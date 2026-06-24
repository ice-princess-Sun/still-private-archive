"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE = 50 * 1024 * 1024;
const MAX_IMAGES = 10;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

type AdminClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validate(formData: FormData) {
  const title = value(formData, "title");
  const slug = value(formData, "slug").toLowerCase();
  const summary = value(formData, "summary");
  const body = value(formData, "body");
  const published = formData.get("published") === "on";

  if (!title || !summary || !body) {
    throw new Error("请完整填写标题、摘要和正文");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("网址标识只能包含小写字母、数字和连字符");
  }

  return { title, slug, summary, body, published };
}

function imageOrder(formData: FormData) {
  try {
    const parsed = JSON.parse(value(formData, "image_order"));
    if (!Array.isArray(parsed)) throw new Error();
    const tokens = parsed.filter(
      (token): token is string =>
        typeof token === "string" && /^(existing:[\w-]+|new:\d+)$/.test(token),
    );
    return [...new Set(tokens)].slice(0, MAX_IMAGES);
  } catch {
    throw new Error("图片顺序信息无效，请重新选择图片");
  }
}

function selectedFiles(formData: FormData) {
  const files = formData
    .getAll("images")
    .filter((item): item is File => item instanceof File && item.size > 0);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_IMAGE_SIZE) {
    throw new Error("所选图片总大小不能超过 50 MB，请压缩或减少图片");
  }

  return files;
}

function validateFile(file: File) {
  if (!MIME_EXTENSIONS[file.type]) throw new Error(`不支持图片格式：${file.name}`);
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`图片 ${file.name} 超过 10 MB`);
  }
}

async function uploadImage(file: File, userId: string, supabase: AdminClient) {
  validateFile(file);
  const path = `${userId}/${randomUUID()}.${MIME_EXTENSIONS[file.type]}`;
  const { error } = await supabase.storage
    .from("archive-images")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new Error(`图片上传失败：${error.message}`);
  return path;
}

async function cleanupStorage(supabase: AdminClient, paths: string[]) {
  if (paths.length) await supabase.storage.from("archive-images").remove(paths);
}

function fail(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "操作失败，请重试";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createEntry(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const uploadedPaths: string[] = [];
  let entryId: string | null = null;

  try {
    const fields = validate(formData);
    const order = imageOrder(formData);
    const files = selectedFiles(formData);

    if (!order.length) throw new Error("请至少选择一张图片");
    if (order.some((token) => token.startsWith("existing:"))) {
      throw new Error("新建图文不能引用已有图片");
    }

    const now = new Date().toISOString();
    const { data: entry, error: entryError } = await supabase
      .from("entries")
      .insert({
        ...fields,
        author_id: user.id,
        author_email: user.email ?? null,
        published_at: fields.published ? now : null,
        updated_at: now,
      })
      .select("id")
      .single();

    if (entryError) {
      throw new Error(entryError.code === "23505" ? "网址标识已被使用" : entryError.message);
    }
    entryId = entry.id;

    const rows = [];
    for (const [position, token] of order.entries()) {
      const index = Number(token.split(":")[1]);
      const file = files[index];
      if (!file) throw new Error("部分图片未能读取，请重新选择");
      const storagePath = await uploadImage(file, user.id, supabase);
      uploadedPaths.push(storagePath);
      rows.push({ entry_id: entry.id, storage_path: storagePath, position });
    }

    const { error: imageError } = await supabase.from("entry_images").insert(rows);
    if (imageError) throw new Error(imageError.message);

    await supabase
      .from("entries")
      .update({ image_path: rows[0].storage_path })
      .eq("id", entry.id);
  } catch (error) {
    await cleanupStorage(supabase, uploadedPaths);
    if (entryId) await supabase.from("entries").delete().eq("id", entryId);
    fail("/admin/new", error);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?success=created");
}

export async function updateEntry(id: string, formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const uploadedPaths: string[] = [];

  const { data: existing } = await supabase
    .from("entries")
    .select("slug,published,published_at,entry_images(*)")
    .eq("id", id)
    .single();

  if (!existing) fail("/admin", new Error("找不到这篇图文"));

  try {
    const fields = validate(formData);
    const order = imageOrder(formData);
    const files = selectedFiles(formData);
    if (!order.length) throw new Error("一篇图文至少需要保留一张图片");

    const existingImages = existing.entry_images ?? [];
    const existingById = new Map(
      existingImages.map((image) => [image.id, image] as const),
    );
    const desired: Array<{
      id?: string;
      entry_id: string;
      storage_path: string;
      position: number;
    }> = [];

    for (const [position, token] of order.entries()) {
      const [kind, rawId] = token.split(":");
      if (kind === "existing") {
        const image = existingById.get(rawId);
        if (!image) throw new Error("已有图片信息已变化，请刷新页面后重试");
        desired.push({
          id: image.id,
          entry_id: id,
          storage_path: image.storage_path,
          position,
        });
      } else {
        const file = files[Number(rawId)];
        if (!file) throw new Error("部分新图片未能读取，请重新选择");
        const storagePath = await uploadImage(file, user.id, supabase);
        uploadedPaths.push(storagePath);
        desired.push({ entry_id: id, storage_path: storagePath, position });
      }
    }

    const retainedIds = new Set(desired.flatMap((image) => (image.id ? [image.id] : [])));
    const removed = existingImages.filter((image) => !retainedIds.has(image.id));

    for (const image of desired.filter((item) => item.id)) {
      const { error } = await supabase
        .from("entry_images")
        .update({ position: image.position })
        .eq("id", image.id as string);
      if (error) throw new Error(error.message);
    }

    const newRows = desired
      .filter((item) => !item.id)
      .map(({ entry_id, storage_path, position }) => ({
        entry_id,
        storage_path,
        position,
      }));
    if (newRows.length) {
      const { error } = await supabase.from("entry_images").insert(newRows);
      if (error) throw new Error(error.message);
    }

    if (removed.length) {
      const { error } = await supabase
        .from("entry_images")
        .delete()
        .in(
          "id",
          removed.map((image) => image.id),
        );
      if (error) throw new Error(error.message);
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("entries")
      .update({
        ...fields,
        image_path: desired[0].storage_path,
        published_at:
          fields.published && !existing.published
            ? now
            : fields.published
              ? existing.published_at
              : null,
        updated_at: now,
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.code === "23505" ? "网址标识已被使用" : error.message);
    }

    await cleanupStorage(
      supabase,
      removed.map((image) => image.storage_path),
    );
  } catch (error) {
    await cleanupStorage(supabase, uploadedPaths);
    fail(`/admin/${id}/edit`, error);
  }

  revalidatePath("/");
  revalidatePath(`/entry/${existing.slug}`);
  revalidatePath("/admin");
  redirect("/admin?success=updated");
}

export async function deleteEntry(id: string) {
  const { supabase } = await requireAdmin();
  const { data: entry } = await supabase
    .from("entries")
    .select("slug,entry_images(storage_path)")
    .eq("id", id)
    .single();

  if (!entry) fail("/admin", new Error("找不到这篇图文"));

  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) fail("/admin", error);

  await cleanupStorage(
    supabase,
    (entry.entry_images ?? []).map((image) => image.storage_path),
  );

  revalidatePath("/");
  revalidatePath(`/entry/${entry.slug}`);
  revalidatePath("/admin");
  redirect("/admin?success=deleted");
}

"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validate(formData: FormData) {
  const title = value(formData, "title");
  const slug = value(formData, "slug").toLowerCase();
  const summary = value(formData, "summary");
  const body = value(formData, "body");
  const published = formData.get("published") === "on";

  if (!title || !summary || !body) throw new Error("请完整填写标题、摘要和正文");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("网址标识只能包含小写字母、数字和连字符");
  }

  return { title, slug, summary, body, published };
}

async function uploadImage(
  file: File,
  userId: string,
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
) {
  if (!MIME_EXTENSIONS[file.type]) throw new Error("照片格式不受支持");
  if (file.size > MAX_IMAGE_SIZE) throw new Error("照片不能超过 10 MB");

  const path = `${userId}/${randomUUID()}.${MIME_EXTENSIONS[file.type]}`;
  const { error } = await supabase.storage
    .from("archive-images")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new Error(`照片上传失败：${error.message}`);
  return path;
}

function fail(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "操作失败，请重试";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createEntry(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  let imagePath: string | null = null;

  try {
    const fields = validate(formData);
    const image = formData.get("image");
    if (!(image instanceof File) || image.size === 0) throw new Error("请选择封面照片");

    imagePath = await uploadImage(image, user.id, supabase);
    const now = new Date().toISOString();
    const { error } = await supabase.from("entries").insert({
      ...fields,
      image_path: imagePath,
      published_at: fields.published ? now : null,
      updated_at: now,
    });

    if (error) throw new Error(error.code === "23505" ? "网址标识已被使用" : error.message);
  } catch (error) {
    if (imagePath) {
      await supabase.storage.from("archive-images").remove([imagePath]);
    }
    fail("/admin/new", error);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?success=created");
}

export async function updateEntry(id: string, formData: FormData) {
  const { supabase, user } = await requireAdmin();
  let newImagePath: string | null = null;

  const { data: existing } = await supabase
    .from("entries")
    .select("slug,image_path,published,published_at")
    .eq("id", id)
    .single();

  if (!existing) fail("/admin", new Error("找不到这篇图文"));

  try {
    const fields = validate(formData);
    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      newImagePath = await uploadImage(image, user.id, supabase);
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("entries")
      .update({
        ...fields,
        image_path: newImagePath ?? existing.image_path,
        published_at:
          fields.published && !existing.published
            ? now
            : fields.published
              ? existing.published_at
              : null,
        updated_at: now,
      })
      .eq("id", id);

    if (error) throw new Error(error.code === "23505" ? "网址标识已被使用" : error.message);

    if (newImagePath && existing.image_path) {
      await supabase.storage.from("archive-images").remove([existing.image_path]);
    }
  } catch (error) {
    if (newImagePath) {
      await supabase.storage.from("archive-images").remove([newImagePath]);
    }
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
    .select("slug,image_path")
    .eq("id", id)
    .single();

  if (!entry) fail("/admin", new Error("找不到这篇图文"));

  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) fail("/admin", error);

  if (entry.image_path) {
    await supabase.storage.from("archive-images").remove([entry.image_path]);
  }

  revalidatePath("/");
  revalidatePath(`/entry/${entry.slug}`);
  revalidatePath("/admin");
  redirect("/admin?success=deleted");
}

"use client";

import { useMemo, useState } from "react";
import type { EntryImage } from "@/lib/entries";
import { createClient } from "@/lib/supabase/client";

type PreviewItem = {
  token: string;
  name: string;
  url: string;
  existing: boolean;
  storagePath: string;
};

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function MultiImagePicker({
  existingImages = [],
}: {
  existingImages?: EntryImage[];
}) {
  const initialItems = useMemo(
    () =>
      existingImages
        .filter((image) => image.signed_url)
        .map((image, index) => ({
          token: `existing:${image.id}`,
          name: `已上传图片 ${index + 1}`,
          url: image.signed_url as string,
          existing: true,
          storagePath: image.storage_path,
        })),
    [existingImages],
  );
  const [items, setItems] = useState<PreviewItem[]>(initialItems);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function selectFiles(input: HTMLInputElement) {
    const selected = Array.from(input.files ?? []);
    input.value = "";
    if (!selected.length) return;

    const available = Math.max(0, MAX_IMAGES - items.length);
    if (!available) {
      setMessage(`一篇图文最多 ${MAX_IMAGES} 张图片。`);
      return;
    }

    const candidates = selected.slice(0, available);
    const oversized = candidates.find((file) => file.size > MAX_FILE_BYTES);
    if (oversized) {
      setMessage(`图片 ${oversized.name} 超过 10 MB，请压缩后重试。`);
      return;
    }

    setUploading(true);
    setMessage("正在上传图片，请不要关闭页面……");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploading(false);
      setMessage("登录状态已失效，请重新登录。");
      return;
    }

    const uploaded: PreviewItem[] = [];
    for (const file of candidates) {
      const extension = extensionFor(file.type);
      if (!extension) {
        setMessage(`不支持图片格式：${file.name}`);
        continue;
      }

      const storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage
        .from("archive-images")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        setMessage(`图片上传失败：${error.message}`);
        continue;
      }

      uploaded.push({
        token: `uploaded:${storagePath}`,
        name: file.name,
        url: URL.createObjectURL(file),
        existing: false,
        storagePath,
      });
    }

    setItems((current) => [...current, ...uploaded]);
    setUploading(false);

    if (selected.length > available) {
      setMessage(`最多保留 ${MAX_IMAGES} 张图片，多余图片未上传。`);
    } else if (uploaded.length === candidates.length) {
      setMessage(`${uploaded.length} 张图片已上传，可以发布。`);
    }
  }

  async function removeItem(index: number) {
    const item = items[index];
    if (!item.existing) {
      const supabase = createClient();
      await supabase.storage.from("archive-images").remove([item.storagePath]);
      URL.revokeObjectURL(item.url);
    }
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="mt-3">
      <input
        type="hidden"
        name="image_order"
        value={JSON.stringify(items.map((item) => item.token))}
      />

      <label
        className={`admin-upload ${
          uploading ? "pointer-events-none cursor-wait opacity-60" : ""
        }`}
      >
        <span className="admin-upload-icon">{uploading ? "…" : "＋"}</span>
        <span className="admin-upload-copy">
          <strong>{uploading ? "正在上传" : "添加图片"}</strong>
          <small>可分批添加，最多 {MAX_IMAGES} 张；选择后直接上传</small>
        </span>
        <input
          type="file"
          multiple
          disabled={uploading}
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => void selectFiles(event.currentTarget)}
        />
      </label>

      {message && (
        <p
          className={`mt-3 border-l pl-3 text-xs ${
            message.includes("失败") || message.includes("超过") || message.includes("失效")
              ? "border-[#9d4d40] text-[#8c453a]"
              : "border-ink text-muted"
          }`}
        >
          {message}
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium">图片预览与顺序</p>
            <p className="text-[10px] text-muted">
              第 1 张作为首页封面 · {items.length}/{MAX_IMAGES}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
              <div key={item.token} className="admin-image-preview">
                <div
                  className="aspect-[4/3] bg-[#d8d5ce] bg-cover bg-center"
                  style={{ backgroundImage: `url("${item.url}")` }}
                />
                <div className="flex items-center justify-between gap-3 border-t hairline p-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium">
                      {index === 0 ? "封面" : `图片 ${index + 1}`}
                    </p>
                    <p className="mt-1 truncate text-[9px] text-muted">{item.name}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <PreviewButton
                      label="前移"
                      disabled={index === 0}
                      onClick={() => moveItem(index, -1)}
                    >
                      ←
                    </PreviewButton>
                    <PreviewButton
                      label="后移"
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(index, 1)}
                    >
                      →
                    </PreviewButton>
                    <PreviewButton
                      label="移除"
                      onClick={() => void removeItem(index)}
                      danger
                    >
                      ×
                    </PreviewButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function extensionFor(type: string) {
  return {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  }[type];
}

function PreviewButton({
  label,
  disabled = false,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-7 cursor-pointer items-center justify-center border hairline text-xs disabled:cursor-not-allowed disabled:opacity-25 ${
        danger ? "text-[#8c453a]" : "text-ink"
      }`}
    >
      {children}
    </button>
  );
}

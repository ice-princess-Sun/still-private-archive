"use client";

import { useEffect, useMemo, useState } from "react";
import type { EntryImage } from "@/lib/entries";

type PreviewItem = {
  token: string;
  name: string;
  url: string;
  existing: boolean;
};

const MAX_IMAGES = 10;

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
        })),
    [existingImages],
  );
  const [items, setItems] = useState<PreviewItem[]>(initialItems);
  const [newUrls, setNewUrls] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(
    () => () => {
      newUrls.forEach((url) => URL.revokeObjectURL(url));
    },
    [newUrls],
  );

  function selectFiles(files: FileList | null) {
    newUrls.forEach((url) => URL.revokeObjectURL(url));
    const retained = items.filter((item) => item.existing);
    const selected = Array.from(files ?? []);
    const available = Math.max(0, MAX_IMAGES - retained.length);
    const accepted = selected.slice(0, available);
    const urls = accepted.map((file) => URL.createObjectURL(file));

    setNewUrls(urls);
    setItems([
      ...retained,
      ...accepted.map((file, index) => ({
        token: `new:${index}`,
        name: file.name,
        url: urls[index],
        existing: false,
      })),
    ]);
    setMessage(
      selected.length > available
        ? `一篇图文最多 ${MAX_IMAGES} 张图片，已保留前 ${available} 张新图片。`
        : "",
    );
  }

  function removeItem(index: number) {
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

      <label className="admin-upload">
        <span className="admin-upload-icon">＋</span>
        <span className="admin-upload-copy">
          <strong>{items.length ? "重新选择新图片" : "选择图片"}</strong>
          <small>可一次选择多张，最多 {MAX_IMAGES} 张</small>
        </span>
        <input
          name="images"
          type="file"
          multiple
          required={items.length === 0}
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => selectFiles(event.target.files)}
        />
      </label>

      {message && (
        <p className="mt-3 border-l border-[#9d4d40] pl-3 text-xs text-[#8c453a]">
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
                    <PreviewButton label="移除" onClick={() => removeItem(index)} danger>
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

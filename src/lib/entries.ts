import type { SupabaseClient } from "@supabase/supabase-js";

export type EntryImage = {
  id: string;
  entry_id: string;
  storage_path: string;
  position: number;
  created_at: string;
  media_url?: string;
};

export type Entry = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  image_path: string | null;
  published: boolean;
  published_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  author_id: string | null;
  author_email: string | null;
  entry_images?: EntryImage[];
  images?: EntryImage[];
  image_url?: string | null;
};

export const ENTRY_SELECT = "*, entry_images(*)";

export function withImageUrls(entries: Entry[]): Entry[] {
  return entries.map((entry) => {
    const images = [...(entry.entry_images ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((image) => ({
        ...image,
        media_url: `/media/${image.id}?v=${encodeURIComponent(image.created_at)}`,
      }));

    return {
      ...entry,
      images,
      image_url: images[0]?.media_url ?? null,
    };
  });
}

export function authorLabel(entry: Pick<Entry, "author_email">) {
  return entry.author_email ?? "未知用户";
}

export async function isAdmin(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

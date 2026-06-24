import type { SupabaseClient } from "@supabase/supabase-js";

export type EntryImage = {
  id: string;
  entry_id: string;
  storage_path: string;
  position: number;
  created_at: string;
  signed_url?: string | null;
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
  created_at: string;
  updated_at: string;
  author_id: string | null;
  author_email: string | null;
  entry_images?: EntryImage[];
  images?: EntryImage[];
  image_url?: string | null;
};

export const ENTRY_SELECT = "*, entry_images(*)";

export async function withSignedImages(
  supabase: SupabaseClient,
  entries: Entry[],
): Promise<Entry[]> {
  return Promise.all(
    entries.map(async (entry) => {
      const imageRows = [...(entry.entry_images ?? [])].sort(
        (a, b) => a.position - b.position,
      );

      const images = await Promise.all(
        imageRows.map(async (image) => {
          const { data } = await supabase.storage
            .from("archive-images")
            .createSignedUrl(image.storage_path, 60 * 60);

          return { ...image, signed_url: data?.signedUrl ?? null };
        }),
      );

      return {
        ...entry,
        images,
        image_url: images[0]?.signed_url ?? null,
      };
    }),
  );
}

export function authorLabel(entry: Pick<Entry, "author_email">) {
  return entry.author_email ?? "未知用户";
}

export async function isAdmin(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

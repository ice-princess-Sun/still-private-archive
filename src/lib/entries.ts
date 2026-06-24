import type { SupabaseClient } from "@supabase/supabase-js";

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
  image_url?: string | null;
};

export async function withSignedImages(
  supabase: SupabaseClient,
  entries: Entry[],
): Promise<Entry[]> {
  return Promise.all(
    entries.map(async (entry) => {
      if (!entry.image_path) return { ...entry, image_url: null };

      const { data } = await supabase.storage
        .from("archive-images")
        .createSignedUrl(entry.image_path, 60 * 60);

      return { ...entry, image_url: data?.signedUrl ?? null };
    }),
  );
}

export async function isAdmin(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

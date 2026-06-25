import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_SECONDS = 60 * 60;
const REDIRECT_CACHE_SECONDS = 55 * 60;

type CachedUrl = {
  url: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, CachedUrl>();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  if (!supabase) return new Response("Service unavailable", { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const { data: image, error } = await supabase
    .from("entry_images")
    .select("id,storage_path,created_at")
    .eq("id", id)
    .single();

  if (error || !image) return new Response("Not found", { status: 404 });

  const cacheKey = `${image.id}:${image.created_at}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return redirectTo(cached.url);
  }

  const { data, error: signError } = await supabase.storage
    .from("archive-images")
    .createSignedUrl(image.storage_path, SIGNED_URL_SECONDS);

  if (signError || !data?.signedUrl) {
    return new Response("Image unavailable", { status: 404 });
  }

  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: Date.now() + REDIRECT_CACHE_SECONDS * 1000,
  });

  return redirectTo(data.signedUrl);
}

function redirectTo(url: string) {
  return new Response(null, {
    status: 307,
    headers: {
      Location: url,
      "Cache-Control": `private, max-age=${REDIRECT_CACHE_SECONDS}`,
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

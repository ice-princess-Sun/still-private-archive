import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/supabase/auth";
import { isAdmin, withSignedImages, type Entry } from "@/lib/entries";

export default async function EntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { supabase, user } = await requireUser();
  const admin = await isAdmin(supabase);
  const { data } = await supabase
    .from("entries")
    .select("*")
    .eq("slug", (await params).slug)
    .single();

  if (!data) notFound();
  const [entry] = await withSignedImages(supabase, [data as Entry]);

  return (
    <main className="min-h-screen px-5 pb-20 md:px-10 lg:px-16">
      <SiteHeader email={user.email} isAdmin={admin} />
      <article className="fade-up">
        <header className="grid gap-10 border-b hairline py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-8">
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted">
              Journal · {formatDate(entry.published_at ?? entry.created_at)}
            </p>
            <h1 className="mt-7 font-serif text-[clamp(4rem,9vw,8rem)] leading-[0.85] tracking-[-0.05em]">
              {entry.title}
            </h1>
          </div>
          <p className="self-end text-sm leading-7 text-muted md:col-span-3 md:col-start-10">
            {entry.summary}
          </p>
        </header>

        <div
          className="mt-8 aspect-[16/10] w-full bg-[#d8d5ce] bg-cover bg-center md:mt-12"
          style={
            entry.image_url ? { backgroundImage: `url("${entry.image_url}")` } : undefined
          }
        />

        <div className="mx-auto max-w-2xl py-16 md:py-24">
          {entry.body
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map((paragraph) => (
              <p
                key={paragraph}
                className="mb-8 whitespace-pre-line font-serif text-2xl leading-[1.8] tracking-[-0.01em] md:text-3xl"
              >
                {paragraph}
              </p>
            ))}
        </div>
      </article>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

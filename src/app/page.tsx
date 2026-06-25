import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/supabase/auth";
import {
  authorLabel,
  ENTRY_SELECT,
  isAdmin,
  withImageUrls,
  type Entry,
} from "@/lib/entries";

export default async function Home() {
  const { supabase, user } = await requireUser();
  const admin = await isAdmin(supabase);
  const { data } = await supabase
    .from("entries")
    .select(ENTRY_SELECT)
    .eq("published", true)
    .order("published_at", { ascending: false });
  const entries = withImageUrls((data ?? []) as Entry[]);

  return (
    <main className="min-h-screen px-5 pb-16 md:px-10 lg:px-16">
      <SiteHeader email={user.email} isAdmin={admin} />

      <section className="fade-up border-b hairline pb-14 pt-16 md:pb-20 md:pt-24 lg:pt-28">
        <p className="mb-7 text-[10px] font-medium uppercase tracking-[0.32em] text-muted md:mb-9">
          Private archive · {new Date().getFullYear()}
        </p>
        <h1 className="max-w-6xl font-serif text-[clamp(3.15rem,7.6vw,7.5rem)] leading-[0.9] tracking-[-0.04em]">
          <span className="block">Quiet things,</span>
          <span className="mt-1 block md:ml-[8vw] md:mt-2">carefully kept.</span>
        </h1>
        <div className="mt-14 grid gap-6 md:mt-20 md:grid-cols-12">
          <p className="max-w-md text-sm leading-7 text-muted md:col-start-8 md:col-span-4">
            这里收藏那些值得被慢慢观看的文字与影像。内容仅对受邀成员开放，
            每一次访问都保持私密。
          </p>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted">Journal</p>
            <h2 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">最近收录</h2>
          </div>
          <span className="hidden text-xs tabular-nums text-muted md:block">
            {String(entries.length).padStart(2, "0")} entries
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="border-y hairline py-20 text-center">
            <p className="font-serif text-3xl">档案暂时为空</p>
            <p className="mt-3 text-xs text-muted">
              {admin ? "前往管理后台发布第一篇图文。" : "新的内容将在这里出现。"}
            </p>
            {admin && (
              <Link
                href="/admin/new"
                className="mt-8 inline-block border-b border-ink pb-1 text-[10px] uppercase tracking-[0.2em]"
              >
                Create first entry
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-x-6 gap-y-14 md:grid-cols-12">
            {entries.map((entry, index) => (
              <Link
                href={`/entry/${entry.slug}`}
                key={entry.slug}
                className={`group block ${
                  index % 2 === 0 ? "md:col-span-7" : "md:col-span-5"
                }`}
              >
                <div
                  className={`relative overflow-hidden bg-[#d8d5ce] ${
                    index % 2 === 0 ? "aspect-[4/3]" : "aspect-[4/5]"
                  }`}
                >
                  {entry.image_url && (
                    <Image
                      src={entry.image_url}
                      alt={entry.title}
                      fill
                      unoptimized
                      priority={index === 0}
                      loading={index === 0 ? "eager" : "lazy"}
                      sizes={index % 2 === 0 ? "(min-width: 768px) 58vw, 100vw" : "(min-width: 768px) 42vw, 100vw"}
                      className="scale-[1.01] object-cover transition duration-700 ease-out group-hover:scale-[1.035]"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/[0.04]" />
                  <div className="absolute right-4 top-4 flex gap-2">
                    {(entry.images?.length ?? 0) > 1 && (
                      <span className="bg-paper/90 px-3 py-2 text-[9px] uppercase tracking-[0.16em] backdrop-blur">
                        {entry.images?.length} photos
                      </span>
                    )}
                    <span className="bg-paper/90 px-3 py-2 text-[9px] uppercase tracking-[0.2em] backdrop-blur">
                      Members only
                    </span>
                  </div>
                </div>
                <div className="mt-5 flex items-start justify-between border-t hairline pt-4">
                  <div>
                    <h3 className="font-serif text-3xl tracking-tight">{entry.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-muted">{entry.summary}</p>
                    <p className="mt-3 text-[9px] uppercase tracking-[0.12em] text-muted">
                      By {authorLabel(entry)}
                    </p>
                  </div>
                  <span className="ml-6 pt-2 text-xs text-muted">
                    {formatDate(entry.published_at ?? entry.created_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(value))
    .replace("/", ".");
}

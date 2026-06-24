import Link from "next/link";
import { deleteEntry } from "@/app/admin/actions";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/supabase/auth";
import { withSignedImages, type Entry } from "@/lib/entries";

const successMessages: Record<string, string> = {
  created: "图文已创建。",
  updated: "修改已保存。",
  deleted: "图文已删除。",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { supabase, user } = await requireAdmin();
  const query = await supabase.from("entries").select("*").order("created_at", {
    ascending: false,
  });
  const entries = await withSignedImages(supabase, (query.data ?? []) as Entry[]);
  const params = await searchParams;

  return (
    <main className="min-h-screen px-5 pb-20 md:px-10 lg:px-16">
      <SiteHeader email={user.email} isAdmin />
      <section className="fade-up py-16 md:py-24">
        <div className="flex flex-col gap-8 border-b hairline pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted">
              Administration
            </p>
            <h1 className="mt-5 font-serif text-6xl tracking-[-0.05em] md:text-8xl">
              内容管理
            </h1>
          </div>
          <Link
            href="/admin/new"
            className="flex items-center justify-between bg-ink px-5 py-4 text-xs uppercase tracking-[0.18em] text-paper"
          >
            新建图文 <span className="ml-12">＋</span>
          </Link>
        </div>

        {(params.success || params.error) && (
          <p
            className={`mt-8 border-l pl-4 text-xs ${
              params.error ? "border-[#9d4d40] text-[#8c453a]" : "border-ink text-muted"
            }`}
          >
            {params.error
              ? decodeURIComponent(params.error)
              : successMessages[params.success ?? ""]}
          </p>
        )}

        <div className="mt-12">
          {entries.length === 0 ? (
            <div className="border-y hairline py-16 text-center">
              <p className="font-serif text-3xl">还没有图文</p>
              <p className="mt-3 text-xs text-muted">点击“新建图文”发布第一篇内容。</p>
            </div>
          ) : (
            entries.map((entry) => (
              <article
                key={entry.id}
                className="grid gap-5 border-b hairline py-6 md:grid-cols-[120px_1fr_auto] md:items-center"
              >
                <div
                  className="aspect-[4/3] bg-[#d8d5ce] bg-cover bg-center"
                  style={
                    entry.image_url
                      ? { backgroundImage: `url("${entry.image_url}")` }
                      : undefined
                  }
                />
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-serif text-3xl tracking-tight">{entry.title}</h2>
                    <span
                      className={`px-2 py-1 text-[8px] uppercase tracking-[0.16em] ${
                        entry.published ? "bg-ink text-paper" : "border hairline text-muted"
                      }`}
                    >
                      {entry.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-2 max-w-xl text-xs leading-5 text-muted">{entry.summary}</p>
                </div>
                <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.16em]">
                  {entry.published && (
                    <Link href={`/entry/${entry.slug}`} className="text-muted hover:text-ink">
                      查看
                    </Link>
                  )}
                  <Link href={`/admin/${entry.id}/edit`} className="hover:underline">
                    编辑
                  </Link>
                  <DeleteEntryButton action={deleteEntry.bind(null, entry.id)} />
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

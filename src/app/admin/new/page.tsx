import Link from "next/link";
import { createEntry } from "@/app/admin/actions";
import { EntryForm } from "@/components/entry-form";
import { SiteHeader } from "@/components/site-header";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user } = await requireAdmin();
  const { error } = await searchParams;

  return (
    <main className="min-h-screen px-5 pb-20 md:px-10 lg:px-16">
      <SiteHeader email={user.email} isAdmin />
      <section className="fade-up py-12 md:py-20">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted transition hover:text-ink"
        >
          ← 返回内容管理
        </Link>
        <div className="mt-8 border-b hairline pb-10">
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted">
            New entry
          </p>
          <h1 className="mt-3 font-serif text-5xl tracking-[-0.05em] md:text-7xl">
            新建图文
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            填写文字、选择封面并设置发布状态。内容保存后仍可随时修改。
          </p>
        </div>
        {error && (
          <div className="mt-8 border border-[#9d4d40]/30 bg-[#9d4d40]/[0.06] px-5 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#8c453a]">
              无法保存
            </p>
            <p className="mt-2 text-xs leading-5 text-[#8c453a]">
              {decodeURIComponent(error)}
            </p>
          </div>
        )}
        <EntryForm action={createEntry} />
      </section>
    </main>
  );
}

import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/supabase/auth";
import { isAdmin } from "@/lib/entries";

export default async function AboutPage() {
  const { supabase, user } = await requireUser();
  const admin = await isAdmin(supabase);

  return (
    <main className="min-h-screen px-5 pb-20 md:px-10 lg:px-16">
      <SiteHeader email={user.email} isAdmin={admin} />
      <section className="fade-up grid gap-16 py-20 md:grid-cols-12 md:py-28">
        <h1 className="font-serif text-7xl leading-[0.85] tracking-[-0.05em] md:col-span-7 md:text-9xl">
          About
          <br />
          this place.
        </h1>
        <div className="space-y-7 text-sm leading-7 text-muted md:col-span-4 md:col-start-9 md:pt-28">
          <p>STILL 是一个私人图文档案，用来保存照片、文字和不愿被公开索引的记忆。</p>
          <p>这里只保留必要的功能。没有社交计数，没有公开搜索，也没有喧闹的通知。</p>
        </div>
      </section>
    </main>
  );
}

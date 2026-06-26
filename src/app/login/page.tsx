import { signIn } from "@/app/actions";
import { LoginHero } from "@/components/login-hero";

const messages: Record<string, string> = {
  "missing-config": "尚未配置 Supabase 环境变量，请先按 README 完成配置。",
  "Invalid login credentials": "邮箱或密码不正确。",
};

const heroImages = [
  {
    url: "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=2200&q=88",
    position: "center",
  },
  {
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2200&q=88",
    position: "center",
  },
  {
    url: "https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?auto=format&fit=crop&w=2200&q=88",
    position: "center",
  },
  {
    url: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=2200&q=88",
    position: "center",
  },
];

function getRotatingHeroImageIndex() {
  const rotationDays = 7;
  const day = Math.floor(Date.now() / 86_400_000);

  return Math.floor(day / rotationDays) % heroImages.length;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? messages[error] ?? error : null;
  const heroImageIndex = getRotatingHeroImageIndex();

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.6fr)_minmax(25rem,1fr)]">
      <LoginHero images={heroImages} initialIndex={heroImageIndex} />

      <section className="flex items-center px-6 py-14 sm:px-16 lg:min-h-screen lg:px-[13%]">
        <div className="fade-up w-full max-w-md">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted">
            Private access
          </p>
          <h1 className="mt-5 font-serif text-5xl tracking-[-0.04em]">欢迎回来</h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            这是一个私人图文空间。请使用受邀账号继续访问。
          </p>

          <form action={signIn} className="mt-12 space-y-8">
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
                Email
              </span>
              <input
                required
                name="email"
                type="email"
                autoComplete="email"
                className="mt-3 w-full border-0 border-b hairline bg-transparent px-0 py-3 text-sm outline-none transition focus:border-ink"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
                Password
              </span>
              <input
                required
                name="password"
                type="password"
                autoComplete="current-password"
                className="mt-3 w-full border-0 border-b hairline bg-transparent px-0 py-3 text-sm outline-none transition focus:border-ink"
              />
            </label>

            {message && (
              <p className="border-l border-[#9d4d40] pl-3 text-xs leading-5 text-[#8c453a]">
                {message}
              </p>
            )}

            <button className="group pressable flex w-full cursor-pointer items-center justify-between bg-ink px-5 py-4 text-xs font-medium uppercase tracking-[0.2em] text-paper hover:bg-[#343430]">
              Enter archive
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </form>
          <p className="mt-8 text-[10px] leading-5 text-muted">
            未经授权无法创建账号。如需访问，请联系网站管理员。
          </p>
        </div>
      </section>
    </main>
  );
}

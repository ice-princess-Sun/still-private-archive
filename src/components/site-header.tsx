import Link from "next/link";
import { signOut } from "@/app/actions";

export function SiteHeader({
  email,
  isAdmin = false,
}: {
  email?: string;
  isAdmin?: boolean;
}) {
  return (
    <header className="flex h-20 items-center justify-between gap-4 border-b hairline">
      <Link
        href="/"
        className="shrink-0 font-serif text-xl font-semibold tracking-[-0.04em] sm:text-2xl"
      >
        STILL
      </Link>
      <nav className="flex min-w-0 items-center gap-3 text-[9px] font-medium uppercase tracking-[0.12em] sm:gap-6 sm:text-[10px] sm:tracking-[0.2em]">
        <Link className="text-muted transition hover:text-ink" href="/about">
          About
        </Link>
        {isAdmin && (
          <Link className="text-muted transition hover:text-ink" href="/admin">
            Admin
          </Link>
        )}
        {email && (
          <form action={signOut} className="shrink-0">
            <button className="cursor-pointer whitespace-nowrap border-0 border-b border-ink/40 bg-transparent p-0 pb-1 text-[9px] font-medium uppercase tracking-[0.12em] text-muted transition hover:border-ink hover:text-ink sm:text-[10px] sm:tracking-[0.2em]">
              <span>Logout</span>
            </button>
          </form>
        )}
      </nav>
    </header>
  );
}

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
        className="shrink-0 font-serif text-xl font-semibold tracking-[-0.04em] transition duration-300 hover:tracking-[-0.02em] sm:text-2xl"
      >
        STILL
      </Link>
      <nav className="flex min-w-0 items-center gap-3 text-[9px] font-medium uppercase tracking-[0.12em] sm:gap-6 sm:text-[10px] sm:tracking-[0.2em]">
        <Link className="interactive-link text-muted hover:text-ink" href="/about">
          About
        </Link>
        {isAdmin && (
          <Link className="interactive-link text-muted hover:text-ink" href="/admin">
            Admin
          </Link>
        )}
        {email && (
          <form action={signOut} className="shrink-0">
            <button className="interactive-link cursor-pointer whitespace-nowrap border-0 bg-transparent p-0 text-[9px] font-medium uppercase tracking-[0.12em] text-muted hover:text-ink sm:text-[10px] sm:tracking-[0.2em]">
              <span>Logout</span>
            </button>
          </form>
        )}
      </nav>
    </header>
  );
}

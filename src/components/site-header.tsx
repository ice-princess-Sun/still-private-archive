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
    <header className="flex h-20 items-center justify-between border-b hairline">
      <Link href="/" className="font-serif text-2xl font-semibold tracking-[-0.04em]">
        STILL
      </Link>
      <nav className="flex items-center gap-6 text-[10px] font-medium uppercase tracking-[0.2em]">
        <Link className="hidden text-muted transition hover:text-ink sm:block" href="/about">
          About
        </Link>
        {isAdmin && (
          <Link className="hidden text-muted transition hover:text-ink sm:block" href="/admin">
            Admin
          </Link>
        )}
        {email && (
          <form action={signOut}>
            <button className="cursor-pointer border-b border-ink/40 pb-1 transition hover:border-ink">
              Sign out
            </button>
          </form>
        )}
      </nav>
    </header>
  );
}

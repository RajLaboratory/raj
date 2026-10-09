import Link from "next/link";
import { can, type AuthUser } from "@/lib/rbac";
import { NAV } from "./nav";
import { Shortcuts } from "./shortcuts";

export function Shell({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  const items = NAV.filter((n) => !n.perm || can(user, n.perm));
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-[var(--line)] bg-[var(--surface)] md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-sm font-bold text-white">R</span>
          <span className="font-semibold">Raj Laboratory</span>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-white/5">
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-6 py-3">
          <div className="text-sm text-[var(--muted)]">{user.roleName}</div>
          <div className="flex items-center gap-4 text-sm">
            <span>{user.name}</span>
            <form action="/api/v1/auth/logout" method="post">
              <button className="text-brand-700 hover:underline">Sign out</button>
            </form>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
      <Shortcuts />
    </div>
  );
}

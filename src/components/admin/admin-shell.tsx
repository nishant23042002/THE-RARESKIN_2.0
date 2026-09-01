import type { ReactNode } from "react";

import { Mark } from "@/components/ui/mark";
import { AdminNav, type AdminNavItem } from "./admin-nav";
import { AdminTopbar } from "./admin-topbar";

/**
 * The admin frame: a quiet left rail + a top bar, on the storefront's own
 * tokens but with none of its chrome. Desktop-first — the rail collapses to a
 * horizontal strip below `md`.
 */
export function AdminShell({
  user,
  sudoUntil,
  nav,
  children,
}: {
  user: { name: string; role: string };
  sudoUntil: string | null;
  nav: AdminNavItem[];
  children: ReactNode;
}) {
  return (
    <div className="ui-surface flex min-h-svh flex-col bg-bg text-ink md:flex-row">
      <aside className="shrink-0 border-b border-line bg-surface md:w-56 md:border-b-0 md:border-r">
        <div className="flex h-14 items-center gap-2 border-b border-line px-4">
          <Mark className="w-4 text-ink" />
          <span className="text-[11px] font-medium tracking-[0.2em] text-ink uppercase">
            Studio
          </span>
        </div>
        <div className="p-3 md:h-[calc(100svh-3.5rem)] md:overflow-y-auto">
          <AdminNav items={nav} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar name={user.name} role={user.role} sudoUntil={sudoUntil} />
        <main id="main" className="flex-1 p-5 md:p-8">
          <div className="max-w-[1120px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

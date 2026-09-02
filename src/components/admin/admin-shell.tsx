import type { ReactNode } from "react";

import { Mark } from "@/components/ui/mark";
import { AdminNav, type AdminNavItem } from "./admin-nav";
import { AdminTopbar } from "./admin-topbar";
import { AdminScrollGuard } from "./admin-scroll-guard";

/**
 * The admin frame: a quiet left rail + a top bar, on the storefront's own
 * tokens but with none of its chrome.
 *
 * Scroll: below `md` the whole page scrolls naturally. From `md` up the shell
 * is a fixed `100svh` frame — the rail and the content column each scroll
 * independently, with the top bar pinned. This keeps the admin usable even if
 * some storefront overlay leaked `body { overflow: hidden }` on the way in
 * (`<AdminScrollGuard>` also clears that).
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
    <div className="ui-surface flex min-h-svh flex-col bg-bg text-ink md:h-svh md:flex-row md:overflow-hidden">
      <AdminScrollGuard />

      <aside className="shrink-0 border-b border-line bg-surface md:flex md:w-56 md:flex-col md:border-b-0 md:border-r">
        <div className="flex h-14 items-center gap-2 border-b border-line px-4">
          <Mark className="w-4 text-ink" />
          <span className="text-[11px] font-medium tracking-[0.2em] text-ink uppercase">
            Studio
          </span>
        </div>
        <div className="p-3 md:min-h-0 md:flex-1 md:overflow-y-auto">
          <AdminNav items={nav} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:overflow-hidden">
        <div className="sticky top-0 z-20 shrink-0 md:static">
          <AdminTopbar name={user.name} role={user.role} sudoUntil={sudoUntil} />
        </div>
        <main id="main" className="flex-1 p-5 md:min-h-0 md:overflow-y-auto md:p-8">
          <div className="max-w-[1120px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

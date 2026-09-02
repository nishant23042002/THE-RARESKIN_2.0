import type { ReactNode } from "react";

import { Mark } from "@/components/ui/mark";
import { AdminNav, type AdminNavItem } from "./admin-nav";
import { AdminTopbar } from "./admin-topbar";
import { AdminScrollGuard } from "./admin-scroll-guard";
import type { AdminTheme } from "@/lib/admin";

/**
 * The admin frame: a quiet left rail + a top bar, on the storefront's own
 * tokens but with none of its chrome.
 *
 * Layout:
 * - `md` and up — a fixed `100svh` frame: a left rail (brand + vertical nav)
 *   and a content column (top bar pinned, content scrolls). Immune to a leaked
 *   `body { overflow: hidden }` (`<AdminScrollGuard>` also clears that).
 * - below `md` — the page scrolls naturally. A slim brand row + the top bar +
 *   a horizontal nav strip are stacked and stick to the top; the nav strip
 *   scrolls sideways so it never pushes the content down.
 *
 * Theme: `data-admin-theme` is set here from a cookie (server-resolved, no
 * flash). `globals.css` scopes the dark palette to this attribute, so the
 * storefront is untouched.
 */
export function AdminShell({
  user,
  sudoUntil,
  nav,
  theme,
  children,
}: {
  user: { name: string; role: string };
  sudoUntil: string | null;
  nav: AdminNavItem[];
  theme: AdminTheme;
  children: ReactNode;
}) {
  return (
    <div
      data-admin-theme={theme}
      className="ui-surface flex min-h-svh flex-col bg-bg text-ink md:h-svh md:flex-row md:overflow-hidden"
    >
      <AdminScrollGuard />

      {/* desktop left rail */}
      <aside className="hidden shrink-0 border-r border-line bg-surface md:flex md:w-56 md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-line px-4">
          <Mark className="w-4 text-ink" />
          <span className="text-[11px] font-medium tracking-[0.2em] text-ink uppercase">
            Studio
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <AdminNav items={nav} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:overflow-hidden">
        {/* sticky header block — mobile shows brand + topbar + nav strip;
            desktop shows only the topbar */}
        <div className="sticky top-0 z-20 md:static">
          <div className="flex h-11 items-center gap-2 border-b border-line bg-surface px-4 md:hidden">
            <Mark className="w-3.5 text-ink" />
            <span className="text-[10px] font-medium tracking-[0.22em] text-ink uppercase">
              Studio
            </span>
          </div>

          <AdminTopbar
            name={user.name}
            role={user.role}
            sudoUntil={sudoUntil}
            theme={theme}
          />

          <div className="border-b border-line bg-surface md:hidden">
            <AdminNav items={nav} layout="strip" />
          </div>
        </div>

        <main
          id="main"
          className="flex-1 p-4 sm:p-5 md:min-h-0 md:overflow-y-auto md:p-8"
        >
          <div className="mx-auto max-w-[1120px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

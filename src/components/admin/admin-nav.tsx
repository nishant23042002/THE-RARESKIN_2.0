"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * Admin navigation. Sections the signed-in role can't reach are simply not
 * passed in (the server decides).
 *
 * - `layout="rail"` (default) — the vertical list in the desktop left rail.
 * - `layout="strip"` — a horizontal, scroll-if-needed row of pills for the
 *   mobile header, so the nav never pushes the content off-screen.
 */

export interface AdminNavItem {
  href: string;
  label: string;
  icon: IconName;
}

export function AdminNav({
  items,
  layout = "rail",
}: {
  items: AdminNavItem[];
  layout?: "rail" | "strip";
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(`${href}/`);

  if (layout === "strip") {
    return (
      <nav
        className="flex gap-1 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Studio sections"
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-colors",
                active
                  ? "bg-ink text-w0"
                  : "border border-line-2 text-ink-2 hover:border-ink hover:text-ink",
              )}
            >
              <Icon name={item.icon} className="size-[14px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-[12.5px] transition-colors",
              active
                ? "bg-ink text-w0"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon name={item.icon} className="size-[15px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

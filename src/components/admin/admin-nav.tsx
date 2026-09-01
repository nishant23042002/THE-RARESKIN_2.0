"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * Admin sidebar navigation. Sections the signed-in role can't reach are simply
 * not passed in (the server decides). G2 adds Catalogue + Media; G3 adds
 * Coupons, Customers, Staff, Settings.
 */

export interface AdminNavItem {
  href: string;
  label: string;
  icon: IconName;
}

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
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

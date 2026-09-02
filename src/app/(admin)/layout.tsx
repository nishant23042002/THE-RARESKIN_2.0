import type { Metadata } from "next";

import {
  requireStaff,
  roleRankFor,
  canManageCatalogue,
} from "@/server/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import type { AdminNavItem } from "@/components/admin/admin-nav";
import type { IconName } from "@/components/ui/icon";
import type { UserRole } from "@/lib/validation/user";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

const NAV: {
  href: string;
  label: string;
  icon: IconName;
  canSee: (role: UserRole) => boolean;
}[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "grid",
    canSee: () => true,
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: "list",
    canSee: (role) => roleRankFor(role) >= roleRankFor("support"),
  },
  {
    href: "/admin/catalogue",
    label: "Catalogue",
    icon: "box",
    canSee: canManageCatalogue,
  },
  {
    href: "/admin/coupons",
    label: "Coupons",
    icon: "tag",
    canSee: (role) => roleRankFor(role) >= roleRankFor("admin"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: "gear",
    canSee: (role) => roleRankFor(role) >= roleRankFor("admin"),
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireStaff();
  const nav: AdminNavItem[] = NAV.filter((n) => n.canSee(ctx.user.role)).map(
    ({ href, label, icon }) => ({ href, label, icon }),
  );

  const sudoUntil = ctx.session.sudoUntil
    ? new Date(ctx.session.sudoUntil).toISOString()
    : null;

  return (
    <AdminShell
      user={{ name: ctx.user.name, role: ctx.user.role }}
      sudoUntil={sudoUntil}
      nav={nav}
    >
      {children}
    </AdminShell>
  );
}

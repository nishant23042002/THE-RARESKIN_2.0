import type { Metadata } from "next";
import { cookies } from "next/headers";

import {
  requireStaff,
  roleRankFor,
  canManageCatalogue,
} from "@/server/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import type { AdminNavItem } from "@/components/admin/admin-nav";
import type { IconName } from "@/components/ui/icon";
import type { UserRole } from "@/lib/validation/user";
import { ADMIN_THEME_COOKIE, parseAdminTheme } from "@/lib/admin";
import { notificationSummary } from "@/server/admin";

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
    href: "/admin/customers",
    label: "Customers",
    icon: "users",
    canSee: (role) => roleRankFor(role) >= roleRankFor("support"),
  },
  {
    href: "/admin/reviews",
    label: "Reviews",
    icon: "star",
    canSee: (role) => roleRankFor(role) >= roleRankFor("support"),
  },
  {
    href: "/admin/messages",
    label: "Messages",
    icon: "mail",
    canSee: (role) => roleRankFor(role) >= roleRankFor("support"),
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    icon: "bell",
    canSee: () => true,
  },
  {
    href: "/admin/staff",
    label: "Staff",
    icon: "shield",
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
  const [ctx, jar] = await Promise.all([requireStaff(), cookies()]);
  const nav: AdminNavItem[] = NAV.filter((n) => n.canSee(ctx.user.role)).map(
    ({ href, label, icon }) => ({ href, label, icon }),
  );
  const notifications = await notificationSummary({
    userId: ctx.user.id,
    role: ctx.user.role,
  });

  const sudoUntil = ctx.session.sudoUntil
    ? new Date(ctx.session.sudoUntil).toISOString()
    : null;

  return (
    <AdminShell
      user={{ name: ctx.user.name, role: ctx.user.role }}
      sudoUntil={sudoUntil}
      nav={nav}
      theme={parseAdminTheme(jar.get(ADMIN_THEME_COOKIE)?.value)}
      notifications={notifications}
    >
      {children}
    </AdminShell>
  );
}

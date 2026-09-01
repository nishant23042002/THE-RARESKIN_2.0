import type { Metadata } from "next";

import { requireStaff, roleRankFor } from "@/server/auth/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import type { AdminNavItem } from "@/components/admin/admin-nav";
import type { IconName } from "@/components/ui/icon";
import type { UserRole } from "@/lib/validation/user";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

const NAV: (AdminNavItem & { min: UserRole; icon: IconName })[] = [
  { href: "/admin", label: "Dashboard", icon: "grid", min: "support" },
  { href: "/admin/orders", label: "Orders", icon: "list", min: "support" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireStaff();
  const rank = roleRankFor(ctx.user.role);
  const nav: AdminNavItem[] = NAV.filter(
    (n) => rank >= roleRankFor(n.min),
  ).map(({ href, label, icon }) => ({ href, label, icon }));

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

import Link from "next/link";

import { requireAdminRole } from "@/server/auth/admin";
import { getAdminDashboard, notificationSummary } from "@/server/admin";
import { PageHeader, StatTile, Card, EmptyState, StatusBadge } from "@/components/admin/ui";
import { NotificationList } from "@/components/admin/notifications/notification-list";
import { formatPaise } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard · Studio" };

export default async function AdminDashboardPage() {
  const ctx = await requireAdminRole("support");
  const [d, activity] = await Promise.all([
    getAdminDashboard(),
    notificationSummary({ userId: ctx.user.id, role: ctx.user.role }),
  ]);

  const weekRevenue = d.last7Days.reduce((s, x) => s + x.revenuePaise, 0);
  const peak = Math.max(1, ...d.last7Days.map((x) => x.revenuePaise));

  return (
    <>
      <PageHeader eyebrow="Studio" title="Dashboard" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Today"
          value={String(d.today.orders)}
          hint={`${formatPaise(d.today.revenuePaise)} in orders`}
          icon="receipt"
        />
        <StatTile
          label="Awaiting shipment"
          value={String(d.awaitingShipment)}
          hint="confirmed + processing"
          icon="box"
          tone={d.awaitingShipment > 0 ? "warn" : undefined}
        />
        <StatTile
          label="Low stock"
          value={String(d.lowStock)}
          hint="at or below threshold"
          icon="alert"
          tone={d.lowStock > 0 ? "warn" : undefined}
        />
        <StatTile
          label="Last 7 days"
          value={formatPaise(weekRevenue)}
          hint={`${d.last7Days.reduce((s, x) => s + x.orders, 0)} orders`}
          icon="grid"
        />
      </div>

      <Card title="Last 7 days" className="mt-6">
        <div className="flex items-end gap-2" style={{ height: 90 }}>
          {d.last7Days.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-[2px] bg-ink/80"
                style={{
                  height: `${Math.round((day.revenuePaise / peak) * 70) + 2}px`,
                }}
                title={`${day.date} · ${formatPaise(day.revenuePaise)} · ${day.orders} orders`}
              />
              <span className="text-[9px] text-ink-3 tabular-nums">
                {day.date.slice(8)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <section className="mt-6 border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-[10.5px] font-medium tracking-[0.14em] text-ink-3 uppercase">
            Latest activity
          </h2>
          <Link
            href="/admin/notifications"
            className="text-[10px] tracking-[0.1em] text-ink-3 uppercase hover:text-ink"
          >
            All →
          </Link>
        </div>
        <NotificationList rows={activity.latest.slice(0, 8)} mode="page" />
      </section>

      <Card
        title="Fulfilment queue"
        className="mt-6"
        action={
          <Link
            href="/admin/orders?status=confirmed"
            className="text-[10px] tracking-[0.1em] text-ink-3 uppercase hover:text-ink"
          >
            All orders →
          </Link>
        }
      >
        {d.fulfilmentQueue.length === 0 ? (
          <EmptyState icon="check">Nothing waiting to ship.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {d.fulfilmentQueue.map((o) => (
              <li key={o.orderNumber}>
                <Link
                  href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-[12.5px] hover:text-ink"
                >
                  <span className="font-medium tabular-nums text-ink">
                    {o.orderNumber}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-ink-2">
                    {o.customerName}
                  </span>
                  <StatusBadge status={o.status} />
                  <span className="tabular-nums text-ink">
                    {formatPaise(o.grandTotalPaise)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

import Link from "next/link";

import { requireAdminRole } from "@/server/auth/admin";
import { listOrders } from "@/server/admin";
import { PageHeader, Card, EmptyState, StatusBadge, PaymentBadge } from "@/components/admin/ui";
import { OrdersFilters } from "@/components/admin/orders/orders-filters";
import { formatPaise } from "@/lib/money";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/validation/commerce";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders · Studio" };

function relTime(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminRole("support");
  const sp = await searchParams;

  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const statusRaw = one(sp.status);
  const methodRaw = one(sp.method);
  const status = (ORDER_STATUSES as readonly string[]).includes(statusRaw ?? "")
    ? (statusRaw as OrderStatus)
    : "all";
  const method = (PAYMENT_METHODS as readonly string[]).includes(methodRaw ?? "")
    ? (methodRaw as PaymentMethod)
    : "all";
  const q = one(sp.q)?.trim() ?? "";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const list = await listOrders({ status, method, q, page });

  return (
    <>
      <PageHeader eyebrow="Studio" title="Orders">
        {list.total} order{list.total === 1 ? "" : "s"}
      </PageHeader>

      <OrdersFilters status={status} method={method} q={q} />

      <Card className="mt-4 !p-0">
        {list.rows.length === 0 ? (
          <EmptyState icon="search">No orders match this view.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-[10px] tracking-[0.1em] text-ink-3 uppercase">
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Placed</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Payment</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.rows.map((o) => (
                  <tr key={o.orderNumber} className="hover:bg-surface-2/60">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
                        className="font-medium tabular-nums text-ink hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-ink">{o.customerName}</span>
                      <span className="block text-[11px] text-ink-3 tabular-nums">
                        {o.customerPhone}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-2">{relTime(o.placedAt)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-ink-2 uppercase">{o.method}</span>{" "}
                      <PaymentBadge status={o.paymentStatus} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink">
                      {formatPaise(o.grandTotalPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {list.pages > 1 && (
        <Pagination page={list.page} pages={list.pages} sp={sp} />
      )}
    </>
  );
}

function Pagination({
  page,
  pages,
  sp,
}: {
  page: number;
  pages: number;
  sp: Record<string, string | string[] | undefined>;
}) {
  const build = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "page" || v == null) continue;
      params.set(k, Array.isArray(v) ? (v[0] ?? "") : v);
    }
    params.set("page", String(p));
    return `/admin/orders?${params.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-[11.5px] text-ink-2">
      <span className="tabular-nums">
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={build(page - 1)}
            className="rounded-[3px] border border-line-2 px-2.5 py-1 hover:border-ink hover:text-ink"
          >
            Previous
          </Link>
        )}
        {page < pages && (
          <Link
            href={build(page + 1)}
            className="rounded-[3px] border border-line-2 px-2.5 py-1 hover:border-ink hover:text-ink"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminRole } from "@/server/auth/admin";
import { getOrderForAdmin } from "@/server/admin";
import { PageHeader, Card, StatusBadge, PaymentBadge, Detail } from "@/components/admin/ui";
import { OrderStatusForm } from "@/components/admin/orders/status-form";
import { OrderNotes } from "@/components/admin/orders/notes";
import { RefundPanel } from "@/components/admin/orders/refund-panel";
import { CancelButton } from "@/components/admin/orders/cancel-button";
import { Icon } from "@/components/ui/icon";
import { formatPaise } from "@/lib/money";
import { roleRankFor } from "@/server/auth/admin";

export const dynamic = "force-dynamic";

const IST = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const fmt = (iso: string | null) => (iso ? IST.format(new Date(iso)) : "—");

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const ctx = await requireAdminRole("support");
  const { orderNumber } = await params;
  const order = await getOrderForAdmin(decodeURIComponent(orderNumber));
  if (!order) notFound();

  const canFulfil = roleRankFor(ctx.user.role) >= roleRankFor("operations");
  const canRefund = roleRankFor(ctx.user.role) >= roleRankFor("admin");

  const p = order.pricing;
  const priceRow = (label: string, paise: number, opts?: { neg?: boolean; strong?: boolean }) =>
    paise !== 0 || opts?.strong ? (
      <div
        className={`flex justify-between py-1 text-[12.5px] ${
          opts?.strong ? "border-t border-line pt-2 text-ink" : "text-ink-2"
        }`}
      >
        <span>{label}</span>
        <span className="tabular-nums">
          {opts?.neg ? "− " : ""}
          {formatPaise(Math.abs(paise))}
        </span>
      </div>
    ) : null;

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-3 inline-flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
      >
        <Icon name="arrowLeft" className="size-3.5" />
        Orders
      </Link>

      <PageHeader
        eyebrow={fmt(order.placedAt)}
        title={order.orderNumber}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <PaymentBadge status={order.payment.status} />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ── left column ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Card title="Items">
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.sku} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden border border-line bg-surface-2">
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Icon name="box" className="size-4 text-ink-3" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink">
                      {it.name}
                    </span>
                    <span className="block text-[11px] text-ink-3 tabular-nums">
                      {it.sku} · {formatPaise(it.unitPricePaise)} × {it.qty}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12.5px] tabular-nums text-ink">
                    {formatPaise(it.lineTotalPaise)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3">
              {priceRow("Items subtotal", p.itemsSubtotalPaise)}
              {priceRow("Discount", -p.discountPaise, { neg: true })}
              {priceRow("Store credit", -p.creditAppliedPaise, { neg: true })}
              {priceRow("Delivery", p.shippingPaise)}
              {priceRow("COD fee", p.codFeePaise)}
              {p.gst.totalPaise > 0 && priceRow("GST", p.gst.totalPaise)}
              {priceRow("Total", p.grandTotalPaise, { strong: true })}
              {order.payment.refundedPaise > 0 &&
                priceRow("Refunded", -order.payment.refundedPaise, { neg: true })}
            </div>
          </Card>

          <Card title="Timeline">
            <ol className="flex flex-col gap-2.5">
              {order.timeline
                .slice()
                .reverse()
                .map((t, i) => (
                  <li key={i} className="flex gap-3 text-[12px]">
                    <span className="w-28 shrink-0 text-ink-3 tabular-nums">
                      {fmt(t.at)}
                    </span>
                    <span className="min-w-0">
                      <span className="text-ink">
                        {t.note ?? t.status}
                      </span>
                      <span className="ml-1.5 text-[10px] tracking-[0.08em] text-ink-3 uppercase">
                        {t.actorName ?? t.actor}
                      </span>
                    </span>
                  </li>
                ))}
            </ol>
          </Card>

          <Card title="Payments & refunds">
            {order.payments.length === 0 ? (
              <p className="text-[12px] text-ink-3">No payment events recorded.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-[12px]">
                {order.payments.map((pay, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span className="text-ink">
                      {pay.event}
                      <span className="ml-1.5 text-[10px] tracking-[0.06em] text-ink-3 uppercase">
                        {pay.source}
                        {pay.signatureVerified ? " · verified" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-ink-2 tabular-nums">
                      {formatPaise(pay.amountPaise)} · {fmt(pay.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <OrderNotes orderNumber={order.orderNumber} notes={order.internalNotes} />
        </div>

        {/* ── right column ────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <Card title="Customer">
            <Detail label="Name">{order.contact.name}</Detail>
            <Detail label="Phone">{order.contact.phone}</Detail>
            <Detail label="Email">{order.contact.email}</Detail>
            {order.customer && (
              <>
                <Detail label="Account role">{order.customer.role}</Detail>
                <Detail label="Orders">{order.customer.orderCount}</Detail>
              </>
            )}
          </Card>

          <Card title="Ship to">
            <p className="text-[12.5px] leading-relaxed text-ink-2">
              <span className="text-ink">{order.shippingAddress.name}</span>
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
              <br />
              {order.shippingAddress.landmark && (
                <>
                  {order.shippingAddress.landmark}
                  <br />
                </>
              )}
              {order.shippingAddress.city}, {order.shippingAddress.state} —{" "}
              {order.shippingAddress.pincode}
              <br />
              {order.shippingAddress.phone}
            </p>
          </Card>

          <Card title="Payment">
            <Detail label="Method">{order.method.toUpperCase()}</Detail>
            <Detail label="Status">{order.payment.status}</Detail>
            {order.payment.instrument && (
              <Detail label="Instrument">
                {order.payment.instrument}
                {order.payment.upiVpa ? ` · ${order.payment.upiVpa}` : ""}
                {order.payment.last4 ? ` · ${order.payment.last4}` : ""}
              </Detail>
            )}
            {order.payment.providerPaymentId && (
              <Detail label="Payment id">
                <span className="text-[11px] tabular-nums">
                  {order.payment.providerPaymentId}
                </span>
              </Detail>
            )}
            {order.payment.capturedAt && (
              <Detail label="Captured">{fmt(order.payment.capturedAt)}</Detail>
            )}
          </Card>

          {order.fulfilment.carrier || order.fulfilment.trackingNumber ? (
            <Card title="Shipment">
              <Detail label="Carrier">{order.fulfilment.carrier ?? "—"}</Detail>
              <Detail label="Tracking">
                {order.fulfilment.trackingNumber ?? "—"}
              </Detail>
              {order.fulfilment.shippedAt && (
                <Detail label="Shipped">{fmt(order.fulfilment.shippedAt)}</Detail>
              )}
              {order.fulfilment.deliveredAt && (
                <Detail label="Delivered">
                  {fmt(order.fulfilment.deliveredAt)}
                </Detail>
              )}
            </Card>
          ) : null}

          {order.customerNote && (
            <Card title="Customer note">
              <p className="text-[12.5px] text-ink-2">{order.customerNote}</p>
            </Card>
          )}

          {canFulfil && (
            <OrderStatusForm
              orderNumber={order.orderNumber}
              status={order.status}
              allowed={order.allowedTransitions}
            />
          )}

          {canRefund && order.method === "razorpay" && (
            <RefundPanel
              orderNumber={order.orderNumber}
              remainingPaise={p.grandTotalPaise - order.payment.refundedPaise}
              paymentStatus={order.payment.status}
            />
          )}

          {canRefund && order.method === "cod" && (
            <CancelButton orderNumber={order.orderNumber} status={order.status} />
          )}
        </div>
      </div>
    </>
  );
}

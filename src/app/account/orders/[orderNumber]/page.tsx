import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { pageMeta } from "@/lib/seo";
import { formatPaise } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/checkout";
import { StatusPill } from "@/components/account/status-pill";
import { requireUser } from "@/server/auth";
import { getUserOrder } from "@/server/data/orders";

export const metadata = pageMeta({
  title: "Order",
  description: "Your THE RARESKIN order.",
  path: "/account/orders",
  noindex: true,
});

export const dynamic = "force-dynamic";

const P = (rupees: number) => formatPaise(Math.round(rupees * 100));
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default async function OrderDetailPage({
  params,
}: PageProps<"/account/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const { user } = await requireUser(`/account/orders/${orderNumber}`);
  const order = await getUserOrder(user.id, decodeURIComponent(orderNumber));
  if (!order) notFound();

  const a = order.shippingAddress;
  const g = order.pricing.gst;

  return (
    <main
      id="main"
      className="ui-surface min-h-svh pt-[calc(var(--announce-h)+var(--header-h)+clamp(2rem,6vw,4rem))] pb-24"
    >
      <Container className="max-w-[760px]">
        <p className="eyebrow mb-3">
          <Link href="/account/orders" className="hover:text-ink">
            Orders
          </Link>{" "}
          / {order.orderNumber}
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-[clamp(1.6rem,3.6vw,2.2rem)] leading-[1.1] tracking-[-0.01em]">
            {order.orderNumber}
          </h1>
          <span className="flex items-center gap-2">
            <StatusPill status={order.status} />
            {order.paymentStatus === "pending" && (
              <span className="text-[10.5px] font-medium tracking-[0.1em] text-ink-3 uppercase">
                Payment pending
              </span>
            )}
          </span>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
          <section className="bg-surface p-5">
            <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
              Delivery address
            </h2>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
              <span className="text-ink">{a.name}</span>
              <br />
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.landmark ? (
                <>
                  {a.landmark}
                  <br />
                </>
              ) : null}
              {a.city}, {a.state} — {a.pincode}
              <br />
              {a.phone}
            </p>
          </section>
          <section className="bg-surface p-5">
            <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
              Payment
            </h2>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
              {order.method === "cod"
                ? "Cash on delivery"
                : "Card · UPI · Netbanking"}
              <br />
              <span className="text-ink-3">Status: {order.paymentStatus}</span>
            </p>
          </section>
        </div>

        <div className="mt-6 border border-line bg-surface">
          <ul className="divide-y divide-line/70">
            {order.items.map((i) => (
              <li
                key={i.sku}
                className="flex items-baseline justify-between px-5 py-3.5 text-[13.5px]"
              >
                <span className="text-ink">
                  {i.name} <span className="text-ink-3">× {i.qty}</span>
                  <span className="mt-0.5 block text-[10.5px] text-ink-3">
                    {i.sku} · {P(i.unitPrice)} each
                  </span>
                </span>
                <span className="tabular-nums text-ink">{P(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-line px-5 py-4 text-[12.5px]">
            <Row label="Subtotal" value={P(order.pricing.itemsSubtotal)} />
            {order.pricing.discount > 0 && (
              <Row
                label={
                  order.coupon
                    ? `Discount · ${order.coupon.code}`
                    : "Discount"
                }
                value={`− ${P(order.pricing.discount)}`}
              />
            )}
            {order.pricing.creditApplied > 0 && (
              <Row
                label="Store credit"
                value={`− ${P(order.pricing.creditApplied)}`}
              />
            )}
            <Row
              label="Shipping"
              value={
                order.pricing.shipping === 0
                  ? "Free"
                  : P(order.pricing.shipping)
              }
            />
            {order.pricing.codFee > 0 && (
              <Row label="COD fee" value={P(order.pricing.codFee)} />
            )}
            <div className="!mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <span className="text-[11px] tracking-[0.16em] text-ink-3 uppercase">
                Total
              </span>
              <span className="serif text-[1.4rem] tabular-nums text-ink">
                {P(order.pricing.grandTotal)}
              </span>
            </div>
            <p className="!mt-2 text-[11.5px] leading-relaxed text-ink-3">
              Inclusive of {g.ratePercent}% GST
              {g.igst > 0
                ? ` — IGST ${P(g.igst)}`
                : ` — CGST ${P(g.cgst)} + SGST ${P(g.sgst)}`}
              . Taxable value {P(order.pricing.taxableValue)}. HSN 33030090.
            </p>
          </dl>
        </div>

        <section className="mt-8">
          <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
            Timeline
          </h2>
          <ol className="mt-3 space-y-3 border-l border-line pl-4">
            {order.timeline.map((t, i) => (
              <li key={i} className="text-[12.5px]">
                <span className="text-ink">{ORDER_STATUS_LABEL[t.status]}</span>
                <span className="mx-2 text-ink-3">·</span>
                <span className="text-ink-3">{fmt(t.at)}</span>
                {t.note && (
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">
                    {t.note}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>

        {order.customerNote && (
          <p className="mt-6 text-[12px] text-ink-3">
            Your note: <span className="text-ink-2">{order.customerNote}</span>
          </p>
        )}
      </Container>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}

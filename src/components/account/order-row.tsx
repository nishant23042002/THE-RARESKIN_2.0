import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { formatPaise } from "@/lib/money";
import type { OrderSummary } from "@/server/data/orders";
import { StatusPill } from "./status-pill";
import { OrderThumb } from "./order-thumb";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function Title({ order }: { order: OrderSummary }) {
  return (
    <>
      {order.firstItemName}
      {order.lineCount > 1 ? (
        <span className="text-ink-3"> + {order.lineCount - 1} more</span>
      ) : null}
    </>
  );
}

/**
 * One order in a list — a full-width link into the order's summary. Two
 * purpose-built layouts: on phones the metadata stacks under the name and the
 * status + total share a baseline row (nothing competes for width); from `sm`
 * up it's a single row with the ordered pieces as overlapped packshots and an
 * explicit "View ›" affordance.
 */
export function OrderRow({ order }: { order: OrderSummary }) {
  const price = formatPaise(Math.round(order.grandTotal * 100));
  const meta = `${order.orderNumber} · ${fmtDate(order.placedAt)}`;
  const lead = order.thumbs[0];

  return (
    <Link
      href={`/account/orders/${order.orderNumber}`}
      className="group block py-4 transition-colors hover:bg-surface"
    >
      {/* ── phone: stacked ─────────────────────────────────────────── */}
      <div className="flex gap-3 sm:hidden">
        <OrderThumb
          slug={lead?.slug ?? ""}
          image={lead?.image ?? null}
          isFragrance={lead?.isFragrance ?? true}
          alt={lead?.name ?? ""}
          className="size-12 shrink-0 rounded-[3px]"
          flaconClass="w-4"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] tracking-[0.02em] text-ink">
            <Title order={order} />
          </p>
          <p className="mt-1 text-[11.5px] text-ink-3">{meta}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <StatusPill status={order.status} />
            <span className="text-[13px] font-medium tabular-nums text-ink">
              {price}
            </span>
          </div>
        </div>
      </div>

      {/* ── sm and up: one row ─────────────────────────────────────── */}
      <div className="hidden items-center gap-4 sm:flex">
        <span className="flex shrink-0 -space-x-3">
          {order.thumbs.map((t, i) => (
            <OrderThumb
              key={`${t.slug}-${i}`}
              slug={t.slug}
              image={t.image}
              isFragrance={t.isFragrance}
              alt={t.name}
              className="size-11 rounded-[3px] ring-2 ring-bg"
              flaconClass="w-4"
            />
          ))}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] tracking-[0.02em] text-ink">
            <Title order={order} />
          </span>
          <span className="mt-0.5 block text-[11.5px] text-ink-3">{meta}</span>
        </span>

        <span className="shrink-0 text-[13px] tabular-nums text-ink">{price}</span>
        <StatusPill status={order.status} />

        <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium tracking-[0.12em] text-ink-3 uppercase transition-colors group-hover:text-ink">
          View
          <Icon name="chevron" className="size-2.5" />
        </span>
      </div>
    </Link>
  );
}

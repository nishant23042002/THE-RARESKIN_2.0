import Link from "next/link";

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

/**
 * One order in a list — a full-width link into the order's summary, with the
 * ordered pieces shown as overlapped packshots and an explicit "View ›"
 * affordance so it's unmistakably a way through, not just a label.
 */
export function OrderRow({ order }: { order: OrderSummary }) {
  return (
    <Link
      href={`/account/orders/${order.orderNumber}`}
      className="group flex items-center gap-3.5 py-4 transition-colors hover:bg-surface sm:gap-4"
    >
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
          {order.firstItemName}
          {order.lineCount > 1 ? (
            <span className="text-ink-3"> + {order.lineCount - 1} more</span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[11.5px] text-ink-3">
          {order.orderNumber} · {fmtDate(order.placedAt)}
        </span>
      </span>

      <span className="shrink-0 text-[13px] tabular-nums text-ink">
        {formatPaise(Math.round(order.grandTotal * 100))}
      </span>
      <StatusPill status={order.status} className="hidden sm:inline-block" />

      <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium tracking-[0.12em] text-ink-3 uppercase transition-colors group-hover:text-ink">
        <span className="hidden sm:inline">View</span>
        <svg viewBox="0 0 8 12" className="w-[7px]" aria-hidden>
          <path
            d="M1.5 1 L6.5 6 L1.5 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}

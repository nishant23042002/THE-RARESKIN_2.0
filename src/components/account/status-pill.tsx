import { ORDER_STATUS_LABEL } from "@/lib/checkout";
import type { OrderStatus } from "@/lib/validation/commerce";
import { cn } from "@/lib/cn";

/** Order status as a small hairline pill, coloured by where the order stands. */
const TONE: Record<OrderStatus, string> = {
  pending: "border-line-2 text-ink-3",
  confirmed: "border-gilt/50 text-[#8f6118]",
  processing: "border-gilt/50 text-[#8f6118]",
  shipped: "border-ink text-ink",
  delivered: "border-ok/50 text-ok",
  cancelled: "border-error/40 text-error",
  returned: "border-error/40 text-error",
  refunded: "border-line-2 text-ink-3",
};

export function StatusPill({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full border px-2.5 py-1 text-[9.5px] font-medium tracking-[0.1em] uppercase",
        TONE[status],
        className,
      )}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

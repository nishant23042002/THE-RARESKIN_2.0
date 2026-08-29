import { cn } from "@/lib/cn";
import type { OrderStatus } from "@/lib/validation/commerce";

/**
 * Where an order sits in its journey — a five-stop rail that fills with the
 * house tri-fragrance gradient (the same one on the checkout drawer's progress
 * bar, so the two read as one system). Terminal states (cancelled / returned /
 * refunded) collapse to a single explanatory line instead of a broken rail.
 */

const FLOW: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Prepared" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

const TRI_JUICE =
  "linear-gradient(90deg, #e0d7bf 0%, #c5872f 52%, #3d2712 100%)";

export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "returned" || status === "refunded") {
    return (
      <div className="border border-error/30 bg-error/[0.04] px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">
        This order was{" "}
        <span className="font-medium text-error">
          {status === "cancelled"
            ? "cancelled"
            : status === "returned"
              ? "returned"
              : "refunded"}
        </span>
        .{" "}
        {status === "refunded"
          ? "Any payment has been returned to its source."
          : status === "returned"
            ? "We’ve received it back."
            : "Nothing further is due — the hold has been released."}
      </div>
    );
  }

  const found = FLOW.findIndex((s) => s.key === status);
  const active = found < 0 ? 0 : found;

  return (
    <div className="pt-1.5">
      <div className="relative">
        <div className="absolute top-[5px] right-[5px] left-[5px] h-[2px] -translate-y-1/2 bg-line-2" />
        <div
          className="absolute top-[5px] left-[5px] h-[2px] -translate-y-1/2 transition-[width] duration-700 ease-out"
          style={{
            width: `calc((100% - 10px) * ${active} / ${FLOW.length - 1})`,
            backgroundImage: TRI_JUICE,
          }}
        />
        <ol className="relative flex justify-between">
          {FLOW.map((s, i) => (
            <li key={s.key} className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  "size-[10px] rounded-full border-2 transition-colors",
                  i < active && "border-transparent bg-ink",
                  i === active && "border-ink bg-surface",
                  i > active && "border-line-2 bg-surface",
                )}
              />
              <span
                className={cn(
                  "text-[8.5px] font-medium tracking-[0.1em] uppercase",
                  i <= active ? "text-ink" : "text-ink-3/55",
                )}
              >
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

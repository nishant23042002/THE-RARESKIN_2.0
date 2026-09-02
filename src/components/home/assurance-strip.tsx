import { Container } from "@/components/ui/container";
import { Icon, type IconName } from "@/components/ui/icon";
import { Stars } from "@/components/ui/stars";

/**
 * The reassurance a first-time visitor needs, right after the hero — the trust
 * bar that until now only lived in the cart drawer and the menu. Kept in the
 * house voice: one hairline band, tiny uppercase labels, the tri-juice rule.
 *
 * Left: how the order works. Right: the proof — the live review average and the
 * launch saving. Both halves collapse to a stacked, centred column on a phone.
 */

const PROMISES: { icon: IconName; label: string }[] = [
  { icon: "truck", label: "Free shipping across India" },
  { icon: "banknote", label: "Cash on delivery" },
  { icon: "returns", label: "7-day returns" },
  { icon: "lock", label: "Secured by Razorpay" },
];

export function AssuranceStrip({
  rating,
  savePercent,
}: {
  /** site-wide review average + count; null when reviews are off or none exist */
  rating: { average: number; count: number } | null;
  /** launch price vs list, e.g. 33 */
  savePercent: number;
}) {
  return (
    <section
      aria-label="Why shop with us"
      className="border-y border-line bg-surface"
    >
      <span
        aria-hidden
        className="block h-[2px] w-full"
        style={{
          backgroundImage:
            "linear-gradient(90deg,#e0d7bf 0%,#c5872f 52%,#3d2712 100%)",
        }}
      />
      <Container className="flex flex-col items-center gap-x-10 gap-y-3.5 py-4 text-center lg:flex-row lg:justify-between lg:text-left">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {PROMISES.map((p) => (
            <li
              key={p.label}
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.1em] text-ink-2 uppercase"
            >
              <Icon name={p.icon} className="size-[15px] text-ink-3" />
              {p.label}
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {rating && rating.count > 0 && (
            <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.1em] text-ink-2 uppercase">
              <Stars value={rating.average} starClassName="size-3.5" />
              <span className="tabular-nums text-ink">
                {rating.average.toFixed(1)}
              </span>
              from {rating.count} verified{" "}
              {rating.count === 1 ? "review" : "reviews"}
            </span>
          )}
          {savePercent > 0 && (
            <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.1em] text-ink-2 uppercase">
              <span className="text-gilt">&minus;{savePercent}%</span>
              at launch
            </span>
          )}
        </div>
      </Container>
    </section>
  );
}

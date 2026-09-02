import { Container } from "@/components/ui/container";
import { Icon, type IconName } from "@/components/ui/icon";
import { Stars } from "@/components/ui/stars";

/**
 * The reassurance a first-time visitor needs, right after the hero — the trust
 * bar that until now only lived in the cart drawer and the menu. Kept in the
 * house voice: one hairline band, tiny uppercase labels, the tri-juice rule.
 *
 * On a phone the four promises sit as a clean 2×2 block (never a ragged wrap);
 * from `sm` up they run as one row; from `lg` the proof (review average + launch
 * saving) moves out to the right.
 */

const PROMISES: { icon: IconName; label: string }[] = [
  { icon: "truck", label: "Free shipping" },
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
      <Container className="flex flex-col items-center gap-x-10 gap-y-4 py-4 lg:flex-row lg:justify-between">
        <ul className="mx-auto grid w-fit grid-cols-2 gap-x-6 gap-y-2.5 sm:mx-0 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-6 lg:justify-start">
          {PROMISES.map((p) => (
            <li
              key={p.label}
              className="inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.08em] whitespace-nowrap text-ink-2 uppercase sm:gap-2 sm:text-[10px] sm:tracking-[0.1em]"
            >
              <Icon
                name={p.icon}
                className="size-[13px] shrink-0 text-ink-3 sm:size-[15px]"
              />
              {p.label}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:shrink-0 sm:gap-x-5">
          {rating && rating.count > 0 && (
            <span className="inline-flex items-center gap-2 text-[9.5px] tracking-[0.08em] text-ink-2 uppercase sm:text-[10px] sm:tracking-[0.1em]">
              <Stars value={rating.average} starClassName="size-3 sm:size-3.5" />
              <span className="tabular-nums text-ink">
                {rating.average.toFixed(1)}
              </span>
              <span className="hidden sm:inline">
                from {rating.count} verified{" "}
                {rating.count === 1 ? "review" : "reviews"}
              </span>
              <span className="sm:hidden">&middot; {rating.count}</span>
            </span>
          )}
          {savePercent > 0 && (
            <span className="inline-flex items-center gap-2 text-[9.5px] tracking-[0.08em] text-ink-2 uppercase sm:text-[10px] sm:tracking-[0.1em]">
              <span className="text-gilt">&minus;{savePercent}%</span>
              at launch
            </span>
          )}
        </div>
      </Container>
    </section>
  );
}

import { cn } from "@/lib/cn";

/**
 * The house star. One shared glyph for the PDP summary, review cards, the
 * homepage block and the account "your reviews" list — and, filled on
 * interaction, the review form's rating picker.
 */
export function Star({
  filled,
  className,
}: {
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={cn("h-4 w-4", className)}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.2}
      aria-hidden
    >
      <path d="M10 1.6l2.55 5.17 5.7.83-4.12 4.02.97 5.68L10 14.6l-5.1 2.5.97-5.68L1.75 7.6l5.7-.83z" />
    </svg>
  );
}

/**
 * A static 5-star row. `value` is rounded to the nearest whole star for the
 * fill; the precise number lives next to it as text where it matters.
 */
export function Stars({
  value = 0,
  className,
  starClassName,
}: {
  value?: number;
  className?: string;
  starClassName?: string;
}) {
  const rounded = Math.round(value);
  return (
    <span
      className={cn("inline-flex gap-0.5 text-gilt", className)}
      role="img"
      aria-label={`${value.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= rounded} className={starClassName} />
      ))}
    </span>
  );
}

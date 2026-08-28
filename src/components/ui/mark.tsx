import { cn } from "@/lib/cn";

/**
 * The crossbar-less "A" — the brand's recurring device. `currentColor` stroke,
 * so colour comes from the parent.
 */
export function Mark({
  className,
  strokeWidth = 1.4,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 12 8"
      fill="none"
      aria-hidden
      className={cn("block", className)}
    >
      <path
        d="M1 7 L6 1.4 L11 7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

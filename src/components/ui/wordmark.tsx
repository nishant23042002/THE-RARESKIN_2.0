import { cn } from "@/lib/cn";

/**
 * "THE RARESKIN" stacked lockup — a stand-in for the final logo SVG. The parent
 * sets the base font-size; the two lines scale from it (0.44em / 1em) exactly
 * as in the prototype's `.wordmark`.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex flex-col items-center font-normal leading-none text-ink",
        className,
      )}
    >
      <span className="mb-[0.42em] pl-[0.52em] text-[0.44em] tracking-[0.52em]">
        THE
      </span>
      <span className="pl-[0.34em] text-[1em] tracking-[0.34em]">RARESKIN</span>
    </span>
  );
}

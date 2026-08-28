import { cn } from "@/lib/cn";

/**
 * Minimal two-rule menu icon (`currentColor`). The lower rule is short and
 * grows to full width on hover — put it inside a `group` to get that.
 */
export function MenuIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("relative block h-[7px] w-[19px]", className)}
    >
      <span className="absolute inset-x-0 top-0 h-[1.5px] bg-current" />
      <span className="absolute bottom-0 left-0 h-[1.5px] w-[58%] bg-current transition-[width] duration-300 ease-[var(--ease-nav)] group-hover:w-full" />
    </span>
  );
}

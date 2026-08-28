"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type AccordionItem = { q: string; a: ReactNode };

/**
 * One panel open at a time. Height animates via `grid-template-rows: 0fr -> 1fr`
 * (no <details>, whose UA `display:none` snaps it open). The + turns to ×.
 * The full answer is always in the DOM, so crawlers see it regardless of state.
 */
export function Accordion({
  items,
  className,
}: {
  items: AccordionItem[];
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();

  return (
    <div className={className}>
      {items.map((it, i) => {
        const isOpen = open === i;
        const panelId = `${baseId}-${i}`;
        return (
          <div key={it.q} className="border-b border-line">
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-5 py-[clamp(14px,2vw,18px)] text-left text-[13.5px] leading-[1.4]"
              >
                <span>{it.q}</span>
                <span
                  aria-hidden
                  className={cn(
                    "relative mt-0.5 block size-3 shrink-0 transition-transform duration-300 ease-[var(--ease-out-strong)] motion-reduce:transition-none",
                    isOpen && "rotate-45",
                  )}
                >
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink" />
                  <span
                    className={cn(
                      "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink transition-opacity duration-300 motion-reduce:transition-none",
                      isOpen && "opacity-0",
                    )}
                  />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              className={cn(
                "grid transition-[grid-template-rows] duration-[380ms] ease-[var(--ease-out-strong)] motion-reduce:transition-none",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="max-w-[64ch] pb-[clamp(14px,2vw,18px)] text-[13.5px] leading-[1.8] text-ink-2 [&_a:hover]:text-ink [&_a]:underline [&_a]:decoration-line-2 [&_a]:underline-offset-2">
                  {typeof it.a === "string" ? <p>{it.a}</p> : it.a}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

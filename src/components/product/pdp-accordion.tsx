"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

type Item = { q: string; a: string };

/**
 * PDP "Details" — one panel open at a time. Height animates via the
 * `grid-template-rows: 0fr -> 1fr` technique on a plain element (no <details>,
 * whose UA `display:none` is what made it snap open). The + turns to ×.
 */
export function PdpAccordion({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();

  return (
    <div>
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
                className="flex w-full items-center justify-between gap-4 py-[15px] text-left text-[12px] tracking-[0.06em] uppercase"
              >
                {it.q}
                <span
                  aria-hidden
                  className={cn(
                    "relative block size-3 shrink-0 transition-transform duration-300 ease-[var(--ease-out-strong)] motion-reduce:transition-none",
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
                <p className="max-w-[52ch] pb-4 text-[13px] leading-[1.7] text-ink-2">
                  {it.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

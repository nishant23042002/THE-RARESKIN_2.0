"use client";

import { useEffect, useState } from "react";
import { Flacon } from "@/components/ui/flacon";
import { Mark } from "@/components/ui/mark";
import { useCart } from "@/components/providers/cart-provider";
import { useScrolled } from "@/hooks/use-scrolled";
import { formatINR, isFragranceSlug } from "@/lib/products";
import { cn } from "@/lib/cn";

/**
 * Site-wide sticky bag bar. Hidden at the top of every page and whenever the bag
 * is empty; slides up from the bottom once the reader scrolls, and tucks away
 * again over the footer so it never sits on the legal line. Tapping it opens the
 * drawer.
 */
export function CartBar() {
  const { lines, count, subtotal, hydrated, isOpen, openCart } = useCart();
  const scrolled = useScrolled(64);
  const [overFooter, setOverFooter] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver(
      ([entry]) => setOverFooter(entry.isIntersecting),
      { rootMargin: "0px 0px -24% 0px" },
    );
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  const visible =
    hydrated && count > 0 && scrolled && !isOpen && !overFooter;

  const flacons = lines.slice(0, 3);
  const items = `${count} ${count === 1 ? "item" : "items"}`;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 w-[calc(100vw+var(--sbw,0px))] border-t border-line bg-w0/92 backdrop-blur-md transition-transform duration-[450ms] ease-[var(--ease-out-strong)] motion-reduce:transition-none",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      aria-hidden={!visible}
    >
      <button
        type="button"
        onClick={openCart}
        // the bar is inert when hidden so it never traps a tab stop
        tabIndex={visible ? 0 : -1}
        aria-label={`View bag — ${items}, ${formatINR(subtotal)}`}
        className="mx-auto flex w-full max-w-[1280px] items-center gap-3.5 px-5 py-3 text-left sm:px-14 xl:px-[92px]"
      >
        <span className="flex shrink-0 items-center">
          {flacons.map((l, i) => (
            <span
              key={l.sku}
              className={cn(
                "grid size-9 place-items-center rounded-full border border-line bg-surface",
                i > 0 && "-ml-3",
              )}
              style={{ zIndex: flacons.length - i }}
            >
              {l.fragrance && isFragranceSlug(l.fragrance) ? (
                <Flacon fragrance={l.fragrance} className="w-3.5" />
              ) : (
                <Mark className="w-3 text-ink-3" />
              )}
            </span>
          ))}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[11px] tracking-[0.14em] text-ink-2 uppercase">
            In your bag &middot; {items}
          </span>
          <span className="block text-[13px] text-ink">
            {formatINR(subtotal)}{" "}
            <span className="text-[10.5px] text-ink-3">
              &mdash; shipping at checkout
            </span>
          </span>
        </span>

        <span className="inline-flex shrink-0 items-center gap-2 rounded-[2px] bg-cta px-4 py-2.5 text-[10.5px] tracking-[0.14em] text-w0 uppercase">
          View bag <span aria-hidden>&rarr;</span>
        </span>
      </button>
    </div>
  );
}

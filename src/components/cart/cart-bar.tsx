"use client";

import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { Mark } from "@/components/ui/mark";
import { Flacon } from "@/components/ui/flacon";
import { useCart } from "@/components/providers/cart-provider";
import { useScrolled } from "@/hooks/use-scrolled";
import { cloudinaryVariant, formatINR, isFragranceSlug } from "@/lib/catalog";
import { cn } from "@/lib/cn";

/**
 * Site-wide sticky bag bar. Hidden at the top of every page and whenever the bag
 * is empty; slides up from the bottom once the reader scrolls, and tucks away
 * again over the footer so it never sits on the legal line. Tapping it opens the
 * drawer.
 *
 * Dark on purpose — a warm-black bar reads against every page ground and pulls
 * the eye without shouting. The RARESKIN wordmark anchors the left (a quiet
 * brand mark at the foot of every scroll); a small overlapped stack of the
 * chosen products sits next to the total, so the bar shows *what* is waiting.
 */
const MAX_THUMBS = 3;

export function CartBar() {
  const { lines, count, subtotal, hydrated, isOpen, openCart, suggestions } =
    useCart();
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

  // packshot by sku, from the catalogue snapshot the provider already holds
  const imageBySku = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const s of suggestions) m.set(s.sku, s.image ?? null);
    return m;
  }, [suggestions]);

  const visible = hydrated && count > 0 && scrolled && !isOpen && !overFooter;
  const items = `${count} ${count === 1 ? "item" : "items"}`;

  const thumbs = lines.slice(0, MAX_THUMBS);
  const extra = lines.length - thumbs.length;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 w-[calc(100vw+var(--sbw,0px))] bg-w4 text-w0 transition-transform duration-[450ms] ease-[var(--ease-out-strong)] motion-reduce:transition-none",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      aria-hidden={!visible}
    >
      {/* the tri-juice hairline pulls the eye to the bar as it rises */}
      <span
        aria-hidden
        className="block h-[2px] w-full"
        style={{
          backgroundImage:
            "linear-gradient(90deg,#e0d7bf 0%,#c5872f 52%,#3d2712 100%)",
        }}
      />
      <button
        type="button"
        onClick={openCart}
        tabIndex={visible ? 0 : -1}
        aria-label={`View bag — ${items}, ${formatINR(subtotal)}`}
        className="group mx-auto flex w-full max-w-[1280px] items-center gap-2.5 px-4 py-3 text-left sm:gap-4 sm:px-14 sm:py-3.5 xl:px-[92px]"
      >
        <span className="hidden shrink-0 items-center gap-4 sm:flex">
          <Logo className="text-w0/90" style={{ width: "108px" }} />
          <span aria-hidden className="h-6 w-px bg-w0/20" />
        </span>

        {/* product stack — the 3rd thumb only from sm up so 320px stays calm */}
        <span className="flex shrink-0 items-center">
          {thumbs.map((l, i) => {
            const url = cloudinaryVariant(imageBySku.get(l.sku) ?? undefined, {
              w: 96,
              h: 96,
              fill: true,
            });
            return (
              <span
                key={l.sku}
                className={cn(
                  "grid size-7 place-items-center overflow-hidden rounded-[3px] bg-w0 ring-1 ring-w4 sm:size-8",
                  i > 0 && "-ml-2.5",
                  i === 2 && "hidden sm:grid",
                )}
                style={{ zIndex: MAX_THUMBS - i }}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                ) : l.fragrance && isFragranceSlug(l.fragrance) ? (
                  <Flacon fragrance={l.fragrance} className="w-3 sm:w-3.5" />
                ) : (
                  <Mark className="w-2.5 text-ink-3 sm:w-3" />
                )}
              </span>
            );
          })}
          {lines.length > 2 && (
            <span className="-ml-2.5 grid size-7 place-items-center rounded-[3px] bg-w0/10 text-[9px] font-medium text-w0/80 ring-1 ring-w4 tabular-nums sm:hidden">
              +{lines.length - 2}
            </span>
          )}
          {extra > 0 && (
            <span className="-ml-2.5 hidden size-8 place-items-center rounded-[3px] bg-w0/10 text-[10px] font-medium text-w0/80 ring-1 ring-w4 tabular-nums sm:grid">
              +{extra}
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[10px] tracking-[0.16em] text-w0/60 uppercase">
            <span className="sm:hidden">Bag &middot; {count}</span>
            <span className="hidden sm:inline">In your bag &middot; {items}</span>
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-w0 sm:text-[14px]">
            {formatINR(subtotal)}
            <span className="hidden text-[10.5px] text-w0/50 sm:inline">
              {" "}
              &mdash; shipping at checkout
            </span>
          </span>
        </span>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[2px] bg-w0 px-3 py-2.5 text-[10px] tracking-[0.12em] text-ink uppercase transition-colors group-hover:bg-w1 sm:gap-2 sm:px-4 sm:tracking-[0.16em]">
          <span className="sm:hidden">View</span>
          <span className="hidden sm:inline">View bag</span>
          <span aria-hidden>&rarr;</span>
        </span>
      </button>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

import { Flacon } from "@/components/ui/flacon";
import { Mark } from "@/components/ui/mark";
import { Icon } from "@/components/ui/icon";
import { useCart } from "@/components/providers/cart-provider";
import { FRAGRANCE_PALETTE, formatINR } from "@/lib/catalog";

/**
 * "Complete the collection" — the rest of the range as one-tap cards, so the
 * bag is never a dead end. A snap-scroll strip; each card fades itself off when
 * it's added and the strip closes the gap. The image well is a 4:5 portrait,
 * sized for a real packshot — it shows the vector flacon until one is uploaded.
 */
export function BagSuggestions({
  heading = "Complete the collection",
  className,
}: {
  heading?: string;
  className?: string;
}) {
  const { suggestions, lines, addItem } = useCart();
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const inBag = useMemo(() => new Set(lines.map((l) => l.sku)), [lines]);
  const show = suggestions.filter((s) => !inBag.has(s.sku));

  if (show.length === 0) {
    if (lines.length === 0 || suggestions.length === 0) return null;
    return (
      <p
        className={`${className ?? ""} px-6 text-[10px] tracking-[0.14em] text-ink-3 uppercase`}
      >
        You have the whole range in your bag.
      </p>
    );
  }

  return (
    <section className={className}>
      <div className="flex items-baseline justify-between px-6">
        <h3 className="text-[9.5px] font-medium tracking-[0.18em] text-ink-3 uppercase">
          {heading}
        </h3>
        {lines.length > 0 && (
          <span className="text-[9.5px] tabular-nums text-ink-3/70">
            {show.length} to go
          </span>
        )}
      </div>

      <div className="no-scrollbar -mb-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-1">
        {show.map((s) => {
          const f = s.fragrance ? FRAGRANCE_PALETTE[s.fragrance] : null;
          const juice = f?.juice ?? "#8a8074";
          const save = Math.max(0, s.mrp - s.price);
          const added = justAdded === s.sku;

          return (
            <article
              key={s.sku}
              className="flex w-[152px] shrink-0 snap-start flex-col overflow-hidden rounded-[4px] border border-line bg-bg/50 transition-opacity duration-300"
              style={added ? { opacity: 0 } : undefined}
            >
              <div
                className="relative aspect-[4/5] w-full overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(158deg, ${juice}26, ${juice}0c 45%, transparent 78%)`,
                }}
              >
                {s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.image}
                    alt={s.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center">
                    {f ? (
                      <span className="block w-9">
                        <Flacon fragrance={s.fragrance!} />
                      </span>
                    ) : (
                      <Mark className="w-6 text-ink-3" />
                    )}
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col px-3 pt-2.5 pb-3">
                <p className="text-[11px] tracking-[0.08em] text-ink">{s.name}</p>
                <p className="mt-0.5 text-[8px] tracking-[0.1em] text-ink-3 uppercase">
                  {s.meta}
                </p>

                <div className="mt-auto flex items-end justify-between pt-3">
                  <span className="leading-none">
                    <span className="text-[11px] tabular-nums text-ink">
                      {formatINR(s.price)}
                    </span>
                    {save > 0 && (
                      <span className="ml-1 text-[8.5px] tabular-nums text-ink-3 line-through">
                        {formatINR(s.mrp)}
                      </span>
                    )}
                  </span>

                  <button
                    type="button"
                    aria-label={`Add ${s.name} to bag`}
                    onClick={() => {
                      setJustAdded(s.sku);
                      window.setTimeout(() => {
                        addItem({
                          sku: s.sku,
                          name: s.name,
                          price: s.price,
                          mrp: s.mrp,
                          fragrance: s.fragrance,
                          href: s.href,
                          meta: s.meta,
                        });
                        setJustAdded(null);
                      }, 260);
                    }}
                    className="grid size-[26px] shrink-0 place-items-center rounded-full border border-ink text-ink transition-colors hover:bg-ink hover:text-bg"
                  >
                    <Icon name="plus" className="size-3" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

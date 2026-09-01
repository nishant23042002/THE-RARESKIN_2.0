"use client";

import { useRef, useState } from "react";
import { Flacon } from "@/components/ui/flacon";
import { Mark } from "@/components/ui/mark";
import { Icon } from "@/components/ui/icon";
import { gsap } from "@/lib/gsap";
import { useCart } from "@/components/providers/cart-provider";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { FRAGRANCE_PALETTE, formatINR } from "@/lib/catalog";
import type { CartLine } from "@/lib/cart";

/**
 * A chosen scent, sitting in the bag like an object on a shelf: the fragrance's
 * juice colour washes the card from the flacon outward, the bottle stands
 * unboxed and casts a shadow tinted to its own liquid, the name is set in
 * display size. The Discovery Set gets a three-juice wash and the ∧ mark.
 */
export function CartLineRow({ line }: { line: CartLine }) {
  const { setQty, removeItem } = useCart();
  const reduced = useReducedMotion();
  const rowRef = useRef<HTMLLIElement>(null);
  const [leaving, setLeaving] = useState(false);

  const f = line.fragrance ? FRAGRANCE_PALETTE[line.fragrance] : null;
  const juice = f?.juice ?? "#8a8074";

  const wash = f
    ? `linear-gradient(102deg, ${juice}33, ${juice}14 42%, transparent 76%)`
    : `linear-gradient(102deg, #a89a7c2e, #bc862f1c 34%, #6a463014 54%, transparent 80%)`;

  function remove() {
    if (leaving) return;
    const el = rowRef.current;
    if (reduced || !el) {
      removeItem(line.sku);
      return;
    }
    setLeaving(true);
    gsap.to(el, {
      opacity: 0,
      height: 0,
      duration: 0.34,
      ease: "power2.inOut",
      onComplete: () => removeItem(line.sku),
    });
  }

  return (
    <li
      ref={rowRef}
      data-cart-line
      className="overflow-hidden border-b border-line/70"
      style={{ backgroundImage: wash }}
    >
      <div className="grid grid-cols-[46px_1fr_auto] items-start gap-4 px-6 py-5">
        <div
          className="pt-0.5"
          style={{ filter: `drop-shadow(0 6px 9px ${juice}4d)` }}
        >
          {f ? (
            <Flacon fragrance={line.fragrance!} className="w-full" />
          ) : (
            <span className="grid aspect-[1/1.4] w-full place-items-center">
              <Mark className="w-5 text-ink-3" />
            </span>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[1.05rem] tracking-[0.14em] text-ink">{line.name}</p>
          {line.meta && (
            <p className="mt-1 text-[9px] tracking-[0.16em] text-ink-3 uppercase">
              {line.meta}
            </p>
          )}

          <div className="mt-3.5 inline-flex items-center rounded-full border border-line-2/80 text-ink-2">
            <button
              type="button"
              onClick={() => setQty(line.sku, line.qty - 1)}
              disabled={line.qty <= 1}
              aria-label={`Decrease ${line.name} quantity`}
              className="grid size-7 place-items-center transition-colors hover:text-ink disabled:opacity-25"
            >
              <Icon name="minus" className="size-3" />
            </button>
            <span className="min-w-[16px] text-center text-[12px] tabular-nums text-ink">
              {line.qty}
            </span>
            <button
              type="button"
              onClick={() => setQty(line.sku, line.qty + 1)}
              aria-label={`Increase ${line.name} quantity`}
              className="grid size-7 place-items-center transition-colors hover:text-ink"
            >
              <Icon name="plus" className="size-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={remove}
            className="mt-3 block text-[9px] tracking-[0.12em] text-ink-3/80 uppercase underline-offset-2 hover:text-ink hover:underline"
          >
            Remove
          </button>
        </div>

        <div className="pt-0.5 text-right">
          <p className="text-[13px] tabular-nums text-ink">
            {formatINR(line.price * line.qty)}
          </p>
          {line.mrp && (
            <p className="mt-0.5 text-[10px] tabular-nums text-ink-3 line-through">
              {formatINR(line.mrp * line.qty)}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

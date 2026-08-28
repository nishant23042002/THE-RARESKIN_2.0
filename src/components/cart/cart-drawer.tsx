"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { gsap } from "@/lib/gsap";
import { useCart } from "@/components/providers/cart-provider";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { formatINR } from "@/lib/products";
import { commerce } from "@/lib/commerce";
import { CartLineRow } from "./cart-line";

/**
 * Right-anchored bag drawer. Native <dialog> + showModal() for the focus trap /
 * ESC. The panel and scrim are parked off-screen by CSS (`.drawer-panel` /
 * `.drawer-scrim`) from the very first paint, so there is no frame where they
 * sit at rest before JS runs — no flash. Fresh GSAP tweens run on each open /
 * close; `killTweensOf` keeps rapid toggles interruptible. `overflow-hidden` on
 * the dialog clips the parked panel so it never widens the document.
 */
export function CartDrawer() {
  const { isOpen, closeCart, lines, count, subtotal, hydrated } = useCart();
  const reduced = useReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) lenis?.stop();
    else lenis?.start();
  }, [isOpen, lenis]);

  useEffect(() => {
    const dlg = dialogRef.current;
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!dlg || !panel || !scrim) return;

    if (isOpen) {
      if (!dlg.open) dlg.showModal();
      document.body.classList.add("is-locked");

      // hand GSAP a clean model of the parked state (x:0 clears any pixel
      // offset the browser baked into the matrix from the CSS `%` park).
      gsap.set(panel, { xPercent: 101, x: 0 });
      gsap.set(scrim, { autoAlpha: 0 });

      if (reduced) {
        gsap.set(panel, { xPercent: 0 });
        gsap.set(scrim, { autoAlpha: 1 });
        return;
      }

      gsap.to(scrim, { autoAlpha: 1, duration: 0.5, ease: "power1.out" });
      gsap.to(panel, {
        xPercent: 0,
        duration: 0.62,
        ease: "power4.out",
        overwrite: "auto",
      });

      const rows = panel.querySelectorAll<HTMLElement>("[data-cart-line]");
      if (rows.length) {
        gsap.fromTo(
          rows,
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.06,
            ease: "power2.out",
            delay: 0.22,
          },
        );
      }
      return;
    }

    if (!dlg.open) return;

    const finish = () => {
      dlg.close();
      document.body.classList.remove("is-locked");
      setCheckoutMsg(null);
    };

    if (reduced) {
      gsap.set(panel, { xPercent: 101, x: 0 });
      gsap.set(scrim, { autoAlpha: 0 });
      finish();
      return;
    }

    gsap.to(scrim, { autoAlpha: 0, duration: 0.32, ease: "power1.in" });
    gsap.to(panel, {
      xPercent: 101,
      x: 0,
      duration: 0.42,
      ease: "power3.in",
      overwrite: "auto",
      onComplete: finish,
    });
  }, [isOpen, reduced]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      closeCart();
    };
    dlg.addEventListener("cancel", onCancel);
    return () => dlg.removeEventListener("cancel", onCancel);
  }, [closeCart]);

  async function checkout() {
    const res = await commerce.startCheckout(lines);
    if (res.kind === "redirect") window.location.href = res.url;
    else setCheckoutMsg("Checkout opens at launch. Your bag is saved.");
  }

  const filled = hydrated && lines.length > 0;

  return (
    <dialog
      ref={dialogRef}
      aria-label="The bag"
      className="fixed inset-0 m-0 h-dvh max-h-none w-[calc(100vw+var(--sbw,0px))] max-w-none overflow-hidden border-0 bg-transparent p-0 backdrop:bg-transparent"
    >
      <div
        ref={scrimRef}
        onClick={closeCart}
        aria-hidden
        className="drawer-scrim absolute inset-0 bg-ink/35"
      />
      <aside
        ref={panelRef}
        className="drawer-panel absolute inset-y-0 right-0 flex w-[min(422px,92vw)] flex-col border-l border-line bg-surface text-ink will-change-transform"
      >
        <header className="flex items-center justify-between border-b border-line px-6 pt-6 pb-4">
          <span className="inline-flex items-center gap-2.5">
            <Mark className="w-3 text-ink" />
            <span className="text-[10.5px] tracking-[0.2em] uppercase">
              The Bag
            </span>
            {count > 0 && (
              <span className="text-[10.5px] tabular-nums text-ink-3">
                &middot; {count}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={closeCart}
            className="text-[9.5px] tracking-[0.14em] text-ink-3 uppercase hover:text-ink"
          >
            Close
          </button>
        </header>

        <div
          data-lenis-prevent
          className="flex flex-1 flex-col overflow-y-auto overscroll-contain"
        >
          {!hydrated ? null : filled ? (
            <ul>
              {lines.map((line) => (
                <CartLineRow key={line.sku} line={line} />
              ))}
            </ul>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <Mark className="mb-6 w-6 text-ink-3" />
              <p className="serif-italic text-[1.4rem] leading-snug text-ink-2">
                Nothing chosen yet.
              </p>
              <p className="mt-3 max-w-[26ch] text-[11px] leading-relaxed text-ink-3">
                Three extraits and the Discovery Set. The whole range.
              </p>
            </div>
          )}
        </div>

        {filled && (
          <footer className="border-t border-line px-6 pt-5 pb-[calc(24px+env(safe-area-inset-bottom))]">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] tracking-[0.16em] text-ink-3 uppercase">
                Subtotal
              </span>
              <span className="serif text-[1.5rem] tabular-nums text-ink">
                {formatINR(subtotal)}
              </span>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-ink-3">
              Shipping and taxes calculated at checkout.
            </p>
            {checkoutMsg ? (
              <p className="mt-5 border-t border-line pt-4 text-center text-[10.5px] leading-relaxed tracking-[0.03em] text-ink-2">
                {checkoutMsg}
              </p>
            ) : (
              <Button onClick={checkout} className="mt-5 w-full">
                Checkout
              </Button>
            )}
          </footer>
        )}
      </aside>
    </dialog>
  );
}

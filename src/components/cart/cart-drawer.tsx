"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";

import { gsap } from "@/lib/gsap";
import { useCart } from "@/components/providers/cart-provider";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { Logo } from "@/components/ui/logo";
import { formatINR } from "@/lib/catalog";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { CartLineRow } from "./cart-line";
import { CheckoutPanel } from "./checkout-panel";

const VIEW_INDEX = { bag: 0, checkout: 1, done: 2 } as const;
const STEPS = ["Bag", "Details", "Placed"] as const;
const TRI_JUICE =
  "linear-gradient(90deg, #e0d7bf 0%, #c5872f 52%, #3d2712 100%)";

/**
 * "The Counter" — one right-anchored panel that slides between three views:
 * the bag, the checkout, and the confirmation. A perfumer's counter where the
 * order is assembled, wrapped, and handed over without you ever leaving the
 * page. Native <dialog> + showModal() for the focus trap / ESC; the panel and
 * scrim are parked off-screen by CSS from first paint (no flash); GSAP only
 * paints, with setTimeout safety nets so a throttled rAF degrades to "no
 * animation" rather than "stuck".
 */
export function CartDrawer() {
  const {
    isOpen,
    view,
    closeCart,
    backToBag,
    goToCheckout,
    lines,
    count,
    subtotal,
    hydrated,
    placedOrder,
  } = useCart();
  const reduced = useReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();

  const index = VIEW_INDEX[view];

  useEffect(() => {
    if (isOpen) lenis?.stop();
    else lenis?.start();
  }, [isOpen, lenis]);

  // open / close
  useEffect(() => {
    const dlg = dialogRef.current;
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!dlg || !panel || !scrim) return;

    if (isOpen) {
      if (!dlg.open) dlg.showModal();
      lockScroll("cart");

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
      // safety net: if the ticker is throttled (background tab / hidden pane)
      // force the resting visible state so the panel is never stuck off-canvas
      const openSafety = window.setTimeout(() => {
        gsap.set(panel, { xPercent: 0, x: 0 });
        gsap.set(scrim, { autoAlpha: 1 });
      }, 900);

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
      return () => window.clearTimeout(openSafety);
    }

    if (!dlg.open) return;

    const finish = () => {
      dlg.close();
      unlockScroll("cart");
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
    const safety = window.setTimeout(finish, 700);
    return () => window.clearTimeout(safety);
  }, [isOpen, reduced]);

  // slide between views
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const to = -index * (100 / 3);
    if (reduced) {
      gsap.set(track, { xPercent: to });
      return;
    }
    gsap.to(track, {
      xPercent: to,
      duration: 0.5,
      ease: "power4.out",
      overwrite: "auto",
    });
    const safety = window.setTimeout(() => {
      gsap.set(track, { xPercent: to });
    }, 620);
    return () => window.clearTimeout(safety);
  }, [index, reduced]);

  // ESC → animated close; also re-sync state if the dialog was closed from
  // outside (e.g. the route transition force-closes open dialogs).
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      closeCart();
    };
    const onClose = () => {
      unlockScroll("cart");
      if (isOpen) closeCart();
    };
    dlg.addEventListener("cancel", onCancel);
    dlg.addEventListener("close", onClose);
    return () => {
      dlg.removeEventListener("cancel", onCancel);
      dlg.removeEventListener("close", onClose);
    };
  }, [closeCart, isOpen]);

  const filled = hydrated && lines.length > 0;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Your bag and checkout"
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
        className="drawer-panel ui-surface absolute inset-y-0 right-0 flex w-[min(468px,94vw)] flex-col border-l border-line bg-surface text-ink will-change-transform"
      >
        {/* ── header ─────────────────────────────────────────────── */}
        <header className="shrink-0 border-b border-line px-6 pt-5 pb-3.5">
          <div className="flex items-center justify-between">
            {view === "checkout" ? (
              <button
                type="button"
                onClick={backToBag}
                className="-ml-1 inline-flex items-center gap-1.5 px-1 py-0.5 text-[10px] tracking-[0.14em] text-ink-2 uppercase transition-colors hover:text-ink"
              >
                <svg viewBox="0 0 12 12" className="w-2.5" aria-hidden>
                  <path
                    d="M7.5 1.5 L3 6 L7.5 10.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Bag
              </button>
            ) : (
              <span className="inline-flex items-center gap-2.5">
                <Mark className="w-3 text-ink" />
                <span className="text-[10.5px] tracking-[0.2em] uppercase">
                  {view === "done"
                    ? placedOrder?.orderNumber ?? "Order placed"
                    : "The Bag"}
                </span>
                {view === "bag" && count > 0 && (
                  <span className="text-[10.5px] tabular-nums text-ink-3">
                    &middot; {count}
                  </span>
                )}
              </span>
            )}
            <button
              type="button"
              onClick={closeCart}
              aria-label="Close"
              className="-mr-1 p-1.5 text-ink-3 transition-colors hover:text-ink"
            >
              <svg viewBox="0 0 16 16" className="w-3" aria-hidden>
                <path
                  d="M2 2 L14 14 M14 2 L2 14"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* progress rail */}
          <div className="mt-3.5">
            <div className="relative h-px bg-line-2">
              <span
                className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-[var(--ease-out-strong)]"
                style={{
                  width: `${(index / (STEPS.length - 1)) * 100}%`,
                  backgroundImage: TRI_JUICE,
                }}
              />
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className="absolute top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: `${(i / (STEPS.length - 1)) * 100}%`,
                    background:
                      i <= index ? "var(--color-ink)" : "var(--color-line-2)",
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[8.5px] tracking-[0.14em] uppercase">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={
                    i === index
                      ? "text-ink"
                      : i < index
                        ? "text-ink-3"
                        : "text-ink-3/55"
                  }
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* ── filmstrip ──────────────────────────────────────────── */}
        <div className="relative flex-1 overflow-hidden">
          <div ref={trackRef} className="flex h-full w-[300%]">
            {/* slide: bag */}
            <div className="flex h-full w-1/3 flex-col">
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
                <footer className="shrink-0 border-t border-line px-6 pt-5 pb-[calc(22px+env(safe-area-inset-bottom))]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9.5px] tracking-[0.16em] text-ink-3 uppercase">
                      Subtotal
                    </span>
                    <span className="serif text-[1.5rem] tabular-nums text-ink">
                      {formatINR(subtotal)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-ink-3">
                    Shipping is free. GST shown at the next step.
                  </p>
                  <Button onClick={goToCheckout} className="mt-4 w-full">
                    Proceed to checkout
                  </Button>
                </footer>
              )}
            </div>

            {/* slide: checkout */}
            <div className="flex h-full w-1/3 flex-col">
              {(isOpen || view === "checkout") && <CheckoutPanel />}
            </div>

            {/* slide: confirmation */}
            <div className="flex h-full w-1/3 flex-col">
              <Confirmation
                order={placedOrder}
                onClose={closeCart}
              />
            </div>
          </div>
        </div>
      </aside>
    </dialog>
  );
}

function Confirmation({
  order,
  onClose,
}: {
  order: { orderNumber: string; method: "razorpay" | "cod" } | null;
  onClose: () => void;
}) {
  if (!order) return <div className="flex-1" />;
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span className="relative mb-6 inline-flex size-14 items-center justify-center rounded-full border border-line-2">
          <span
            aria-hidden
            className="absolute inset-x-4 -bottom-px h-[2px]"
            style={{ backgroundImage: TRI_JUICE }}
          />
          <svg viewBox="0 0 20 20" className="w-6 text-ink" fill="none" aria-hidden>
            <path
              d="M4 10.5 L8.5 15 L16 5.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="eyebrow mb-2 text-ok">Order placed</p>
        <h3 className="serif text-[1.7rem] leading-tight tracking-[-0.01em] text-ink">
          {order.orderNumber}
        </h3>
        <p className="mx-auto mt-3 max-w-[30ch] text-[12.5px] leading-relaxed text-ink-2">
          {order.method === "cod"
            ? "You’ll pay the courier in cash on arrival. We’ll confirm dispatch by SMS."
            : "Held as unpaid for now — online payment goes live shortly and our team will be in touch. A receipt is on its way to your email."}
        </p>
        <Logo
          className="mt-8 text-ink-3"
          style={{ width: "96px", opacity: 0.5 }}
        />
      </div>
      <footer className="shrink-0 space-y-2.5 border-t border-line px-6 pt-4 pb-[calc(22px+env(safe-area-inset-bottom))]">
        <Button
          href={`/account/orders/${order.orderNumber}`}
          onClick={onClose}
          className="w-full"
        >
          View order
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-[10px] tracking-[0.16em] text-ink-3 uppercase transition-colors hover:text-ink"
        >
          Keep shopping
        </button>
      </footer>
    </>
  );
}

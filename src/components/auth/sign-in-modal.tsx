"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";

import { gsap } from "@/lib/gsap";
import { Logo } from "@/components/ui/logo";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useRouteTransition } from "@/components/providers/route-transition";
import { useCart } from "@/components/providers/cart-provider";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { SignInForm } from "./sign-in-form";

/**
 * THE RARESKIN sign-in — a modal, not a page.
 *
 * A dark "crown" carries the real wordmark and a plain heading; its lower edge
 * is the three-fragrance hairline (aurévan cream → orvélis gold → vayrén dark),
 * the house signature. Below, the phone → one-time-code form sits on paper.
 * Centred card from 640px up, a bottom sheet below it. On success the modal
 * hands straight off to the page transition ("The Aperture"), which carries you
 * to your account.
 */
export function SignInModal({
  open,
  next,
  authError = null,
  onClose,
}: {
  open: boolean;
  next: string;
  authError?: string | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Studio (staff) sign-in is a different message from the shopper sign-in — the
  // guard bounced them here as `?next=/admin…`, and a new phone number here
  // makes a *customer*, not staff, so the "registered automatically" copy would
  // mislead. `next` is already `safeNextPath`-sanitised (same-origin path).
  const isStudio = next.startsWith("/admin");
  const reduced = useReducedMotion();
  const lenis = useLenis();
  const { navigate } = useRouteTransition();
  const { isOpen: cartOpen, view: cartView } = useCart();

  const isSheet = () =>
    typeof window !== "undefined" &&
    !window.matchMedia("(min-width: 640px)").matches;

  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
  }, [open, lenis]);

  useEffect(() => {
    const dlg = dialogRef.current;
    const scrim = scrimRef.current;
    const panel = panelRef.current;
    if (!dlg || !scrim || !panel) return;

    // Resting (visible) state — the panel is never left invisible if the
    // timeline can't tick (rAF throttled in a background tab).
    const shown = () => {
      gsap.set([dlg, scrim], { autoAlpha: 1 });
      gsap.set(panel, { autoAlpha: 1, y: 0, scale: 1, yPercent: 0 });
    };

    if (open) {
      if (!dlg.open) dlg.showModal();
      lockScroll("signin");
      gsap.killTweensOf([dlg, scrim, panel]);
      gsap.set(dlg, { autoAlpha: 1 });

      if (reduced) {
        shown();
        return;
      }

      const sheet = isSheet();
      gsap.set(scrim, { autoAlpha: 0 });
      gsap.set(
        panel,
        sheet
          ? { autoAlpha: 1, yPercent: 100, y: 0, scale: 1 }
          : { autoAlpha: 0, yPercent: 0, y: 14, scale: 0.985 },
      );

      const tl = gsap.timeline();
      tl.to(scrim, { autoAlpha: 1, duration: 0.3, ease: "power2.out" }, 0);
      tl.to(
        panel,
        sheet
          ? { yPercent: 0, duration: 0.55, ease: "power4.out" }
          : { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" },
        0.04,
      );

      const safety = window.setTimeout(() => {
        if (tl.progress() < 1) shown();
      }, 1000);
      return () => {
        window.clearTimeout(safety);
        tl.kill();
      };
    }

    if (!dlg.open) {
      unlockScroll("signin");
      return;
    }

    const finish = () => {
      dlg.close();
      unlockScroll("signin");
    };

    if (reduced) {
      finish();
      return;
    }

    const sheet = isSheet();
    gsap.killTweensOf([scrim, panel]);
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(
      panel,
      sheet
        ? { yPercent: 100, duration: 0.32, ease: "power3.in" }
        : { autoAlpha: 0, y: 10, scale: 0.985, duration: 0.26, ease: "power2.in" },
      0,
    );
    tl.to(scrim, { autoAlpha: 0, duration: 0.28, ease: "power1.in" }, 0.02);

    const safety = window.setTimeout(() => {
      if (tl.progress() < 1) {
        tl.kill();
        finish();
      }
    }, 700);
    return () => window.clearTimeout(safety);
  }, [open, reduced]);

  // animate out on native ESC instead of a hard close
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dlg.addEventListener("cancel", onCancel);
    return () => dlg.removeEventListener("cancel", onCancel);
  }, [onClose]);

  function handleAuthenticated() {
    unlockScroll("signin");
    onClose();
    // If sign-in was triggered from inside the checkout drawer, that panel is
    // still open underneath — let it resume rather than navigating away.
    if (cartOpen && cartView === "checkout") return;
    // Otherwise hand straight to the page transition — the curtain closes over
    // the modal, holds on the wordmark, and carries the user to `next`.
    navigate(next);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Sign in"
      className="signin-dialog m-0 max-h-none max-w-none border-0 bg-transparent p-0 text-ink backdrop:bg-transparent"
      style={{ width: "100vw", height: "100dvh" }}
    >
      <div
        ref={scrimRef}
        onClick={onClose}
        className="fixed inset-0 bg-ink/45 backdrop-blur-[2px]"
      />

      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <div
          ref={panelRef}
          className="signin-panel relative w-full overflow-hidden rounded-t-[20px] bg-bg shadow-[0_-30px_80px_-24px_rgba(20,16,12,0.4)] will-change-transform sm:w-[92vw] sm:max-w-[440px] sm:rounded-[12px] sm:shadow-[0_40px_120px_-30px_rgba(20,16,12,0.5)]"
        >
          {/* crown */}
          <div className="relative bg-w4 px-6 pt-6 pb-7 text-w0 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <Logo
                className="mt-0.5 text-w0"
                style={{ width: "clamp(120px, 34vw, 148px)" }}
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mt-1 -mr-1 p-2 text-w0/55 transition-colors hover:text-w0"
              >
                <svg viewBox="0 0 16 16" className="w-3.5" aria-hidden>
                  <path
                    d="M2 2 L14 14 M14 2 L2 14"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {isStudio && (
              <p className="mt-6 text-[10px] font-medium tracking-[0.22em] text-w0/55 uppercase">
                Studio · Staff access
              </p>
            )}
            <h2
              className={`serif text-[clamp(1.5rem,4.6vw,1.85rem)] leading-[1.14] tracking-[-0.01em] ${
                isStudio ? "mt-1.5" : "mt-7"
              }`}
            >
              {isStudio ? "Sign in to Studio" : "Sign in to your account"}
            </h2>

            <span
              aria-hidden
              className="signin-juice absolute inset-x-0 bottom-0 h-[2px]"
            />
          </div>

          {/* body */}
          <div className="px-6 py-7 sm:px-8">
            <SignInForm
              onAuthenticated={handleAuthenticated}
              next={next}
              authError={authError}
              variant={isStudio ? "studio" : "store"}
            />
          </div>

          <div className="border-t border-line px-6 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))] text-[10.5px] leading-[1.6] tracking-[0.02em] text-ink-3 sm:px-8 sm:pb-5">
            {isStudio && (
              <p className="mb-2 border-b border-line pb-3 text-[11px] tracking-[0.02em] text-ink-2">
                Studio is for staff accounts.{" "}
                <button
                  type="button"
                  onClick={onClose}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Back to the store
                </button>
              </p>
            )}
            By continuing, you agree to THE RARESKIN&rsquo;s{" "}
            <a
              href="/terms"
              className="underline underline-offset-2 hover:text-ink"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="underline underline-offset-2 hover:text-ink"
            >
              Privacy Policy
            </a>
            .
          </div>
        </div>
      </div>
    </dialog>
  );
}

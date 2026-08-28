"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Logo } from "@/components/ui/logo";
import { fragranceList } from "@/lib/products";

const MORE_LINKS = [
  { label: "Why Extrait", href: "/#why" },
  { label: "The Idea", href: "/#idea" },
  { label: "Shipping & Returns", href: "/shipping" },
  { label: "Contact", href: "/contact" },
];

/**
 * Full-screen overlay nav opened by the header's "Index" button (every
 * breakpoint). Native <dialog> + showModal() gives the focus trap, ESC and
 * inert background; a single paused GSAP timeline plays / reverses so open and
 * close stay interruptible.
 */
export function SiteMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const reduced = useReducedMotion();
  const lenis = useLenis();

  // build the timeline once, panel parked off-screen
  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;
      const items = panel.querySelectorAll<HTMLElement>("[data-stagger]");

      gsap.set(panel, { yPercent: -101 });
      gsap.set(items, { opacity: 0, y: 14 });

      const tl = gsap.timeline({ paused: true });
      tl.to(panel, { yPercent: 0, duration: 0.7, ease: "power4.out" });
      tl.to(
        items,
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.055, ease: "power3.out" },
        "-=0.42",
      );
      tlRef.current = tl;
    },
    { scope: dialogRef },
  );

  // drive open / close
  useEffect(() => {
    const dlg = dialogRef.current;
    const tl = tlRef.current;
    if (!dlg || !tl) return;

    if (open) {
      if (!dlg.open) dlg.showModal();
      document.body.classList.add("is-locked");
      lenis?.stop();
      if (reduced) {
        tl.progress(1).pause();
        return;
      }
      tl.timeScale(1).play();
      return;
    }

    if (!dlg.open) return;

    const finish = () => {
      dlg.close();
      document.body.classList.remove("is-locked");
      lenis?.start();
    };

    // nothing to animate back (reduced motion, or closed before the open
    // animation ever advanced) — just shut it.
    if (reduced || tl.time() === 0) {
      tl.pause(0);
      finish();
      return;
    }

    tl.timeScale(1.7);
    tl.eventCallback("onReverseComplete", finish);
    tl.reverse();

    // safety net: never leave the overlay stuck open if the callback misfires
    const guard = window.setTimeout(finish, 700);
    return () => window.clearTimeout(guard);
  }, [open, reduced, lenis]);

  // animate out on native ESC / backdrop cancel instead of snapping shut
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

  return (
    <dialog
      ref={dialogRef}
      aria-label="Menu"
      className="m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      <div
        ref={panelRef}
        className="flex h-full flex-col bg-bg px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] will-change-transform"
      >
        <div className="mb-11 flex items-center justify-between">
          <Logo className="w-[132px] text-ink" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-[2px] border border-ink px-3.5 py-[9px] text-[10px] uppercase tracking-[0.14em] transition-colors hover:bg-ink hover:text-w0"
          >
            Close
          </button>
        </div>

        <p className="mb-3.5 text-[9px] uppercase tracking-[0.2em] text-ink-3">
          The Three
        </p>
        {fragranceList.map((f) => (
          <Link
            key={f.slug}
            href={`/fragrances/${f.slug}`}
            onClick={onClose}
            data-stagger
            className="flex items-center gap-3.5 border-b border-line py-3"
            style={{ "--dot": f.accent } as CSSProperties}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: "var(--dot)" }}
            />
            <span className="text-[2rem] font-light tracking-[0.04em]">
              {f.name}
            </span>
          </Link>
        ))}
        <Link
          href="/discovery-set"
          onClick={onClose}
          data-stagger
          className="flex items-center gap-3.5 border-b border-line py-3"
        >
          <span className="size-2 rounded-full bg-w3" />
          <span className="text-[2rem] font-light tracking-[0.04em]">
            The Set
          </span>
        </Link>

        <p className="mt-8 mb-3.5 text-[9px] uppercase tracking-[0.2em] text-ink-3">
          More
        </p>
        {MORE_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onClose}
            data-stagger
            className="py-2 text-[13px] uppercase tracking-[0.08em] text-ink-2 transition-colors hover:text-ink"
          >
            {l.label}
          </Link>
        ))}

        <p className="mt-auto pt-8 text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
          Cash on delivery &middot; Ships across India
        </p>
      </div>
    </dialog>
  );
}

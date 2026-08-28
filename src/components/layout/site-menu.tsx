"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { gsap } from "@/lib/gsap";
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
 * Full-screen overlay nav opened by the header's menu button (every breakpoint).
 * Native <dialog> + showModal() gives the focus trap, ESC and inert background.
 * The panel is parked off-screen by CSS (`.menu-panel`) from first paint so it
 * can never flash at rest; fresh GSAP tweens run on each open / close, with
 * `killTweensOf` keeping rapid toggles interruptible.
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
  const reduced = useReducedMotion();
  const lenis = useLenis();

  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
  }, [open, lenis]);

  useEffect(() => {
    const dlg = dialogRef.current;
    const panel = panelRef.current;
    if (!dlg || !panel) return;
    const items = panel.querySelectorAll<HTMLElement>("[data-stagger]");

    if (open) {
      if (!dlg.open) dlg.showModal();
      document.body.classList.add("is-locked");

      // hand GSAP a clean model of the parked state (`y:0` clears the pixel
      // offset the browser baked into the matrix from the CSS `%` park).
      gsap.set(panel, { yPercent: -101, y: 0 });

      if (reduced) {
        gsap.set(panel, { yPercent: 0 });
        gsap.set(items, { autoAlpha: 1, y: 0 });
        return;
      }

      gsap.to(panel, {
        yPercent: 0,
        duration: 0.7,
        ease: "power4.out",
        overwrite: "auto",
      });
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.055,
          ease: "power3.out",
          delay: 0.12,
        },
      );
      return;
    }

    if (!dlg.open) return;

    const finish = () => {
      dlg.close();
      document.body.classList.remove("is-locked");
    };

    if (reduced) {
      gsap.set(panel, { yPercent: -101, y: 0 });
      finish();
      return;
    }

    gsap.to(panel, {
      yPercent: -101,
      y: 0,
      duration: 0.45,
      ease: "power3.in",
      overwrite: "auto",
      onComplete: finish,
    });
  }, [open, reduced]);

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
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      <div
        ref={panelRef}
        className="menu-panel flex h-full flex-col bg-bg px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] will-change-transform"
      >
        <div className="mb-11 flex items-center justify-between">
          <Logo className="w-[clamp(112px,32vw,132px)] text-ink" />
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

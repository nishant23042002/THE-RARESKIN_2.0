"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useScrolled } from "@/hooks/use-scrolled";

/**
 * Rotating promo bar. One line, changes every ~4.2s with a short blur-lifted
 * fade; pauses on hover and while the tab is hidden. Collapses to nothing once
 * the visitor scrolls, and does not return — a first-impression element, not a
 * permanent fixture (matches the "Campaign" prototype).
 */

const ROTATE_MS = 4200;

// Kept short so they hold one line down to ~360px; `truncate` is the backstop.
const MESSAGES: ReactNode[] = [
  <>
    <b className="font-normal">Launch offer</b>
    <span className="mx-2 text-gilt">₹799</span>
    <s className="opacity-65">₹1,199</s>
  </>,
  <>Free shipping across India</>,
  <>Cash on delivery available</>,
  <>
    <b className="font-normal">Discovery Set</b>
    <span className="ml-2">all three for ₹799</span>
  </>,
  <>Extrait de Parfum. Nothing lighter.</>,
];

export function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const scrolled = useScrolled();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden || pausedRef.current) return;
      setIndex((i) => (i + 1) % MESSAGES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  // incoming message
  useGSAP(
    () => {
      const el = msgRef.current;
      if (!el) return;
      if (reduced) {
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.18 });
        return;
      }
      gsap.fromTo(
        el,
        { opacity: 0, yPercent: 55, filter: "blur(3px)" },
        {
          opacity: 1,
          yPercent: 0,
          filter: "blur(0px)",
          duration: 0.34,
          ease: "power2.out",
        },
      );
    },
    { dependencies: [index, reduced], scope: barRef },
  );

  // collapse once scrolled
  useGSAP(
    () => {
      const bar = barRef.current;
      if (!bar) return;
      const open =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--announce-h")
          .trim() || "34px";
      gsap.to(bar, {
        height: scrolled ? 0 : open,
        opacity: scrolled ? 0 : 1,
        duration: reduced ? 0 : 0.7,
        ease: "power4.out",
        overwrite: "auto",
      });
    },
    { dependencies: [scrolled, reduced] },
  );

  return (
    <div
      ref={barRef}
      role="region"
      aria-label="Announcement"
      onPointerEnter={() => {
        pausedRef.current = true;
      }}
      onPointerLeave={() => {
        pausedRef.current = false;
      }}
      className="relative z-[60] overflow-hidden bg-w4 font-light text-[#e9e7e0]"
      style={{ height: "var(--announce-h)" }}
    >
      <div className="grid h-[var(--announce-h)] place-items-center">
        <p
          key={index}
          ref={msgRef}
          className="col-start-1 row-start-1 max-w-[92vw] truncate px-4 text-center text-[12px] leading-none tracking-[0.15em] uppercase"
        >
          {MESSAGES[index]}
        </p>
      </div>
    </div>
  );
}

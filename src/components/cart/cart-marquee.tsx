"use client";

import { useRef } from "react";

import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Mark } from "@/components/ui/mark";

/**
 * A slow, seamless promo band pinned to the very top of the bag drawer — the
 * counter's ticker. One track holds the phrase group twice; GSAP slides it
 * exactly one group width, forever (`ease: "none"`, `repeat: -1`), so there is
 * no jump at the seam. Decorative (`aria-hidden`) — every line is stated plainly
 * elsewhere in the flow. Frozen under reduced motion and while the tab is hidden
 * (rAF stops for free).
 */

const NOTES = [
  "Free shipping across India",
  "Cash on delivery available",
  "Dispatched within 24–48 hours",
  "Discovery Set — all three for ₹799",
  "Extrait de Parfum · nothing lighter",
] as const;

function Group() {
  return (
    <div className="flex h-full flex-none items-center">
      {NOTES.map((note) => (
        <span key={note} className="flex flex-none items-center">
          <span className="px-5 text-[10.5px] leading-none font-light tracking-[0.16em] whitespace-nowrap uppercase">
            {note}
          </span>
          <Mark className="w-[9px] shrink-0 text-[#c9a24a]/70" strokeWidth={1.6} />
        </span>
      ))}
    </div>
  );
}

export function CartMarquee() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track || reduced) return;
      gsap.set(track, { xPercent: 0 });
      const tween = gsap.to(track, {
        xPercent: -50,
        duration: 26,
        ease: "none",
        repeat: -1,
      });
      return () => {
        tween.kill();
      };
    },
    { dependencies: [reduced], scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="shrink-0 overflow-hidden border-b border-black/10 bg-w4 text-[#e9e7e0]"
      style={{ height: "var(--announce-h)" }}
    >
      <div
        ref={trackRef}
        className="flex h-full w-max items-center will-change-transform"
      >
        <Group />
        <Group />
      </div>
    </div>
  );
}

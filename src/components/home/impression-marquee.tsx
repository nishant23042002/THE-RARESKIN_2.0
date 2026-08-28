"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { fragranceList } from "@/lib/products";

/**
 * Slow single-line band between the hero and the collection. One seamless loop:
 * the track holds the phrase group twice and GSAP slides it exactly one group
 * width, forever. Decorative only (`aria-hidden`) — the impressions all appear
 * in the product cards below. Keeps moving on hover; a hidden tab freezes it
 * for free because rAF stops. Static under reduced motion.
 */
const LINES = [
  "Scents that stay with you",
  ...fragranceList.map((f) => f.impression),
  "Different by design",
];

function Group() {
  // `pr-14` carries the trailing rhythm so the two groups butt together with
  // the same gap they use internally — keeps `xPercent: -50` a clean seam.
  return (
    <div className="flex flex-none gap-14 pr-14">
      {LINES.map((line) => (
        <span key={line} className="flex flex-none items-center gap-14">
          <span className="serif-italic text-[clamp(1.15rem,2.4vw,1.9rem)] whitespace-nowrap opacity-90">
            {line}
          </span>
          <span className="text-[clamp(1.15rem,2.4vw,1.9rem)] leading-none text-gilt/70">
            &#8250;
          </span>
        </span>
      ))}
    </div>
  );
}

export function ImpressionMarquee() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track || reduced) return;
      gsap.set(track, { xPercent: 0 });
      gsap.to(track, {
        xPercent: -50,
        duration: 42,
        ease: "none",
        repeat: -1,
      });
    },
    { dependencies: [reduced], scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="overflow-hidden border-y border-ink bg-w4 py-6 text-w0"
    >
      <div ref={trackRef} className="flex w-max will-change-transform">
        <Group />
        <Group />
      </div>
    </div>
  );
}

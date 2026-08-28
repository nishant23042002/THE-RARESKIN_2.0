"use client";

import { useEffect, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";

/**
 * `true` once the page has scrolled past `threshold` pixels. Backed by
 * ScrollTrigger (no scroll listener, synced with Lenis; also works with native
 * scrolling under reduced motion). Shared by the announcement bar (collapse)
 * and the header (condense).
 */
export function useScrolled(threshold = 4): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setScrolled(window.scrollY > threshold);

    const st = ScrollTrigger.create({
      start: threshold,
      // a real range [threshold, maxScroll] so `isActive` stays true the whole
      // time the page is scrolled — `end: "max"` collapses to a 1px window here
      // because there is no trigger element.
      end: () => Math.max(threshold + 1, ScrollTrigger.maxScroll(window)),
      onToggle: (self) => setScrolled(self.isActive),
    });

    return () => st.kill();
  }, [threshold]);

  return scrolled;
}

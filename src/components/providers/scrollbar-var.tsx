"use client";

import { useEffect } from "react";

/**
 * Publishes the classic-scrollbar width as `--sbw` on :root.
 *
 * `scrollbar-gutter: stable` (in globals) already keeps the page from shifting
 * when scroll is locked, but it also makes `100vw` resolve to the *content*
 * width — so a full-bleed overlay (`w-screen`) would stop 15px short of the
 * window edge. Overlays add `--sbw` back with `calc()` to reach the real edge.
 * It's `0px` on overlay-scrollbar systems, where there is nothing to add.
 */
export function ScrollbarVar() {
  useEffect(() => {
    const set = () => {
      const w = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty("--sbw", `${Math.max(0, w)}px`);
    };
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  return null;
}

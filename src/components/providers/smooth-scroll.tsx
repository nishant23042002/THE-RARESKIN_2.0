"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ReactLenis } from "lenis/react";
import { GsapLenisBridge } from "./gsap-lenis-bridge";

/**
 * Lenis smooth scroll. Disabled entirely under `prefers-reduced-motion` — the
 * page falls back to native scrolling and every ScrollTrigger still fires
 * (ScrollTrigger has its own scroll listener). The GSAP <-> Lenis clock sync
 * lives in <GsapLenisBridge>, which reads the instance via `useLenis()`.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  // null = not yet resolved; render plainly until we know, so reduced-motion
  // users never get a frame of smooth scroll.
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setEnabled(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!enabled) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        duration: 1.05,
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
      }}
    >
      <GsapLenisBridge />
      {children}
    </ReactLenis>
  );
}

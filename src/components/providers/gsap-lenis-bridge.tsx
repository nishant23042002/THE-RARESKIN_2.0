"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Rendered inside <ReactLenis>. `useLenis()` hands us the instance reactively
 * (the imperative ref lands a render too late), so we can drive Lenis from the
 * GSAP ticker and keep ScrollTrigger in lock-step.
 */
export function GsapLenisBridge() {
  const lenis = useLenis();
  const pathname = usePathname();

  useEffect(() => {
    if (!lenis) return;

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(tick);
    };
  }, [lenis]);

  useEffect(() => {
    if (!lenis) return;
    lenis.scrollTo(0, { immediate: true });
    ScrollTrigger.refresh();
  }, [pathname, lenis]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !lenis) return;
    Object.assign(window as unknown as Record<string, unknown>, {
      __lenis: lenis,
      __gsap: gsap,
      __ScrollTrigger: ScrollTrigger,
    });
  }, [lenis]);

  return null;
}

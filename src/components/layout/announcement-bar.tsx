"use client";

import Link from "next/link";
import { useMemo, useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Mark } from "@/components/ui/mark";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useScrolled } from "@/hooks/use-scrolled";

/**
 * Announcement marquee. One seamless horizontal loop — the phrase group is laid
 * down twice and GSAP slides the track exactly one group width, forever
 * (`ease: "none"`, `repeat: -1`), so there is no jump at the seam. Pauses on
 * hover (so a linked promo can be clicked) and while the tab is hidden (rAF
 * stops for free). Collapses to nothing once the visitor scrolls, and does not
 * return — a first-impression element, not a permanent fixture. Frozen under
 * reduced motion, where it shows the messages as a static centred line.
 *
 * Messages come from Site Settings (`announcements`) when any are configured;
 * otherwise the built-in `FALLBACK` set is used.
 */

export interface AnnouncementItem {
  text: string;
  href?: string;
}

const FALLBACK: ReactNode[] = [
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

function Group({ items, ariaHidden }: { items: ReactNode[]; ariaHidden?: boolean }) {
  return (
    <div
      className="flex flex-none items-center"
      aria-hidden={ariaHidden || undefined}
    >
      {items.map((node, i) => (
        <span key={i} className="flex flex-none items-center">
          <span className="px-6 text-[11.5px] leading-none tracking-[0.16em] whitespace-nowrap uppercase">
            {node}
          </span>
          <Mark className="w-[9px] shrink-0 text-gilt/70" strokeWidth={1.6} />
        </span>
      ))}
    </div>
  );
}

export function AnnouncementBar({
  messages,
  rotateSeconds,
}: {
  messages?: AnnouncementItem[];
  /** Site Settings dial — repurposed as a marquee speed control: seconds of
   *  travel per message (higher = slower). */
  rotateSeconds?: number;
} = {}) {
  const perItem =
    rotateSeconds && rotateSeconds >= 3 ? Math.min(rotateSeconds, 12) : 5.5;
  const items: ReactNode[] = useMemo(() => {
    const active = (messages ?? []).filter((m) => m.text.trim());
    if (active.length === 0) return FALLBACK;
    return active.map((m, i) =>
      m.href ? (
        <Link key={i} href={m.href} className="hover:underline underline-offset-4">
          {m.text}
        </Link>
      ) : (
        <span key={i}>{m.text}</span>
      ),
    );
  }, [messages]);

  const barRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const scrolled = useScrolled();

  // seamless loop — killed while scrolled away (bar height is 0) so it isn't
  // spinning rAF off-screen; recreated when the bar returns.
  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track || reduced || scrolled) return;
      gsap.set(track, { xPercent: 0 });
      const tween = gsap.to(track, {
        xPercent: -50,
        duration: Math.max(16, items.length * perItem),
        ease: "none",
        repeat: -1,
      });
      const onEnter = () => tween.timeScale(0);
      const onLeave = () => tween.timeScale(1);
      const root = barRef.current;
      root?.addEventListener("pointerenter", onEnter);
      root?.addEventListener("pointerleave", onLeave);
      return () => {
        tween.kill();
        root?.removeEventListener("pointerenter", onEnter);
        root?.removeEventListener("pointerleave", onLeave);
      };
    },
    { dependencies: [reduced, scrolled, items.length, perItem], scope: barRef },
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
      className="relative z-[60] overflow-hidden bg-w4 font-light text-[#e9e7e0]"
      style={{ height: "var(--announce-h)" }}
    >
      {reduced ? (
        <div className="grid h-[var(--announce-h)] place-items-center">
          <p className="max-w-[92vw] truncate px-4 text-center text-[12px] leading-none tracking-[0.15em] uppercase">
            {items[0]}
          </p>
        </div>
      ) : (
        <div
          ref={trackRef}
          className="flex h-full w-max items-center will-change-transform"
        >
          <Group items={items} />
          <Group items={items} ariaHidden />
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useScrolled } from "@/hooks/use-scrolled";

/**
 * Rotating promo bar. One line, changes every few seconds with a short
 * blur-lifted fade; pauses on hover and while the tab is hidden. Collapses to
 * nothing once the visitor scrolls, and does not return — a first-impression
 * element, not a permanent fixture (matches the "Campaign" prototype).
 *
 * Messages come from Site Settings (`announcements`) when any are configured;
 * otherwise the built-in `FALLBACK` set is used.
 */

const DEFAULT_ROTATE_MS = 4200;

export interface AnnouncementItem {
  text: string;
  href?: string;
}

// Kept short so they hold one line down to ~360px; `truncate` is the backstop.
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

export function AnnouncementBar({
  messages,
  rotateSeconds,
}: {
  messages?: AnnouncementItem[];
  rotateSeconds?: number;
} = {}) {
  const items: ReactNode[] = useMemo(() => {
    const active = (messages ?? []).filter((m) => m.text.trim());
    if (active.length === 0) return FALLBACK;
    return active.map((m, i) =>
      m.href ? (
        <Link key={i} href={m.href} className="hover:underline">
          {m.text}
        </Link>
      ) : (
        <span key={i}>{m.text}</span>
      ),
    );
  }, [messages]);

  const rotateMs =
    rotateSeconds && rotateSeconds >= 3
      ? rotateSeconds * 1000
      : DEFAULT_ROTATE_MS;

  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const scrolled = useScrolled();

  const count = items.length;
  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(() => {
      if (document.hidden || pausedRef.current) return;
      setIndex((i) => (i + 1) % count);
    }, rotateMs);
    return () => window.clearInterval(id);
  }, [count, rotateMs]);

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
          {items[index % count]}
        </p>
      </div>
    </div>
  );
}

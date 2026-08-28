"use client";

import {
  Children,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

const COMMIT = 0.18; // fraction of a slide to commit a step

/**
 * Transform-based slide track shared by the PDP gallery and the impressions
 * deck — same "click-and-drag, one step per gesture" feel as the hero, plus
 * clickable dots. A drag never travels more than one slide, whatever its
 * length; a short drag springs back.
 */
export function Carousel({
  children,
  ariaLabel,
  className,
  viewportClassName,
  dotsInside = false,
  dotTone = "dark",
  showDots = true,
  activeIndex,
  onActiveChange,
}: {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
  viewportClassName?: string;
  /** overlay the dots on the last slide instead of sitting below */
  dotsInside?: boolean;
  dotTone?: "dark" | "light";
  showDots?: boolean;
  /** controlled active slide — pair with onActiveChange (e.g. a thumb strip) */
  activeIndex?: number;
  onActiveChange?: (i: number) => void;
}) {
  const slides = Children.toArray(children);
  const count = slides.length;

  const viewportRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; from: number } | null>(null);
  const [internal, setInternal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const controlled = activeIndex != null;
  const active = controlled
    ? Math.max(0, Math.min(count - 1, activeIndex))
    : internal;

  function go(i: number) {
    const n = Math.max(0, Math.min(count - 1, i));
    if (!controlled) setInternal(n);
    onActiveChange?.(n);
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (e.button !== 0 || count < 2) return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    start.current = { x: e.clientX, from: active };
  }

  function onPointerMove(e: ReactPointerEvent) {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (!dragging) {
      if (Math.abs(dx) < 5) return;
      setDragging(true);
      viewportRef.current?.setPointerCapture?.(e.pointerId);
    }
    const w = viewportRef.current?.clientWidth ?? 1;
    setOffset(Math.max(-w, Math.min(w, dx)));
  }

  function endDrag(e: ReactPointerEvent) {
    const s = start.current;
    start.current = null;
    if (!s) return;
    viewportRef.current?.releasePointerCapture?.(e.pointerId);
    const w = viewportRef.current?.clientWidth ?? 1;
    const dx = e.clientX - s.x;
    const step = dx <= -w * COMMIT ? 1 : dx >= w * COMMIT ? -1 : 0;
    setDragging(false);
    setOffset(0);
    go(s.from + step);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(active + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(active - 1);
    }
  }

  return (
    <div
      className={cn("relative", className)}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      <div
        ref={viewportRef}
        className={cn("overflow-hidden", viewportClassName)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="flex touch-pan-y select-none"
          style={{
            transform: `translateX(calc(${-active * 100}% + ${offset}px))`,
            transition: dragging
              ? "none"
              : "transform 0.55s var(--ease-out-strong)",
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              className="w-full flex-none"
              aria-hidden={i !== active}
              inert={i !== active}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {count > 1 && showDots && (
        <div
          className={cn(
            "flex items-center gap-2",
            dotsInside
              ? "absolute bottom-4 left-1/2 -translate-x-1/2"
              : "mt-4 justify-center",
          )}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1} of ${count}`}
              aria-current={i === active}
              className={cn(
                "h-[3px] rounded-full transition-all duration-300",
                dotTone === "light" ? "bg-w0" : "bg-ink",
                i === active ? "w-6 opacity-100" : "w-2 opacity-35 hover:opacity-70",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

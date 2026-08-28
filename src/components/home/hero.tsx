"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/gsap";
import { useNavTone } from "@/components/providers/nav-tone";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
import type { Fragrance } from "@/lib/catalog";
import { HeroScene, HERO_ART } from "./hero-scene";

const AUTOPLAY_S = 6;
const DRAG_THRESHOLD = 0.16; // fraction of a slide width to commit a change

export function Hero({ fragrances }: { fragrances: Fragrance[] }) {
  const SLIDES = fragrances; // the three, from the catalogue
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<gsap.core.Tween | null>(null);
  const pausedRef = useRef(false);
  const dragRef = useRef<{
    startX: number;
    startScroll: number;
    dx: number;
    engaged: boolean;
  } | null>(null);
  const snapRearmRef = useRef<number>(0);
  const [active, setActive] = useState(0);

  const { setTone } = useNavTone();
  const reduced = useReducedMotion();

  const count = fragrances.length;
  const goTo = useCallback(
    (i: number, { wrap = true } = {}) => {
      const track = trackRef.current;
      if (!track) return;
      const n = wrap
        ? ((i % count) + count) % count
        : Math.max(0, Math.min(count - 1, i));
      track.scrollTo({
        left: n * track.clientWidth,
        behavior: reduced ? "auto" : "smooth",
      });
    },
    [reduced, count],
  );

  // active slide — read from scroll position (paused mid-drag)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      if (dragRef.current?.engaged) return;
      const i = Math.round(track.scrollLeft / track.clientWidth);
      setActive((prev) => (prev === i ? prev : i));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const onResize = () => goTo(active, { wrap: false });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, goTo]);

  useEffect(() => () => window.clearTimeout(snapRearmRef.current), []);

  // header tone follows the active slide; reset when leaving the page
  useEffect(() => {
    const slug = SLIDES[active]?.slug;
    if (slug) setTone(HERO_ART[slug].theme === "dark" ? "light" : "dark");
  }, [active, setTone, SLIDES]);
  useEffect(() => () => setTone("dark"), [setTone]);

  const setPaused = useCallback((paused: boolean) => {
    pausedRef.current = paused;
    const tw = progressRef.current;
    if (!tw) return;
    if (paused) tw.pause();
    else if (!document.hidden && !document.body.classList.contains("is-locked"))
      tw.resume();
  }, []);

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    // pause while a modal (menu / cart / pdp) holds the body
    const mo = new MutationObserver(() =>
      setPaused(document.body.classList.contains("is-locked")),
    );
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      mo.disconnect();
    };
  }, [setPaused]);

  // autoplay + dot progress — one linear tween per slide, drives the advance.
  // Keeps running while the cursor is over the hero.
  useGSAP(
    () => {
      progressRef.current?.kill();
      if (reduced) return;
      const fills = sectionRef.current?.querySelectorAll<HTMLElement>("[data-fill]");
      if (!fills?.length) return;
      gsap.set(fills, { scaleX: 0 });
      progressRef.current = gsap.fromTo(
        fills[active],
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: AUTOPLAY_S,
          ease: "none",
          onComplete: () => {
            if (
              !document.hidden &&
              !document.body.classList.contains("is-locked")
            )
              goTo(active + 1);
          },
        },
      );
      if (pausedRef.current) progressRef.current.pause();
    },
    { dependencies: [active, reduced], scope: sectionRef },
  );

  // content reveal for the active slide
  useGSAP(
    () => {
      const copy = sectionRef.current?.querySelector(
        `[data-slide="${active}"] [data-copy]`,
      );
      if (!copy) return;
      const parts = copy.querySelectorAll<HTMLElement>("[data-rise]");
      if (reduced) {
        gsap.set(parts, { autoAlpha: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        parts,
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out" },
      );
    },
    { dependencies: [active, reduced], scope: sectionRef },
  );

  // --- click-and-drag to slide ---
  function onPointerDown(e: React.PointerEvent) {
    const track = trackRef.current;
    if (!track || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, a")) return;
    if (snapRearmRef.current) {
      window.clearTimeout(snapRearmRef.current);
      snapRearmRef.current = 0;
    }
    dragRef.current = {
      startX: e.clientX,
      startScroll: track.scrollLeft,
      dx: 0,
      engaged: false,
    };
    setPaused(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    const track = trackRef.current;
    if (!d || !track) return;
    d.dx = e.clientX - d.startX;
    if (!d.engaged) {
      if (Math.abs(d.dx) < 6) return;
      d.engaged = true;
      track.style.scrollSnapType = "none";
      track.style.scrollBehavior = "auto";
      track.setPointerCapture(e.pointerId);
      track.classList.add("is-dragging");
    }
    // follow the pointer, but never past the immediate neighbour — a long
    // drag still only ever commits to one slide.
    const w = track.clientWidth || 1;
    const offset = Math.max(-w, Math.min(w, d.dx));
    track.scrollLeft = d.startScroll - offset;
  }

  function endDrag(e: React.PointerEvent) {
    const d = dragRef.current;
    const track = trackRef.current;
    dragRef.current = null;
    setPaused(false);
    if (!d || !track) return;
    track.style.scrollBehavior = "";
    track.classList.remove("is-dragging");
    if (!d.engaged) {
      track.style.scrollSnapType = "";
      return;
    }
    track.releasePointerCapture?.(e.pointerId);
    const w = track.clientWidth || 1;
    const from = Math.round(d.startScroll / w);
    // exactly one step, whatever the drag distance
    const step =
      d.dx <= -w * DRAG_THRESHOLD ? 1 : d.dx >= w * DRAG_THRESHOLD ? -1 : 0;
    // scroll to the target while snap is still off (so mandatory snap can't
    // yank it back to the nearer slide mid-drag), then re-arm snap once it lands.
    goTo(from + step, { wrap: false });
    snapRearmRef.current = window.setTimeout(
      () => {
        snapRearmRef.current = 0;
        if (trackRef.current) trackRef.current.style.scrollSnapType = "";
      },
      reduced ? 0 : 560,
    );
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(active + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(active - 1);
    }
  }

  const activeSlug = SLIDES[active]?.slug ?? SLIDES[0]?.slug ?? "aurevan";
  const activeTheme = HERO_ART[activeSlug].theme;

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="Campaign"
      className="relative h-[100svh] min-h-[520px]"
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      <div
        ref={trackRef}
        data-lenis-prevent-touch
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain select-none"
      >
        {SLIDES.map((f, i) => {
          const art = HERO_ART[f.slug];
          return (
            <div
              key={f.slug}
              data-slide={i}
              aria-hidden={i !== active}
              className="relative h-full w-full flex-none snap-start snap-always"
            >
              <HeroScene fragrance={f.slug} />
              <div
                className={cn(
                  "absolute inset-0 flex flex-col justify-end px-[clamp(24px,6vw,88px)] pb-[clamp(88px,12vh,132px)]",
                  art.align === "end" && "items-end text-right",
                )}
              >
                <div
                  data-copy
                  className={cn(
                    "max-w-[34ch]",
                    art.theme === "dark" ? "text-w0" : "text-ink",
                  )}
                >
                  <p
                    data-rise
                    className="text-[10px] tracking-[0.28em] uppercase opacity-75"
                  >
                    {f.mood.join(" · ")}
                  </p>
                  <h1
                    data-rise
                    className="mt-3.5 text-[clamp(2.6rem,7vw,5.4rem)] leading-[0.98] tracking-[-0.02em]"
                  >
                    {f.name}
                  </h1>
                  <p
                    data-rise
                    className="serif-italic mt-3 text-[clamp(1.05rem,2.4vw,1.5rem)] opacity-90"
                  >
                    {f.title}
                  </p>
                  <div data-rise className="mt-7">
                    <Button
                      href={`/fragrances/${f.slug}`}
                      variant={art.button}
                      size="sm"
                    >
                      Discover {f.name}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* controls */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-[clamp(24px,4vh,40px)] flex items-center justify-between px-[clamp(24px,6vw,88px)]",
          activeTheme === "dark" ? "text-w0" : "text-ink",
        )}
      >
        <div
          className="pointer-events-auto flex gap-2.5"
          role="tablist"
          aria-label="Slides"
        >
          {SLIDES.map((f, i) => (
            <button
              key={f.slug}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${f.name}, slide ${i + 1} of ${SLIDES.length}`}
              onClick={() => goTo(i)}
              className="relative h-[2px] w-9 overflow-hidden bg-current/30"
            >
              <span
                data-fill
                className="absolute inset-0 origin-left scale-x-0 bg-current"
              />
            </button>
          ))}
        </div>

        <div className="pointer-events-auto hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label="Previous slide"
            className="grid size-10 place-items-center border border-current/40 transition-colors hover:bg-current/10"
          >
            <Arrow dir="left" />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="Next slide"
            className="grid size-10 place-items-center border border-current/40 transition-colors hover:bg-current/10"
          >
            <Arrow dir="right" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={cn("w-3.5", dir === "left" && "rotate-180")}
      fill="none"
      aria-hidden
    >
      <path
        d="M1 6 L11 6 M7 2 L11 6 L7 10"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

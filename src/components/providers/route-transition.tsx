"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLenis } from "lenis/react";

import { gsap } from "@/lib/gsap";
import { Logo } from "@/components/ui/logo";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { FRAGRANCE_PALETTE, isFragranceSlug } from "@/lib/catalog";

/**
 * "The Aperture" — the route transition for THE RARESKIN.
 *
 * On every in-app navigation a warm-black curtain closes toward the point you
 * tapped, holds for a beat on the wordmark and the three-fragrance rule, then
 * parts from that same seam to reveal the next page — a cinematic aperture, not
 * a wipe.
 *
 * It is context-aware: on the way to a fragrance the rule becomes that scent's
 * own colour and its name appears; anywhere else it's the full
 * aurévan → orvélis → vayrén spectrum.
 *
 * Mechanics: a document-level capture listener intercepts internal `<a>` clicks,
 * kicks off `router.push` immediately (the next page renders behind the
 * curtain), and choreographs cover → hold → reveal with GSAP. The reveal waits
 * for the destination to actually be on screen, so a slow route is masked
 * rather than flashing. Everything animates on `transform` / `opacity` only.
 */

interface RouteTransitionValue {
  /** Navigate with the curtain (for programmatic navigation). */
  navigate: (href: string) => void;
  active: boolean;
}

const RouteTransitionContext = createContext<RouteTransitionValue | null>(null);

export function useRouteTransition(): RouteTransitionValue {
  return (
    useContext(RouteTransitionContext) ?? { navigate: () => {}, active: false }
  );
}

const TRI_JUICE =
  "linear-gradient(90deg, #e0d7bf 0%, #c5872f 52%, #3d2712 100%)";

function ruleFor(pathname: string): { background: string; label: string | null } {
  const m = pathname.match(/^\/fragrances\/([^/?#]+)/);
  if (m && isFragranceSlug(m[1])) {
    const p = FRAGRANCE_PALETTE[m[1]];
    return { background: p.juice, label: p.name };
  }
  return { background: TRI_JUICE, label: null };
}

const COVER_S = 0.42;
const HOLD_MS = 190;
const REVEAL_S = 0.44;

type Phase = "idle" | "cover" | "hold" | "reveal";

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const reduced = useReducedMotion();
  const grainId = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);

  const phaseRef = useRef<Phase>("idle");
  const targetRef = useRef<string | null>(null);
  const reachedRef = useRef(false);
  const coveredRef = useRef(false);
  const seamYRef = useRef(0.5); // tap Y as a fraction of viewport height
  const timersRef = useRef<number[]>([]);
  const firstRenderRef = useRef(true);
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  const [active, setActive] = useState(false);
  const [rule, setRule] = useState<{ background: string; label: string | null }>({
    background: TRI_JUICE,
    label: null,
  });

  // ── choreography ───────────────────────────────────────────────────────
  //
  // The phase machine is driven by `setTimeout` (which keeps firing even in a
  // backgrounded tab); GSAP only paints. So a stalled ticker degrades to
  // "navigation with no visible curtain", never a curtain stuck on screen.

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  const settle = useCallback(() => {
    clearTimers();
    phaseRef.current = "idle";
    targetRef.current = null;
    reachedRef.current = false;
    coveredRef.current = false;
    const els = [
      rootRef.current,
      topRef.current,
      bottomRef.current,
      stageRef.current,
      seamRef.current,
      lightRef.current,
    ].filter(Boolean);
    gsap.killTweensOf(els);
    if (rootRef.current) {
      gsap.set(rootRef.current, { autoAlpha: 0, pointerEvents: "none" });
    }
    document.body.classList.remove("route-locked");
    lenis?.start();
    setActive(false);
  }, [lenis, clearTimers]);

  const playReveal = useCallback(() => {
    if (phaseRef.current !== "hold") return;
    phaseRef.current = "reveal";
    const top = topRef.current;
    const bottom = bottomRef.current;
    const stage = stageRef.current;
    if (!top || !bottom || !stage) {
      settle();
      return;
    }

    lenis?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);

    if (reducedRef.current) {
      gsap.to(rootRef.current, { autoAlpha: 0, duration: 0.3, ease: "power1.inOut" });
      later(settle, 320);
      return;
    }

    const tl = gsap.timeline();
    tl.to(stage, { autoAlpha: 0, y: -10, duration: 0.22, ease: "power2.in" }, 0);
    tl.to(top, { yPercent: -101, duration: REVEAL_S, ease: "power4.inOut" }, 0.08);
    tl.to(bottom, { yPercent: 101, duration: REVEAL_S, ease: "power4.inOut" }, 0.08);
    later(settle, (REVEAL_S + 0.1) * 1000);
  }, [settle, lenis, later]);

  const maybeReveal = useCallback(() => {
    if (
      coveredRef.current &&
      reachedRef.current &&
      phaseRef.current === "cover"
    ) {
      phaseRef.current = "hold";
      later(playReveal, reducedRef.current ? 40 : HOLD_MS);
    }
  }, [playReveal, later]);

  const playCover = useCallback(
    (href: string): boolean => {
      const root = rootRef.current;
      const top = topRef.current;
      const bottom = bottomRef.current;
      const stage = stageRef.current;
      const seam = seamRef.current;
      const light = lightRef.current;
      if (!root || !top || !bottom || !stage) return false;

      const target = new URL(href, window.location.href).pathname;
      phaseRef.current = "cover";
      targetRef.current = target;
      reachedRef.current = false;
      coveredRef.current = false;
      setActive(true);
      setRule(ruleFor(target));

      document
        .querySelectorAll<HTMLDialogElement>("dialog[open]")
        .forEach((d) => d.close());
      document.body.classList.add("route-locked");
      lenis?.stop();

      const cy = gsap.utils.clamp(0.12, 0.88, seamYRef.current);
      top.style.height = `${cy * 100}vh`;
      bottom.style.height = `${(1 - cy) * 100}vh`;
      if (seam) seam.style.top = `${cy * 100}vh`;

      gsap.set(root, { autoAlpha: 1, pointerEvents: "auto" });
      gsap.killTweensOf([top, bottom, stage, seam, light].filter(Boolean));

      const onCovered = () => {
        if (coveredRef.current) return;
        coveredRef.current = true;
        maybeReveal();
      };

      if (reducedRef.current) {
        gsap.set([top, bottom], { yPercent: 0 });
        gsap.set(stage, { autoAlpha: 1, y: 0 });
        gsap.fromTo(
          root,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.26, ease: "power1.out" },
        );
        later(onCovered, 300);
        router.push(href);
        return true;
      }

      gsap.set(top, { yPercent: -101 });
      gsap.set(bottom, { yPercent: 101 });
      gsap.set(stage, { autoAlpha: 0, y: 12 });
      if (seam) gsap.set(seam, { autoAlpha: 0, scaleX: 0.35 });
      if (light) gsap.set(light, { xPercent: -150 });

      const tl = gsap.timeline();
      tl.to(
        [top, bottom],
        { yPercent: 0, duration: COVER_S, ease: "power4.inOut" },
        0,
      );
      if (seam) {
        tl.to(
          seam,
          { autoAlpha: 1, scaleX: 1, duration: 0.24, ease: "power2.out" },
          COVER_S - 0.2,
        );
        tl.to(seam, { autoAlpha: 0, duration: 0.36, ease: "power1.in" }, ">-0.04");
      }
      tl.to(
        stage,
        { autoAlpha: 1, y: 0, duration: 0.38, ease: "power3.out" },
        COVER_S - 0.16,
      );
      if (light) {
        tl.to(
          light,
          { xPercent: 150, duration: 0.9, ease: "sine.inOut" },
          COVER_S - 0.1,
        );
      }

      // authoritative "cover done" clock — independent of the GSAP ticker
      later(onCovered, COVER_S * 1000 + 70);
      router.push(href);
      return true;
    },
    [router, lenis, maybeReveal, later],
  );

  const start = useCallback(
    (rawHref: string) => {
      if (phaseRef.current !== "idle") return;
      let url: URL;
      try {
        url = new URL(rawHref, window.location.href);
      } catch {
        router.push(rawHref);
        return;
      }
      const href = url.pathname + url.search + url.hash;

      if (url.pathname === window.location.pathname) {
        router.push(href); // same route — no curtain
        return;
      }

      // hard ceiling: whatever happens, tear the curtain down after this
      later(settle, (COVER_S + REVEAL_S) * 1000 + HOLD_MS + 4000);
      if (!playCover(href)) {
        clearTimers();
        router.push(href);
      }
    },
    [playCover, router, settle, later, clearTimers],
  );

  // ── intercept internal <a> clicks ──────────────────────────────────────

  useEffect(() => {
    function shouldHandle(a: HTMLAnchorElement, e: MouseEvent): boolean {
      if (e.defaultPrevented || e.button !== 0) return false;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
      if (a.target && a.target !== "_self") return false;
      if (a.hasAttribute("download") || a.dataset.noTransition !== undefined) {
        return false;
      }
      const raw = a.getAttribute("href");
      if (!raw || raw.startsWith("#") || /^(mailto|tel):/.test(raw)) return false;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return false;
      }
      if (url.origin !== window.location.origin) return false;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return false; // same page (hash) — leave it
      }
      return true;
    }

    function onClick(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      const a = el?.closest?.("a");
      if (!(a instanceof HTMLAnchorElement) || !shouldHandle(a, e)) return;
      e.preventDefault();
      seamYRef.current =
        window.innerHeight > 0
          ? gsap.utils.clamp(0, 1, e.clientY / window.innerHeight)
          : 0.5;
      const url = new URL(a.href, window.location.href);
      start(url.pathname + url.search + url.hash);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  // ── destination arrival ───────────────────────────────────────────────

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    if (phaseRef.current === "idle") return;
    if (targetRef.current && pathname === targetRef.current) {
      reachedRef.current = true;
      // let the incoming page paint a frame, then try to reveal
      later(maybeReveal, 48);
    }
  }, [pathname, maybeReveal, later]);

  useEffect(() => {
    if (rootRef.current) {
      gsap.set(rootRef.current, { autoAlpha: 0, pointerEvents: "none" });
    }
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const navigate = useCallback((href: string) => start(href), [start]);

  return (
    <RouteTransitionContext.Provider value={{ navigate, active }}>
      {children}

      <div
        ref={rootRef}
        aria-hidden
        className="route-curtain"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 300,
          opacity: 0,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        {(["top", "bottom"] as const).map((edge) => (
          <div
            key={edge}
            ref={edge === "top" ? topRef : bottomRef}
            style={{
              position: "absolute",
              [edge]: 0,
              left: 0,
              width: "100vw",
              height: "50vh",
              background: "var(--color-w4)",
              overflow: "hidden",
            }}
          >
            <Grain id={`${grainId}-${edge}`} />
          </div>
        ))}

        <div
          ref={seamRef}
          aria-hidden
          style={{
            position: "absolute",
            top: "50vh",
            left: 0,
            width: "100%",
            height: "1px",
            transformOrigin: "center",
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.55) 42%, rgba(255,255,255,0.55) 58%, transparent)",
            opacity: 0,
          }}
        />

        <div
          ref={stageRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: "24px",
            opacity: 0,
            overflow: "hidden",
          }}
        >
          <div
            ref={lightRef}
            aria-hidden
            style={{
              position: "absolute",
              top: "-50%",
              left: "50%",
              width: "44%",
              height: "200%",
              transform: "rotate(18deg)",
              background:
                "linear-gradient(90deg, transparent, rgba(255,253,247,0.07) 50%, transparent)",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "clamp(14px, 2.4vw, 22px)",
            }}
          >
            <Logo
              className="text-w0"
              style={{ width: "clamp(150px, 42vw, 224px)" }}
            />
            <span
              aria-hidden
              style={{
                display: "block",
                width: "min(300px, 62vw)",
                height: "2px",
                borderRadius: "2px",
                background: rule.background,
              }}
            />
            {rule.label && (
              <span
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "rgba(236,231,218,0.62)",
                }}
              >
                {rule.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </RouteTransitionContext.Provider>
  );
}

function Grain({ id }: { id: string }) {
  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.05,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    >
      <filter id={id}>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

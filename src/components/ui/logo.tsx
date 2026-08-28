"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { Wordmark } from "./wordmark";

const SRC = "/brand/rareskin-wordmark.png";
/** cropped artwork: 1487 x 331 (black-on-transparent, tinted via currentColor) */
const ASPECT = "1487 / 331";

/**
 * The RARESKIN wordmark — the artwork rendered as a `currentColor` CSS mask, so
 * it inverts ink <-> cream with the header tone and scales on the compositor
 * (no per-frame mask re-fit). It renders straight from SSR, so there is no
 * load-swap flash.
 *
 * Sizing is the caller's job (`w-*` / inline width on the wrapper). The span
 * carries its own inline `display:block` + `max-width:100%` so a missing utility
 * layer (HMR, a CSS chunk race) can never let it balloon past its box. The
 * genuine-asset-missing fallback is probed with a detached `Image()` — there is
 * no real <img> in the tree that could paint at native size if a class drops.
 */
export function Logo({
  className,
  style,
  title = "THE RARESKIN",
}: {
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const probe = new Image();
    probe.onerror = () => setFailed(true);
    probe.src = SRC;
  }, []);

  if (failed) {
    return (
      <span className={cn("inline-flex text-[13px]", className)} style={style}>
        <Wordmark />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={title}
      className={cn("block", className)}
      style={{
        display: "block",
        maxWidth: "100%",
        aspectRatio: ASPECT,
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${SRC})`,
        maskImage: `url(${SRC})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        ...style,
      }}
    />
  );
}

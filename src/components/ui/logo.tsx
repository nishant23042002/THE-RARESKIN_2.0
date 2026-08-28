"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { Wordmark } from "./wordmark";

const SRC = "/brand/rareskin-wordmark.png";
/** cropped artwork: 1487 x 331 (black-on-transparent, tinted via currentColor) */
const ASPECT = "1487 / 331";

/**
 * The RARESKIN wordmark — the artwork rendered as a `currentColor` CSS mask, so
 * it inverts ink <-> cream with the header tone and scales on the compositor
 * (no per-frame mask re-fit). The mask renders straight from SSR, so there is
 * no load-swap flash; the hidden probe only trips the Jost text fallback if the
 * asset genuinely fails.
 *
 * Size comes from the caller's `w-[...]`; scaling is done by the parent's
 * `transform`, never by changing this box.
 */
export function Logo({
  className,
  title = "THE RARESKIN",
}: {
  className?: string;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={cn("inline-flex text-[13px]", className)}>
        <Wordmark />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={title}
      className={cn("block", className)}
      style={
        {
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
        } as CSSProperties
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SRC}
        alt=""
        aria-hidden
        className="hidden"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

"use client";

import { useCallback, useEffect } from "react";

import { Icon } from "@/components/ui/icon";
import { cloudinaryVariant } from "@/lib/catalog";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

export interface LightboxPhoto {
  url: string;
  alt: string;
}

/**
 * A minimal, dependency-free image viewer for customer review photos. Fixed
 * overlay, one image at a time, prev / next (wraps), Esc + arrow keys, click the
 * scrim to close. Scroll is locked while open.
 */
export function ReviewLightbox({
  photos,
  index,
  onClose,
  onIndex,
}: {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const open = index != null && photos.length > 0;

  const step = useCallback(
    (delta: number) => {
      if (index == null) return;
      onIndex((index + delta + photos.length) % photos.length);
    },
    [index, photos.length, onIndex],
  );

  useEffect(() => {
    if (!open) return;
    lockScroll("review-lightbox");
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll("review-lightbox");
    };
  }, [open, onClose, step]);

  if (!open || index == null) return null;
  const photo = photos[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review photo"
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/85 p-4 backdrop-blur-[2px]"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-w0/10 text-w0 transition-colors hover:bg-w0/20"
      >
        <Icon name="close" className="size-4" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label="Previous photo"
            className="absolute left-3 z-10 grid size-10 place-items-center rounded-full bg-w0/10 text-w0 transition-colors hover:bg-w0/20 sm:left-6"
          >
            <Icon name="chevron" className="size-4 rotate-90" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label="Next photo"
            className="absolute right-3 z-10 grid size-10 place-items-center rounded-full bg-w0/10 text-w0 transition-colors hover:bg-w0/20 sm:right-6"
          >
            <Icon name="chevron" className="size-4 -rotate-90" />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cloudinaryVariant(photo.url, { w: 1400 }) ?? photo.url}
        alt={photo.alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[86vh] max-w-full rounded-[3px] object-contain"
      />

      {photos.length > 1 && (
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.1em] text-w0/70 tabular-nums">
          {index + 1} / {photos.length}
        </span>
      )}
    </div>
  );
}

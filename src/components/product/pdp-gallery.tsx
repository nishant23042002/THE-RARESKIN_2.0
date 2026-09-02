"use client";

import { useState } from "react";
import { Flacon } from "@/components/ui/flacon";
import { Carousel } from "@/components/ui/carousel";
import { cn } from "@/lib/cn";
import { cloudinaryVariant, type FragranceImages, type FragranceSlug } from "@/lib/catalog";

/**
 * PDP gallery — a draggable frame with dots, plus a thumbnail strip.
 *
 * With real photography attached (`images.hero|flat|box`), each non-null image
 * is a slide. With none, it falls back to the vector flacon in three label
 * states (packshot / detail / carton), so the swipe + dot + thumb mechanic is
 * always real.
 */

const VECTOR_VIEWS = [
  { key: "packshot", label: true, volume: true },
  { key: "detail", label: false, volume: false },
  { key: "carton", label: true, volume: false },
] as const;

const FRAME_BG =
  "linear-gradient(165deg, var(--color-w0), var(--color-w1) 60%, var(--color-w2))";

export function PdpGallery({
  slug,
  name,
  images,
}: {
  slug: FragranceSlug;
  name: string;
  images: FragranceImages;
}) {
  const [active, setActive] = useState(0);

  const photos = (["flat", "hero", "box"] as const)
    .map((k) => images[k])
    .filter((url): url is string => Boolean(url));

  const slides =
    photos.length > 0
      ? photos.map((url, i) => ({
          key: `photo-${i}`,
          full: cloudinaryVariant(url, { w: 1000 }) ?? url,
          thumb: cloudinaryVariant(url, { w: 200 }) ?? url,
        }))
      : null;

  return (
    <div className="grid gap-3 lg:sticky lg:top-[calc(var(--announce-h)+var(--header-h)+24px)]">
      <Carousel
        ariaLabel={`${name} images`}
        dotsInside
        activeIndex={active}
        onActiveChange={setActive}
        viewportClassName="rounded-[3px] border border-line"
      >
        {slides
          ? slides.map((s) => (
              <div
                key={s.key}
                className="relative aspect-[1/1.06] overflow-hidden"
                style={{ background: FRAME_BG }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.full}
                  alt={name}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
              </div>
            ))
          : VECTOR_VIEWS.map((v) => (
              <div
                key={v.key}
                className="relative grid aspect-[1/1.06] place-items-center overflow-hidden"
                style={{ background: FRAME_BG }}
              >
                <span
                  className="pointer-events-none absolute inset-0 opacity-50"
                  style={{
                    background:
                      "linear-gradient(112deg, transparent 42%, rgba(255,255,255,0.5) 52%, transparent 62%)",
                  }}
                />
                <span className="relative z-[1] block w-[46%]">
                  <Flacon fragrance={slug} label={v.label} volume={v.volume} />
                </span>
              </div>
            ))}
      </Carousel>

      <div className="flex gap-2.5">
        {slides
          ? slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${name} — view ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "aspect-square flex-1 overflow-hidden rounded-[2px] border transition-colors",
                  i === active ? "border-ink-2" : "border-line hover:border-line-2",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.thumb}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))
          : VECTOR_VIEWS.map((v, i) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${name} — view ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "grid aspect-square flex-1 place-items-center rounded-[2px] border transition-colors",
                  i === active ? "border-ink-2" : "border-line hover:border-line-2",
                )}
                style={{ background: FRAME_BG }}
              >
                <span className="block w-[42%]">
                  <Flacon fragrance={slug} label={v.label} volume={v.volume} />
                </span>
              </button>
            ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Flacon } from "@/components/ui/flacon";
import { Carousel } from "@/components/ui/carousel";
import { cn } from "@/lib/cn";
import type { FragranceSlug } from "@/lib/products";

/**
 * PDP gallery — a draggable frame with dots, plus a thumbnail strip. Placeholder
 * art: the same flacon in three label states (packshot / detail / carton), so
 * the swipe + dot + thumb mechanic is real and drops onto `images.hero|flat|box`
 * when photography lands.
 */
const VIEWS = [
  { key: "packshot", label: true, volume: true },
  { key: "detail", label: false, volume: false },
  { key: "carton", label: true, volume: false },
] as const;

const FRAME_BG =
  "linear-gradient(165deg, var(--color-w0), var(--color-w1) 60%, var(--color-w2))";

export function PdpGallery({
  slug,
  name,
}: {
  slug: FragranceSlug;
  name: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="grid gap-3 lg:sticky lg:top-[calc(var(--announce-h)+var(--header-h)+24px)]">
      <Carousel
        ariaLabel={`${name} images`}
        dotsInside
        activeIndex={active}
        onActiveChange={setActive}
        viewportClassName="rounded-[3px] border border-line"
      >
        {VIEWS.map((v) => (
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
        {VIEWS.map((v, i) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`${name} — view ${i + 1}`}
            aria-current={i === active}
            className={cn(
              "grid aspect-square flex-1 place-items-center rounded-[2px] border transition-colors",
              i === active
                ? "border-ink-2"
                : "border-line hover:border-line-2",
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

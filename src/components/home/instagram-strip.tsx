"use client";

import Link from "next/link";
import { useRef } from "react";

import { Container } from "@/components/ui/container";
import { gsap, useGSAP } from "@/lib/gsap";
import { cloudinaryVariant } from "@/lib/catalog";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { ShowcasePhoto } from "@/server/data/reviews";

/**
 * "@THERARESKIN" — a slow horizontal band of Instagram-style posts (portrait
 * cards, the way a feed photo actually sits), same seamless-loop mechanic as the
 * announcement bar. The visual-proof layer between the written reviews and the
 * newsletter. Pauses on hover; a plain swipeable strip under reduced motion.
 */

const TILE =
  "relative block aspect-[4/5] w-[clamp(150px,23vw,232px)] shrink-0 overflow-hidden rounded-[4px] border border-line bg-surface-2";

function Tile({ photo, profileHref }: { photo: ShowcasePhoto; profileHref?: string }) {
  const src =
    cloudinaryVariant(photo.url, { w: 420, h: 525, fill: true }) ?? photo.url;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={photo.alt}
      loading="lazy"
      decoding="async"
      className="size-full object-cover transition-transform duration-500 ease-[var(--ease-brand)] hover:scale-[1.04]"
    />
  );
  if (profileHref) {
    return (
      <a
        href={profileHref}
        target="_blank"
        rel="noopener noreferrer"
        className={TILE}
        aria-label="See more on Instagram"
      >
        {img}
      </a>
    );
  }
  if (photo.href) {
    return (
      <Link href={photo.href} className={TILE}>
        {img}
      </Link>
    );
  }
  return <span className={TILE}>{img}</span>;
}

export function InstagramStrip({
  photos,
  profileHref,
  handle = "@therareskin",
}: {
  photos: ShowcasePhoto[];
  profileHref?: string;
  handle?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // keep the loop wide enough to cover the viewport even with a handful of
  // photos — cycle the set up to a floor, then the marquee doubles it.
  const base: ShowcasePhoto[] = [];
  if (photos.length > 0) {
    while (base.length < Math.max(6, photos.length)) {
      base.push(photos[base.length % photos.length]);
    }
  }

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track || reduced || base.length === 0) return;
      gsap.set(track, { xPercent: 0 });
      const tween = gsap.to(track, {
        xPercent: -50,
        duration: Math.max(24, base.length * 4.5),
        ease: "none",
        repeat: -1,
      });
      const root = rootRef.current;
      const on = () => tween.timeScale(0);
      const off = () => tween.timeScale(1);
      root?.addEventListener("pointerenter", on);
      root?.addEventListener("pointerleave", off);
      return () => {
        tween.kill();
        root?.removeEventListener("pointerenter", on);
        root?.removeEventListener("pointerleave", off);
      };
    },
    { dependencies: [reduced, base.length], scope: rootRef },
  );

  if (base.length === 0) return null;

  return (
    <section className="overflow-hidden border-t border-line py-[clamp(52px,9vw,108px)]">
      <Container className="mb-[clamp(20px,3vw,34px)] flex items-baseline justify-between gap-4">
        <div>
          <span className="eyebrow mb-2 block">On the skin</span>
          <h2 className="text-[clamp(1.5rem,2.6vw,2.1rem)]">{handle}</h2>
        </div>
        {profileHref && (
          <a
            href={profileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-underline shrink-0 text-[11px] tracking-[0.14em] text-ink-2 uppercase transition-colors hover:text-ink"
          >
            Follow &rarr;
          </a>
        )}
      </Container>

      {reduced ? (
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-[clamp(16px,4vw,64px)]">
          {base.map((p, i) => (
            <Tile key={`${p.url}-${i}`} photo={p} profileHref={profileHref} />
          ))}
        </div>
      ) : (
        <div ref={rootRef}>
          <div
            ref={trackRef}
            className="flex w-max gap-3 will-change-transform"
          >
            {[...base, ...base].map((p, i) => (
              <Tile
                key={`${p.url}-${i}`}
                photo={p}
                profileHref={profileHref}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

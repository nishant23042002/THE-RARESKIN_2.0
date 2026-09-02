import type { CSSProperties } from "react";
import {
  cloudinaryVariant,
  FRAGRANCE_PALETTE,
  type FragranceImages,
  type FragranceSlug,
} from "@/lib/catalog";

interface HeroArt {
  theme: "light" | "dark";
  bg: string;
  bloom: string;
  /** bottom-up wash for text legibility; direction favours the content side */
  scrim: string;
  /** which side the copy block sits on */
  align: "start" | "end";
  bandTone: string;
  bandOpacity: number;
  bottleX: number;
  bottleScale: number;
  button: "onLight" | "onDark";
}

export const HERO_ART: Record<FragranceSlug, HeroArt> = {
  aurevan: {
    theme: "light",
    bg: "linear-gradient(118deg, #f4f0e7 0%, #e9e1d1 52%, #d6ccb5 100%)",
    bloom:
      "radial-gradient(58% 52% at 80% 14%, rgba(255,253,247,0.9), transparent 68%)",
    scrim:
      "linear-gradient(6deg, rgba(236,231,218,0.92) 2%, rgba(236,231,218,0.16) 36%, transparent 60%)",
    align: "start",
    bandTone: "#ffffff",
    bandOpacity: 0.5,
    bottleX: 940,
    bottleScale: 1.9,
    button: "onDark",
  },
  orvelis: {
    theme: "light",
    bg: "linear-gradient(125deg, #f3e4c4 0%, #e6cd97 46%, #c9a457 100%)",
    bloom:
      "radial-gradient(56% 52% at 18% 14%, rgba(255,244,214,0.92), transparent 66%)",
    scrim:
      "linear-gradient(-4deg, rgba(58,40,12,0.5) 2%, rgba(58,40,12,0.12) 38%, transparent 60%)",
    align: "end",
    bandTone: "#ffffff",
    bandOpacity: 0.42,
    bottleX: 680,
    bottleScale: 1.95,
    button: "onDark",
  },
  vayren: {
    theme: "dark",
    bg: "linear-gradient(130deg, #3b2c22 0%, #241b13 50%, #0f0906 100%)",
    bloom:
      "radial-gradient(48% 44% at 22% 16%, rgba(233,220,191,0.15), transparent 70%)",
    scrim:
      "linear-gradient(8deg, rgba(15,9,6,0.8) 2%, rgba(15,9,6,0.22) 42%, transparent 64%)",
    align: "start",
    bandTone: "#e9dcbf",
    bandOpacity: 0.22,
    bottleX: 930,
    bottleScale: 1.95,
    button: "onLight",
  },
};

/**
 * Art-directed backdrop for a hero slide.
 *
 * When a hero banner has been uploaded in the admin (`images.hero`), it fills
 * the frame as a full-bleed `object-cover` photograph — a portrait crop
 * (`images.heroPortrait`) swaps in on phones. The `bloom` + `scrim` gradients
 * stay layered on top so the headline always has enough contrast, whatever the
 * photo does in that corner.
 *
 * With no banner yet, it falls back to the vector placeholder scene: a lit
 * gradient ground, raking light bands and the campaign flacon tinted to the
 * juice.
 */
export function HeroScene({
  fragrance,
  images,
}: {
  fragrance: FragranceSlug;
  images?: FragranceImages;
}) {
  const art = HERO_ART[fragrance];
  const juice = FRAGRANCE_PALETTE[fragrance].juice;
  const banner = images?.hero ?? null;
  const bannerPortrait = images?.heroPortrait ?? images?.hero ?? null;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: art.bg }}
    >
      {banner ? (
        <picture>
          {bannerPortrait && (
            <source
              media="(max-width: 767px)"
              srcSet={cloudinaryVariant(bannerPortrait, { w: 1400 }) ?? bannerPortrait}
            />
          )}
          <img
            src={cloudinaryVariant(banner, { w: 2880 }) ?? banner}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: art.bloom }} />
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1600 1000"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden
          >
            <g opacity={art.bandOpacity}>
              <rect
                x="180"
                y="-200"
                width="300"
                height="1500"
                transform="rotate(20 800 500)"
                fill={art.bandTone}
                opacity="0.55"
              />
              <rect
                x="620"
                y="-200"
                width="150"
                height="1500"
                transform="rotate(20 800 500)"
                fill={art.bandTone}
                opacity="0.3"
              />
              <rect
                x="1140"
                y="-200"
                width="230"
                height="1500"
                transform="rotate(20 800 500)"
                fill={art.bandTone}
                opacity="0.18"
              />
            </g>
            <g transform={`translate(${art.bottleX} 830)`}>
              <use
                href="#cbtl"
                style={{ "--cj": juice } as CSSProperties}
                transform={`scale(${art.bottleScale})`}
              />
            </g>
            <rect width="1600" height="1000" filter="url(#grain)" opacity="0.05" />
          </svg>
        </>
      )}

      {/* bloom + scrim always sit on top so the headline keeps its contrast */}
      {banner && (
        <div
          className="absolute inset-0"
          style={{ background: art.bloom, mixBlendMode: "soft-light" }}
        />
      )}
      <div className="absolute inset-0" style={{ background: art.scrim }} />
    </div>
  );
}

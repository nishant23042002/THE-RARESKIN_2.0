import Link from "next/link";
import type { CSSProperties } from "react";
import { Flacon } from "@/components/ui/flacon";
import { Stars } from "@/components/ui/stars";
import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { cloudinaryVariant, formatINR, type Fragrance } from "@/lib/catalog";

/**
 * One oversized fragrance card in the full-bleed 3-up collection grid. The
 * ground gradient and text tone come straight from the product record; the
 * card exposes them as `--txt` / `--txt-inv` so the on-card buttons and the
 * hover state tint themselves. Presentational — the collection section owns the
 * scroll choreography and drives `[data-sheen]` / the reveal.
 */
export function ProductCard({
  fragrance: f,
  index,
  showRating = false,
}: {
  fragrance: Fragrance;
  index: number;
  /** show the star line when reviews are live and this scent has any */
  showRating?: boolean;
}) {
  const rated = showRating && f.rating.count > 0;
  return (
    <article
      data-card
      style={
        {
          background: f.ground,
          color: f.onGround,
          "--txt": f.onGround,
          "--txt-inv": f.onGroundInverse,
        } as CSSProperties
      }
      className="group relative isolate flex h-full min-h-[clamp(560px,68vh,660px)] flex-col justify-between overflow-hidden p-[clamp(20px,2.4vw,34px)] sm:min-h-[520px]"
    >
      <span
        data-sheen
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3] opacity-40 max-[640px]:hidden motion-reduce:hidden"
        style={{
          background:
            "linear-gradient(118deg, transparent 42%, rgba(255,255,255,0.4) 52%, transparent 62%)",
        }}
      />

      <div className="relative z-[2] flex items-baseline justify-between gap-3">
        <span className="serif-italic text-[clamp(1.05rem,1.7vw,1.45rem)] opacity-50">
          {`0${index + 1}`}
        </span>
        <span className="text-[8.5px] tracking-[0.2em] uppercase opacity-55">
          Extrait de Parfum
        </span>
      </div>

      <Link
        href={`/fragrances/${f.slug}`}
        aria-label={`Open ${f.name}`}
        className="relative z-[2] grid flex-1 place-items-center py-[4%]"
      >
        {(() => {
          const photo = cloudinaryVariant(f.images.flat ?? f.images.hero, {
            w: 640,
          });
          return photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photo}
              alt={f.name}
              className="block w-[clamp(120px,42%,240px)] transition-transform duration-500 ease-[var(--ease-brand)] group-hover:-translate-y-1.5 group-hover:scale-[1.03] group-active:scale-[0.97]"
              style={{ filter: `drop-shadow(0 26px 34px ${f.juice}55)` }}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span
              className="block w-[clamp(84px,26%,148px)] transition-transform duration-500 ease-[var(--ease-brand)] group-hover:-translate-y-1.5 group-hover:scale-[1.03] group-active:scale-[0.97]"
              style={{ filter: `drop-shadow(0 26px 34px ${f.juice}55)` }}
            >
              <Flacon fragrance={f.slug} />
            </span>
          );
        })()}
      </Link>

      <div className="relative z-[2]">
        <h3 className="text-[clamp(1.5rem,2.4vw,2.3rem)] leading-[0.95] tracking-[0.12em]">
          {f.name}
        </h3>
        <p className="mt-2.5 text-[9px] tracking-[0.15em] uppercase opacity-75">
          {f.mood.join(" · ")}
        </p>
        <p className="mt-2 text-[8.5px] leading-[1.9] tracking-[0.08em] uppercase opacity-65">
          {f.notes.join(" · ")}
        </p>
        {rated && (
          <span className="mt-3 inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.1em] uppercase opacity-80">
            <Stars value={f.rating.average} starClassName="size-3" />
            {f.rating.average.toFixed(1)} · {f.rating.count}
          </span>
        )}
        <div className="mt-[clamp(16px,2vw,24px)] flex flex-col items-start gap-3.5">
          <span className="text-[12px] tracking-[0.06em]">
            {formatINR(f.price)}
            <s className="ml-2 text-[10px] opacity-60">{formatINR(f.mrp)}</s>
          </span>
          <AddToBagButton
            sku={f.sku}
            name={f.name}
            price={f.price}
            mrp={f.mrp}
            fragrance={f.slug}
            href={`/fragrances/${f.slug}`}
            meta={`Extrait · ${f.volumeMl} ml`}
            label="Add to bag"
            variant="onCard"
            size="md"
            className="w-full tracking-[0.18em]"
          />
        </div>
      </div>
    </article>
  );
}

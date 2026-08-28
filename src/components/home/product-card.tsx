import Link from "next/link";
import type { CSSProperties } from "react";
import { Flacon } from "@/components/ui/flacon";
import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { formatINR, type Fragrance } from "@/lib/products";

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
}: {
  fragrance: Fragrance;
  index: number;
}) {
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
      className="group relative isolate flex h-full min-h-[440px] flex-col justify-between overflow-hidden p-[clamp(20px,2.4vw,34px)] max-sm:aspect-[4/5] max-sm:h-auto max-sm:min-h-0"
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
        <span
          className="block w-[clamp(84px,26%,148px)] transition-transform duration-500 ease-[var(--ease-brand)] group-hover:-translate-y-1.5 group-hover:scale-[1.03] group-active:scale-[0.97]"
          style={{ filter: `drop-shadow(0 26px 34px ${f.juice}55)` }}
        >
          <Flacon fragrance={f.slug} />
        </span>
      </Link>

      <div className="relative z-[2]">
        <h3 className="text-[clamp(1.5rem,2.4vw,2.3rem)] leading-[0.95] tracking-[0.12em]">
          {f.name}
        </h3>
        <p className="mt-2.5 text-[9px] tracking-[0.15em] uppercase opacity-60">
          {f.mood.join(" · ")}
        </p>
        <p className="mt-2 text-[8.5px] leading-[1.9] tracking-[0.08em] uppercase opacity-50">
          {f.notes.join(" · ")}
        </p>
        <div className="mt-[clamp(16px,2vw,24px)] flex flex-col items-start gap-3.5">
          <span className="text-[12px] tracking-[0.06em]">
            {formatINR(f.price)}
            <s className="ml-2 text-[10px] opacity-45">{formatINR(f.mrp)}</s>
          </span>
          <AddToBagButton
            sku={f.slug}
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

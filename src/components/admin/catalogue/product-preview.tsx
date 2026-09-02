"use client";

import { useEffect, useRef } from "react";

import { Flacon } from "@/components/ui/flacon";
import { Icon } from "@/components/ui/icon";
import { cloudinaryVariant, formatINR, isFragranceSlug } from "@/lib/catalog";

/**
 * A faithful-enough mockup of the storefront PDP, rendered from the *current*
 * (possibly unsaved) form state — so a `catalog_manager` can see how a product
 * reads, with its photo, before flipping it to `active`. Not the real PDP
 * component (that's `Fragrance`-DTO + `FRAGRANCE_PALETTE`-bound); a composition
 * that matches its layout and type.
 */

export interface ProductPreviewData {
  slug: string;
  status: string;
  kind: "fragrance" | "set";
  name: string;
  pronunciation: string;
  title: string;
  poem: string;
  impression: string;
  priceRupees: number;
  mrpRupees: number;
  volumeMl: number;
  mood: string[];
  notes: string[];
  notesByPhase: { arrive: string; linger: string; stay: string };
  longevity: number;
  images: { hero: string | null; flat: string | null; box: string | null };
  colour: { juiceHex: string; ground: string; onGround: string };
}

function GenericBottle({ juice }: { juice: string }) {
  return (
    <svg viewBox="0 0 160 320" className="block h-auto w-full" aria-hidden>
      <ellipse cx="80" cy="300" rx="56" ry="8" fill="#2c2a26" opacity="0.14" />
      <rect x="30" y="84" width="100" height="176" rx="6" fill="#eceae3" />
      <rect
        x="30"
        y="84"
        width="100"
        height="176"
        rx="6"
        fill={juice}
        opacity="0.9"
      />
      <rect
        x="30"
        y="84"
        width="100"
        height="176"
        rx="6"
        fill="none"
        stroke="#c9c6bd"
        strokeWidth="1"
      />
      <rect x="40" y="92" width="4" height="160" rx="2" fill="#fff" opacity="0.4" />
      <rect x="56" y="70" width="48" height="7" fill="#c9a24a" />
      <rect x="66" y="76" width="28" height="9" fill="#d9d6cd" />
      <rect x="52" y="8" width="56" height="64" rx="6" fill="#1c1a17" />
    </svg>
  );
}

export function ProductPreview({
  open,
  data,
  onClose,
}: {
  open: boolean;
  data: ProductPreviewData;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  const photos = [data.images.flat, data.images.hero, data.images.box].filter(
    (u): u is string => Boolean(u),
  );
  const phases: [string, string][] = [
    ["Arrive", data.notesByPhase.arrive],
    ["Linger", data.notesByPhase.linger],
    ["Stay", data.notesByPhase.stay],
  ];
  const save = Math.max(0, data.mrpRupees - data.priceRupees);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      // this is a mock of the *storefront*, which is always light — pin the
      // token scope so it doesn't follow the admin's dark theme
      data-admin-theme="light"
      className="ui-surface m-auto w-[min(96vw,900px)] border border-line bg-bg p-0 text-ink backdrop:bg-ink/50"
    >
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <span className="text-[10.5px] font-medium tracking-[0.14em] text-ink-3 uppercase">
          Preview · how it reads on the storefront
          {data.status !== "active" && (
            <span className="ml-2 rounded-full border border-gilt/50 px-2 py-0.5 text-[9px] text-[#8f6118]">
              {data.status} — not live
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-ink-3 hover:text-ink"
          aria-label="Close preview"
        >
          <Icon name="close" className="size-[14px]" />
        </button>
      </div>

      <div className="max-h-[80vh] overflow-y-auto p-[clamp(18px,3vw,34px)]">
        <div className="grid gap-[clamp(24px,4vw,48px)] lg:grid-cols-2 lg:items-start">
          {/* gallery */}
          <div className="grid gap-3">
            <div
              className="relative grid aspect-[1/1.06] place-items-center overflow-hidden rounded-[3px] border border-line"
              style={{
                background:
                  photos.length > 0
                    ? "var(--color-surface)"
                    : "linear-gradient(165deg, var(--color-w0), var(--color-w1) 60%, var(--color-w2))",
              }}
            >
              {photos[0] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={cloudinaryVariant(photos[0], { w: 900 }) ?? photos[0]}
                  alt={data.name}
                  className="h-full w-full object-cover"
                />
              ) : isFragranceSlug(data.slug) ? (
                <span className="block w-[46%]">
                  <Flacon fragrance={data.slug} label volume />
                </span>
              ) : (
                <span className="block w-[42%]">
                  <GenericBottle juice={data.colour.juiceHex} />
                </span>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2.5">
                {photos.slice(0, 4).map((p, i) => (
                  <span
                    key={i}
                    className="aspect-square flex-1 overflow-hidden rounded-[2px] border border-line"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cloudinaryVariant(p, { w: 160 }) ?? p}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* copy + buy box */}
          <div>
            <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-light tracking-[0.1em]">
              {data.name || "Untitled"}
            </h1>
            {data.pronunciation && (
              <p className="mt-2 text-[11.5px] tracking-[0.04em] text-ink-3">
                {data.pronunciation}
              </p>
            )}
            <p className="mt-1 text-[10px] tracking-[0.24em] text-ink-3 uppercase">
              {data.kind === "set" ? "Discovery Set" : "Extrait de Parfum"}
            </p>
            {data.title && (
              <p className="mt-4 inline-flex items-center gap-2 text-[11px] tracking-[0.18em] text-ink-2 uppercase">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: data.colour.juiceHex }}
                />
                {data.title}
              </p>
            )}
            {data.poem && (
              <p className="serif-italic mt-3.5 max-w-[40ch] text-[1.15rem] leading-[1.5] text-ink-2">
                {data.poem}
              </p>
            )}

            <div className="mt-6 rounded-[4px] border border-line-2 bg-surface p-[clamp(16px,3vw,24px)]">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <span className="text-[clamp(1.7rem,3.4vw,2.3rem)] leading-none font-light">
                  {formatINR(data.priceRupees || 0)}
                </span>
                {data.mrpRupees > data.priceRupees && (
                  <s className="text-[15px] text-ink-3">
                    {formatINR(data.mrpRupees)}
                  </s>
                )}
                <span className="rounded-full bg-cta px-2.5 py-1 text-[9px] tracking-[0.14em] text-w0 uppercase">
                  Launch offer
                </span>
              </div>
              <p className="mt-2 text-[11px] tracking-[0.03em] text-ink-3">
                {save > 0 ? `Save ${formatINR(save)} · ` : ""}
                {data.volumeMl} ml · price all-inclusive
              </p>
              <div className="mt-4 rounded-[2px] bg-cta px-4 py-3 text-center text-[11px] tracking-[0.16em] text-w0 uppercase">
                Add to bag · {formatINR(data.priceRupees || 0)}
              </div>
            </div>

            {(data.notesByPhase.arrive ||
              data.notesByPhase.linger ||
              data.notesByPhase.stay) && (
              <section className="mt-8 border-t border-line pt-6">
                <h2 className="mb-3 text-[10.5px] tracking-[0.16em] text-ink-3 uppercase">
                  How it unfolds
                </h2>
                <dl>
                  {phases.map(([k, v], i) => (
                    <div
                      key={k}
                      className={`grid grid-cols-[84px_1fr] gap-3.5 py-2.5 text-[13.5px] ${
                        i < 2 ? "border-b border-line" : ""
                      }`}
                    >
                      <dt className="pt-[3px] text-[9.5px] tracking-[0.16em] text-ink-3 uppercase">
                        {k}
                      </dt>
                      <dd>{v || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {data.notes.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {data.notes.map((n) => (
                  <span
                    key={n}
                    className="rounded-full border border-line-2 px-3 py-1.5 text-[10.5px] tracking-[0.06em] text-ink-2 uppercase"
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}

            {data.impression && (
              <p className="serif-italic mt-6 text-[1.05rem] text-ink-2">
                &ldquo;{data.impression}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}

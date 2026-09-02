"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Mark } from "@/components/ui/mark";
import { Icon } from "@/components/ui/icon";
import { Flacon } from "@/components/ui/flacon";
import { useCart } from "@/components/providers/cart-provider";
import { useScrolled } from "@/hooks/use-scrolled";
import { cloudinaryVariant, isFragranceSlug } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import type { FragranceSlug } from "@/lib/catalog";
import type { SiteSettingsInput } from "@/lib/validation/site-settings";

type Campaign = SiteSettingsInput["campaign"];

export interface CampaignProduct {
  name: string;
  image: string | null;
  fragrance?: FragranceSlug;
}

/**
 * The running offer — "Buy 1, get 1", a festive drop — as a small, calm corner
 * card rather than a full-width banner. Borrowed from how a marketplace keeps a
 * "Sponsored" label present without hijacking the page: it's always in the same
 * spot, easy to ignore, one tap to read, one tap to dismiss.
 *
 * Collapsed it's a pill with the ∧ mark and the headline; a slow light sweep
 * passes over it every few seconds so it stays noticed without moving. Tap to
 * expand the detail + CTA. Dismissal is per-offer (`code`) in localStorage, so
 * bumping the code in Site Settings brings it back for the next campaign. It
 * rides just above the bag bar and tucks away over the footer, like the bar.
 */

const key = (code: string) => `rrs.campaign:${code || "current"}`;

function endsLabel(iso: string): string | null {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  if (days <= 6)
    return `Ends ${end.toLocaleDateString("en-IN", { weekday: "long" })}`;
  return `Ends ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

export function CampaignNote({
  campaign,
  products = [],
}: {
  campaign: Campaign;
  /** a few product packshots to show inside the expanded card */
  products?: CampaignProduct[];
}) {
  const { count, isOpen } = useCart();
  const scrolled = useScrolled(64);
  // SSR + the first client render both paint nothing, so hydration matches; the
  // card only appears after mount (rAF, so the setState isn't an effect-body
  // statement — matches the pattern in site-menu.tsx).
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [overFooter, setOverFooter] = useState(false);

  const live = campaign.active && campaign.label.trim().length > 0;

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setMounted(true);
      try {
        setDismissed(localStorage.getItem(key(campaign.code)) === "1");
      } catch {
        /* private mode — leave it visible */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [campaign.code]);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver(
      ([e]) => setOverFooter(e.isIntersecting),
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  const ends = useMemo(() => endsLabel(campaign.endsAt), [campaign.endsAt]);

  // the bag bar occupies the bottom strip once the reader scrolls with a
  // non-empty bag — sit above it then, at the corner otherwise
  const barUp = count > 0 && scrolled && !isOpen;

  if (!mounted || !live || dismissed || overFooter) return null;

  function dismiss() {
    setDismissed(true);
    setOpen(false);
    try {
      localStorage.setItem(key(campaign.code), "1");
    } catch {
      /* private mode — it just re-shows next visit */
    }
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed left-4 z-30 flex max-w-[min(340px,calc(100vw-2rem))] flex-col items-start gap-2 transition-[bottom] duration-300 sm:left-6",
        barUp ? "bottom-[84px]" : "bottom-4",
      )}
    >
      {open && (
        <div className="campaign-rise pointer-events-auto w-full rounded-[5px] border border-line bg-surface p-4 shadow-[0_20px_50px_-30px_rgba(35,33,32,0.4)]">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[8.5px] font-medium tracking-[0.2em] text-ink-3 uppercase">
              Offer
            </span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss this offer"
              className="-m-1 p-1 text-ink-3 transition-colors hover:text-ink"
            >
              <Icon name="close" className="size-3" />
            </button>
          </div>
          <p className="serif mt-1.5 text-[1.1rem] leading-snug text-ink">
            {campaign.label}
          </p>
          {campaign.detail.trim() && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">
              {campaign.detail}
            </p>
          )}

          {products.length > 0 && (
            <div className="mt-3 flex gap-1.5">
              {products.slice(0, 3).map((p) => {
                const url = cloudinaryVariant(p.image ?? undefined, {
                  w: 120,
                  h: 150,
                  fill: true,
                });
                return (
                  <span
                    key={p.name}
                    className="grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-[3px] border border-line bg-surface-2"
                    title={p.name}
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    ) : p.fragrance && isFragranceSlug(p.fragrance) ? (
                      <Flacon fragrance={p.fragrance} className="w-7" />
                    ) : (
                      <Mark className="w-4 text-ink-3" />
                    )}
                  </span>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            {campaign.href.trim() ? (
              <Link
                href={campaign.href}
                onClick={() => setOpen(false)}
                className="nav-underline text-[10.5px] tracking-[0.14em] text-ink uppercase"
              >
                See the offer &rarr;
              </Link>
            ) : (
              <span />
            )}
            {ends && (
              <span className="text-[9px] tracking-[0.12em] text-ink-3 uppercase">
                {ends}
              </span>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Hide offer" : `Offer — ${campaign.label}`}
        className="campaign-pill pointer-events-auto group inline-flex items-center gap-2.5 rounded-full border border-line bg-surface py-2 pr-3.5 pl-2.5 text-left shadow-[0_10px_28px_-18px_rgba(35,33,32,0.5)]"
      >
        <span className="grid size-6 place-items-center rounded-full bg-w4 text-w0">
          <Mark className="w-[11px]" strokeWidth={1.6} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] tracking-[0.04em] text-ink">
            {campaign.label}
          </span>
        </span>
        <Icon
          name="chevron"
          className={cn(
            "size-3 shrink-0 text-ink-3 transition-transform",
            open ? "-rotate-90" : "rotate-90",
          )}
        />
      </button>
    </div>
  );
}

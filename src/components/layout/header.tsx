"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Mark } from "@/components/ui/mark";
import { useScrolled } from "@/hooks/use-scrolled";
import { useCart } from "@/components/providers/cart-provider";
import { useNavTone } from "@/components/providers/nav-tone";
import { fragranceList } from "@/lib/products";
import { SiteMenu } from "./site-menu";

/**
 * Fixed header (rendered inside the fixed top strip with the announcement bar).
 * Transparent over the hero, painting itself in the tone the active hero slide
 * asks for; once the page is scrolled it goes frosted + ink and condenses.
 * The state change rides one long quint-out curve (`--ease-nav`), Polène-style.
 */
export function Header() {
  const scrolled = useScrolled();
  const { tone } = useNavTone();
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, openCart } = useCart();

  const effectiveTone = scrolled ? "dark" : tone;

  return (
    <>
      <header
        className="site-header"
        data-scrolled={scrolled}
        data-tone={effectiveTone}
      >
        <div className="site-header__row mx-auto grid max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 sm:px-10 xl:px-[72px]">
          <div className="justify-self-start">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              className="nav-underline group inline-flex items-center gap-2 py-1 text-[10.5px] tracking-[0.16em] uppercase"
            >
              <Mark className="w-3 transition-transform duration-300 ease-[var(--ease-brand)] group-hover:-translate-y-0.5" />
              Index
            </button>
          </div>

          <Link
            href="/"
            aria-label="THE RARESKIN, home"
            className="site-header__wordmark justify-self-center"
          >
            <Logo className="w-[146px] sm:w-[160px]" />
          </Link>

          <div className="justify-self-end">
            <button
              type="button"
              onClick={openCart}
              aria-label={`Open bag, ${count} ${count === 1 ? "item" : "items"}`}
              className="nav-underline inline-flex items-center gap-[7px] py-1 text-[10.5px] tracking-[0.14em] uppercase"
            >
              Bag <b className="font-normal tabular-nums">{count}</b>
            </button>
          </div>
        </div>

        {/* fragrance index — laptop and up, collapses on scroll */}
        <nav
          aria-label="Fragrances"
          className="site-header__index hidden lg:block"
        >
          <div className="mx-auto flex max-w-[1500px] items-center justify-center gap-[clamp(18px,3vw,46px)] px-5 sm:px-10 xl:px-[72px]">
            {fragranceList.map((f) => (
              <Link
                key={f.slug}
                href={`/fragrances/${f.slug}`}
                style={{ "--underline-color": f.accent } as CSSProperties}
                className="nav-underline inline-flex items-center gap-[9px] py-[3px] text-[10.5px] tracking-[0.14em] uppercase opacity-75 transition-opacity hover:opacity-100"
              >
                <span
                  className="size-[6px] shrink-0 rounded-full"
                  style={{ background: f.accent }}
                />
                {f.name}
              </Link>
            ))}
            <Link
              href="/discovery-set"
              className="nav-underline py-[3px] text-[10.5px] tracking-[0.14em] uppercase"
            >
              Discovery Set
            </Link>
          </div>
        </nav>
      </header>

      <SiteMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

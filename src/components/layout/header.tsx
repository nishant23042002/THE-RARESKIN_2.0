"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { MenuIcon } from "@/components/ui/menu-icon";
import { useScrolled } from "@/hooks/use-scrolled";
import { useCart } from "@/components/providers/cart-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { useNavTone } from "@/components/providers/nav-tone";
import type { CatalogNavItem } from "@/lib/catalog";
import { SiteMenu } from "./site-menu";

/**
 * Fixed header (rendered inside the fixed top strip with the announcement bar).
 * Transparent over the hero, painting itself in the tone the active hero slide
 * asks for; once the page is scrolled it goes frosted + ink and condenses.
 * The state change rides one long quint-out curve (`--ease-nav`), Polène-style.
 */
export function Header({ nav }: { nav: CatalogNavItem[] }) {
  const scrolled = useScrolled();
  const { tone } = useNavTone();
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, openCart } = useCart();
  const { status, openSignIn } = useAuth();
  // The storefront shell is server-rendered with no session knowledge; the
  // client seeds auth from a sessionStorage cache. Gate the auth-dependent
  // control on mount so SSR and first paint agree (no hydration mismatch) —
  // repeat visitors see a one-frame "Sign in" → "Account" swap.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const authed = mounted && status === "authed";

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
              aria-label="Open menu"
              className="group inline-flex items-center gap-2.5 py-2 text-[10.5px] tracking-[0.16em] uppercase"
            >
              <MenuIcon />
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>

          <Link
            href="/"
            aria-label="THE RARESKIN, home"
            className="site-header__wordmark justify-self-center"
            style={{
              display: "block",
              width: "clamp(104px, 26vw, 140px)",
              maxWidth: "140px",
            }}
          >
            <Logo className="w-full" />
          </Link>

          <div className="flex items-center justify-self-end gap-4 sm:gap-5">
            {authed ? (
              <Link
                href="/account"
                className="nav-underline hidden py-1 text-[10.5px] tracking-[0.14em] uppercase sm:inline"
              >
                Account
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openSignIn()}
                className="nav-underline hidden py-1 text-[10.5px] tracking-[0.14em] uppercase sm:inline"
              >
                Sign in
              </button>
            )}
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
            {nav.map((f) => (
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

      <SiteMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        nav={nav}
      />
    </>
  );
}

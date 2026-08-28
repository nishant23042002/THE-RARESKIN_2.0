# THE RARESKIN

The storefront for THE RARESKIN — three Extrait de Parfum, a Discovery Set,
India / INR. Built greenfield from the approved "Campaign" prototype.

- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **Styling:** Tailwind CSS v4 — CSS-first `@theme` tokens in `src/app/globals.css`
- **Motion:** GSAP 3 + ScrollTrigger + `@gsap/react`, Lenis smooth scroll
- **Commerce:** front-end-first — a working `localStorage` cart behind a
  provider interface; checkout is a clearly-marked placeholder until a real
  provider (Razorpay) is wired in
- **Fonts:** Jost + Newsreader via `next/font/google`

---

## Getting started

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Other scripts:

```bash
pnpm build          # production build (also runs the TS check)
pnpm start          # serve the production build
pnpm lint           # eslint
```

Copy `.env.example` to `.env.local` if you need to override the site URL or
start wiring integrations — nothing in it is required to build and run.

---

## Project structure

```
src/
  app/
    layout.tsx            fonts, providers, header/footer, base metadata, Org JSON-LD
    page.tsx              homepage — composes the home/* sections
    globals.css           Tailwind import + @theme tokens + component layer
    fragrances/[slug]/    PDP (static, per-fragrance metadata + Product/Breadcrumb JSON-LD)
    discovery-set/  the-idea/  faq/  contact/  shipping/  returns/  privacy/  terms/
    not-found.tsx
    sitemap.ts  robots.ts  manifest.ts  icon.tsx  apple-icon.tsx  opengraph-image.tsx
    api/newsletter/  api/contact/   (validation stubs — see below)
  components/
    layout/    AnnouncementBar  Header  SiteMenu  Footer  PageIntro  LegalDoc
    home/      Hero  ImpressionMarquee  Collection  ProductCard  Quiz  DiscoverySet
               WhyExtrait  TheIdea  Reviews  Newsletter
    product/   PdpGallery  PdpReviews
    cart/      CartProvider(*)  CartDrawer  CartBar  CartToast  CartLine  AddToBagButton
    contact/   ContactForm
    ui/        Button  Mark(∧)  Flacon(SVG)  Container  Carousel  Accordion  Reveal
               Logo  MenuIcon  Wordmark  PaymentMarks  SvgDefs
    providers/ SmoothScroll  GsapLenisBridge  NavToneProvider  ScrollbarVar
  hooks/       useScrolled  useReducedMotion
  lib/
    products.ts            single source of truth for the catalogue + DISCOVERY_SET
    cart.ts                cart types + reducer + localStorage helpers
    commerce/index.ts      CommerceProvider interface + placeholderProvider
    faq.ts                 FAQ content (also feeds FAQPage JSON-LD)
    quiz.ts                quiz questions + tally
    seo.ts                 pageMeta() + Organization / BreadcrumbList JSON-LD
    site.ts                SITE constants + real CONTACT details
    gsap.ts  motion.ts  cn.ts
public/
  brand/rareskin-wordmark.png     wordmark artwork (rendered as a CSS mask)
  pay/                            vendored card-network SVGs + India flag
```

`(*)` `CartProvider` lives in `components/providers/`.

---

## Key decisions

**Front-end-first commerce.** `src/lib/cart.ts` holds the cart in
`localStorage` (`rareskin:cart:v1`), hydration-safe. `src/lib/commerce/index.ts`
exposes:

```ts
interface CommerceProvider { startCheckout(lines: CartLine[]): Promise<CheckoutResult> }
```

`commerce` currently points at `placeholderProvider`, which makes the drawer
show a "checkout opens at launch" state.

**Design tokens.** All colour / type / easing values are CSS custom properties
in the `@theme` block of `globals.css`. Change them there, not in components.

**Motion.** `<SmoothScroll>` drives Lenis from `gsap.ticker`; every animated
component uses `useGSAP({ scope })` for automatic cleanup. A global
`@media (prefers-reduced-motion: reduce)` guard plus `useReducedMotion()` /
`gsap.matchMedia()` cover reduced motion.

**Placeholder art.** Bottles and campaign scenes are art-directed SVG
(`Flacon`, `HeroScene`). Real photography drops into `public/images/<slug>/`
and the `images.hero|flat|box` slots in `products.ts` / `PdpGallery`.

---

## Environment variables

See `.env.example`. All optional:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | canonical domain (metadata, sitemap, OG). Set to the real domain in production. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `NEXT_PUBLIC_RAZORPAY_KEY_ID` | for the future checkout provider |
| `CONTACT_FORWARD_EMAIL` | where `/api/contact` should send messages |
| `NEWSLETTER_API_KEY` / `NEWSLETTER_LIST_ID` | newsletter provider |
| `NEXT_PUBLIC_ANALYTICS_ID` | analytics |

---

## Wiring the integrations

### Checkout (Razorpay)

1. Add a `src/lib/commerce/razorpay.ts` that implements `CommerceProvider`
   (create a Razorpay order server-side in an API route, return
   `{ kind: "redirect", url }` or open the Razorpay modal).
2. In `src/lib/commerce/index.ts`, switch `export const commerce` from
   `placeholderProvider` to the Razorpay one, guarded on the env keys.
3. No UI changes — `CartDrawer` already calls `commerce.startCheckout(lines)`.

### Contact & newsletter forms

`src/app/api/contact/route.ts` and `src/app/api/newsletter/route.ts` validate
the payload and return `{ ok: true }` without delivering anything. Replace the
`// TODO` in each with a call to your email/ESP provider. The client components
(`ContactForm`, `Newsletter`) already handle success and error states.

### Product photography

Drop images into `public/images/<slug>/hero.jpg` etc., then swap the `<Flacon>`
placeholders in `components/product/pdp-gallery.tsx` and
`components/home/hero-scene.tsx` for `next/image`. The layout is already built
around the final aspect ratios.

---

## Deploy (Vercel)

1. Push to a Git repo and import it in Vercel — framework preset **Next.js**,
   no build config needed.
2. Set `NEXT_PUBLIC_SITE_URL` to the production domain in the Vercel project's
   Environment Variables (Production). Add any integration keys as they land.
3. Add the custom domain in Vercel → Settings → Domains.
4. Every push builds a Preview deployment; promote to Production from the
   Vercel dashboard or by pushing to the default branch.

`pnpm build` must pass locally before deploying.

---

## Pre-launch checklist

Content that ships as a deliberate placeholder and needs a real value / review
before going live:

- **Domain** — confirm `NEXT_PUBLIC_SITE_URL` / the value in `lib/site.ts`.
- **Checkout** — implement the Razorpay `CommerceProvider` (see above).
- **Contact & newsletter** — connect the API stubs to a real inbox / ESP.
- **Legal pages** — Shipping / Returns / Privacy / Terms carry real,
  brand-specific copy but should get a final legal review. Confirm the values
  chosen as sensible defaults: 7-day return window, 48-hour damage-report
  window, delivery estimates, 5–7 day refund timeline, Raigad jurisdiction,
  and the DPDP grievance-officer contact.
- **FAQ** — verify the assertions ("bottled in India by Velocity Ventures
  Group", "ingredient list printed on every carton", phone hours). Add an
  animal-testing / vegan statement when the position is set.
- **Founder portrait** — `/the-idea` has a 4:5 placeholder card awaiting the
  real photo.
- **Packaging copy** — the PDP "What's in the box" answer describes a
  recyclable carton + a wear card; confirm this matches the actual packaging.
- **Reviews** — the PDP "Impressions" deck and the homepage Reviews block are
  labelled placeholders until verified-buyer reviews exist.
- **Indexing** — `metadata.robots` in `layout.tsx` is `index: true`. Set it to
  `false` if you want the site hidden from search until launch.

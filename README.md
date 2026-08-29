# THE RARESKIN

The storefront for THE RARESKIN — three Extrait de Parfum, a Discovery Set,
India / INR. Built greenfield from the approved "Campaign" prototype.

- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **Styling:** Tailwind CSS v4 — CSS-first `@theme` tokens in `src/app/globals.css`
- **Motion:** GSAP 3 + ScrollTrigger + `@gsap/react`, Lenis smooth scroll
- **Commerce:** a `localStorage` working cart that syncs to a server cart
  (guest + account, merged on sign-in); checkout is a **right-side drawer** that
  slides bag → checkout → confirmation (no separate route), with a server-side
  GST engine, coupon + store-credit application, pincode serviceability and
  atomic stock reservation. Orders are created server-side with correct maths
  and a stock hold; **payment is stubbed** until Razorpay is wired (next phase).
  See [`docs/checkout.md`](docs/checkout.md).
- **Data layer:** MongoDB Atlas + Mongoose, Zod validation shared client/server,
  Cloudinary for media, `migrate-mongo` migrations. The storefront reads the
  catalogue (products, prices, copy, SEO) from the database via a `server-only`
  access layer with tag-based ISR — edits go live without a deploy. See
  [`docs/data-layer.md`](docs/data-layer.md).
- **Auth:** passwordless phone-OTP (Twilio Verify) with revocable DB sessions,
  a sign-in **modal** (not a page), and a `/account` area. Rate-limited
  (Upstash), Turnstile-ready. Works locally with a dev code — no SMS account
  needed. See [`docs/auth.md`](docs/auth.md).
- **Route transition:** every in-app navigation plays a full-viewport branded
  curtain that closes toward your tap and parts to reveal the next page,
  context-aware to the destination. See
  [`docs/route-transition.md`](docs/route-transition.md).
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
pnpm typecheck      # tsc --noEmit
```

Database (needs `MONGODB_URI` in `.env.local` — see `docs/data-layer.md`):

```bash
pnpm db:migrate         # apply pending migrations
pnpm db:migrate:status  # show migration state
pnpm db:seed            # import the catalogue + settings (idempotent)
pnpm db:check           # connectivity probe
pnpm catalog list       # inspect the live catalogue
pnpm catalog set aurevan price 749   # edit a field + bump the cache
pnpm catalog set vayren stock 60     # set an inventory level
pnpm coupon add WELCOME10 percent 10 # create a discount code (admin UI later)
pnpm revalidate         # refresh the storefront cache on demand
```

Copy `.env.example` to `.env.local` to wire integrations. The storefront still
builds and runs with none of it set; the data-layer scripts need at least
`MONGODB_URI`.

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
    cart/      CartProvider(*)  CartDrawer("The Counter")  CheckoutPanel  CartBar
               CartToast  CartLine  AddToBagButton
    contact/   ContactForm
    ui/        Button  Mark(∧)  Flacon(SVG)  Container  Carousel  Accordion  Reveal
               Logo  MenuIcon  Wordmark  PaymentMarks  SvgDefs
    providers/ SmoothScroll  GsapLenisBridge  NavToneProvider  ScrollbarVar
               AuthProvider  RouteTransitionProvider ("The Aperture")
  hooks/       useScrolled  useReducedMotion
  lib/
    catalog.ts             isomorphic catalogue DTO types + formatINR + brand palette
    money.ts               paise <-> rupee helpers — all money is integer paise
    validation/            Zod schemas shared by client forms and the server
    cart.ts                cart types + reducer + localStorage helpers
    checkout.ts            isomorphic checkout / quote / order DTOs
    pincode.ts             India PIN -> GST state resolution + state list
    faq.ts                 FAQ content (also feeds FAQPage JSON-LD)
    quiz.ts                quiz questions + tally
    seo.ts                 pageMeta() + Organization / BreadcrumbList JSON-LD
    site.ts                SITE constants + real CONTACT details
    gsap.ts  motion.ts  cn.ts
  server/                  server-only — DB, secrets, media, auth (never imported client-side)
    env.ts                 Zod-validated process.env accessor
    db/                    cached Mongoose connection + model re-exports
    models/                Product MediaAsset SiteSettings User Counter AuditLog Session OtpChallenge
    data/catalog.ts        the storefront's catalogue access layer (cached, tagged)
    auth/                  phone-OTP sessions, rate limiting, Twilio/Turnstile
    cloudinary.ts          signed direct-upload params + delivery URLs
  proxy.ts                 optimistic auth gate for /account, /admin
  app/api/revalidate/      on-demand cache purge (bearer REVALIDATE_SECRET)
  app/api/auth/            otp/start · otp/verify · logout · session · sessions/revoke-all
migrations/                versioned, reversible migrate-mongo migrations
scripts/                   db:seed / db:check / catalog (tsx, load .env via @next/env)
docs/data-layer.md         how the data layer works + provisioning steps
public/
  brand/rareskin-wordmark.png     wordmark artwork (rendered as a CSS mask)
  pay/                            vendored card-network SVGs + India flag
```

`(*)` `CartProvider` lives in `components/providers/`.

---

## Key decisions

**Commerce.** `src/lib/cart.ts` holds the working cart in `localStorage`
(`rareskin:cart:v1`), hydration-safe; the `CartProvider` syncs it to a server
`Cart` (folding a guest bag into the account on sign-in). Checkout is **one
right-side drawer** — `CartDrawer` ("The Counter") slides between `bag`,
`checkout` (`checkout-panel.tsx`) and `done`; there is no `/checkout` route. The
panel collects contact + address and calls the server, which is the only place
money and stock are decided:

- `src/server/commerce/pricing.ts` — tax-inclusive GST engine: grand total is
  built from catalogue prices, tax is what's *within* it, split CGST+SGST for
  Maharashtra deliveries else IGST.
- `coupons.ts` / `store-credit.ts` — validation + a real credit ledger (the
  Discovery-Set credit), applied inside the order transaction.
- `inventory.ts` — a guarded atomic `$inc` + a `stockLedger` row per movement.
- `orders.ts` — `quoteOrder()` (a hint) and `placeOrder()` (authoritative, in a
  MongoDB transaction, idempotent per client key).

`flags.checkoutEnabled` in Site Settings gates the customer-facing flow (off
until launch); it's always usable in development.

**Design tokens.** All colour / type / easing values are CSS custom properties
in the `@theme` block of `globals.css`. Change them there, not in components.

**Motion.** `<SmoothScroll>` drives Lenis from `gsap.ticker`; every animated
component uses `useGSAP({ scope })` for automatic cleanup. A global
`@media (prefers-reduced-motion: reduce)` guard plus `useReducedMotion()` /
`gsap.matchMedia()` cover reduced motion.

**Placeholder art.** Bottles and campaign scenes are art-directed SVG
(`Flacon`, `HeroScene`). Real photography is uploaded to Cloudinary through the
admin and stored on each product's `media` field; the DAL then serves those
URLs in place of the `/images/<slug>/…` fallbacks.

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

### Checkout (Razorpay — next phase)

The order pipeline is built; only the payment step is stubbed. To wire Razorpay:

1. In `placeOrder()`, move the stock `commit` behind a short reservation (Redis
   key) and create the order as `pending` with a Razorpay order id.
2. Add `POST /api/checkout/razorpay/callback` (verify the signature) and
   `POST /api/webhooks/razorpay` (idempotent, dedup by event id) — the webhook
   confirms the order, commits the reservation, and issues the Discovery-Set
   credit (currently issued at order-creation for testability).
3. In `checkout-panel.tsx`, the `method === "razorpay"` branch opens the
   Razorpay modal (over the drawer) instead of placing directly; COD keeps the
   current path. The drawer's `done` view already handles confirmation.

Set `flags.checkoutEnabled: true` in Site Settings when ready for customers.

### Contact & newsletter forms

`src/app/api/contact/route.ts` and `src/app/api/newsletter/route.ts` validate
the payload and return `{ ok: true }` without delivering anything. Replace the
`// TODO` in each with a call to your email/ESP provider. The client components
(`ContactForm`, `Newsletter`) already handle success and error states.

### Product photography

Upload packshots / campaign images through the admin (Phase G) — they land in
Cloudinary and attach to a product's `media` field, and the catalogue DAL
serves them automatically. Until then the `<Flacon>` / `<HeroScene>` vector
placeholders stand in, sized to the final aspect ratios; swap them for
`next/image` in `components/product/pdp-gallery.tsx` and
`components/home/hero-scene.tsx` once real assets exist.

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
- **Checkout / payment** — the order pipeline is done; wire Razorpay (see
  "Wiring the integrations"), then flip `flags.checkoutEnabled` in Site
  Settings. Until then the checkout drawer shows "opens with launch" for
  customers.
- **Coupons** — created with `pnpm coupon add …` for now (admin UI is a later
  phase). None ship by default.
- **Stock** — every product seeds at `stock: 0`; set real levels with
  `pnpm catalog set <slug> stock <n>` (or the admin) before launch.
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

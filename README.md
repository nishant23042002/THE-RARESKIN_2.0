# THE RARESKIN

The storefront for THE RARESKIN — three Extrait de Parfum, a Discovery Set,
India / INR. Built greenfield from the approved "Campaign" prototype.

- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **Styling:** Tailwind CSS v4 — CSS-first `@theme` tokens in `src/app/globals.css`
- **Motion:** GSAP 3 + ScrollTrigger + `@gsap/react`, Lenis smooth scroll
- **Commerce:** a `localStorage` working cart that syncs to a server cart
  (guest + account, merged on sign-in); checkout is a **right-side drawer** that
  slides bag → checkout → payment → confirmation (no separate route), with a
  server-side GST engine, coupon + store-credit application, pincode
  serviceability and atomic stock decrement. **Razorpay hosted checkout** is
  wired end to end, **payment-first** — an online order is created only once the
  payment is verified (failed/abandoned payments leave nothing behind); verified
  webhook (authoritative), immutable payment log, refund path, oversell
  auto-refund. Works locally without keys via a "simulate payment" panel. See
  [`docs/checkout.md`](docs/checkout.md) and [`docs/payments.md`](docs/payments.md).
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
pnpm coupon add WELCOME10 percent 10 # create a discount code (coupon UI in G3)
pnpm revalidate         # refresh the storefront cache on demand
pnpm email:test RRS-2026-000001  # render every order email to .mail/ (dev)
pnpm email:preview      # react-email dev server for the templates
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

### Payments (Razorpay)

Wired end to end (Test Mode). Full setup + guarantees in
[`docs/payments.md`](docs/payments.md). The short version:

1. `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (Test Mode) → hosted checkout goes
   live; blank → the local "simulate payment" panel.
2. Create a webhook at `/api/webhooks/razorpay` for `payment.captured`,
   `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`,
   `payment.dispute.created`; its secret → `RAZORPAY_WEBHOOK_SECRET`.
3. `CRON_SECRET` in the Vercel project (crons in `vercel.json`: reconcile
   payments daily, drain the email outbox every 2 min).
4. Flip `flags.checkoutEnabled: true` in Site Settings.

### Emails (Resend)

Order-lifecycle email is wired end to end — see [`docs/email.md`](docs/email.md).
A durable `emailmessages` outbox, an opportunistic `after()` drain, and a `*/2`
cron sweep as the guarantee. Blank `RESEND_API_KEY` → every email renders to
`.mail/*.html` for local review (`pnpm email:test <orderNumber>`,
`pnpm email:preview`). Going live: verify a domain, set `RESEND_API_KEY` /
`EMAIL_FROM` / `RESEND_WEBHOOK_SECRET`.

### Invoices

Every non-cancelled order has a downloadable PDF invoice —
`GET /api/account/orders/<orderNumber>/invoice` (a "Download invoice" button on
the order page, a link in the confirmation email). Rendered on demand with
`@react-pdf/renderer` from `src/server/invoice/` — brand wordmark, the tri-juice
rule, a flacon glyph per fragrance with its notes, both party blocks, the full
pricing ladder (discount, credit, shipping, COD fee, GST when applicable),
exact payment method, and the amount in words. Brand fonts (`public/fonts/*.woff`)
are bundled into the route via `outputFileTracingIncludes`.

### Contact & newsletter forms

`src/app/api/contact/route.ts` and `src/app/api/newsletter/route.ts` validate
the payload and return `{ ok: true }` without delivering anything. Replace the
`// TODO` in each with a call to your email/ESP provider. The client components
(`ContactForm`, `Newsletter`) already handle success and error states.

### Product photography

Upload packshots through **`/admin/catalogue/<slug>/edit`** → Images (needs
`CLOUDINARY_*`). An uploaded `hero`/`flat`/`box` immediately replaces the vector
`<Flacon>` on the PDP gallery, the home collection cards, the Discovery Set
vials, and the bag cross-sell — everywhere else (the animated `<HeroScene>`, the
quiz) stays on vectors, a deliberate later polish. Aspect ratios are already the
final ones.

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
- **Checkout / payment** — the flow is done end to end. Add Razorpay Test-Mode
  keys + a webhook (see [`docs/payments.md`](docs/payments.md)) and
  `CRON_SECRET`, then flip `flags.checkoutEnabled` in Site Settings. Until then
  the checkout drawer shows "opens with launch" for customers; in dev it uses
  the simulate-payment panel.
- **Admin** — `/admin` ("Studio"): orders (fulfil, refund, cancel, notes), the
  **catalogue editor** (full record, product photos, ledgered stock, draft
  delete), **coupons**, **customers** (role / suspend / revoke sessions),
  **staff** (add / promote by phone), and **Site Settings**. Role-gated +
  phone-OTP sudo for dangerous actions; a non-staff account gets a real 403
  "no access" screen. See [`docs/admin.md`](docs/admin.md).
- **Google sign-in (optional)** — "Continue with Google" for staff/customers who
  link a Google account from `/account` or `/admin/account`. Off until
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set, the
  `/api/auth/google/callback` redirect URI is registered in Google Cloud, and
  `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=1`. See [`docs/auth.md`](docs/auth.md).
- **Coupons** — created + edited in `/admin/coupons` (`pnpm coupon` stays for
  bulk / CI). None ship by default.
- **Staff** — add / promote team members in `/admin/staff` by phone number (they
  sign in with an OTP). The seed makes the first `superadmin` from
  `SEED_SUPERADMIN_PHONE`.
- **Go live** — the storefront shows a **holding page** until `storeLive` is
  flipped on in `/admin/settings` (signed-in staff always see the real site).
  `checkoutEnabled` is a separate switch. Both flips need a phone OTP. Set the
  announcement-bar messages and footer social links there too.
- **Stock** — every product seeds at `stock: 0`; set real levels in
  `/admin/catalogue/<slug>/edit` (or `pnpm catalog set <slug> stock <n>`) before
  launch.
- **Contact & newsletter** — the contact form now saves every enquiry to
  **`/admin/messages`** and raises a notification; wiring a real ESP for the
  newsletter list still goes in `/api/newsletter`.
- **Notifications** — Studio has a live activity feed (topbar bell + toasts +
  `/admin/notifications` + a dashboard panel) covering orders, payments,
  disputes, reviews, staff sign-ins, low stock, email bounces and enquiries.
  Polls every 20 s; no extra infrastructure. See
  [`docs/notifications.md`](docs/notifications.md).
- **Demo reviews** — `pnpm seed:reviews` adds 4 sample approved reviews (with
  throwaway customer accounts + delivered orders, two carrying product photos
  and two customers with avatars) so the storefront + admin can be seen with
  content; `flags.reviewsEnabled` is currently **on**. Remove both before
  launch: `pnpm seed:reviews --remove`, then turn `reviewsEnabled` off until
  real reviews exist. (Photo uploads need `CLOUDINARY_*` — already set.)
- **Demo campaign** — the "Launch offer — ₹799" offer card is **on** in Site
  Settings (`campaign`) so the corner card can be seen. Edit or turn it off in
  `Admin → Settings → Running offer`; the vector flacons in the card become real
  packshots once product photos are uploaded.
- **@THERARESKIN strip** — the homepage Instagram band is filled with
  placeholder lifestyle photos (`DUMMY_INSTAGRAM` in `(store)/page.tsx`). Swap
  for a real feed / curated set, and set the Instagram URL in Site Settings →
  Social so "Follow →" links out. Real customer review photos already feed in
  ahead of the placeholders.
- **Legal pages** — Shipping / Returns / Privacy / Terms carry real,
  brand-specific copy but should get a final legal review. Confirm the values
  chosen as sensible defaults: 7-day return window, 48-hour damage-report
  window, delivery estimates, 5–7 day refund timeline, Raigad jurisdiction,
  and the DPDP grievance-officer contact.
- **FAQ** — verify the assertions ("bottled in India by Velocity Ventures
  Group", "ingredient list printed on every carton", phone hours). Add an
  animal-testing / vegan statement when the position is set.
- **Homepage "Made deliberately" band** — `made-deliberately.tsx` states
  "Extrait concentration", "IFRA-compliant", "No added phthalates" and
  "Bottled in Roha, Maharashtra". Confirm each with the perfumer / QA before
  launch and adjust the copy in that file. The animal-testing line is
  deliberately omitted until the position is set (see FAQ item above).
- **Founder portrait** — two placeholders await the real photo: the `/the-idea`
  page card, and the homepage "first letter" card (`FounderPortrait` in
  `home/founder-note.tsx` — drop a file at `/public/brand/founder.jpg` and swap
  the panel body for the `<img>` noted in the comment).
- **Packaging copy** — the PDP "What's in the box" answer describes a
  recyclable carton + a wear card; confirm this matches the actual packaging.
- **Reviews** — verified buyers review a product from **`/account/reviews`**
  once their order is `delivered`, with an optional profile photo (set on
  `/account`) and up to 3 product photos; every review is moderated in
  **`/admin/reviews`** before it shows. A `review-request` email goes out ~5
  days after delivery (daily cron). The PDP "Impressions" section (avatars +
  photo strips + a lightbox), the homepage animated marquee and the star
  ratings render only while **`flags.reviewsEnabled`** is on in Site Settings —
  currently **on** for the demo (see "Demo reviews" above); turn it off after
  removing the demo data and leave it off until real reviews exist. See
  [`docs/reviews.md`](docs/reviews.md).
- **Indexing** — `metadata.robots` in `layout.tsx` is `index: true`. Set it to
  `false` if you want the site hidden from search until launch.

# Data layer (Phases A–B)

The foundation the commerce platform is built on: a MongoDB Atlas database, a
typed access layer, Cloudinary plumbing, migrations, and a seed that imports the
static catalogue (Phase A) — and the storefront now reading every product,
price, and word from that database (Phase B).

## Phase B — storefront on the database

`src/lib/products.ts` is gone. The three fragrances and the Discovery Set are
served from MongoDB through `src/server/data/catalog.ts`, a `server-only` Data
Access Layer:

| Function | Returns | Cache tags |
| --- | --- | --- |
| `getFragrances()` | active fragrances, in `order` | `catalog` |
| `getFragranceBySlug(slug)` | one active fragrance or `null` | `catalog`, `product:<slug>` |
| `getDiscoverySet()` | the set or `null` | `catalog`, `product:discovery-set` |
| `getStorefrontCatalog()` | `{ fragrances, discoverySet }` | (both of the above) |
| `getCatalogNav()` | `{ slug, name, accent }[]` for the header/menu | `catalog` |

Every query is wrapped in `unstable_cache`, so pages prerender to a static
shell and only regenerate when a tag is revalidated. Server components (the
homepage, PDPs, `discovery-set`, `layout`, `sitemap`, OG images) call the DAL;
client sections (`Hero`, `Collection`, `Quiz`, `SiteMenu`, …) receive plain
objects as props and never import the catalogue.

**Isomorphic pieces** live in `src/lib/catalog.ts` — the `Fragrance` /
`DiscoverySetInfo` DTO types, `formatINR`, `isFragranceSlug`, and
`FRAGRANCE_PALETTE` (the juice/accent colours the vector `<Flacon>` needs when
it only has a slug; these mirror the DB `colour` field and `globals.css` — a
later theming phase unifies them).

### Editing content without a deploy

```bash
pnpm catalog list                       # slug / status / price / stock
pnpm catalog set aurevan price 749      # rupees → stored as paise
pnpm catalog set vayren status draft    # hide from the storefront
pnpm catalog set orvelis title "…"
pnpm revalidate                          # bump the whole catalogue cache
```

`pnpm catalog set …` writes the change, records an audit entry, and POSTs to
`/api/revalidate` (bearer `REVALIDATE_SECRET`) so the storefront reflects it
within seconds. Set `REVALIDATE_TARGET` for a non-local server. The admin
dashboard (Phase G) replaces this CLI.

### PDP routing

`generateStaticParams` prerenders the active slugs; `dynamicParams = true` so a
newly-activated product renders on first request, and an unknown or draft slug
returns 404. Product `seo.metaTitle` / `seo.metaDescription` feed
`generateMetadata`. `sitemap.xml` is generated from the live catalogue.

---

## Phase A — collections, models, migrations, seed

---

## Layout

```
src/
  lib/
    money.ts               paise <-> rupee helpers (isomorphic — all money is integer paise)
    validation/            Zod schemas, shared by client forms and the server
      primitives.ts        objectId, paise, slug, hexColor, phoneE164, pincode, email …
      product.ts           productCreateInput / productUpdateInput (discriminated on `kind`)
      media.ts             upload + MediaRef schemas
      site-settings.ts     the editable-configuration contract
      user.ts              roles, addresses, staff invites
  server/                  server-only — never imported by client code
    env.ts                 Zod-validated process.env accessor (the only reader of secrets)
    db/
      connect.ts           cached Mongoose singleton for serverless
      index.ts             `dbConnect()` + re-exported models
    models/                Mongoose schemas (Product, MediaAsset, SiteSettings, User, Counter, AuditLog)
    cloudinary.ts          signed direct-upload params + delivery URL builder

migrate-mongo-config.js    migration runner config (loads .env* via @next/env)
migrations/                versioned, reversible DB migrations
scripts/
  _bootstrap.ts            loads .env* before anything reads process.env
  seed.ts                  idempotent catalogue + settings + first-superadmin seed
  db-check.ts              connectivity probe
```

### Why `src/server/` is separate from `src/lib/`

Per the Next.js data-security guide, database access and secrets live in a
server-only Data Access Layer. `src/lib/` is isomorphic (safe on the client);
`src/server/` is not and refuses to load in a browser. Later phases add
`src/server/data/*` DAL modules (with `import "server-only"`) that pages call —
pages never touch a model directly.

---

## Money

Every amount stored in the DB or sent to Razorpay is an **integer number of
paise** (`₹799` → `79900`). Rupees only exist for display, at the very edge.
Use `toPaise` / `formatPaise` from `@/lib/money`; never store a float.

---

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | yes | `mongodb+srv://…` from Atlas → Connect → Drivers |
| `MONGODB_DB` | no (`rareskin`) | database name inside the cluster |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | for media | server-side only |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | for the image loader | browser-safe |
| `SEED_SUPERADMIN_PHONE` / `SEED_SUPERADMIN_NAME` | seed only | first admin account, `+91XXXXXXXXXX` |

`@/server/env` parses these once and fails with the full list of problems if any
are missing or malformed. Scripts load `.env.local` through `@next/env` before
importing anything.

---

## Provisioning MongoDB Atlas

1. Create a project and an **M10 dedicated** cluster (not M0/M2 — you want
   continuous backups, Performance Advisor and no auto-pause) in region
   `ap-south-1` (Mumbai).
2. Create **one database user per environment** with the built-in role
   `readWrite` scoped to a single database — never a cluster-wide role.
3. Network access: use the **Vercel ↔ Atlas integration** or PrivateLink for
   production. For local dev, add your IP.
4. Enable continuous backup + point-in-time restore. Add Atlas alerts for
   connections, disk, replication lag and slow queries.
5. Put the connection string in `.env.local` (dev) and the Vercel project's
   environment variables (Preview / Production — separate clusters).

The connection is pooled (`maxPoolSize: 10`) and memoised on `globalThis` so
warm serverless instances reuse it.

---

## Provisioning Cloudinary

1. Create an account; note the cloud name, API key and API secret from
   **Account Details**.
2. No unsigned upload preset — the server signs every upload
   (`signUpload` in `@/server/cloudinary`) and the browser PUTs straight to
   Cloudinary. We re-validate the metadata it returns before storing a
   `MediaAsset`.
3. Folder convention: `rareskin/products/<slug>/`, `rareskin/content/`,
   `rareskin/og/`, `rareskin/invoices/` (private).

---

## Migrations

Index creation is owned by migrations (production connects with
`autoIndex: false`). The Mongoose schemas declare the same indexes, with
**matching names**, so local dev (`autoIndex: true`) and production converge on
an identical set. When you change an index, change it in both places.

```bash
pnpm db:migrate            # apply pending migrations (run before deploy)
pnpm db:migrate:status     # what's applied / pending
pnpm db:migrate:down       # roll back the last one
pnpm db:migrate:create "add coupon indexes"
```

Migrations are plain CommonJS in `migrations/`, run with the native driver.
`down()` for the initial migration drops indexes but **leaves collections and
data in place** on purpose.

---

## Seeding

```bash
pnpm db:seed               # insert anything missing; leave existing rows alone
pnpm db:seed --fresh       # drop products + settings, then insert
```

The seed:

- imports the three fragrances and the Discovery Set from
  `src/lib/products.ts`, converting rupee prices to paise, and validates each
  one against `productCreateInput` before inserting;
- creates the `siteSettings` singleton with sensible India defaults (GST 18 %,
  HSN `33030090`, COD on, store **not** live);
- upserts the first `superadmin` from `SEED_SUPERADMIN_PHONE` (created
  unverified — it becomes usable after the first OTP login, wired in Phase C);
- writes a `seed.run` row to the audit log.

Media is intentionally left empty — real photography is uploaded through the
admin (Phase G) once it exists.

Run order on a fresh environment: `pnpm db:migrate` → `pnpm db:seed`.

---

## Collections in this phase

| Collection | Purpose |
| --- | --- |
| `products` | catalogue — fragrances (`kind: "fragrance"`) and the set (`kind: "set"`) |
| `mediaassets` | one row per Cloudinary file; powers the media library and orphan cleanup |
| `sitesettings` | the single editable-config document (`key: "singleton"`) |
| `users` | accounts; phone-first, passwordless, role ladder for RBAC |
| `counters` | atomic sequences for future order / invoice numbers |
| `auditlogs` | append-only record of mutating actions (insert-only, guarded at the model) |

Later phases add `cart`, `order`, `payment`, `webhookEvent`, `storeCredit`,
`stockLedger`, `coupon`, `review`, `contentBlock`, and more — see the platform
plan.

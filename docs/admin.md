# Admin — "Studio" (Phase G)

The operator console at `/admin`. Phase G: **G1** — the shell, RBAC, sudo
re-auth, order management, new-device email; **G2** — catalogue editor +
product photography + stock ledger; **G2.5** — the 403 "no access" page +
Google account linking; **G3a** — coupons + Site Settings editor (and wiring
its loose ends: announcement bar, footer social, the holding page); **G3b** —
customers, staff, product delete.

## Route groups

The `app/` tree is split so `/admin` inherits none of the storefront:

```
app/
  layout.tsx            ← minimal root: <html>/<body>, fonts, JSON-LD, SvgDefs
  (store)/layout.tsx    ← providers, header, footer, cart + sign-in machinery
  (store)/…             ← every shopper-facing route (URLs unchanged)
  (admin)/layout.tsx    ← requireStaff() → <AdminShell>
  (admin)/admin/…       ← the console
```

Route groups are transparent to the URL. Both group layouts are **nested** under
the one root layout (not separate root layouts), so navigating store ⇄ admin is
a normal client transition.

## RBAC

**Authentication ≠ authorization.** The shop has one login — phone + OTP, the
same one used at checkout. Anyone can *authenticate*; what they can *do* is their
`User.role`, which defaults to `customer` for everyone who signs up. So a
customer who types `/admin` goes: `proxy.ts` (middleware, cookie-only) bounces
them to sign-in → they log in and get a **customer** session → `requireStaff()`
runs server-side in `(admin)/layout.tsx`, validates the session against Mongo
(not revoked / expired, user active, role not drifted), sees `isStaff === false`
→ `forbidden()`. They get a **403** and a styled "no access" screen
(`src/components/admin/no-access.tsx`) that names the signed-in account and
offers *Back to the store* / *Use a different account* — the same shape a
production admin (Shopify et al.) shows. Every `/api/admin/*` route re-checks
independently (defense in depth) and returns a bare `403`. Middleware
deliberately does no DB work, per the Next.js security guidance — the real gate
is the layout/route.

`forbidden()` needs `experimental.authInterrupts` (in `next.config.ts`). The
interrupt is caught by the nearest `forbidden.tsx`: a non-staff account on
`/admin` trips the guard in `(admin)/layout.tsx`, and a layout's own interrupt
resolves to the **parent** boundary — the root `src/app/forbidden.tsx`
("You don't have access to Studio", no chrome). A staff member who opens a
section above their role (e.g. `support` on `/admin/catalogue`) trips the guard
in that *page* instead — caught by `src/app/(admin)/forbidden.tsx`, rendered
inside the admin shell ("This part of Studio is off-limits").

Staff access is granted by a `superadmin` setting `User.role` (via `mongosh` /
the seed for now; the Phase G3 staff UI later). A post-sign-in `?next=` redirect
is sanitised (`safeNextPath` — same-origin path only) so a crafted link can't
bounce a signed-in user off-site.

`src/server/auth/admin.ts`:

| guard | behaviour |
| --- | --- |
| `requireStaff()` | no session → sign-in redirect; signed-in **non-staff** → `forbidden()` (a real 403 + the "no access" screen) |
| `requireAdminRole(min)` | `requireStaff` + rank ≥ `min` on the `roleRank` ladder, else `forbidden()` |
| `requireCatalogueRole()` | `requireStaff` + `canManageCatalogue` — the catalogue's guard (see below), else `forbidden()` |
| `assertSudo(ctx)` | throws `SudoRequiredError` unless `session.sudoUntil` is live |

Role ladder (`src/server/auth/index.ts`): `customer 0 · support 1 ·
catalog_manager 1 · operations 2 · admin 3 · superadmin 4`. Section minimums:
view orders/customers `support`, fulfil orders `operations`, refunds + cancels +
(G3) coupons/staff/settings `admin`, escalate a role to `admin`+ `superadmin`.

`support` and `catalog_manager` are the same rank but parallel — a plain rank
check would let `support` into the catalogue. `canManageCatalogue(role)` is the
real gate: the `catalog_manager` role itself, or `operations`+.

Every mutating admin action writes an `AuditLog` row (append-only) with the
actor, before/after, IP and UA.

## Sudo re-auth

Dangerous actions (refund, cancel; G3 adds role change / staff invite /
destructive edits) require a fresh phone OTP. `POST /api/admin/sudo/start` sends
a code to the **staff member's own** number (dev code `AUTH_DEV_OTP` when Twilio
is unset); `POST /api/admin/sudo/confirm` verifies it and sets
`session.sudoUntil = now + SUDO_WINDOW_MINUTES` (15). A gated route returns
`409 { error: "sudo-required" }`; the client `<SudoGate>` dialog handles the
start→confirm→retry loop. TOTP 2FA is deferred (the `user.twoFactor` fields
exist for it).

## Account & security (`/admin/account`)

Linked from the top bar. Shows the staff member's name / role / masked phone /
email, a **Sign-in methods** panel (`<SignInMethods>`, shared with the
storefront `/account`) — phone is always primary; Google can be linked once and
then used instead of an OTP (see `docs/auth.md`) — and their signed-in devices
with "Sign out of all devices". Google linking degrades gracefully: with
`GOOGLE_CLIENT_ID`/`SECRET` unset the panel shows "Not available on this
environment" and the routes 503.

## Order management

- **List** `/admin/orders` — filter by status / method, search order number /
  name / phone / email, paginated (`src/server/admin/orders.ts` `listOrders`).
- **Detail** `/admin/orders/[orderNumber]` — items (live catalogue thumbs),
  price ladder, timeline, the immutable `payments` log, refunds, internal notes.
- **Advance status** `PATCH …/orders/[n]` `{ action: "status", to, carrier?,
  trackingNumber?, trackingUrl?, eta? }` — uses the `TRANSITIONS` state machine;
  `shipped` writes `order.fulfilment` and fires `notifyOrderStatus("shipped")`
  with the carrier/tracking (rendered in the `order-shipped` email); `delivered`
  fires `notifyOrderStatus("delivered")`.
- **Internal note** `PATCH …/orders/[n]` `{ action: "note", text }` — staff-only,
  never surfaced to the customer.
- **Refund** `POST …/orders/[n]/refund` `{ amountPaise?, reason }` — `admin`+ and
  sudo. Blank amount = full remaining. Calls `createRazorpayRefund` then
  `recordRefund({ source: "admin" })`; the `refund.processed` webhook reconciles
  the final state (`payment.status`, the `refunded` transition, the
  `refund-processed` email). COD orders show a "record a manual refund" note only.
- **Cancel** `POST …/orders/[n]/cancel` `{ reason }` — `admin`+ and sudo, **COD
  only** (`pending`/`confirmed`/`processing`). Restores stock, releases the
  coupon and store credit, sends `order-cancelled`. Paid online orders are
  cancelled by issuing a full refund instead.

## New-device sign-in email

After an OTP verify creates a session for an **existing** account
(`created: false`), `isFirstSeenDevice` checks for a prior session on the same
`browser`+`os` in the last 90 days. If none, `notifyNewDevice` queues the
`new-device` template — only when the account has an email on file, deduped per
(user, day, device+ip). It runs in `after()` and never blocks sign-in.

## Catalogue (G2)

`/admin/catalogue` — the primary catalogue editor (`pnpm catalog` stays for
scripted / CI edits). `catalog_manager` or `operations`+.

- **List** (`src/server/admin/catalog.ts` `listProducts`) — every product, all
  statuses. Inline status change per row; drag rows + "Save order" to re-sequence
  the collection grid (`order` field).
- **Edit** `[slug]/edit` — the whole record in one form: identity (`slug` / SKU
  locked — carts and orders reference them), story, notes, pricing (₹ in the
  form, paise in the DB), inventory flags, images, SEO, the brand palette
  (collapsed), and — for `kind: set` — the vials + store-credit rule. One PATCH
  on save; the server flattens it to a `$set` so a nested field never nukes a
  sibling. `productUpdateInput` is the contract.
- **Create** `new` — the full `productCreateInput` (kind, slug, SKU + everything
  above). Lands as `draft`. "Duplicate" on an edit page clones to a draft.
- **Preview** — a "Preview" button on the form renders a storefront-PDP mockup
  from the *current, unsaved* form state (photo included, vector fallback
  otherwise) so a `draft` can be reviewed before it goes `active`.
- **Stock** — a separate panel on the edit page, its own endpoint. A signed
  delta + a reason (`restock` / `correction` / `damage` / `return` / `write_off`)
  + a note → guarded `$inc` (can't go below zero) + a `stockLedger` row. The
  reasons map onto the ledger enum (`restock`→restock, `return`→return, else
  →adjustment) with the specific reason kept in the row's `note`.
- Every write bumps the storefront cache — `revalidateTag("catalog")` +
  `revalidateTag("product:<slug>", { expire: 0 })` — so a change is live on the
  next request.

### Product photography

`upload-field.tsx` runs a signed direct upload: `POST /api/admin/media/sign`
(wraps `signUpload`, folder `rareskin/products`, transformation pinned
server-side) → browser PUTs straight to Cloudinary → `POST /api/admin/media/confirm`
re-validates the echo and writes a `MediaAsset` → the form attaches the returned
`mediaRef` to `media.{hero,flat,box,og}` / `media.gallery` / `seo.ogImageRef`.
"Remove" just drops the ref (the Cloudinary asset is left — it may be reused;
orphan cleanup is a later media-library concern). Needs Cloudinary configured
(`CLOUDINARY_*`).

**Storefront surfaces** that render an uploaded photo (vector `<Flacon>`
fallback when none): the PDP gallery (`pdp-gallery.tsx` — each non-null
`hero/flat/box` is a slide), the home collection cards (`product-card.tsx`), the
Discovery Set component vials (`discovery-set.tsx`), and the bag cross-sell
strip. Hero scene / quiz stay on vectors (bespoke animated art). The DAL
(`imagesFor` in `src/server/data/catalog.ts`) returns a real Cloudinary URL or
`null`; `cloudinaryVariant()` (`src/lib/catalog.ts`) rewrites the delivery URL
for `f_auto,q_auto` + a width cap.

## Coupons (G3a)

`/admin/coupons` — `admin`+ only. Replaces `pnpm coupon` as the primary editor
(the script stays for bulk / CI).

- **List** (`src/server/admin/coupons.ts` `listCoupons`) — every code with an
  *effective* status (`expired` once `endsAt` passes, `scheduled` before
  `startsAt`, `paused`, `active`), redemption count, per-user cap, window.
  Inline active⇄paused toggle per row.
- **Create / edit** (`coupon-form.tsx`) — `code` (immutable after create — orders
  snapshot `coupon.code`), `type` (`percent` / `fixed` — ₹ in the form, paise in
  the DB — / `free_shipping`), value, min subtotal, max total uses, uses per
  customer, an optional start/end window, `stackable`, status, internal note.
  `couponInput` / `couponUpdateInput` are the contracts. One POST/PATCH on save.
- **No delete** — pause (or let the window expire) is the lifecycle; redemption
  history lives on the orders that carry the code. `usedCount` is bumped
  atomically inside the order transaction (`src/server/payments/process.ts`);
  per-user use is counted from the customer's non-cancelled orders.
- Every write records a `coupon.create` / `coupon.update` / `coupon.status_change`
  audit row with before/after. No cache tag — `validateCoupon`
  (`src/server/commerce/coupons.ts`) reads live.

## Site Settings (G3a)

`/admin/settings` — `admin`+ only. Edits the one `siteSettings` singleton
(`key: "singleton"`); `siteSettingsInput` is the contract, the DAL
(`getSiteSettings`, tag `settings`) parses every read back through Zod so a
document that predates a field still gets its default.

- **`getSettingsForEdit()` reads the DB directly** (not the cached DAL) so the
  form always shows ground truth — a stale cache would otherwise be silently
  re-persisted on save.
- **`updateSiteSettings`** deep-merges the patch onto the current settings,
  re-parses the whole result, `$set`s the singleton (`upsert`), then
  `revalidateTag("settings", { expire: 0 })` + `revalidatePath("/")`. The audit
  row records only the sections that actually changed.
- **Sudo:** a patch that flips `flags.storeLive` or `flags.maintenanceMode`
  needs a fresh phone OTP (`assertSudo` in `PATCH /api/admin/settings`, `<SudoGate>`
  on the form).
- **Sections:** launch switches (`flags`), announcement bar, shipping, COD, GST,
  contact, social links.

### What each field drives

| section | effect |
| --- | --- |
| `flags.storeLive` / `flags.maintenanceMode` | `(store)/layout.tsx` shows a **holding page** (`holding-page.tsx`) for the whole storefront — *except* signed-in staff, who keep working it. The holding page carries its own minimal "team member sign-in" (`holding-staff-signin.tsx`) since the normal modal isn't mounted there. `/admin` is a separate route group and is never gated. |
| `flags.checkoutEnabled` / `codEnabled` / etc. | consumed by the checkout engine + storefront (unchanged from before). |
| `announcements` / `announcementRotateSeconds` | `<AnnouncementBar>` rotates the configured active messages; **clear them all** to fall back to the built-in set. |
| `social.*` | a "Follow" block in the footer + the holding page (`social-links.tsx`) — only the links you set appear. |
| `shipping` / `cod` / `gst` / `contact` | already flow through the checkout engine + email (`getSiteSettings` in `src/server/commerce/orders.ts`, `order-context.ts`). |

## Customers (G3b)

`/admin/customers` — `support`+ can **view**; `admin`+ can manage.

- **List** (`src/server/admin/users.ts` `listUsers`) — every account, filter by
  role + status, search phone / name / email, paginated. Phone is masked in
  every DTO. Order count is one `Order.aggregate` over the page.
- **Detail** (`getUserForAdmin`) — identity (phone / email / linked Google),
  at-a-glance stats (reuses `getAccountOverview`), recent orders (link into
  `/admin/orders/[n]`), addresses, store credit, active sessions
  (`listUserSessions(id, "")` — nothing is "current" from the admin's view), and
  an **account-history** trail (the `AuditLog` rows targeting this user).
- **Manage** (`account-controls.tsx`, `admin`+ only):
  - **Role** — the `<select>` options are limited by `canEditRole`
    (`src/server/auth/admin.ts`): `admin` sees only the roles below `admin`;
    `superadmin` sees all. You can't change your **own** role.
  - **Suspend / lift** — a suspended account fails `loadSession` immediately
    (`status !== "active"`).
  - **Sign out all sessions** — for a lost phone; not sudo-gated (reversible).
  - Role changes and suspensions are **sudo-gated** and **revoke every session**
    so the change takes effect at once. Audited as `user.role_change` /
    `user.status_change` / `user.sessions_revoked`.

## Staff (G3b)

`/admin/staff` — `admin`+. Lists staff by rank; each row links to that person's
`/admin/customers/[id]` for the full controls (one code path for role changes).

**"Invite" = create-or-promote by phone.** Auth is phone-OTP passwordless, so
`createOrPromoteStaff` (`src/server/admin/staff-actions.ts`) upserts a `User` by
phone number with the chosen staff role — no invite email, no password. The
person signs in with an OTP and lands in `/admin`. If the account already
existed, its sessions are revoked so the new role applies on next sign-in.
Sudo-gated; `canEditRole` gate — only a `superadmin` can grant `admin` /
`superadmin`. `name` / `email` are filled only if they were empty (never
clobbered).

## Product delete (G3b)

`deleteProduct` (`src/server/admin/catalog-actions.ts`), surfaced as a **Delete**
button on the product edit page **only for a `draft`**. Sudo-gated + a
type-the-slug confirm. The server refuses unless `status === "draft"` **and** no
`Order` references the slug/SKU — otherwise it tells you to archive instead
(`status: archived` hides it everywhere while keeping order history intact).
`MediaAsset.usedIn` back-refs are cleared best-effort; `product.delete` audited.

## Reviews (Phase H)

`/admin/reviews` (`support`+). The default view is the **pending** queue.
`moderateReview` (`src/server/admin/review-actions.ts`) sets `approved` /
`rejected`, then recomputes `Product.ratings { average, count }` from the
product's `approved` set and busts the `reviews` / `reviews:<slug>` / `catalog`
/ `product:<slug>` cache tags so the storefront refreshes within seconds.
`review.approve` / `review.reject` are audited. Approve puts a review live;
**Hide** takes an approved one back down (also `rejected`).

Customers write from `/account/reviews` — one review per product, only for
products on a `delivered` order, editable by the customer while still `pending`.
The storefront surfaces (PDP deck, homepage block, star ratings, Product
JSON-LD `aggregateRating`) are all gated by **`flags.reviewsEnabled`** in Site
Settings. Full lifecycle: [`reviews.md`](reviews.md).

## Notifications + Messages (Phase I)

A live activity feed for staff. Events across the app — orders, payments (incl.
**disputes** and oversell auto-refunds), review submissions, staff sign-ins from
a new device, staff/role changes, low stock, email bounces, contact enquiries,
newsletter sign-ups — raise a `Notification` that shows in the topbar **bell**
(20 s poll, unread badge, one-shot wobble, `(N)` tab-title badge, and a slide-in
**toast** for high-priority events). Full feed at `/admin/notifications` (category
filter, mark-all-read); the dashboard gets a "Latest activity" panel. Per-staff
read state; 60-day TTL. Admin-only events (`payment.dispute`, `staff.*`,
`auth.staff_login`, `email.bounced`) are hidden from a `support` account.

`/admin/messages` (`support`+) — the contact form persists a `ContactMessage`
and pings a notification. Filter, expand, **Reply by email**, **Mark handled**
(audited). Full detail: [`notifications.md`](notifications.md).

## Verifying locally

Blank `RAZORPAY_KEY_ID` / `TWILIO_*` / `RESEND_API_KEY` in `.env.local` to force
the dev fallbacks (OTP `AUTH_DEV_OTP`, payments via `/api/payments/dev-simulate`,
email to `.mail/<key>.html`). **Keep `CLOUDINARY_*` set** — the image upload
flow needs it. Sign in as the seeded superadmin, place orders through the drawer
+ dev-simulate, then exercise the flows above. The full refund happy-path
(partial + full, visible in the Razorpay dashboard) needs real test keys.

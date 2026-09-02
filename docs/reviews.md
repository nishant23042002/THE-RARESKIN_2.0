# Reviews (Phase H)

Verified-buyer product reviews — write flow, moderation queue, the request
email, and the storefront surfaces.

## Model

`src/server/models/review.ts` — `Review`. One document per `(userId, productId)`
(unique index), so a customer reviews a given product once and edits it rather
than stacking. Proof-of-purchase and display data are **snapshotted**:
`orderId` / `orderNumber`, `sku`, `productSlug`, and `authorName`
(`"Nishant S."`, computed at submit via `firstNameLastInitial` in
`src/lib/reviews.ts` — a later account rename never rewrites a published review).

Lifecycle: `pending` → `approved` (public) | `rejected` (hidden). `moderation
{ byId, at, note }` + `publishedAt` are set on the decision.

Migration `migrations/20260902160000-reviews-collection.js` (applied) — the
`reviews` collection + four indexes mirroring the schema.

## Who can write, and when

`src/server/data/reviews.ts`:

- `getReviewableItems(userId)` — distinct products from the user's `delivered`
  orders, minus ones already reviewed.
- `hasDeliveredPurchase(userId, productId)` — the submit-time gate.
- `getMyReviews(userId)` — the "Your reviews" list with status.

`src/server/reviews/submit.ts`:

- `submitReview` — re-checks a `delivered` order containing the `sku`; the unique
  index is the backstop (`11000` → `already-reviewed`). Inserts `status: pending`.
- `editReview` — own review, **only while `pending`**.

Routes: `POST /api/account/reviews`, `PATCH /api/account/reviews/[id]`
(`requireUser`, Zod, `checkRate("account:review:user")` — 20 / hour / user).

UI: `/account/reviews` (`src/components/account/account-reviews.tsx`) — an inline
form per reviewable item + the submitted list. Entry points: a prompt on
`/account` when something is waiting, and a "Write a review" link on each
delivered line item of an order.

## Moderation

`/admin/reviews` (`support`+). `listReviews` (`src/server/admin/reviews.ts`)
defaults to the `pending` queue; `moderateReview`
(`src/server/admin/review-actions.ts`):

1. sets `approved` / `rejected` + `moderation` + `publishedAt`
2. `recomputeProductRating(productId)` — averages the `approved` set (1 dp) into
   `Product.ratings { average, count }`
3. busts `reviews`, `reviews:<slug>`, `catalog`, `product:<slug>`
4. audits `review.approve` / `review.reject`

"Hide" on an approved review is just `reject`.

## Request email

`review-request` template (`src/server/email/templates/review-request.tsx`),
subject *"How is &lt;first item&gt; wearing?"*. `notifyReviewRequest(orderNumber)`
in `notify.ts` (dedupe key `review-request:<orderNumber>`).

Cron `GET /api/cron/review-requests` (Bearer `CRON_SECRET`, daily `0 9 * * *` in
`vercel.json`) — finds orders `delivered` between 5 and 30 days ago and enqueues
one email each. `enqueueEmail`'s dedupe makes re-runs safe; the 30-day floor
stops a backlog being mailed at once on first deploy. **No-ops entirely while
`flags.reviewsEnabled` is off.**

## Storefront (gated by `flags.reviewsEnabled`)

`src/server/data/reviews.ts` cached reads (tags `reviews` / `reviews:<slug>`):

- `getProductReviews(slug)` — `{ summary: { average, count, distribution },
  items }` for the PDP.
- `getFeaturedReviews(limit)` — most-recent `approved` across all products for
  the homepage.

Surfaces:

- **PDP** `src/components/product/pdp-reviews.tsx` — summary panel + review
  cards, or a "be the first" prompt at zero. A compact star line by the product
  title links to `#reviews`. The page adds `aggregateRating` + up to 5 `review`
  entries to the Product JSON-LD when `count > 0`.
- **Homepage** `src/components/home/reviews.tsx` — quote cards; the section
  hides itself when there's nothing to show.
- `Fragrance.rating { average, count }` is carried on the catalogue DTO
  (`toFragrance`) for anywhere else that wants it.

With the flag **off** none of these render — the store looks exactly as it did
before the feature. Flip it on in Site Settings at launch.

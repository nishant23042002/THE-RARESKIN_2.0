# Checkout & orders (Phase D → E)

The commerce backbone: a server cart, an India GST pricing engine, coupon and
store-credit application, atomic stock decrement, and order creation, plus
**Razorpay hosted checkout end to end** — verified webhook, immutable payment
log, refund path. Checkout is **payment-first**: an online order is created only
once the payment is verified (see [`docs/payments.md`](payments.md)).

> Guiding rule: **never trust the client with a number.** The checkout request
> carries SKUs, quantities and an address. Prices, tax, discounts, credit,
> shipping and stock are all computed server-side from the live catalogue and
> Site Settings.

## Pieces

```
src/lib/pincode.ts                 PIN -> GST state/UT code + name (isomorphic)
src/lib/checkout.ts                quote / order DTOs (isomorphic)
src/lib/validation/commerce.ts     cart / checkout / coupon / order Zod schemas

src/server/models/
  cart.ts        coupon.ts        order.ts        stock-ledger.ts   store-credit.ts

src/server/commerce/
  pricing.ts        the GST engine (pure, deterministic)
  serviceability.ts pincode + COD eligibility from Site Settings
  coupons.ts        validate a code; discount effect
  store-credit.ts   balance / FIFO spend / grant (the Discovery-Set credit)
  inventory.ts      guarded atomic decrement + stock ledger
  orders.ts         quoteOrder() (hint) + placeOrder() (authoritative, txn)

src/server/data/
  cart.ts        server cart CRUD, guest->account merge, hydration
  settings.ts    getSiteSettings() — cached, Zod-parsed singleton
  addresses.ts   account address book (one-default invariant, incl. email)
  orders.ts      order reads for the account area
  account.ts     getAccountOverview() — the /account at-a-glance strip

src/app/api/
  cart                 GET (hydrate) · PUT (replace / ?merge=1)
  checkout/quote       POST  -> non-binding price preview
  checkout/place       POST  -> creates the order (session required)
  account/addresses    GET · POST · [id] PATCH · [id] DELETE

src/components/cart/cart-drawer.tsx      "The Counter" — one panel, three views
src/components/cart/checkout-panel.tsx   in-drawer checkout: order review + steps
src/components/ui/payment-marks.tsx      PaymentBadges — marks on the dark CTA
src/components/providers/cart-provider   view state: bag ↔ checkout ↔ done
src/lib/scroll-lock.ts                   ref-counted body lock (drawer + modal)
src/app/account/*                 landing, orders list + [orderNumber] detail
src/app/account/addresses         address book
src/components/account/           order-row · order-thumb · order-progress ·
                                  status-pill · address-book
```

## The cart

The `localStorage` bag (`rareskin:cart:v1`) stays the fast working cart. The
`CartProvider`:

- **on sign-in** — `PUT /api/cart?merge=1` with the local lines, then `GET` the
  union and adopt it locally (so a bag started on another device carries over);
  the guest cookie cart (`__Host-rrs.cart`) is folded into the account `Cart`.
- **while signed in** — a debounced `PUT /api/cart` keeps the server `Cart` in
  step (persistence + a base for abandoned-cart email later).

`placeOrder` takes the line items from the request body (not the server cart),
re-prices them, and clears the account cart on success.

## The GST engine — `computePricing`

> **Currently off.** `settings.gst.ratePercent` is `0`, so `taxableValue ==
> grandTotal`, every tax figure is `0`, and no GST line is shown anywhere
> (checkout drawer, order detail, list). The engine below is intact — set
> `ratePercent` back to `18` in Site Settings (and `scripts/seed.ts`) to bring
> the CGST/SGST/IGST split and the invoice line back.

Pricing is **tax-inclusive** (`settings.gst.pricesIncludeTax`). When a rate is
set, catalogue prices are treated as already containing it, so:

```
itemsSubtotal = Σ unitPrice × qty                 (tax-inclusive, paise)
discount      = coupon effect, capped at subtotal
credit        = min(requested, balance, subtotal − discount)
shipping      = free-above rule, or 0 for an always-free store, or free_shipping coupon
codFee        = settings.cod.feePaise when method = cod

grandTotal    = itemsSubtotal − discount − credit + shipping + codFee
taxableValue  = round(grandTotal × 100 / (100 + rate))
taxTotal      = grandTotal − taxableValue
```

**Split:** delivery state == origin (Maharashtra, `27`) → CGST + SGST (half
each, remainder to SGST); otherwise IGST. The state comes from the PIN prefix
(`resolvePincode`), falling back to the address's state name, falling back to
inter-state (IGST) when unknown.

Every figure is an integer paise. `taxableValue + taxTotal == grandTotal` and
`cgst + sgst + igst == taxTotal` always hold.

## Oversell prevention

Inside the place-order transaction, each line is decremented with one guarded
write:

```js
Product.findOneAndUpdate(
  { _id, "inventory.trackInventory": true, "inventory.stock": { $gte: qty } },
  { $inc: { "inventory.stock": -qty } },
)
```

`null` → the item sold out since the shopper's last look; the whole transaction
aborts and the response is `{ ok: false, code: "sold-out" }` — nothing is
charged, no partial order. A `stockLedger` row records every movement with the
resulting balance. `placeOrder` also does a pre-flight check and returns
`cart-changed` (with the adjusted quantities) before opening the transaction, so
the common case is a clean "review your bag again" prompt.

**Payment-first:** an online order decrements stock at `finalizeOnlineCheckout`
(verified payment), not at checkout-start — so stock is not reserved during the
payment window. A capture that then can't be honoured is auto-refunded in full
(see [`docs/payments.md`](payments.md)). COD commits the decrement at
order-creation (no payment step).

## Store credit

`StoreCredit` is a ledger, not a flag. Buying the Discovery Set issues a grant
(`reason: "discovery_set_purchase"`, idempotent per order). Spending it walks a
customer's active grants oldest-first inside the order transaction, appending a
ledger entry per grant and flipping a grant to `spent` at zero — it can never be
double-spent. `refundStoreCreditForOrder` reverses a spend on cancellation.

> The Discovery-Set grant is issued inside `finalizeOnlineCheckout` (verified
> payment), or at order-creation for COD.

## Coupons

`Coupon` documents — `percent`, `fixed` (paise), or `free_shipping` — with
`minSubtotalPaise`, `maxUses`, `usesPerUser`, a validity window and a status.
`validateCoupon` runs at quote time and again in the transaction; `usedCount` is
bumped with a guarded `$inc` so a concurrent last redemption can't over-issue.
Per-user use is counted from the customer's non-cancelled orders carrying the
code. Manage codes with `pnpm coupon` until the admin UI (Phase H):

```bash
pnpm coupon list
pnpm coupon add WELCOME10 percent 10          # 10% off
pnpm coupon add FLAT200 fixed 200 --min 999   # ₹200 off orders over ₹999
pnpm coupon add FREESHIP free_shipping
pnpm coupon pause WELCOME10
```

## Order lifecycle

- **Online** — `startOnlineCheckout` writes a `CheckoutIntent` (the validated
  cart snapshot + a Razorpay order) and returns; **no order exists yet**. On
  verified payment `finalizeOnlineCheckout` creates the order directly as
  `status: "confirmed"` / `payment.status: "paid"`, with a full snapshot of
  every line (price, name, image, HSN), both addresses, the pricing breakdown,
  the coupon, and a two-entry `timeline`. `idempotencyKey` = the Razorpay order
  id, so the callback and the webhook converge on one order.
- **COD** — `placeCodOrder` creates the order `status: "pending"` /
  `payment.method: "cod"` immediately; `idempotencyKey` (a client UUID) dedupes
  a double-submit.

State machine: `pending → confirmed → … → delivered`, with `cancelled` /
`returned` / `refunded`; `cancelUnpaidOrder` handles a customer/admin cancelling
a COD order before dispatch.

## Checkout flow (UI) — "The Counter"

There is **no `/checkout` route**. Cart, checkout and confirmation are one
right-anchored drawer (`cart-drawer.tsx`) that slides between three views —
`bag → checkout → done` — driven by `CartProvider` state (`view`, `placedOrder`,
`goToCheckout()`, `backToBag()`, `completeOrder()`). A progress rail in the
header fills with the tri-fragrance gradient as you move through it.

- **Bag** — the lush juice-washed line items (`CartLineRow`), subtotal, and
  "Proceed to checkout".
- **Checkout** (`checkout-panel.tsx`) — **one screen, not a wizard.** A returning
  shopper's trip is review → pay; a first-timer types their address once.
  - **Order review** (always visible) — each line with name / "Extrait de
    Parfum" / qty / price / MRP strike, then the price ladder (items, discount,
    credit, delivery, total, "You save ₹X"; an inclusive-GST line only when a
    rate is set) and a Free-delivery / No-hidden-fees / Secure-checkout row.
  - **Deliver to** — the default saved address shown as a card (name from the
    address itself — never the account "name" — plus lines, PIN, phone, and a
    live "Delivers to <state> · free shipping" note). **Change** expands the
    saved-address picker + "＋ Add a new address"; picking one collapses it. A
    shopper with no saved address sees the form directly (PIN → serviceability,
    name, mobile, lines, state), saved to the account on first order. The
    **receipt email** shows as text ("Receipt & updates to … · SMS to …") with
    an *Edit* that reveals the input; it's only ever typed when we don't already
    know it (account email / address email).
  - **Payment** — a "＋ Discount code" disclosure, a store-credit toggle (when
    there's a balance), the method rows (COD only when the region allows it), a
    "＋ Add a note" disclosure.
  - **One sticky CTA** — "Pay securely · ₹X" (or "Place order · ₹X" for COD)
    with the accepted-payment marks (`PaymentBadges` — Visa / Mastercard / RuPay
    / UPI; the UPI tile stands in for GPay / PhonePe / Paytm). It validates the
    email + address, expands whatever needs fixing, then places and pays.
  - A **guest** sees a "verify your number" gate first → the sign-in modal opens
    *on top of the open drawer* (`sign-in-modal.tsx` checks
    `useCart().view === "checkout"` and does not navigate away); the OTP makes a
    lightweight `customer` account and the bag carries over to the express screen.
- **Done** — a debossed check, the order number in display serif, "what's next".
  A **paid** order then shows a 5-second countdown (a draining tri-juice rail)
  and auto-advances: the drawer slides out and the page transition carries the
  shopper to `/account/orders/<n>`. "View order now" skips the wait; "Stay here"
  cancels it. A COD order keeps the plain "View order" / "Keep shopping" pair
  (no auto-redirect — nothing has been charged yet).

The panel re-quotes (debounced) on every change to PIN, coupon, credit or
method. `flags.checkoutEnabled` gates it for customers; always on in dev.

**Scroll lock** is ref-counted (`src/lib/scroll-lock.ts`) so the drawer keeps
`body.is-locked` even as the sign-in modal, stacked on top, opens and closes.

**Typography** — the drawer panel and every `/account` page carry `.ui-surface`
(`globals.css`), which sets a 400 weight floor and bumps the small label / value
sizes. The editorial body stays at 300; only the dense, transactional surfaces
run heavier so information reads cleanly.

## The `/account` area

`getAccountOverview()` (`src/server/data/account.ts`) drives an at-a-glance
strip — **Orders · In progress · Store credit** (or lifetime spend) — above the
recent-order list, the default delivery address, and the store-credit explainer.

**Order rows** (`src/components/account/order-row.tsx`) are shared by the
`/account` recent strip and the full `/account/orders` list: overlapped product
packshots, name + "+ N more", number · date, total, a `StatusPill`, and an
explicit **View ›** affordance so the row plainly reads as a way through.

**Order detail** (`/account/orders/[orderNumber]`) leads with the number, the
`StatusPill`, and `OrderProgress` — a five-stop rail (Placed → Confirmed →
Prepared → Shipped → Delivered) that fills with the house tri-fragrance gradient,
the same one on the checkout drawer. Then the pieces (each links to its PDP, with
the product's headline notes as hairline chips), the total, delivery + payment,
and a connected timeline ("The journey").

**Live visuals.** `src/server/data/orders.ts` joins each ordered item's
`productId` against the live catalogue at read time for its gallery image, PDP
link and notes — so replacing a product's photography updates order history too.
`OrderThumb` (`src/components/account/order-thumb.tsx`) renders that image, or
falls back to the vector `<Flacon>` (fragrances) / the house mark. The order's
own `items[].image` snapshot is only the last-resort fallback.

`StatusPill` (`src/components/account/status-pill.tsx`) colours each order by
where it stands and is shared by every one of these surfaces.

## Migration

`migrations/20260829160000-commerce-collections-and-indexes.js` creates
`carts`, `coupons`, `orders`, `storecredits`, `stockledgers` with index names
matching the Mongoose schemas. `carts` has a 45-day TTL on `expiresAt`.

Checkout uses a **MongoDB transaction**, so it needs a replica set — Atlas
provides one; a local standalone `mongod` returns
`{ ok: false, code: "transaction-unsupported" }`.

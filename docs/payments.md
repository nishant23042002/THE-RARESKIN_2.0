# Payments — Razorpay

Razorpay Standard Checkout (the hosted modal) → card data never touches our
origin, so the merchant stays PCI SAQ-A. UPI, cards, netbanking and wallets are
all covered; Google Pay / PhonePe / Paytm settle over UPI.

> **Payment-first.** An online order is created **only once Razorpay verifies the
> payment**. A failed or abandoned payment creates nothing — no order, no stock
> movement, no cleanup — and the customer's bag is untouched so they can retry.
> This is the standard Razorpay-on-D2C flow (Bellavita et al.).

> **The webhook is the truth.** The client callback is a fast path for the
> confirmation screen only. `finalizeOnlineCheckout` is idempotent — a retried
> webhook, a callback that races it, or a reconciliation sweep all converge on
> one order (`idempotencyKey` = the Razorpay order id).

## Flow (online)

```
POST /api/checkout/place
  ─▶ validateCheckout(): hydrate items, cart-changed diff, address,
     serviceability, coupon, credit, computePricing        (all server-side)
  ─▶ createRazorpayOrder(amount = server total)
  ─▶ CheckoutIntent.create({ …validated snapshot…, razorpayOrderId })
  ─▶ returns { intentId, payment: { kind:"razorpay", razorpayOrderId, … } }
     NO order. NO stock movement.

client ─▶ opens hosted checkout, pays
  ├▶ success  → /api/payments/razorpay/callback  (verify sig, fast)
  └▶ webhook  → /api/webhooks/razorpay           (verify sig, dedupe, AUTHORITATIVE)
       └▶ finalizeOnlineCheckout(): CheckoutIntent → TXN {
              Order.create({ status:"confirmed", payment.status:"paid" })
              commitStockForOrder() guarded $gte
                 ok       → grant Discovery-Set credit, spend credit, bump coupon,
                            clear cart, intent → "consumed"
                 oversold → ABORT (create nothing) → refund the capture in full
          }
```

A failed attempt → `markIntentFailed` (analytics only). The `CheckoutIntent`
TTL-expires after 24h; nothing to clean up.

### Trade-off — stock is not reserved during the payment window

If two customers pay for the last unit at once, the second `commitStockForOrder`
fails the guarded `$gte`. The customer has already paid, so the capture is
**auto-refunded in full** (`autoRefund` → `createRazorpayRefund`), an
`order.oversold_refunded` audit row is written, and no order is created. Rare,
controlled inventory, industry-standard.

## Pieces

```
src/server/env.ts                 getRazorpayEnv / isRazorpayConfigured / getCronSecret
src/server/payments/
  razorpay.ts     REST client (raw fetch, Basic auth) + the two signature checks
  process.ts      finalizeOnlineCheckout / markIntentFailed / cancelUnpaidOrder
                  / recordRefund + the order state machine — idempotent, txn'd
src/server/commerce/orders.ts     validateCheckout / placeOrder →
                  placeCodOrder (COD, order now) | startOnlineCheckout (intent only)
src/server/models/
  checkout-intent.ts  pre-payment snapshot (Razorpay order + validated cart),
                      unique on razorpayOrderId, 24h TTL — never in order history
  payment.ts          immutable audit log (one row per event, never a PAN)
  webhook-event.ts    idempotency ledger (unique provider+eventId, 30-day TTL)

src/app/api/
  checkout/place                POST → COD order, or a CheckoutIntent + payment directive
  payments/razorpay/callback    POST → verify sig, then finalizeOnlineCheckout
  payments/dev-simulate         POST → local-only, stands in for the hosted checkout
  webhooks/razorpay             POST → verified, deduped, always 200 fast
  cron/reconcile-payments       GET/POST — catch a paid intent both the callback
                                and the webhook missed

src/lib/razorpay-checkout.ts     client — loads checkout.js on demand, opens the modal
vercel.json                      the cron schedules
```

**Drawer / overlay layering.** The checkout drawer is a top-layer
`<dialog showModal()>`, which paints above any z-indexed element — so before
opening Razorpay the panel calls `suspendModal()` (drops the drawer to a
non-modal `show()`), and `resumeModal()` once the payment window is gone. A
*failed* attempt does **not** close Razorpay's window (it swaps to a "try
another method" screen), so `openRazorpayCheckout` holds the failure and only
resolves on the real `ondismiss`.

## Non-negotiables (all enforced)

- **Signature verification** on the callback (`HMAC-SHA256(order_id|payment_id,
  key_secret)`) *and* every webhook (`HMAC-SHA256(rawBody, webhook_secret)` —
  separate secret). `timingSafeEqual`.
- **Server-side amount.** The Razorpay order is minted at the recomputed cart
  total and that amount is frozen on the `CheckoutIntent`;
  `finalizeOnlineCheckout` refunds (and creates nothing for) any captured amount
  that doesn't match.
- **Idempotency.** Webhook events deduped by `x-razorpay-event-id`; order
  creation deduped by `idempotencyKey` = the Razorpay order id (so the callback
  and the webhook converge on one order).
- **Auto-capture** (`payment_capture: 1`).
- **The webhook is exempt** from auth and rate limiting and always answers 200
  fast (Razorpay retries any non-2xx).
- **Store only** `providerPaymentId`, `providerOrderId`, method, `last4` / UPI
  handle — never a PAN.

## Events handled

| Event | Action |
| --- | --- |
| `payment.captured` / `order.paid` | `finalizeOnlineCheckout` → confirmed order + stock; a capture that can't be honoured is auto-refunded |
| `payment.failed` | `markIntentFailed` — flag the intent (analytics); nothing else, no order exists |
| `refund.processed` / `refund.failed` | append to `order.refunds[]`, update `payment.status`, log |
| `payment.dispute.created` | logged loudly; ops alerting + fulfilment freeze is `TODO(phase-j)` |

## COD

No Razorpay call. `placeCodOrder` creates the order `pending` /
`payment.method: cod` with stock committed at creation; `idempotencyKey` (a
client UUID) dedupes a double-submit. It stays `pending` until a delivery
confirmation (Phase I).

## Local development

No Razorpay account needed. With the keys blank, `POST /api/checkout/place`
returns `payment: { kind: "razorpay-dev" }` + an `intentId`, and the checkout
drawer shows a **"Payment success / Failure"** panel that hits
`/api/payments/dev-simulate` — which runs the exact same `finalizeOnlineCheckout`
the webhook does. Disabled the moment `RAZORPAY_KEY_ID` is set, and always
disabled in production.

## Going live

1. Razorpay Test Mode keys → `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
2. Create a webhook (Dashboard → Settings → Webhooks) at
   `https://<domain>/api/webhooks/razorpay`, subscribe to the events above
   (incl. `refund.processed` / `refund.failed`), copy its secret to
   `RAZORPAY_WEBHOOK_SECRET`.
3. Set `CRON_SECRET` in the Vercel project.
4. Flip `flags.checkoutEnabled` in Site Settings.
5. Live keys only after KYC (business PAN, GST certificate, bank account).

# Payments — Razorpay (Phase E)

Razorpay Standard Checkout (the hosted modal) → card data never touches our
origin, so the merchant stays PCI SAQ-A. UPI, cards, netbanking and wallets are
all covered; Google Pay / PhonePe / Paytm settle over UPI.

> **The webhook is the truth.** The client callback is a fast path for the
> confirmation screen only. Payment state, stock and the Discovery-Set credit
> are changed **only** by verified, idempotent server events — a retried
> webhook, a callback that races it, or a reconciliation sweep all converge on
> the same result.

## Flow

```
place order ─▶ order created `pending` + stock held + paymentDueBy = now+30m
            └▶ createRazorpayOrder(amount = server total, receipt = RRS-…)
client ─────▶ opens hosted checkout, pays
            ├▶ callback  → /api/payments/razorpay/callback  (verify sig, fast confirm)
            └▶ webhook   → /api/webhooks/razorpay           (verify sig, dedupe, AUTHORITATIVE)
                          └▶ confirmPaidOrder: pending → confirmed, payment.status = paid,
                             issue Discovery-Set credit, write the payments log row
```

If payment never completes, the **auto-cancel** cron (every 5 min) cancels the
order after 30 minutes, releases the stock hold, returns any store credit and
frees the coupon.

## Pieces

```
src/server/env.ts                 getRazorpayEnv / isRazorpayConfigured / getCronSecret
src/server/payments/
  razorpay.ts     REST client (raw fetch, Basic auth) + the two signature checks
  checkout.ts     buildCheckoutPayment() — creates the Razorpay order, idempotent
  process.ts      the order state machine + confirmPaidOrder / markPaymentFailed
                  / cancelUnpaidOrder / recordRefund — all idempotent, all in a txn
src/server/models/
  payment.ts        immutable audit log (one row per event, never a PAN)
  webhook-event.ts  idempotency ledger (unique provider+eventId, 30-day TTL)
  order.ts          + payment.signature/instrument/refundedPaise, paymentDueBy

src/app/api/
  checkout/place                POST → order + a `payment` directive for the client
  payments/razorpay/callback    POST → fast confirm (verify sig, then confirmPaidOrder)
  payments/dev-simulate         POST → local-only, stands in for the hosted checkout
  webhooks/razorpay             POST → verified, deduped, always 200 fast
  cron/auto-cancel              GET/POST (Bearer CRON_SECRET) — release stale orders
  cron/reconcile-payments       GET/POST — catch missed webhooks against Razorpay

src/lib/razorpay-checkout.ts     client — loads checkout.js on demand, opens the modal
vercel.json                      the cron schedules
```

**Drawer / overlay layering.** The checkout drawer is a top-layer
`<dialog showModal()>`, which paints above any z-indexed element — so before
opening Razorpay the panel calls `suspendModal()` (drops the drawer to a
non-modal `show()`), and `resumeModal()` once the payment window is gone. A
*failed* attempt does **not** close Razorpay's window (it swaps to a "try
another method" screen), so `openRazorpayCheckout` holds the failure and only
resolves on the real `ondismiss` — otherwise the drawer would restore on top of
the still-open retry screen.

## Non-negotiables (all enforced)

- **Signature verification** on the callback (`HMAC-SHA256(order_id|payment_id,
  key_secret)`) *and* every webhook (`HMAC-SHA256(rawBody, webhook_secret)` —
  separate secret). `timingSafeEqual`. An unverifiable webhook is logged and
  400'd; an unverifiable callback returns `{ ok: false, error: "signature" }`.
- **Server-side amount.** The Razorpay order amount is the recomputed cart total;
  `confirmPaidOrder` also rejects any captured amount that doesn't match
  (`reason: "amount-mismatch"`).
- **Idempotency.** Webhook events are deduped by `x-razorpay-event-id` (unique
  index); order creation is deduped by the client `idempotencyKey`;
  `confirmPaidOrder` is a no-op on an already-paid order.
- **Auto-capture** (`payment_capture: 1`).
- **The webhook is exempt** from auth and rate limiting and always answers 200
  fast (Razorpay retries any non-2xx).
- **Store only** `providerPaymentId`, `providerOrderId`, method, `last4` / UPI
  handle — never a PAN.

## Events handled

| Event | Action |
| --- | --- |
| `payment.captured` / `order.paid` | confirm order, keep the stock hold, issue Discovery-Set credit, log |
| `payment.failed` | `payment.status = failed`; order **stays `pending`** so the customer can retry |
| `refund.processed` / `refund.failed` | append to `order.refunds[]`, update `payment.status`, log |
| `payment.dispute.created` | logged loudly; ops alerting + fulfilment freeze is `TODO(phase-j)` |

## COD

No Razorpay call. The order is created `pending` / `payment.method: cod` and
stays there until a delivery confirmation (Phase I adds the eligibility engine +
confirmation). COD orders have no `paymentDueBy`, so the auto-cancel job leaves
them alone.

## Local development

No Razorpay account needed. With the keys blank, `POST /api/checkout/place`
returns `payment: { kind: "razorpay-dev" }` and the checkout drawer shows a
**"Payment success / Failure"** panel that hits `/api/payments/dev-simulate` —
which runs the exact same `confirmPaidOrder` / `markPaymentFailed` the webhook
does. Disabled the moment `RAZORPAY_KEY_ID` is set, and always disabled in
production.

## Going live

1. Razorpay Test Mode keys → `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
2. Create a webhook (Dashboard → Settings → Webhooks) at
   `https://<domain>/api/webhooks/razorpay`, subscribe to the six events above,
   copy its secret to `RAZORPAY_WEBHOOK_SECRET`.
3. Set `CRON_SECRET` in the Vercel project (the crons in `vercel.json` pick it
   up automatically).
4. Flip `flags.checkoutEnabled` in Site Settings.
5. Live keys only after KYC (business PAN, GST certificate, bank account).

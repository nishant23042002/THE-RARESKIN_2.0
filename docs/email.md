# Transactional email (Phase F)

Every order state change reaches the customer's inbox — a confirmation / receipt
on payment, "pay on delivery" for COD, a "finish paying" nudge on a failed
attempt, a cancellation notice, a refund notice. Delivery is via **Resend**;
templates are **React Email**; with no key set every email is written to
`.mail/<key>.html` so the whole pipeline is exercisable locally.

> **The outbox is the truth.** A notification is a row in `emailmessages`,
> written right after the order-state commit. It is sent by an opportunistic
> drain (`after()` on the request that caused it) and, as the real guarantee, by
> a cron sweep every 2 minutes. A retried webhook, a callback that races it, or a
> repeated `notify*` call all collapse onto one row via `dedupeKey`.

## Flow

```
order-state commit ─▶ notifyX(orderNumber)         (src/server/email/notify.ts)
                        └▶ enqueueEmail  → emailmessages row  (status: queued)
                        └▶ after(drainOutbox({ ids:[row] }))  — best-effort, low latency
cron */2 min ─────────▶ /api/cron/send-emails → drainOutbox({ limit: 50 })  — the guarantee
drainOutbox ─────────▶ claim (atomic findOneAndUpdate) → sendEmailMessage
                        ├▶ suppressed?  → status: suppressed, no send
                        ├▶ RESEND_API_KEY set → resend.emails.send({ react }, { idempotencyKey })
                        └▶ blank + dev      → render to .mail/<key>.html
                        outcome → sent | queued (retry, exp backoff) | failed
Resend ──────────────▶ /api/webhooks/resend  (Svix-signed, WebhookEvent dedupe)
                        └▶ email.bounced / .complained → emailsuppressions upsert
```

## Pieces

```
src/server/models/
  email-message.ts      the outbox + delivery log (dedupeKey unique, status_next drain index)
  email-suppression.ts  hard bounces / spam complaints (email unique)

src/server/email/
  client.ts        getResend() / isEmailConfigured() / getEmailFrom()
  types.ts         the template prop shapes — plain, presentation-ready data
  order-context.ts loadOrderEmailContext(orderNumber) — unscoped order → props (money
                   pre-formatted, dates in IST, whatsNext from Site Settings)
  render.tsx       emailSubject() (pure) · renderElement() · renderHtml()
  send.ts          sendEmailMessage() — suppression gate, Resend send vs .mail/ fallback,
                   outcome classification (retryable vs fatal)
  outbox.ts        enqueueEmail (idempotent) · drainOutbox (claim loop + exp backoff)
                   · enqueueAndDrain
  notify.ts        notifyOrderConfirmed / …PlacedCod / …PaymentFailed / …Cancelled
                   / …RefundProcessed / …OrderStatus  — each swallows its own errors
  webhook-verify.ts  verifyResendSignature() — Svix scheme, node:crypto, 5-min replay window
  templates/
    theme.ts _layout.tsx _parts.tsx _mock.ts
    order-confirmed · order-placed-cod · payment-failed · order-cancelled
    · refund-processed · order-shipped · order-delivered

src/app/api/
  webhooks/resend        POST → Svix-verified, deduped, always 200 fast
  cron/send-emails       GET/POST (Bearer CRON_SECRET) — the drain sweep
  dev/email              GET ?action=drain | ?action=test&order=<n>  (404 in prod)

vercel.json              + { "path": "/api/cron/send-emails", "schedule": "*/2 * * * *" }
```

## Templates & triggers

| template | subject | fires from | dedupeKey |
| --- | --- | --- | --- |
| `order-confirmed` | `Order <n> confirmed — THE RARESKIN` | `finalizeOnlineCheckout` (verified payment) | `order-confirmed:<n>` |
| `order-placed-cod` | `Order <n> received — pay on delivery` | `placeCodOrder` (`method: cod`) | `order-placed-cod:<n>` |
| `payment-failed` | `Payment didn't go through — order <n>` | prepared — not wired to the payment-first flow (kept for manual / COD use) | `payment-failed:<n>` |
| `order-cancelled` | `Order <n> cancelled` | `cancelUnpaidOrder` (COD cancel / admin) | `order-cancelled:<n>` |
| `refund-processed` | `Refund on its way — order <n>` | `recordRefund` (`status: processed`) | `refund-processed:<refundId or <n>:<idx>>` |
| `order-shipped` | `Your order <n> has shipped` | **Phase G** — `notifyOrderStatus`, no live trigger yet | `order-shipped:<n>` |
| `order-delivered` | `Delivered — order <n>` | **Phase G** | `order-delivered:<n>` |

No GST line (rate 0). The `order-confirmed` email links to a downloadable
invoice PDF (`GET /api/account/orders/<n>/invoice`, generated on demand from
`src/server/invoice/`).

## Local development

No Resend account needed. With `RESEND_API_KEY` blank:

```bash
pnpm dev
pnpm email:test RRS-2026-000001   # wipes + re-renders all 7 templates to .mail/
pnpm email:drain                  # send every queued / retry-due row now
pnpm email:preview                # react-email dev server on :3030 (mock data)
```

`email:test` / `email:drain` hit `/api/dev/email` on the running dev server —
the pipeline needs the real Next runtime (`unstable_cache` + `react-dom/server`),
which a plain `tsx` process can't provide.

Suppression, retries and the webhook idempotency ledger all still run in dev.

## Going live

1. Resend → **Domains** → add `therareskin.com`, add the DKIM/SPF records, wait
   for "Verified".
2. `RESEND_API_KEY` (from Resend → API Keys) and `EMAIL_FROM` (an address on the
   verified domain) in the Vercel project.
3. Resend → **Webhooks** → add `https://<domain>/api/webhooks/resend`, subscribe
   to `email.bounced`, `email.complained`, `email.delivered`; copy the
   `whsec_...` signing secret to `RESEND_WEBHOOK_SECRET`.
4. `CRON_SECRET` is shared with the existing crons — nothing new to set; the
   `*/2` sweep in `vercel.json` picks it up. (Minute-granularity crons need
   Vercel Pro; on Hobby, fold `drainOutbox` into the daily reconcile handler.)
5. Send a real order through in Test Mode and confirm it lands (check the row in
   `emailmessages` flips to `sent` with a Resend `providerId`, and Resend's
   dashboard shows it delivered).

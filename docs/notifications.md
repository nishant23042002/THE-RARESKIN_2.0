# Admin notifications + messages (Phase I)

A staff-facing activity feed. Every meaningful lifecycle event raises a
`Notification` that surfaces live in Studio: an animated topbar bell with an
unread badge, a slide-in toast for high-priority events, a `(N)` browser-tab
title badge, a dropdown feed, `/admin/notifications`, and a "Latest activity"
panel on the dashboard.

## Model

`src/server/models/notification.ts` — `Notification`. Distinct from `AuditLog`
(immutable accountability of admin *actions*); this is transient *work to
triage*, with **per-staff read state** (`readBy: ObjectId[]` — "unread for me" =
my id not in the array) and a **60-day TTL** on `createdAt`.

Fields: `type`, `category` (`orders|payments|reviews|customers|inventory|system`
— drives icon + filter), `severity` (`info|success|attention|critical` — drives
colour + whether it toasts), `title` / `body`, `href`, `actor`, `minRole` (feed
filter — `roleRank(viewer) >= roleRank(minRole)`; default `support`),
`dedupeKey` (unique).

`src/server/models/contact-message.ts` — `ContactMessage` (the enquiry inbox).

Migration `20260902170000-notifications-and-messages.js` (applied).

## Creation

`src/server/notifications/` — `createNotification` (never throws, idempotent on
`dedupeKey`) + `notify.ts` typed one-liners (`notifyOrderPlaced`,
`notifyPaymentDispute`, `notifyReviewSubmitted`, `notifyStaffLogin`,
`notifyLowStock`, `notifyContactMessage`, …) each wrapped in a local `safely()`
so a notification bug can't break the event that raised it —
same principle as `src/server/email/notify.ts`.

`low-stock.ts` `checkLowStockForOrder(lines)` — after a stock commit, alerts for
any line that *just crossed* its threshold (`stock <= threshold` and
`stock + qty > threshold`), day-scoped dedupe.

## Wire points

One call next to the existing `recordAudit` / email-notify, post-commit:

| event | source |
|---|---|
| order placed (COD / paid) | `server/commerce/orders.ts`, `server/payments/process.ts` |
| oversold auto-refund / amount-mismatch | `process.ts` (`critical`, admin) |
| payment failed / refunded | `process.ts` |
| **dispute** | `api/webhooks/razorpay/route.ts` `payment.dispute.created` (`critical`, admin) — was the `TODO(phase-j)` |
| order cancelled | `process.ts` `cancelUnpaidOrder` |
| review submitted | `server/reviews/submit.ts` |
| staff sign-in (new device) | `api/auth/otp/verify` + `google/callback` (`attention`, admin) |
| staff invited / role change / suspend | `server/admin/{staff,user}-actions.ts` (admin) |
| low stock | order paths → `checkLowStockForOrder` |
| email bounced / complained | `api/webhooks/resend/route.ts` (admin) |
| contact enquiry | `api/contact/route.ts` (+ persists `ContactMessage`) |
| newsletter sign-up | `api/newsletter/route.ts` (`info`) |

## Feed + API

`src/server/admin/notifications.ts` — `listNotifications` (minRole-filtered,
cursor on `createdAt`, each row flagged `read`), `notificationSummary` →
`{ unread, latest[10] }`. `notification-actions.ts` `markNotificationsRead`
(`$addToSet: { readBy }`).

- `GET /api/admin/notifications` — feed (`?category=&cursor=&limit=`)
- `GET /api/admin/notifications/summary` — the 20 s poll
- `POST /api/admin/notifications/read` — `{ ids? | all?, category? }`
- `PATCH /api/admin/messages/[id]` — `{ action: "handle", note? }`

## Live behaviour

`src/components/admin/notifications/notification-bell.tsx` (in `admin-topbar`):
polls `/summary` every **20 s while the tab is visible** (pauses on
`visibilitychange`, `AbortController` per request). On an unread rise: a one-shot
bell wobble (CSS `.bell-ring`), a badge pulse, and a **toast**
(`notification-toast.tsx`) for `attention` / `critical` rows — `critical` stays
until dismissed, `attention` auto-clears after 7 s. The `(N)` title badge tracks
`unread` and survives client navigation. `prefers-reduced-motion` drops the
motion; toasts still appear.

A `window` event `rrs:notif-refresh` lets the `/admin/notifications` page tell
the bell to re-poll immediately after a read.

SSE / WebSocket push is a possible future upgrade — polling is the mechanism today.

## Messages inbox

`/admin/messages` (`support`+) — the contact form now persists a `ContactMessage`
and raises a `customer.message` notification. Filter new / handled / all, expand
a row, **Reply by email** (`mailto:` with a prefilled subject), **Mark handled**
+ an optional note (audited `message.handled`). The storefront `/contact` client
is unchanged.

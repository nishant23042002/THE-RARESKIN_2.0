# Admin — "Studio" (Phase G)

The operator console at `/admin`. Phase G ships in three sub-phases; this
document covers **G1**: the shell, RBAC, sudo re-auth, order management, and the
new-device sign-in email. G2 (catalogue + media) and G3 (coupons, customers,
staff, Site Settings) extend it.

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

`src/server/auth/admin.ts`:

| guard | behaviour |
| --- | --- |
| `requireStaff()` | no session → sign-in redirect; signed-in **non-staff** → `notFound()` (a 404, so `/admin` is never disclosed to a customer) |
| `requireAdminRole(min)` | `requireStaff` + rank ≥ `min` on the `roleRank` ladder, else 404 |
| `assertSudo(ctx)` | throws `SudoRequiredError` unless `session.sudoUntil` is live |

Role ladder (`src/server/auth/index.ts`): `customer 0 · support 1 ·
catalog_manager 1 · operations 2 · admin 3 · superadmin 4`. Section minimums:
view orders/customers `support`, fulfil orders `operations`, refunds + cancels +
(G3) coupons/staff/settings `admin`, escalate a role to `admin`+ `superadmin`.

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

## Verifying locally

Blank `RAZORPAY_KEY_ID` / `TWILIO_*` / `RESEND_API_KEY` in `.env.local` to force
the dev fallbacks (OTP `AUTH_DEV_OTP`, payments via `/api/payments/dev-simulate`,
email to `.mail/<key>.html`). Sign in as the seeded superadmin, place orders
through the drawer + dev-simulate, then exercise the flows above. The full
refund happy-path (partial + full, visible in the Razorpay dashboard) needs real
test keys.

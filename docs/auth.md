# Authentication (Phase C)

Passwordless, phone-first. A shopper enters an Indian mobile number, gets a
one-time code by SMS, and is signed in — first-timers get a `customer` account
automatically. There is no password anywhere.

## Why not Auth.js

Auth.js v5's Credentials provider (which an OTP flow is) forces **JWT**
sessions. The plan calls for revocable **database** sessions — a role change,
a suspension, or "sign out everywhere" must take effect on the next request,
which a stateless JWT cannot do. So the session layer is hand-rolled (~5 small
files) on top of the Phase A `session` model. Twilio Verify still owns the code
itself.

## Pieces

```
src/lib/auth.ts                 isomorphic — phone normalisation, SessionUser type, constants
src/server/auth/
  session.ts                    create / read (React-cached) / slide / revoke / list sessions
  otp.ts                        Twilio Verify send + check; dev-code fallback; per-phone throttle
  rate-limit.ts                 Upstash sliding-window limits + in-process fallback
  turnstile.ts                  Cloudflare Turnstile verification (skipped when unconfigured)
  user.ts                       get-or-create the account for a verified phone
  index.ts                      guards: requireUser(), requireRole(), hasRole()
src/proxy.ts                    optimistic cookie-presence gate for /account, /admin
src/app/api/auth/
  otp/start   otp/verify   logout   session   sessions/revoke-all
src/components/providers/auth-provider.tsx     client session state (no server prop → storefront stays static)
src/components/auth/
  sign-in-modal.tsx  sign-in-form.tsx  otp-input.tsx  turnstile-widget.tsx  sign-in-modal-mount.tsx
```

## API responses

The `/api/auth/otp/*` routes return **HTTP 200** with `{ ok: false, error }` for
every *expected* user-facing outcome — wrong code, expired code, unrecognised
number, rate-limited, failed bot check. These aren't request errors and a 4xx
would just spam the browser console. Non-2xx is reserved for a malformed body
(`400`) or an actual provider / server failure (`502`). Clients check
`data.ok`, not the status code.

Rate limits (per 15 min, sliding): start 5/phone · 30/IP, verify 12/phone ·
50/IP — tuned so a shared office/campus NAT never hits a wall while abuse still
stops. Twilio Verify separately caps attempts-per-code at 5.

## The sign-in modal (production behaviour)

- **Errors are red** (`--color-error`) with an alert icon; a wrong / expired
  code also paints the OTP field red.
- **Resend** — a countdown ("Resend available in 30s"), then a "Resend code"
  link. The cooldown escalates each time (30 → 45 → 60 → 90s) and is capped at
  4 resends (the server allows 5 sends / 15 min / number: 1 initial + 4). A
  successful resend clears the field and shows "A new code has been sent.". A
  server rate-limit response drives the countdown from its `retryAfter`.
- **Edit number** — a back control at the top of the code step returns to the
  phone step with the number kept for editing.
- **WebOTP** — on Android Chrome the SMS code is auto-read and submitted
  (`navigator.credentials.get({ otp })`), aborted on unmount. The manual field
  is the fallback everywhere else. The first cell also carries
  `autocomplete="one-time-code"` for iOS keyboard autofill and accepts a paste
  of the whole code.
- **On success** the modal hands straight to the "Aperture" page transition
  (`docs/route-transition.md`) — no separate confirmation screen.
- Wrong attempts clear + remount the field; `burned` (too many wrong) sends
  back to the phone step; `no-challenge` (expired) keeps you on the code step
  to resend.

## Twilio Verify wiring

The OTP is delivered by **Twilio Verify** — Twilio generates the code, sends the
SMS, and validates it; it owns expiry (~10 min), its own send cap (5) and check
cap (5) per verification. `src/server/auth/otp.ts` adds our audit trail, our own
attempt counter, request throttling, and a translation of Twilio's error codes.

Setup:

1. **Account SID + auth token** — Console → Account Info. The SID starts with
   `AC`.
2. **Verify Service** — Console → Verify → Services → create one. Its SID starts
   with `VA` (a `MG…` Messaging Service SID is the wrong kind; `getTwilioEnv()`
   rejects it with a specific error).
3. **Code Length** — in that service's settings, set it to match
   `NEXT_PUBLIC_OTP_LENGTH` (default **4**). On the first send, `ensureCodeLength()`
   fetches the service and logs a loud warning if the two disagree — that
   mismatch is exactly what makes a code un-enterable.
4. **India DLT** — production SMS to Indian numbers needs an approved DLT entity
   + template mapped to the Verify Service (weeks of lead time — start early).

`OTP_LENGTH` is read from `NEXT_PUBLIC_OTP_LENGTH` (4–10, default 4) and drives
the input, the validation regex, the copy, and the WebOTP match — one value,
everywhere.

Env-var format is validated at the point of use, not in the schema, so a wrong
value never takes down the storefront or the build. In production a missing or
malformed Twilio config **errors the OTP flow** rather than falling back to a
fixed dev code.

### Twilio error mapping

| Twilio code | meaning | client result |
| --- | --- | --- |
| 20404 | Verify Service not found (wrong `VA…`) | `send-failed` (502) + server log |
| 60200 / 60605 / 60033 | invalid / unreachable number | `invalid-phone` (200) |
| 60203 | max send attempts for this verification | `rate-limited`, retryAfter 600 |
| 60212 | too many concurrent requests | `rate-limited`, retryAfter 60 |
| 60202 | max check attempts | `too-many-attempts`, burned |
| 60410 | blocked by fraud guard | `challenge-failed` |
| 21608 | trial account, number not verified | `send-failed` + server log |

## Session model

- The session token **is** the document `_id` — a 256-bit CSPRNG value, stored
  only in the `__Host-rrs.session` cookie (`httpOnly; Secure; SameSite=Lax`)
  and in Mongo.
- Sliding lifetime: 30 days for customers, 8 hours for staff. Extended on an
  active visit (`/api/auth/session`, throttled to one write / 30 min).
- Invalidated immediately when: revoked, expired (also TTL-purged), the account
  is suspended, or the account's role changed since the session was minted.
- `sudoUntil` reserved for the admin's re-auth-for-dangerous-actions (Phase G).

## The sign-in modal

Not a page — a modal opened from the header / menu "Sign in", or auto-opened
when a guard bounces someone to `/?signin=1&next=…`. Centred card from 640 px
up, a bottom sheet below. Dark "crown" with the real wordmark and the
three-fragrance hairline; phone → segmented one-time-code on paper; on success
it hands straight to the "Aperture" page transition, which carries the user to
`next`.

The entrance/exit animation is GSAP with a `setTimeout` safety net — if rAF is
throttled (background tab) the modal still reaches its resting visible state.

## Storefront stays static

`AuthProvider` hydrates the session **client-side** from `/api/auth/session`
(with a `sessionStorage` cache to avoid a flash). It never takes a server prop,
so the root layout and every storefront page remain statically prerendered.
`/account` and the `/api/auth/*` routes are dynamic, as they should be.

## Local development

No Twilio / Turnstile / Upstash account needed:

- **OTP:** with Twilio unconfigured, `sendOtp` logs a fixed code and the modal
  shows it inline. Set `AUTH_DEV_OTP` (same length as `NEXT_PUBLIC_OTP_LENGTH`)
  or the default (`4242…` trimmed to that length) is used.
- **Turnstile:** skipped entirely when `TURNSTILE_SECRET_KEY` is blank.
- **Rate limiting:** falls back to an in-process sliding window (single
  instance only — logs a warning once).

Try it: run the app, click **Sign in**, enter any Indian mobile number, then
the dev code.

## Production readiness

| Item | Needed for |
| --- | --- |
| Twilio account + Verify Service (`VA…`) | real SMS |
| **India DLT** — registered entity, sender ID, approved template | any SMS to Indian numbers (weeks of lead time — start now) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_VERIFY_SERVICE_SID` | — |
| Cloudflare Turnstile keys | bot protection on the OTP form |
| Upstash Redis | rate limiting that holds across serverless instances |
| Set a fraud ceiling on Twilio (max verifications / number / day) | SMS-pumping fraud |

### DLT registration (do first)

Transactional SMS to Indian numbers is regulated by TRAI. Before a single
production OTP can send you must, on a DLT portal (Jio / Airtel / Vi / BSNL):

1. Register the sending entity (Velocity Ventures Group) → get an **Entity ID**.
2. Register a **Header / Sender ID** (6 characters, e.g. `RRSKIN`).
3. Register the **OTP message template** → get a **Template ID**.
4. Give those IDs to Twilio during Verify onboarding for India.

## Not in this phase

- New-device sign-in email alerts. The email pipeline now exists (Phase F,
  `src/server/email/`); this just needs a `notifyNewDevice` template + a hook in
  `createSession`. The device is already recorded on the session and shown in
  `/account`.
- ~~Guest cart merge on login~~ — done in Phase D (`docs/checkout.md`).
- Admin 2FA (TOTP) + sudo re-auth — Phase G.

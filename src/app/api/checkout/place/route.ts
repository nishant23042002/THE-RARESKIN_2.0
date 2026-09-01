import { NextResponse } from "next/server";

import { placeOrderInput } from "@/lib/validation/commerce";
import { getAuth, checkRate, requestContext } from "@/server/auth";
import { placeOrder } from "@/server/commerce";

/**
 * Start checkout. Requires a valid session — a guest verifies their phone via
 * the sign-in modal first. Totals, tax, coupon, credit and stock are all
 * recomputed here; the body only says what to buy and where to send it.
 *
 * **Payment-first:** for an online order this creates a `CheckoutIntent` + a
 * Razorpay order and returns a `payment` directive — **no order and no stock
 * movement** until the payment is verified (`/api/payments/razorpay/callback`
 * and the webhook both call `finalizeOnlineCheckout`). A COD order has no
 * payment step, so it is created here directly and `idempotencyKey` dedupes a
 * double-submit.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
  }

  const parsed = placeOrderInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 6) },
      { status: 400 },
    );
  }

  const ctx = await requestContext();
  const [byUser, byIp] = await Promise.all([
    checkRate("checkout:place:user", auth.user.id),
    checkRate("checkout:place:ip", ctx.ip ?? "unknown"),
  ]);
  if (!byUser.success || !byIp.success) {
    return NextResponse.json({ ok: false, error: "rate-limited" }, { status: 429 });
  }

  const result = await placeOrder(parsed.data, {
    userId: auth.user.id,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json(result);
}

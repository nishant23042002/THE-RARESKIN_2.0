import { NextResponse } from "next/server";

import { placeOrderInput } from "@/lib/validation/commerce";
import { getAuth, checkRate, requestContext } from "@/server/auth";
import { placeOrder } from "@/server/commerce";
import { buildCheckoutPayment } from "@/server/payments";

/**
 * Place an order. Requires a valid session — a guest verifies their phone via
 * the sign-in modal first. Totals, tax, coupon, credit and stock are all
 * recomputed here; the body only says what to buy and where to send it.
 * `idempotencyKey` dedupes a double-submit.
 *
 * The order is created as `pending` with a 30-minute payment window (Razorpay)
 * and the response carries a `payment` directive telling the client how to
 * collect payment — hosted Razorpay checkout, a dev-simulate panel, or COD.
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

  if (!result.ok) return NextResponse.json(result);

  // Attach the payment directive (creates the Razorpay order, idempotently).
  try {
    const payment = await buildCheckoutPayment(result.orderNumber);
    if (!payment) {
      return NextResponse.json({
        ok: false,
        code: "payment-init-failed",
        message: "We couldn’t start the payment. Please try again.",
      });
    }
    return NextResponse.json({ ...result, payment });
  } catch (err) {
    console.error("[checkout/place] payment init failed", err);
    return NextResponse.json({
      ok: false,
      code: "payment-init-failed",
      message:
        "We couldn’t reach the payment provider. Your order is saved — retry in a moment.",
    });
  }
}

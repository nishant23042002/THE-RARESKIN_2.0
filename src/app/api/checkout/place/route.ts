import { NextResponse } from "next/server";

import { placeOrderInput } from "@/lib/validation/commerce";
import {
  getAuth,
  checkRate,
  requestContext,
} from "@/server/auth";
import { placeOrder } from "@/server/commerce";

/**
 * Place an order. Requires a valid session — a guest verifies their phone via
 * the sign-in modal first (a lightweight `customer` account is created then).
 * Totals, tax, coupon, credit and stock are all recomputed here; the request
 * body only says what to buy and where to send it. `idempotencyKey` dedupes a
 * double-submit. No payment is taken in Phase D.
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

  // Expected, actionable failures (sold out, coupon invalid, address, …) return
  // 200 `{ ok: false, code }` so the client renders a prompt rather than the
  // browser logging a request error. `place` throws only on a true server fault.
  return NextResponse.json(result);
}

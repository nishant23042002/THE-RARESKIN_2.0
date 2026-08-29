import { NextResponse } from "next/server";

import { checkoutQuoteInput } from "@/lib/validation/commerce";
import { getCurrentUser, checkRate, requestContext } from "@/server/auth";
import { quoteOrder } from "@/server/commerce";

/**
 * Non-binding price preview for the checkout screen. Recomputed server-side on
 * every relevant field change (PIN, coupon, credit toggle, method). The real
 * numbers are settled again at `POST /api/checkout/place`.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = checkoutQuoteInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const ctx = await requestContext();
  const rl = await checkRate("checkout:quote:ip", ctx.ip ?? "unknown");
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: "rate-limited" }, { status: 429 });
  }

  const user = await getCurrentUser();
  const result = await quoteOrder(parsed.data, user?.id ?? null);
  return NextResponse.json(result);
}

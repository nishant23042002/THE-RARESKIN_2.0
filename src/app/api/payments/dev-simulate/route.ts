import { NextResponse } from "next/server";

import { devPaymentSimulateInput } from "@/lib/validation/commerce";
import { getAuth } from "@/server/auth";
import { dbConnect } from "@/server/db";
import { CheckoutIntent } from "@/server/models";
import { isProduction, isRazorpayConfigured } from "@/server/env";
import { finalizeOnlineCheckout, markIntentFailed } from "@/server/payments";

/**
 * Local-only: stand in for the Razorpay hosted checkout so the whole payment
 * flow (order confirms, stock commits, Discovery-Set credit issues, webhook
 * idempotency) is testable without keys or a public webhook URL. Disabled the
 * moment Razorpay is configured, and always disabled in production.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (isProduction() || isRazorpayConfigured()) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
  }

  const parsed = devPaymentSimulateInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  const { intentId, outcome } = parsed.data;

  await dbConnect();
  const intent = await CheckoutIntent.findOne({
    _id: intentId,
    userId: auth.user.id,
  })
    .select("razorpayOrderId")
    .lean<{ razorpayOrderId: string } | null>();
  if (!intent) {
    return NextResponse.json({ ok: false, error: "not-found" });
  }

  if (outcome === "failed") {
    await markIntentFailed(intent.razorpayOrderId, "simulated failure");
    return NextResponse.json({ ok: false, error: "failed" });
  }

  const res = await finalizeOnlineCheckout({
    providerOrderId: intent.razorpayOrderId,
    providerPaymentId: `pay_dev_${Date.now().toString(36)}`,
    source: "dev-simulate",
    instrument: "upi",
    upiVpa: "test@razorpay",
  });
  if (!res.ok) {
    if (res.reason === "sold-out-refunded") {
      return NextResponse.json({ ok: false, error: "sold-out", refunded: true });
    }
    return NextResponse.json({ ok: false, error: res.reason });
  }
  return NextResponse.json({ ok: true, orderNumber: res.orderNumber });
}

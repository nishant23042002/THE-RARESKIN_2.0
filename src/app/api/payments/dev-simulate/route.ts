import { NextResponse } from "next/server";

import { devPaymentSimulateInput } from "@/lib/validation/commerce";
import { getAuth } from "@/server/auth";
import { dbConnect } from "@/server/db";
import { Order } from "@/server/models";
import { isProduction, isRazorpayConfigured } from "@/server/env";
import { confirmPaidOrder, markPaymentFailed } from "@/server/payments";

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
  const { orderNumber, outcome } = parsed.data;

  await dbConnect();
  const order = await Order.findOne({ orderNumber, userId: auth.user.id })
    .select("orderNumber payment.method")
    .lean<{ orderNumber: string; payment: { method: string } } | null>();
  if (!order || order.payment.method !== "razorpay") {
    return NextResponse.json({ ok: false, error: "not-found" });
  }

  const fakePaymentId = `pay_dev_${Date.now().toString(36)}`;

  if (outcome === "failed") {
    await markPaymentFailed({
      orderNumber,
      providerPaymentId: fakePaymentId,
      reason: "simulated failure",
      source: "dev-simulate",
    });
    return NextResponse.json({ ok: false, error: "failed", orderNumber });
  }

  const res = await confirmPaidOrder({
    orderNumber,
    providerPaymentId: fakePaymentId,
    source: "dev-simulate",
    instrument: "upi",
    upiVpa: "test@razorpay",
  });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.reason });
  }
  return NextResponse.json({ ok: true, orderNumber: res.orderNumber });
}

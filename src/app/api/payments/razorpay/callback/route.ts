import { NextResponse } from "next/server";

import { razorpayCallbackInput } from "@/lib/validation/commerce";
import { getAuth } from "@/server/auth";
import { Order } from "@/server/models";
import { dbConnect } from "@/server/db";
import {
  verifyCallbackSignature,
  confirmPaidOrder,
  fetchRazorpayPayment,
} from "@/server/payments";

/**
 * Fast confirmation path after the hosted Razorpay checkout succeeds. The
 * signature is verified here, but the **webhook is authoritative** — this only
 * lets the drawer flip to the confirmation screen without waiting for the
 * webhook. `confirmPaidOrder` is idempotent, so both paths converge.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
  }

  const parsed = razorpayCallbackInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    parsed.data;

  if (
    !verifyCallbackSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    )
  ) {
    return NextResponse.json({ ok: false, error: "signature" });
  }

  await dbConnect();
  const order = await Order.findOne({
    "payment.providerOrderId": razorpay_order_id,
    userId: auth.user.id,
  })
    .select("orderNumber")
    .lean<{ orderNumber: string } | null>();
  if (!order) {
    return NextResponse.json({ ok: false, error: "not-found" });
  }

  // Pull instrument details for the receipt (best effort).
  let instrument: string | null = null;
  let last4: string | null = null;
  let upiVpa: string | null = null;
  let amountPaise: number | null = null;
  try {
    const p = await fetchRazorpayPayment(razorpay_payment_id);
    instrument = p.method ?? null;
    last4 = p.card?.last4 ?? null;
    upiVpa = p.vpa ?? null;
    amountPaise = p.amount ?? null;
  } catch {
    /* the webhook will fill these in */
  }

  const res = await confirmPaidOrder({
    orderNumber: order.orderNumber,
    providerOrderId: razorpay_order_id,
    providerPaymentId: razorpay_payment_id,
    signature: razorpay_signature,
    source: "checkout-callback",
    instrument,
    last4,
    upiVpa,
    amountPaise,
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.reason });
  }
  return NextResponse.json({ ok: true, orderNumber: res.orderNumber });
}

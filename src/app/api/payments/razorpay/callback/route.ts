import { NextResponse } from "next/server";

import { razorpayCallbackInput } from "@/lib/validation/commerce";
import { getAuth } from "@/server/auth";
import { dbConnect } from "@/server/db";
import { CheckoutIntent } from "@/server/models";
import {
  verifyCallbackSignature,
  finalizeOnlineCheckout,
  fetchRazorpayPayment,
} from "@/server/payments";

/**
 * Fast confirmation path after the hosted Razorpay checkout succeeds. The
 * signature is verified here, then `finalizeOnlineCheckout` turns the paid
 * `CheckoutIntent` into a real order. The **webhook is authoritative** and calls
 * the same idempotent path — this just lets the drawer flip to the confirmation
 * screen without waiting for it.
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
  // The intent must belong to this customer (defence in depth — the signature
  // already proves the payment is genuine).
  const intent = await CheckoutIntent.findOne({
    razorpayOrderId: razorpay_order_id,
    userId: auth.user.id,
  })
    .select("_id")
    .lean<{ _id: unknown } | null>();
  if (!intent) {
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

  const res = await finalizeOnlineCheckout({
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
    if (res.reason === "sold-out-refunded") {
      return NextResponse.json({ ok: false, error: "sold-out", refunded: true });
    }
    return NextResponse.json({ ok: false, error: res.reason });
  }
  return NextResponse.json({ ok: true, orderNumber: res.orderNumber });
}

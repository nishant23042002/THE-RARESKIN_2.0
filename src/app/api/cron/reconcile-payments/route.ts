import { NextResponse } from "next/server";

import { dbConnect } from "@/server/db";
import { CheckoutIntent, Order, type CheckoutIntentDoc } from "@/server/models";
import { getCronSecret, isRazorpayConfigured } from "@/server/env";
import {
  fetchRazorpayPayment,
  fetchRazorpayOrderPayments,
  finalizeOnlineCheckout,
} from "@/server/payments";

/**
 * Daily reconciliation — the backstop for "the customer paid but BOTH the
 * checkout callback and the webhook failed to reach us". For every recent
 * still-`pending` checkout intent, ask Razorpay whether its order was actually
 * captured; if so and no order exists yet, `finalizeOnlineCheckout` catches it
 * up. (A full settlements-vs-orders sweep lands with the finance export in
 * Phase I.)
 */
export const dynamic = "force-dynamic";

function authed(request: Request): boolean {
  const secret = getCronSecret();
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

async function run() {
  await dbConnect();
  if (!isRazorpayConfigured()) return { skipped: "razorpay-not-configured" };

  const since = new Date(Date.now() - 3 * 86_400_000);
  const suspects = await CheckoutIntent.find({
    status: "pending",
    createdAt: { $gt: since },
  })
    .select("razorpayOrderId amountPaise")
    .limit(200)
    .lean<
      (Pick<CheckoutIntentDoc, "razorpayOrderId" | "amountPaise">)[]
    >();

  let recovered = 0;
  const autoRefunded: string[] = [];
  const mismatches: string[] = [];

  for (const s of suspects) {
    try {
      const alreadyOrder = await Order.exists({
        "payment.providerOrderId": s.razorpayOrderId,
      });
      if (alreadyOrder) continue;

      const { items } = await fetchRazorpayOrderPayments(s.razorpayOrderId);
      const captured = items?.find((p) => p.status === "captured");
      if (!captured) continue;

      const detail = await fetchRazorpayPayment(captured.id);
      const r = await finalizeOnlineCheckout({
        providerOrderId: s.razorpayOrderId,
        providerPaymentId: captured.id,
        source: "cron",
        instrument: detail.method ?? null,
        last4: detail.card?.last4 ?? null,
        upiVpa: detail.vpa ?? null,
        amountPaise: detail.amount ?? null,
      });
      if (r.ok && !r.reused) recovered += 1;
      else if (
        !r.ok &&
        (r.reason === "sold-out-refunded" || r.reason === "amount-mismatch")
      ) {
        autoRefunded.push(`${s.razorpayOrderId}:${r.reason}`);
      } else if (!r.ok) {
        mismatches.push(`${s.razorpayOrderId}:${r.reason}`);
      }
    } catch (err) {
      console.error("[cron/reconcile] error for", s.razorpayOrderId, err);
    }
  }

  if (mismatches.length) {
    console.error("[cron/reconcile] MISMATCHES", mismatches);
  }
  return { checked: suspects.length, recovered, autoRefunded, mismatches };
}

export async function GET(request: Request) {
  if (!authed(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await run()) });
}

export async function POST(request: Request) {
  return GET(request);
}

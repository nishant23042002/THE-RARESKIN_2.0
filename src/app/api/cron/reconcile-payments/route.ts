import { NextResponse } from "next/server";

import { dbConnect } from "@/server/db";
import { Order, type OrderDoc } from "@/server/models";
import { getCronSecret, isRazorpayConfigured } from "@/server/env";
import {
  fetchRazorpayPayment,
  fetchRazorpayOrderPayments,
  confirmPaidOrder,
} from "@/server/payments";

/**
 * Daily reconciliation — for every recent order that is still `pending` but has
 * a Razorpay order id, ask Razorpay whether a payment was actually captured. If
 * a webhook was missed, `confirmPaidOrder` catches it up; genuine mismatches are
 * logged for a human. (A full settlements-vs-orders sweep lands with the
 * finance export in Phase I.)
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
  const suspects = await Order.find({
    "payment.method": "razorpay",
    "payment.status": { $in: ["pending", "failed"] },
    "payment.providerOrderId": { $type: "string" },
    createdAt: { $gt: since },
  })
    .select("orderNumber payment.providerOrderId pricing.grandTotalPaise")
    .limit(200)
    .lean<
      (Pick<OrderDoc, "orderNumber"> & {
        payment: { providerOrderId: string };
        pricing: { grandTotalPaise: number };
      })[]
    >();

  let recovered = 0;
  const mismatches: string[] = [];

  for (const o of suspects) {
    try {
      const { items } = await fetchRazorpayOrderPayments(
        o.payment.providerOrderId,
      );
      const captured = items?.find((p) => p.status === "captured");
      if (!captured) continue;

      const detail = await fetchRazorpayPayment(captured.id);
      const r = await confirmPaidOrder({
        orderNumber: o.orderNumber,
        providerOrderId: o.payment.providerOrderId,
        providerPaymentId: captured.id,
        source: "cron",
        instrument: detail.method ?? null,
        last4: detail.card?.last4 ?? null,
        upiVpa: detail.vpa ?? null,
        amountPaise: detail.amount ?? null,
      });
      if (r.ok && !r.reused) recovered += 1;
      else if (!r.ok) mismatches.push(`${o.orderNumber}:${r.reason}`);
    } catch (err) {
      console.error("[cron/reconcile] error for", o.orderNumber, err);
    }
  }

  if (mismatches.length) {
    console.error("[cron/reconcile] MISMATCHES", mismatches);
  }
  return { checked: suspects.length, recovered, mismatches };
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

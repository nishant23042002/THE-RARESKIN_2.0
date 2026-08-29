import { NextResponse } from "next/server";

import { dbConnect } from "@/server/db";
import { Order, type OrderDoc } from "@/server/models";
import { getCronSecret } from "@/server/env";
import { cancelUnpaidOrder } from "@/server/payments";

/**
 * Auto-cancel unpaid online orders once their 30-minute payment window lapses —
 * cancels the order, releases the stock hold, gives back any store credit, and
 * frees the coupon. Runs every 5 minutes via Vercel Cron (see `vercel.json`);
 * also callable locally with the bearer token.
 */
export const dynamic = "force-dynamic";

async function run() {
  await dbConnect();
  const now = new Date();
  const stale = await Order.find({
    "payment.method": "razorpay",
    status: "pending",
    "payment.status": { $ne: "paid" },
    paymentDueBy: { $lt: now },
  })
    .select("_id orderNumber")
    .limit(100)
    .lean<Pick<OrderDoc, "_id" | "orderNumber">[]>();

  const cancelled: string[] = [];
  for (const o of stale) {
    const res = await cancelUnpaidOrder(o._id, {
      reason: "Payment not completed within 30 minutes.",
      source: "cron",
    });
    if (res.ok) cancelled.push(res.orderNumber ?? o.orderNumber);
  }
  return { checked: stale.length, cancelled };
}

function authed(request: Request): boolean {
  const secret = getCronSecret();
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically.
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
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

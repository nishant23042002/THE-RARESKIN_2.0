import { NextResponse } from "next/server";

import { dbConnect } from "@/server/db";
import { EmailMessage } from "@/server/models";
import { isProduction } from "@/server/env";
import { drainOutbox } from "@/server/email";
import {
  notifyOrderCancelled,
  notifyOrderConfirmed,
  notifyOrderPlacedCod,
  notifyOrderStatus,
  notifyPaymentFailed,
  notifyRefundProcessed,
} from "@/server/email/notify";

/**
 * Local email tooling — runs inside the real Next runtime (which `tsx` scripts
 * can't: `unstable_cache` + `react-dom/server` both need it). Driven by
 * `pnpm email:drain` / `pnpm email:test <orderNumber>`. 404 in production.
 *
 *   GET /api/dev/email?action=drain
 *   GET /api/dev/email?action=test&order=RRS-2026-000001
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (isProduction()) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const order = url.searchParams.get("order");

  await dbConnect();

  if (action === "drain") {
    return NextResponse.json({ ok: true, ...(await drainOutbox({ limit: 100 })) });
  }

  if (action === "test") {
    if (!order) {
      return NextResponse.json(
        { ok: false, error: "?order= required" },
        { status: 400 },
      );
    }
    // ?only=order-confirmed → send just that one (for a real-delivery check)
    const only = url.searchParams.get("only");
    const wiped = await EmailMessage.deleteMany({ orderNumber: order });

    if (!only || only === "order-confirmed") await notifyOrderConfirmed(order);
    if (!only || only === "order-placed-cod") await notifyOrderPlacedCod(order);
    if (!only || only === "payment-failed") {
      await notifyPaymentFailed(order, "the bank declined the transaction");
    }
    if (!only || only === "order-cancelled") {
      await notifyOrderCancelled(
        order,
        "Payment wasn't completed within 30 minutes.",
      );
    }
    if (!only || only === "refund-processed") {
      await notifyRefundProcessed({
        orderNumber: order,
        providerRefundId: `rfnd_test_${Date.now().toString(36)}`,
        refundIndex: 0,
        amountPaise: 79900,
        reason: "returned unopened within 7 days",
        fullRefund: false,
      });
    }
    if (!only || only === "order-shipped") {
      await notifyOrderStatus(order, "shipped");
    }
    if (!only || only === "order-delivered") {
      await notifyOrderStatus(order, "delivered");
    }

    const drained = await drainOutbox({ limit: 100 });
    return NextResponse.json({
      ok: true,
      clearedRows: wiped.deletedCount,
      ...drained,
      note: "check .mail/",
    });
  }

  return NextResponse.json(
    { ok: false, error: "?action=drain | ?action=test&order=<n>" },
    { status: 400 },
  );
}

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
    const wiped = await EmailMessage.deleteMany({ orderNumber: order });

    await notifyOrderConfirmed(order);
    await notifyOrderPlacedCod(order);
    await notifyPaymentFailed(order, "the bank declined the transaction");
    await notifyOrderCancelled(
      order,
      "Payment wasn't completed within 30 minutes.",
    );
    await notifyRefundProcessed({
      orderNumber: order,
      providerRefundId: `rfnd_test_${Date.now().toString(36)}`,
      refundIndex: 0,
      amountPaise: 79900,
      reason: "returned unopened within 7 days",
      fullRefund: false,
    });
    await notifyOrderStatus(order, "shipped");
    await notifyOrderStatus(order, "delivered");

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

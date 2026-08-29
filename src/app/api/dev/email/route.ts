import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { dbConnect } from "@/server/db";
import { EMAIL_TEMPLATES, EmailMessage } from "@/server/models";
import { isProduction } from "@/server/env";
import { drainOutbox } from "@/server/email";
import { loadOrderEmailContext, whatsNextLine } from "@/server/email/order-context";
import { renderHtml } from "@/server/email/render";
import type { EmailPropsFor } from "@/server/email/types";
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
 * can't: `unstable_cache` + `react-dom/server` both need it). 404 in production.
 *
 *   ?action=drain                          send every queued / retry-due row
 *   ?action=test&order=RRS-…[&only=<tpl>]   enqueue + drain (SENDS if a key is set)
 *   ?action=render&order=RRS-…              render every template to .mail/ only,
 *                                          never sends — for design review
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

  if (action === "render") {
    if (!order) {
      return NextResponse.json({ ok: false, error: "?order= required" }, { status: 400 });
    }
    const ctx = await loadOrderEmailContext(order);
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "order not found" }, { status: 404 });
    }
    const whatsNext = await whatsNextLine();
    const extras: Record<string, Record<string, unknown>> = {
      "order-confirmed": {
        whatsNext,
        discoverySetCredit: ctx.discoverySetCredit,
      },
      "order-placed-cod": {
        amountDueOnDelivery: ctx.base.totals.grandTotal,
        whatsNext,
      },
      "payment-failed": {
        reason: "the bank declined the transaction",
        holdUntil: ctx.paymentDueBy,
      },
      "order-cancelled": {
        reason: "Payment wasn't completed within 30 minutes.",
        refundNote: "any store credit you used has been returned",
      },
      "refund-processed": {
        refundAmount: "₹799",
        refundReason: "returned unopened within 7 days",
        destination: "to your original payment method",
        fullRefund: false,
      },
      "order-shipped": {
        carrier: "Delhivery",
        trackingNumber: "DL1234567890IN",
        trackingUrl: "https://www.delhivery.com/track/package/DL1234567890IN",
        eta: "in 3–4 days",
      },
      "order-delivered": { deliveredAt: ctx.base.placedAt },
    };
    const dir = path.join(process.cwd(), ".mail");
    await fs.mkdir(dir, { recursive: true });
    const written: string[] = [];
    for (const tpl of EMAIL_TEMPLATES) {
      const props = { ...ctx.base, ...extras[tpl] } as EmailPropsFor<typeof tpl>;
      const html = await renderHtml(tpl, props);
      await fs.writeFile(path.join(dir, `${tpl}.html`), html, "utf8");
      written.push(`${tpl}.html`);
    }
    return NextResponse.json({ ok: true, written, note: "check .mail/ — nothing was sent" });
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

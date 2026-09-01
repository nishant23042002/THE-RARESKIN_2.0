import { NextResponse } from "next/server";

import { dbConnect } from "@/server/db";
import { WebhookEvent } from "@/server/models";
import { isRazorpayWebhookConfigured } from "@/server/env";
import {
  verifyWebhookSignature,
  finalizeOnlineCheckout,
  markIntentFailed,
  recordRefund,
} from "@/server/payments";

/**
 * The authoritative Razorpay webhook. Verified by HMAC against
 * `RAZORPAY_WEBHOOK_SECRET`, deduped by `x-razorpay-event-id`, and always
 * answered **200 fast** — Razorpay retries on any non-2xx. No auth, no rate
 * limit. An unverifiable payload is logged and dropped.
 *
 * Events: payment.captured / order.paid → finalize the paid checkout intent
 * into a confirmed order (commit stock, issue Discovery-Set credit); a capture
 * that can't be honoured is auto-refunded. payment.failed → flag the intent.
 * refund.processed / refund.failed → update refunds + payment log.
 * payment.dispute.created → flag for operations.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const eventId = request.headers.get("x-razorpay-event-id") ?? crypto.randomUUID();

  if (!isRazorpayWebhookConfigured()) {
    console.warn("[webhook/razorpay] received but RAZORPAY_WEBHOOK_SECRET unset");
    return NextResponse.json({ ok: true, ignored: "not-configured" });
  }

  if (!verifyWebhookSignature(raw, signature)) {
    console.warn("[webhook/razorpay] signature verification failed", { eventId });
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let body: RazorpayWebhookBody;
  try {
    body = JSON.parse(raw) as RazorpayWebhookBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await dbConnect();

  // Idempotency: first writer wins the unique (provider, eventId) index.
  try {
    await WebhookEvent.create({
      provider: "razorpay",
      eventId,
      type: body.event,
      status: "received",
    });
  } catch {
    return NextResponse.json({ ok: true, deduped: true });
  }

  let status: "processed" | "ignored" | "failed" = "ignored";
  let error: string | null = null;

  try {
    const payment = body.payload?.payment?.entity;
    const refund = body.payload?.refund?.entity;

    switch (body.event) {
      case "payment.captured":
      case "order.paid": {
        if (payment) {
          const res = await finalizeOnlineCheckout({
            providerOrderId: payment.order_id,
            providerPaymentId: payment.id,
            source: "webhook",
            webhookEventId: eventId,
            instrument: payment.method ?? null,
            last4: payment.card?.last4 ?? null,
            upiVpa: payment.vpa ?? null,
            amountPaise: payment.amount ?? null,
            raw: payment as unknown as Record<string, unknown>,
          });
          // A sold-out / amount-mismatch capture is auto-refunded inside
          // `finalizeOnlineCheckout` — the event is handled, don't make
          // Razorpay retry it.
          const handled =
            res.ok ||
            res.reason === "sold-out-refunded" ||
            res.reason === "amount-mismatch";
          status = handled ? "processed" : "failed";
          if (!res.ok) error = res.reason;
        }
        break;
      }
      case "payment.failed": {
        if (payment) {
          await markIntentFailed(
            payment.order_id,
            payment.error_description ?? "declined",
          );
          status = "processed";
        }
        break;
      }
      case "refund.processed":
      case "refund.failed": {
        if (refund) {
          await recordRefund({
            orderNumber: refund.notes?.orderNumber ?? "",
            amountPaise: refund.amount,
            providerRefundId: refund.id,
            status: body.event === "refund.failed" ? "failed" : "processed",
            reason: refund.notes?.reason ?? "refund",
            source: "webhook",
          });
          status = "processed";
        }
        break;
      }
      case "payment.dispute.created": {
        console.error("[webhook/razorpay] DISPUTE created", {
          eventId,
          paymentId: payment?.id,
        });
        // TODO(phase-j): alert operations + freeze fulfilment
        status = "processed";
        break;
      }
      default:
        status = "ignored";
    }
  } catch (err) {
    status = "failed";
    error = err instanceof Error ? err.message : String(err);
    console.error("[webhook/razorpay] handler error", { eventId, error });
  }

  await WebhookEvent.updateOne(
    { provider: "razorpay", eventId },
    { $set: { status, error, processedAt: new Date() } },
  );

  // Always 200 so Razorpay doesn't retry a handled event.
  return NextResponse.json({ ok: true, status });
}

// ── payload shapes (partial) ───────────────────────────────────────────

interface RazorpayWebhookBody {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id: string;
        order_id: string;
        amount: number;
        method?: string | null;
        vpa?: string | null;
        card?: { last4?: string } | null;
        error_description?: string | null;
      };
    };
    refund?: {
      entity?: {
        id: string;
        amount: number;
        notes?: { orderNumber?: string; reason?: string };
      };
    };
  };
}

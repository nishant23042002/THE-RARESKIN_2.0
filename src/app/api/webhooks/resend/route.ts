import { NextResponse } from "next/server";

import { dbConnect } from "@/server/db";
import { EmailMessage, WebhookEvent } from "@/server/models";
import { isResendWebhookConfigured } from "@/server/env";
import { suppressEmail, verifyResendSignature } from "@/server/email";

/**
 * Resend delivery webhook. Svix-signed against `RESEND_WEBHOOK_SECRET`, deduped
 * by the `svix-id` header (`WebhookEvent`, `provider: "resend"`), always
 * answered **200 fast**. A hard bounce or spam complaint adds the address to the
 * suppression list so we never email it again.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const svixId =
    request.headers.get("svix-id") ?? crypto.randomUUID();
  const svixTs = request.headers.get("svix-timestamp") ?? "";
  const svixSig = request.headers.get("svix-signature") ?? "";

  if (!isResendWebhookConfigured()) {
    console.warn("[webhook/resend] received but RESEND_WEBHOOK_SECRET unset");
    return NextResponse.json({ ok: true, ignored: "not-configured" });
  }
  if (!verifyResendSignature(raw, svixId, svixTs, svixSig)) {
    console.warn("[webhook/resend] signature verification failed", { svixId });
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let body: ResendWebhookBody;
  try {
    body = JSON.parse(raw) as ResendWebhookBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await dbConnect();

  try {
    await WebhookEvent.create({
      provider: "resend",
      eventId: svixId,
      type: body.type,
      status: "received",
    });
  } catch {
    return NextResponse.json({ ok: true, deduped: true });
  }

  let status: "processed" | "ignored" | "failed" = "ignored";
  let error: string | null = null;

  try {
    const emailId = body.data?.email_id ?? null;
    const to = Array.isArray(body.data?.to)
      ? body.data?.to[0]
      : body.data?.to;

    switch (body.type) {
      case "email.bounced": {
        if (to) {
          await suppressEmail({
            email: to,
            reason: "bounced",
            source: "resend-webhook",
          });
        }
        if (emailId) {
          await EmailMessage.updateOne(
            { providerId: emailId },
            {
              $set: {
                status: "failed",
                lastError: `bounced: ${body.data?.bounce?.message ?? "hard bounce"}`,
              },
            },
          );
        }
        status = "processed";
        break;
      }
      case "email.complained": {
        if (to) {
          await suppressEmail({
            email: to,
            reason: "complained",
            source: "resend-webhook",
          });
        }
        status = "processed";
        break;
      }
      case "email.delivered": {
        if (emailId) {
          await EmailMessage.updateOne(
            { providerId: emailId },
            { $set: { deliveredAt: new Date() } },
          );
        }
        status = "processed";
        break;
      }
      default:
        status = "ignored"; // email.sent / .delivery_delayed / .opened / .clicked
    }
  } catch (err) {
    status = "failed";
    error = err instanceof Error ? err.message : String(err);
    console.error("[webhook/resend] handler error", { svixId, error });
  }

  await WebhookEvent.updateOne(
    { provider: "resend", eventId: svixId },
    { $set: { status, error, processedAt: new Date() } },
  );

  return NextResponse.json({ ok: true, status });
}

// ── payload shape (partial) ────────────────────────────────────────────

interface ResendWebhookBody {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    from?: string;
    subject?: string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
}

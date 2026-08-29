import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Webhook idempotency ledger. Razorpay (and later Resend / Twilio) retry
 * delivery on any non-2xx, so every event is recorded by its provider event id
 * before processing — a second delivery of the same id is a no-op. TTL-purged
 * after 30 days.
 */
export interface WebhookEventDoc {
  _id: Types.ObjectId;
  provider: "razorpay" | "resend" | "twilio";
  /** the provider's unique event id (`x-razorpay-event-id`) */
  eventId: string;
  type: string;
  status: "received" | "processed" | "failed" | "ignored";
  error: string | null;
  receivedAt: Date;
  processedAt: Date | null;
  expiresAt: Date;
}

const webhookEventSchema = new Schema<WebhookEventDoc>(
  {
    provider: {
      type: String,
      enum: ["razorpay", "resend", "twilio"],
      required: true,
    },
    eventId: { type: String, required: true },
    type: { type: String, required: true },
    status: {
      type: String,
      enum: ["received", "processed", "failed", "ignored"],
      default: "received",
    },
    error: { type: String, default: null },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 86_400_000),
    },
  },
  { versionKey: false },
);

webhookEventSchema.index(
  { provider: 1, eventId: 1 },
  { name: "provider_event_unique", unique: true },
);
webhookEventSchema.index({ expiresAt: 1 }, { name: "ttl", expireAfterSeconds: 0 });

export const WebhookEvent: Model<WebhookEventDoc> =
  (models.WebhookEvent as Model<WebhookEventDoc>) ??
  model<WebhookEventDoc>("WebhookEvent", webhookEventSchema);

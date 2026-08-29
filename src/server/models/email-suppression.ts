import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Addresses we must not email again — hard bounces and spam complaints reported
 * by the Resend webhook, plus manual entries. `sendEmailMessage` checks this
 * before every send; the row is upserted with `$setOnInsert` so the first
 * signal (a complaint, say) is never overwritten by a later one.
 */

export const SUPPRESSION_REASONS = [
  "bounced",
  "complained",
  "manual",
] as const;
export type SuppressionReason = (typeof SUPPRESSION_REASONS)[number];

export interface EmailSuppressionDoc {
  _id: Types.ObjectId;
  email: string; // lowercased, unique
  reason: SuppressionReason;
  source: string; // "resend-webhook" | "admin" | "script"
  at: Date;
}

const emailSuppressionSchema = new Schema<EmailSuppressionDoc>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    reason: { type: String, enum: SUPPRESSION_REASONS, required: true },
    source: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

// Index name must match migrations/*-email-collections-and-indexes.js.
emailSuppressionSchema.index({ email: 1 }, { name: "email_unique", unique: true });

export const EmailSuppression: Model<EmailSuppressionDoc> =
  (models.EmailSuppression as Model<EmailSuppressionDoc>) ??
  model<EmailSuppressionDoc>("EmailSuppression", emailSuppressionSchema);

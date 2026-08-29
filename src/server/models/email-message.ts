import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * The transactional-email outbox and delivery log.
 *
 * Every order-lifecycle notification is written here **after** the order-state
 * commit, then drained (opportunistically via `after()`, and by a cron sweep as
 * the real guarantee) — rendered and handed to Resend, or, when no key is set,
 * written to `.mail/<key>.html` for local review.
 *
 * `dedupeKey` is the idempotency handle: a retried webhook, a callback that
 * races it, or a second `notify*` call all collapse onto one row. Status
 * transitions in place (queued → sending → sent | failed | suppressed); nothing
 * is deleted.
 */

export const EMAIL_TEMPLATES = [
  "order-confirmed",
  "order-placed-cod",
  "payment-failed",
  "order-cancelled",
  "refund-processed",
  "order-shipped",
  "order-delivered",
] as const;
export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];

export const EMAIL_STATUSES = [
  "queued", // waiting for the drain (a future `nextAttemptAt` = awaiting retry)
  "sending", // claimed by a worker
  "sent", // handed to Resend (or written to .mail/ in dev)
  "failed", // attempts exhausted, or a fatal provider error (bad recipient)
  "suppressed", // recipient is on the suppression list — never sent
  "skipped", // reserved
] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export interface EmailMessageDoc {
  _id: Types.ObjectId;
  to: string; // lowercased recipient
  template: EmailTemplate;
  subject: string; // computed once at enqueue
  dedupeKey: string; // unique — the idempotency handle
  orderId: Types.ObjectId | null;
  orderNumber: string | null;
  userId: Types.ObjectId | null;
  /** frozen template-prop snapshot, so a resend renders identically */
  props: Record<string, unknown>;
  status: EmailStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  /** Resend email id, or `dev-<ts>` for the local `.mail/` fallback */
  providerId: string | null;
  /** retry-eligibility gate — the drain only picks rows due at/before now */
  nextAttemptAt: Date;
  /** claim marker; a stale lock (> 2 min) is reclaimable by another worker */
  lockedAt: Date | null;
  queuedAt: Date;
  sentAt: Date | null;
  /** set by the Resend `email.delivered` webhook */
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const emailMessageSchema = new Schema<EmailMessageDoc>(
  {
    to: { type: String, required: true, lowercase: true, trim: true },
    template: { type: String, enum: EMAIL_TEMPLATES, required: true },
    subject: { type: String, required: true },
    dedupeKey: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    orderNumber: { type: String, default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    props: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: EMAIL_STATUSES, default: "queued" },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 5, min: 1 },
    lastError: { type: String, default: null },
    providerId: { type: String, default: null },
    nextAttemptAt: { type: Date, default: Date.now },
    lockedAt: { type: Date, default: null },
    queuedAt: { type: Date, default: Date.now },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false },
);

// Index names must match migrations/*-email-collections-and-indexes.js.
emailMessageSchema.index(
  { dedupeKey: 1 },
  { name: "dedupeKey_unique", unique: true },
);
emailMessageSchema.index(
  { status: 1, nextAttemptAt: 1 },
  { name: "status_next" },
);
emailMessageSchema.index(
  { orderNumber: 1 },
  {
    name: "orderNumber",
    partialFilterExpression: { orderNumber: { $type: "string" } },
  },
);
emailMessageSchema.index(
  { providerId: 1 },
  {
    name: "provider_id",
    partialFilterExpression: { providerId: { $type: "string" } },
  },
);
emailMessageSchema.index({ createdAt: -1 }, { name: "createdAt_desc" });

export const EmailMessage: Model<EmailMessageDoc> =
  (models.EmailMessage as Model<EmailMessageDoc>) ??
  model<EmailMessageDoc>("EmailMessage", emailMessageSchema);

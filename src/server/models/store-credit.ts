import { Schema, model, models, type Model, type Types } from "mongoose";

import {
  STORE_CREDIT_REASONS,
  STORE_CREDIT_STATUSES,
} from "@/lib/validation/commerce";

/**
 * Store credit — money the shop owes a customer (the Discovery-Set credit
 * toward a first full-size bottle, refund credit, goodwill). It is a **ledger**,
 * not a boolean: every grant is a row with a running `remainingPaise`, and every
 * spend appends a `ledger[]` entry and decrements the remainder inside the
 * order transaction, so it can never be double-spent.
 */
export interface StoreCreditLedgerSub {
  at: Date;
  /** signed paise — negative on spend, positive on reversal */
  deltaPaise: number;
  orderId: Types.ObjectId | null;
  note: string;
  actorId: Types.ObjectId | null;
}

export interface StoreCreditDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amountPaise: number;
  remainingPaise: number;
  reason: (typeof STORE_CREDIT_REASONS)[number];
  sourceOrderId: Types.ObjectId | null;
  expiresAt: Date | null;
  status: (typeof STORE_CREDIT_STATUSES)[number];
  ledger: StoreCreditLedgerSub[];
  createdAt: Date;
  updatedAt: Date;
}

const ledgerSchema = new Schema<StoreCreditLedgerSub>(
  {
    at: { type: Date, default: Date.now },
    deltaPaise: { type: Number, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    note: { type: String, default: "" },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false },
);

const storeCreditSchema = new Schema<StoreCreditDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amountPaise: { type: Number, required: true, min: 0 },
    remainingPaise: { type: Number, required: true, min: 0 },
    reason: { type: String, enum: STORE_CREDIT_REASONS, required: true },
    sourceOrderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: STORE_CREDIT_STATUSES, default: "active" },
    ledger: { type: [ledgerSchema], default: [] },
  },
  { timestamps: true },
);

// Balance lookup: active grants for a user, oldest first (FIFO spend).
storeCreditSchema.index(
  { userId: 1, status: 1, createdAt: 1 },
  { name: "user_status_created" },
);
// Guard against issuing the Discovery-Set credit twice for one order.
storeCreditSchema.index(
  { sourceOrderId: 1, reason: 1 },
  {
    name: "source_reason_unique",
    unique: true,
    partialFilterExpression: { sourceOrderId: { $type: "objectId" } },
  },
);

export const StoreCredit: Model<StoreCreditDoc> =
  (models.StoreCredit as Model<StoreCreditDoc>) ??
  model<StoreCreditDoc>("StoreCredit", storeCreditSchema);

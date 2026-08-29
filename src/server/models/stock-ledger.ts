import { Schema, model, models, type Model, type Types } from "mongoose";

import { STOCK_LEDGER_REASONS } from "@/lib/validation/commerce";

/**
 * Append-only record of every stock movement. The guarded `$inc` on the product
 * is the source of truth for the *level*; this collection is the audit trail —
 * "why is AURÉVAN at 41?" is answered by replaying these rows. Written inside
 * the same transaction as the movement it records.
 */
export interface StockLedgerDoc {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  sku: string;
  /** signed units — negative on an order, positive on restock / cancellation */
  delta: number;
  reason: (typeof STOCK_LEDGER_REASONS)[number];
  orderId: Types.ObjectId | null;
  /** product stock immediately after this movement */
  balanceAfter: number;
  actorId: Types.ObjectId | null;
  note?: string;
  at: Date;
}

const stockLedgerSchema = new Schema<StockLedgerDoc>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    delta: { type: Number, required: true },
    reason: { type: String, enum: STOCK_LEDGER_REASONS, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    balanceAfter: { type: Number, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    note: String,
    at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

stockLedgerSchema.index({ productId: 1, at: -1 }, { name: "product_at" });
stockLedgerSchema.index({ orderId: 1 }, { name: "order" });

stockLedgerSchema.pre(
  /^(update|delete|findOneAndUpdate|findOneAndDelete|findOneAndReplace|replaceOne)$/i,
  function () {
    throw new Error("stockLedger is append-only");
  },
);

export const StockLedger: Model<StockLedgerDoc> =
  (models.StockLedger as Model<StockLedgerDoc>) ??
  model<StockLedgerDoc>("StockLedger", stockLedgerSchema);

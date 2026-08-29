import "server-only";

import type { ClientSession, Types } from "mongoose";

import { Product, StockLedger } from "@/server/models";

/**
 * Oversell prevention.
 *
 * Each line is decremented with a single **guarded** atomic write —
 *
 *   findOneAndUpdate(
 *     { _id, "inventory.stock": { $gte: qty }, "inventory.trackInventory": true },
 *     { $inc: { "inventory.stock": -qty } },
 *   )
 *
 * — inside the place-order transaction. If it returns `null`, the item sold out
 * between add-to-cart and checkout and the whole order is rejected cleanly.
 * A `stockLedger` row is written for every movement.
 *
 * Phase D commits the decrement at order-creation time (there is no payment
 * window yet). Phase E moves this behind a short Redis reservation that the
 * verified `order.paid` webhook converts to a real decrement.
 */

export interface StockLine {
  productId: Types.ObjectId | string;
  sku: string;
  qty: number;
  /** from the product doc, resolved by the caller */
  trackInventory: boolean;
  allowBackorder: boolean;
}

export type StockCommitResult =
  | { ok: true }
  | { ok: false; failedSku: string };

/**
 * Decrement stock for every line, recording a ledger entry each. Rolls nothing
 * back itself — it runs inside a transaction, so the caller aborts on `ok:false`.
 */
export async function commitStockForOrder(
  lines: StockLine[],
  orderId: Types.ObjectId,
  session: ClientSession,
): Promise<StockCommitResult> {
  for (const line of lines) {
    if (!line.trackInventory || line.allowBackorder) {
      // Not tracked / backorder allowed — still log the movement for forensics,
      // but no guard and the balance may go negative by design.
      const doc = await Product.findByIdAndUpdate(
        line.productId,
        { $inc: { "inventory.stock": -line.qty } },
        { new: true, session },
      );
      await StockLedger.create(
        [
          {
            productId: line.productId,
            sku: line.sku,
            delta: -line.qty,
            reason: "order",
            orderId,
            balanceAfter: doc?.inventory.stock ?? 0,
            actorId: null,
            note: line.allowBackorder ? "backorder allowed" : "not tracked",
          },
        ],
        { session },
      );
      continue;
    }

    const updated = await Product.findOneAndUpdate(
      {
        _id: line.productId,
        "inventory.trackInventory": true,
        "inventory.stock": { $gte: line.qty },
      },
      { $inc: { "inventory.stock": -line.qty } },
      { new: true, session },
    );

    if (!updated) return { ok: false, failedSku: line.sku };

    await StockLedger.create(
      [
        {
          productId: line.productId,
          sku: line.sku,
          delta: -line.qty,
          reason: "order",
          orderId,
          balanceAfter: updated.inventory.stock,
          actorId: null,
        },
      ],
      { session },
    );
  }

  return { ok: true };
}

/** Put stock back (order cancelled / returned). Used by the lifecycle in Phase E+. */
export async function restoreStockForOrder(
  lines: { productId: Types.ObjectId | string; sku: string; qty: number }[],
  orderId: Types.ObjectId,
  reason: "cancellation" | "return",
  session: ClientSession,
): Promise<void> {
  for (const line of lines) {
    const doc = await Product.findByIdAndUpdate(
      line.productId,
      { $inc: { "inventory.stock": line.qty } },
      { new: true, session },
    );
    await StockLedger.create(
      [
        {
          productId: line.productId,
          sku: line.sku,
          delta: line.qty,
          reason,
          orderId,
          balanceAfter: doc?.inventory.stock ?? line.qty,
          actorId: null,
        },
      ],
      { session },
    );
  }
}

import "server-only";

import type { ClientSession, Types } from "mongoose";

import { dbConnect } from "@/server/db";
import { StoreCredit } from "@/server/models";
import type { STORE_CREDIT_REASONS } from "@/lib/validation/commerce";

/**
 * The store-credit ledger.
 *
 * `getStoreCreditBalance` — spendable paise right now (active, not expired).
 * `spendStoreCredit`      — FIFO across a customer's grants, inside the order
 *                           transaction; appends a ledger entry per grant hit
 *                           and flips a grant to `spent` when it hits zero.
 * `grantStoreCredit`      — issue new credit (Discovery-Set purchase, refund,
 *                           goodwill). Idempotent per `sourceOrderId` + reason.
 */

async function activeGrants(
  userId: Types.ObjectId | string,
  session?: ClientSession,
) {
  const now = new Date();
  return StoreCredit.find({
    userId,
    status: "active",
    remainingPaise: { $gt: 0 },
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  })
    .sort({ createdAt: 1 })
    .session(session ?? null);
}

export async function getStoreCreditBalance(
  userId: Types.ObjectId | string,
): Promise<number> {
  await dbConnect();
  const grants = await activeGrants(userId);
  return grants.reduce((sum, g) => sum + g.remainingPaise, 0);
}

/**
 * Spend up to `amountPaise` of credit. Returns the amount actually spent
 * (0 when the customer has no balance). Must be called with a transaction
 * `session` — it is only ever invoked from the place-order transaction.
 */
export async function spendStoreCredit(
  userId: Types.ObjectId | string,
  amountPaise: number,
  orderId: Types.ObjectId,
  session: ClientSession,
): Promise<number> {
  if (amountPaise <= 0) return 0;
  const grants = await activeGrants(userId, session);

  let remaining = amountPaise;
  for (const grant of grants) {
    if (remaining <= 0) break;
    const take = Math.min(grant.remainingPaise, remaining);
    grant.remainingPaise -= take;
    grant.ledger.push({
      at: new Date(),
      deltaPaise: -take,
      orderId,
      note: "Applied to order",
      actorId: null,
    });
    if (grant.remainingPaise === 0) grant.status = "spent";
    await grant.save({ session });
    remaining -= take;
  }
  return amountPaise - remaining;
}

/** Reverse a spend (order cancelled) — re-open grants and top them back up. */
export async function refundStoreCreditForOrder(
  userId: Types.ObjectId | string,
  orderId: Types.ObjectId,
  session: ClientSession,
): Promise<number> {
  const grants = await StoreCredit.find({
    userId,
    "ledger.orderId": orderId,
  }).session(session);

  let restored = 0;
  for (const grant of grants) {
    const spent = grant.ledger
      .filter((l) => String(l.orderId) === String(orderId) && l.deltaPaise < 0)
      .reduce((s, l) => s + -l.deltaPaise, 0);
    if (spent <= 0) continue;
    grant.remainingPaise = Math.min(
      grant.amountPaise,
      grant.remainingPaise + spent,
    );
    grant.ledger.push({
      at: new Date(),
      deltaPaise: spent,
      orderId,
      note: "Restored — order cancelled",
      actorId: null,
    });
    if (grant.status === "spent" && grant.remainingPaise > 0) {
      grant.status = "active";
    }
    await grant.save({ session });
    restored += spent;
  }
  return restored;
}

export async function grantStoreCredit(
  input: {
    userId: Types.ObjectId | string;
    amountPaise: number;
    reason: (typeof STORE_CREDIT_REASONS)[number];
    sourceOrderId?: Types.ObjectId | null;
    expiresAt?: Date | null;
    note?: string;
    actorId?: Types.ObjectId | null;
  },
  session?: ClientSession,
): Promise<{ granted: boolean }> {
  await dbConnect();
  if (input.amountPaise <= 0) return { granted: false };

  // Idempotency for order-sourced grants (the Discovery-Set credit).
  if (input.sourceOrderId) {
    const exists = await StoreCredit.exists({
      sourceOrderId: input.sourceOrderId,
      reason: input.reason,
    }).session(session ?? null);
    if (exists) return { granted: false };
  }

  await StoreCredit.create(
    [
      {
        userId: input.userId,
        amountPaise: input.amountPaise,
        remainingPaise: input.amountPaise,
        reason: input.reason,
        sourceOrderId: input.sourceOrderId ?? null,
        expiresAt: input.expiresAt ?? null,
        status: "active",
        ledger: [
          {
            at: new Date(),
            deltaPaise: input.amountPaise,
            orderId: input.sourceOrderId ?? null,
            note: input.note ?? "Issued",
            actorId: input.actorId ?? null,
          },
        ],
      },
    ],
    session ? { session } : undefined,
  );
  return { granted: true };
}

import "server-only";

import type { ClientSession, Types } from "mongoose";

import { dbConnect } from "@/server/db";
import { Coupon, Order, type CouponDoc } from "@/server/models";

/**
 * Coupon validation.
 *
 * `validateCoupon` is called at quote time and again inside the place-order
 * transaction. It never mutates — the atomic `usedCount` bump happens in
 * `orders.ts` so it shares the transaction. Per-user usage is counted from the
 * customer's non-cancelled orders that carry the code.
 */

export type CouponRejection =
  | "not-found"
  | "inactive"
  | "not-started"
  | "expired"
  | "min-subtotal"
  | "max-uses"
  | "per-user-limit";

export interface CouponEffect {
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  /** percent (0–100) for `percent`, paise for `fixed`, 0 for `free_shipping` */
  value: number;
}

export type CouponValidation =
  | { ok: true; coupon: CouponDoc; effect: CouponEffect }
  | { ok: false; reason: CouponRejection };

export async function validateCoupon(
  rawCode: string,
  opts: {
    userId: Types.ObjectId | string;
    itemsSubtotalPaise: number;
    session?: ClientSession;
    now?: Date;
  },
): Promise<CouponValidation> {
  await dbConnect();
  const code = rawCode.trim().toUpperCase();
  const now = opts.now ?? new Date();

  const q = Coupon.findOne({ code });
  if (opts.session) q.session(opts.session);
  const coupon = await q.exec();
  if (!coupon) return { ok: false, reason: "not-found" };

  if (coupon.status !== "active") return { ok: false, reason: "inactive" };
  if (coupon.startsAt && coupon.startsAt.getTime() > now.getTime()) {
    return { ok: false, reason: "not-started" };
  }
  if (coupon.endsAt && coupon.endsAt.getTime() < now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  if (opts.itemsSubtotalPaise < coupon.minSubtotalPaise) {
    return { ok: false, reason: "min-subtotal" };
  }
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, reason: "max-uses" };
  }
  if (coupon.usesPerUser > 0) {
    const used = await Order.countDocuments({
      userId: opts.userId,
      "coupon.code": code,
      status: { $ne: "cancelled" },
    }).session(opts.session ?? null);
    if (used >= coupon.usesPerUser) {
      return { ok: false, reason: "per-user-limit" };
    }
  }

  return {
    ok: true,
    coupon,
    effect: { code, type: coupon.type, value: coupon.value },
  };
}

/** Human copy for a rejection — surfaced on the checkout coupon field. */
export function couponRejectionMessage(reason: CouponRejection): string {
  switch (reason) {
    case "not-found":
      return "That code isn’t recognised.";
    case "inactive":
      return "That code isn’t active.";
    case "not-started":
      return "That code isn’t available yet.";
    case "expired":
      return "That code has expired.";
    case "min-subtotal":
      return "Your bag doesn’t meet this code’s minimum.";
    case "max-uses":
      return "That code has been fully redeemed.";
    case "per-user-limit":
      return "You’ve already used that code.";
  }
}

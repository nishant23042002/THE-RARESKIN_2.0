import "server-only";

import { dbConnect } from "@/server/db";
import { Coupon, type CouponDoc } from "@/server/models";
import { formatPaise } from "@/lib/money";

/**
 * Coupon reads for the admin. Not cached — `validateCoupon` reads live at
 * checkout, and an operator always needs the current record.
 */

export type CouponEffectiveStatus = "active" | "paused" | "expired" | "scheduled";

export interface AdminCouponRow {
  id: string;
  code: string;
  type: CouponDoc["type"];
  value: number;
  valueLabel: string;
  status: CouponDoc["status"];
  effectiveStatus: CouponEffectiveStatus;
  usedCount: number;
  maxUses: number;
  usesPerUser: number;
  minSubtotalPaise: number;
  startsAt: string | null;
  endsAt: string | null;
  stackable: boolean;
  note: string | null;
  createdAt: string;
}

export interface CouponEditDTO {
  code: string;
  type: CouponDoc["type"];
  value: number;
  minSubtotalPaise: number;
  maxUses: number;
  usesPerUser: number;
  startsAt: string | null;
  endsAt: string | null;
  stackable: boolean;
  status: CouponDoc["status"];
  note: string | null;
  usedCount: number;
}

function valueLabel(c: Pick<CouponDoc, "type" | "value">): string {
  if (c.type === "percent") return `${c.value}%`;
  if (c.type === "fixed") return formatPaise(c.value);
  return "Free shipping";
}

function effectiveStatus(
  c: Pick<CouponDoc, "status" | "startsAt" | "endsAt">,
  now = Date.now(),
): CouponEffectiveStatus {
  if (c.status === "paused") return "paused";
  if (c.endsAt && c.endsAt.getTime() < now) return "expired";
  if (c.status === "expired") return "expired";
  if (c.startsAt && c.startsAt.getTime() > now) return "scheduled";
  return "active";
}

export async function listCoupons(): Promise<AdminCouponRow[]> {
  await dbConnect();
  const docs = await Coupon.find().sort({ createdAt: -1 }).lean<CouponDoc[]>();
  return docs.map((c) => ({
    id: String(c._id),
    code: c.code,
    type: c.type,
    value: c.value,
    valueLabel: valueLabel(c),
    status: c.status,
    effectiveStatus: effectiveStatus(c),
    usedCount: c.usedCount,
    maxUses: c.maxUses,
    usesPerUser: c.usesPerUser,
    minSubtotalPaise: c.minSubtotalPaise,
    startsAt: c.startsAt ? c.startsAt.toISOString() : null,
    endsAt: c.endsAt ? c.endsAt.toISOString() : null,
    stackable: c.stackable,
    note: c.note ?? null,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function getCouponForEdit(
  rawCode: string,
): Promise<CouponEditDTO | null> {
  await dbConnect();
  const c = await Coupon.findOne({ code: rawCode.trim().toUpperCase() }).lean<CouponDoc | null>();
  if (!c) return null;
  return {
    code: c.code,
    type: c.type,
    value: c.value,
    minSubtotalPaise: c.minSubtotalPaise,
    maxUses: c.maxUses,
    usesPerUser: c.usesPerUser,
    startsAt: c.startsAt ? c.startsAt.toISOString() : null,
    endsAt: c.endsAt ? c.endsAt.toISOString() : null,
    stackable: c.stackable,
    status: c.status,
    note: c.note ?? null,
    usedCount: c.usedCount,
  };
}

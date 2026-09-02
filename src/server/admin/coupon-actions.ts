import "server-only";

import { Types } from "mongoose";

import { dbConnect } from "@/server/db";
import { Coupon, recordAudit } from "@/server/models";
import type { AuthContext } from "@/server/auth/session";
import type {
  CouponInput,
  CouponUpdateInput,
} from "@/lib/validation/commerce";
import type { COUPON_STATUSES } from "@/lib/validation/commerce";

/**
 * Coupon mutations. Every write records an audit row. There is no delete —
 * pausing (or letting a window expire) is the lifecycle; redemption history
 * lives on the orders that carry the code.
 */

type CouponStatus = (typeof COUPON_STATUSES)[number];

export type CouponActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

interface Req {
  ip: string | null;
  userAgent: string | null;
}

export async function createCoupon(
  input: CouponInput,
  ctx: AuthContext,
  req: Req,
): Promise<CouponActionResult<{ code: string }>> {
  await dbConnect();
  const actor = new Types.ObjectId(ctx.user.id);

  const existing = await Coupon.exists({ code: input.code });
  if (existing) return { ok: false, error: "code-taken" };

  try {
    const doc = await Coupon.create({
      ...input,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      createdBy: actor,
    });
    await recordAudit({
      actorId: actor,
      actorRole: ctx.user.role,
      action: "coupon.create",
      targetType: "Coupon",
      targetId: doc.code,
      after: { code: doc.code, type: doc.type, value: doc.value, status: doc.status },
      ip: req.ip,
      userAgent: req.userAgent,
    });
    return { ok: true, code: doc.code };
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      return { ok: false, error: "code-taken" };
    }
    throw e;
  }
}

export async function updateCoupon(
  rawCode: string,
  input: CouponUpdateInput,
  ctx: AuthContext,
  req: Req,
): Promise<CouponActionResult<{ code: string }>> {
  await dbConnect();
  const code = rawCode.trim().toUpperCase();
  const actor = new Types.ObjectId(ctx.user.id);

  const before = (await Coupon.findOne({ code }).lean()) as unknown as
    | Record<string, unknown>
    | null;
  if (!before) return { ok: false, error: "not-found" };

  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    set[k] = v; // `null` is a real value here (clear a date / note)
  }
  if (Object.keys(set).length === 0) return { ok: false, error: "empty" };

  await Coupon.updateOne({ code }, { $set: set });

  await recordAudit({
    actorId: actor,
    actorRole: ctx.user.role,
    action: "coupon.update",
    targetType: "Coupon",
    targetId: code,
    before: pick(before, Object.keys(set)),
    after: set,
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true, code };
}

export async function setCouponStatus(
  rawCode: string,
  status: CouponStatus,
  ctx: AuthContext,
  req: Req,
): Promise<CouponActionResult<{ code: string }>> {
  await dbConnect();
  const code = rawCode.trim().toUpperCase();
  const actor = new Types.ObjectId(ctx.user.id);

  const res = await Coupon.findOneAndUpdate(
    { code },
    { $set: { status } },
    { new: false },
  )
    .select("status")
    .lean<{ status: string } | null>();
  if (!res) return { ok: false, error: "not-found" };

  await recordAudit({
    actorId: actor,
    actorRole: ctx.user.role,
    action: "coupon.status_change",
    targetType: "Coupon",
    targetId: code,
    before: { status: res.status },
    after: { status },
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true, code };
}

function pick(
  obj: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

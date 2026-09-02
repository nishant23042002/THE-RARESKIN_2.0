import "server-only";

import { Types } from "mongoose";

import { dbConnect } from "@/server/db";
import { User, recordAudit } from "@/server/models";
import { notifyStaffInvited } from "@/server/notifications";
import { assertSudo, canEditRole } from "@/server/auth/admin";
import { revokeAllSessions } from "@/server/auth";
import { normalizeIndianMobile } from "@/lib/auth";
import type { AuthContext } from "@/server/auth/session";
import type { StaffInviteInput } from "@/lib/validation/user";

/**
 * "Invite staff" = create or promote a `User` by phone number + role. Auth is
 * phone-OTP passwordless, so there is no email link or password — the person
 * signs in with an OTP as normal and lands in `/admin` with their new access.
 * Sudo-gated; `admin` can grant anything below `admin`, only `superadmin` can
 * grant `admin` / `superadmin`.
 */

export type StaffActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

interface Req {
  ip: string | null;
  userAgent: string | null;
}

export async function createOrPromoteStaff(
  input: StaffInviteInput,
  ctx: AuthContext,
  req: Req,
): Promise<StaffActionResult<{ id: string; created: boolean }>> {
  assertSudo(ctx);
  await dbConnect();

  if (!canEditRole(ctx.user.role, input.role)) {
    return { ok: false, error: "requires-superadmin" };
  }

  const phone = normalizeIndianMobile(input.phone);
  if (!phone) return { ok: false, error: "invalid-phone" };

  const existing = await User.findOne({ phone });
  if (existing) {
    // don't let a lower actor touch someone already at / above their reach
    if (!canEditRole(ctx.user.role, existing.role)) {
      return { ok: false, error: "requires-superadmin" };
    }
    const before = existing.role;
    existing.role = input.role;
    if (!existing.name) existing.name = input.name;
    if (!existing.email && input.email) existing.email = input.email;
    await existing.save();
    await revokeAllSessions(String(existing._id));

    await recordAudit({
      actorId: new Types.ObjectId(ctx.user.id),
      actorRole: ctx.user.role,
      action: "staff.invite",
      targetType: "User",
      targetId: String(existing._id),
      before: { role: before },
      after: { role: input.role, promoted: true },
      ip: req.ip,
      userAgent: req.userAgent,
    });
    await notifyStaffInvited({
      name: existing.name || input.name,
      role: input.role,
      by: ctx.user.name || "an admin",
      created: false,
    });
    return { ok: true, id: String(existing._id), created: false };
  }

  const user = await User.create({
    phone,
    name: input.name,
    email: input.email ?? null,
    role: input.role,
    status: "active",
  });
  await recordAudit({
    actorId: new Types.ObjectId(ctx.user.id),
    actorRole: ctx.user.role,
    action: "staff.invite",
    targetType: "User",
    targetId: String(user._id),
    after: { phone, role: input.role, created: true },
    ip: req.ip,
    userAgent: req.userAgent,
  });
  await notifyStaffInvited({
    name: input.name,
    role: input.role,
    by: ctx.user.name || "an admin",
    created: true,
  });
  return { ok: true, id: String(user._id), created: true };
}

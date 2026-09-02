import "server-only";

import { Types } from "mongoose";

import { dbConnect } from "@/server/db";
import { User, recordAudit } from "@/server/models";
import { notifyUserAccountChange } from "@/server/notifications";
import { assertSudo, canEditRole } from "@/server/auth/admin";
import { revokeAllSessions } from "@/server/auth";
import type { AuthContext } from "@/server/auth/session";
import type { UserAdminUpdateInput } from "@/lib/validation/user";

/**
 * Account management. `updateUserAccount` is sudo-gated + guards who can grant
 * which role; `signOutUserEverywhere` is not (it's reversible — the person just
 * signs in again).
 */

export type UserActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

interface Req {
  ip: string | null;
  userAgent: string | null;
}

export async function updateUserAccount(
  id: string,
  input: UserAdminUpdateInput,
  ctx: AuthContext,
  req: Req,
): Promise<UserActionResult> {
  assertSudo(ctx);
  await dbConnect();

  if (id === ctx.user.id) {
    return { ok: false, error: "self-target" };
  }

  const user = await User.findById(id);
  if (!user) return { ok: false, error: "not-found" };

  const before = { role: user.role, status: user.status };
  let touchedRole = false;
  let touchedStatus = false;

  if (input.role && input.role !== user.role) {
    if (
      !canEditRole(ctx.user.role, user.role) ||
      !canEditRole(ctx.user.role, input.role)
    ) {
      return { ok: false, error: "requires-superadmin" };
    }
    user.role = input.role;
    touchedRole = true;
  }

  if (input.status && input.status !== user.status) {
    // suspending / un-suspending any account below your reach
    if (!canEditRole(ctx.user.role, user.role)) {
      return { ok: false, error: "requires-superadmin" };
    }
    user.status = input.status;
    user.suspendedReason =
      input.status === "suspended" ? input.suspendedReason ?? null : null;
    touchedStatus = true;
  }

  if (!touchedRole && !touchedStatus) return { ok: false, error: "no-change" };

  await user.save();

  // A role change or a suspension takes effect immediately — drop every session.
  await revokeAllSessions(id);

  if (touchedRole) {
    await recordAudit({
      actorId: new Types.ObjectId(ctx.user.id),
      actorRole: ctx.user.role,
      action: "user.role_change",
      targetType: "User",
      targetId: id,
      before: { role: before.role },
      after: { role: user.role },
      ip: req.ip,
      userAgent: req.userAgent,
    });
  }
  if (touchedStatus) {
    await recordAudit({
      actorId: new Types.ObjectId(ctx.user.id),
      actorRole: ctx.user.role,
      action: "user.status_change",
      targetType: "User",
      targetId: id,
      before: { status: before.status },
      after: { status: user.status, reason: user.suspendedReason },
      ip: req.ip,
      userAgent: req.userAgent,
    });
  }

  const by = ctx.user.name || "an admin";
  if (touchedRole) {
    await notifyUserAccountChange({
      name: user.name || "an account",
      change: `role ${before.role} → ${user.role}`,
      by,
    });
  }
  if (touchedStatus) {
    await notifyUserAccountChange({
      name: user.name || "an account",
      change:
        user.status === "suspended"
          ? `suspended${user.suspendedReason ? ` — ${user.suspendedReason}` : ""}`
          : "reinstated",
      by,
      severity: user.status === "suspended" ? "attention" : "info",
    });
  }
  return { ok: true };
}

export async function signOutUserEverywhere(
  id: string,
  ctx: AuthContext,
  req: Req,
): Promise<UserActionResult<{ revoked: number }>> {
  await dbConnect();
  const user = await User.exists({ _id: id });
  if (!user) return { ok: false, error: "not-found" };

  const revoked = await revokeAllSessions(id);
  await recordAudit({
    actorId: new Types.ObjectId(ctx.user.id),
    actorRole: ctx.user.role,
    action: "user.sessions_revoked",
    targetType: "User",
    targetId: id,
    after: { revoked },
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true, revoked };
}

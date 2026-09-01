import "server-only";

import { Types } from "mongoose";

import { dbConnect } from "@/server/db";
import { Session, recordAudit } from "@/server/models";
import { SUDO_WINDOW_MINUTES } from "@/lib/auth";

import { sendOtp, checkOtp, type SendResult } from "./otp";
import type { AuthContext } from "./session";

/**
 * Staff re-authentication ("sudo"). A dangerous admin action first sends a fresh
 * OTP to the staff member's own phone; on success `session.sudoUntil` is set
 * `SUDO_WINDOW_MINUTES` ahead so a short burst of related actions isn't
 * re-prompted. Reuses the Twilio Verify flow (dev code `AUTH_DEV_OTP` locally).
 */

export async function startSudo(
  ctx: AuthContext,
  reqCtx: { ip: string | null; userAgent: string | null },
): Promise<SendResult> {
  return sendOtp(ctx.user.phone, reqCtx, "sudo");
}

export async function confirmSudo(
  ctx: AuthContext,
  code: string,
  reqCtx: { ip: string | null; userAgent: string | null },
): Promise<{ ok: boolean; error?: string; sudoUntil?: string }> {
  const result = await checkOtp(ctx.user.phone, code, "sudo");
  if (!result.ok) {
    return { ok: false, error: result.error ?? "invalid-code" };
  }

  await dbConnect();
  const sudoUntil = new Date(Date.now() + SUDO_WINDOW_MINUTES * 60_000);
  await Session.updateOne(
    { _id: ctx.session._id },
    { $set: { sudoUntil } },
  );

  await recordAudit({
    actorId: new Types.ObjectId(ctx.user.id),
    actorRole: ctx.user.role,
    action: "admin.sudo_grant",
    targetType: "Session",
    targetId: null,
    after: { minutes: SUDO_WINDOW_MINUTES },
    ip: reqCtx.ip,
    userAgent: reqCtx.userAgent,
  });

  return { ok: true, sudoUntil: sudoUntil.toISOString() };
}

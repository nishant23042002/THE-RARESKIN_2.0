import "server-only";

import { dbConnect } from "@/server/db";
import { User, recordAudit, type UserDoc } from "@/server/models";

/**
 * Get-or-create the account for a verified phone number.
 *
 * First-time callers (including guest checkout) get a lightweight `customer`
 * row — no name required. `phoneVerifiedAt` is stamped because they just
 * completed an OTP.
 */
export async function upsertVerifiedUser(
  phone: string,
  ctx: { ip: string | null },
): Promise<{ user: UserDoc; created: boolean }> {
  await dbConnect();

  const existing = await User.findOne({ phone });
  if (existing) {
    existing.phoneVerifiedAt ??= new Date();
    existing.lastLoginAt = new Date();
    existing.lastLoginIp = ctx.ip;
    await existing.save();
    return { user: existing, created: false };
  }

  const user = await User.create({
    phone,
    phoneVerifiedAt: new Date(),
    role: "customer",
    status: "active",
    lastLoginAt: new Date(),
    lastLoginIp: ctx.ip,
  });

  await recordAudit({
    actorId: user._id,
    actorRole: "customer",
    action: "auth.account_created",
    targetType: "User",
    targetId: String(user._id),
    after: { phone },
    ip: ctx.ip,
    userAgent: null,
  });

  return { user, created: true };
}

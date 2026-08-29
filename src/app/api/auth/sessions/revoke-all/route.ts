import { NextResponse } from "next/server";

import { recordAudit } from "@/server/models";
import {
  clearSessionCookie,
  getAuth,
  requestContext,
  revokeAllSessions,
} from "@/server/auth";

/** "Sign out of every device." Revokes all of the user's sessions, this one
 *  included, so the caller is logged out too. */
export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await getAuth();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const count = await revokeAllSessions(ctx.user.id);
  await clearSessionCookie();

  const req = await requestContext();
  await recordAudit({
    actorId: ctx.session.userId,
    actorRole: ctx.user.role,
    action: "auth.revoke_all_sessions",
    targetType: "User",
    targetId: ctx.user.id,
    after: { revoked: count },
    ip: req.ip,
    userAgent: req.userAgent,
  });

  return NextResponse.json({ ok: true, revoked: count });
}

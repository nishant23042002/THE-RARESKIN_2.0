import { NextResponse } from "next/server";

import { getAuth, requestContext } from "@/server/auth";
import { dbConnect } from "@/server/db";
import { User, recordAudit } from "@/server/models";

/**
 * `POST /api/auth/account/google/unlink` — drop the linked Google identity.
 * A phone number is always on file, so unlinking never locks anyone out.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(auth.user.id);
  if (!user) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  const had = user.google?.email ?? null;
  user.google = null;
  await user.save();

  const reqCtx = await requestContext();
  await recordAudit({
    actorId: user._id,
    actorRole: user.role,
    action: "auth.google_unlink",
    targetType: "User",
    targetId: String(user._id),
    before: { googleEmail: had },
    ip: reqCtx.ip,
    userAgent: reqCtx.userAgent,
  });

  return NextResponse.json({ ok: true });
}

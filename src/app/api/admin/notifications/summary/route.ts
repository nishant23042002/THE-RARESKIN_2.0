import { NextResponse } from "next/server";

import { requireStaff } from "@/server/auth/admin";
import { notificationSummary } from "@/server/admin";

/**
 * `GET /api/admin/notifications/summary` — the 20-second poll behind the topbar
 * bell. Deliberately cheap: an unread count + the 10 newest rows.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireStaff();
  const summary = await notificationSummary({
    userId: ctx.user.id,
    role: ctx.user.role,
  });
  return NextResponse.json({ ok: true, ...summary });
}

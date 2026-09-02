import { NextResponse } from "next/server";

import { notificationReadInput } from "@/lib/validation/notification";
import { requireStaff } from "@/server/auth/admin";
import { markNotificationsRead } from "@/server/admin";

/** `POST /api/admin/notifications/read` — mark a set read for the caller. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireStaff();
  const parsed = notificationReadInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request" },
      { status: 400 },
    );
  }

  const result = await markNotificationsRead(
    { userId: ctx.user.id, role: ctx.user.role },
    parsed.data,
  );
  return NextResponse.json(result);
}

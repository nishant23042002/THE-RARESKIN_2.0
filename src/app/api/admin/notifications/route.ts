import { NextResponse } from "next/server";

import { NOTIFICATION_CATEGORIES } from "@/lib/validation/notification";
import { requireStaff } from "@/server/auth/admin";
import { listNotifications } from "@/server/admin";

/** `GET /api/admin/notifications?category=&cursor=&limit=` — the feed. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await requireStaff();
  const url = new URL(request.url);

  const rawCategory = url.searchParams.get("category");
  const category = (NOTIFICATION_CATEGORIES as readonly string[]).includes(
    rawCategory ?? "",
  )
    ? (rawCategory as (typeof NOTIFICATION_CATEGORIES)[number])
    : undefined;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Number(url.searchParams.get("limit")) || undefined;

  const feed = await listNotifications(
    { category, cursor, limit },
    { userId: ctx.user.id, role: ctx.user.role },
  );
  return NextResponse.json({ ok: true, ...feed });
}

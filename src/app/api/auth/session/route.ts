import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";
import { getCurrentUser, touchSession } from "@/server/auth";

/**
 * Current session, for the client `AuthProvider`. Reading this keeps the
 * storefront's pages static — auth state is hydrated on the client instead of
 * making every route dynamic. Also slides the session on an active visit.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (user) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) {
      // fire-and-forget — don't block the response on the slide write
      void touchSession(token).catch(() => {});
    }
  }

  return NextResponse.json(
    { user },
    { headers: { "cache-control": "no-store" } },
  );
}

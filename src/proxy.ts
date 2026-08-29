import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth";

/**
 * Optimistic auth gate. This only checks whether a session *cookie* is present
 * and bounces home (where the sign-in modal auto-opens) if not — the real
 * validation (revoked? expired? role?) happens in the guarded page via
 * `requireUser()`. Per the Next.js docs, proxy is not a session-management
 * layer; keep it to cheap redirects.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("signin", "1");
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};

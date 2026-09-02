import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { googleStartQuery } from "@/lib/validation/auth";
import { safeNextPath } from "@/lib/auth";
import { isGoogleAuthConfigured } from "@/server/env";
import { beginOAuth, googleRedirectUri } from "@/server/auth/google";
import { checkRate, getAuth, requestContext } from "@/server/auth";

/**
 * `GET /api/auth/google/start?mode=link|signin&next=/path`
 *
 * Stashes the OAuth secrets in five short-lived `__Host-` cookies and redirects
 * to Google's consent screen. `mode=link` needs a live session; `mode=signin`
 * is open. The callback (`/api/auth/google/callback`) trusts only these cookies.
 */
export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600, // 10 minutes to complete the round-trip
};

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: "google-not-configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const parsed = googleStartQuery.safeParse({
    mode: url.searchParams.get("mode") ?? undefined,
    next: url.searchParams.get("next") ?? undefined,
  });
  const mode = parsed.success ? parsed.data.mode : "signin";
  const next = safeNextPath(parsed.success ? parsed.data.next : null);

  if (mode === "link") {
    const ctx = await getAuth();
    if (!ctx) {
      return NextResponse.redirect(
        new URL("/?signin=1&next=/admin/account", url.origin),
      );
    }
  }

  const ctx = await requestContext();
  const rate = await checkRate("auth:google:ip", ctx.ip ?? "unknown");
  if (!rate.success) {
    return NextResponse.redirect(
      new URL("/?signin=1&auth_error=google-rate-limited", url.origin),
    );
  }

  const { url: googleUrl, state, codeVerifier, nonce } = beginOAuth(
    mode,
    googleRedirectUri(request),
  );

  const jar = await cookies();
  jar.set("__Host-goog_state", state, COOKIE_OPTS);
  jar.set("__Host-goog_verifier", codeVerifier, COOKIE_OPTS);
  jar.set("__Host-goog_nonce", nonce, COOKIE_OPTS);
  jar.set("__Host-goog_mode", mode, COOKIE_OPTS);
  jar.set("__Host-goog_next", next, COOKIE_OPTS);

  return NextResponse.redirect(googleUrl);
}

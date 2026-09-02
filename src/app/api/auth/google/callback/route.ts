import { cookies } from "next/headers";
import { NextResponse, after } from "next/server";

import { safeNextPath } from "@/lib/auth";
import { isGoogleAuthConfigured, googleStaffDomains } from "@/server/env";
import {
  completeOAuth,
  googleRedirectUri,
  type GoogleIdentity,
} from "@/server/auth/google";
import {
  createSession,
  getAuth,
  isFirstSeenDevice,
  requestContext,
} from "@/server/auth";
import { notifyNewDevice } from "@/server/email";
import { notifyStaffLogin } from "@/server/notifications";
import { dbConnect } from "@/server/db";
import { User, recordAudit, type UserDoc } from "@/server/models";
import { STAFF_ROLES } from "@/lib/validation/user";

/**
 * `GET /api/auth/google/callback` — Google redirects here with `code` + `state`.
 *
 * Reads (and clears) the five `__Host-goog_*` cookies from `/start`, exchanges
 * the code, then branches on the stashed `mode`:
 *  - **link**  — attach the Google identity to the signed-in account.
 *  - **signin** — find an existing account by `google.sub` or a verified-email
 *    match and mint a session. Never creates an account.
 */
export const dynamic = "force-dynamic";

const GOOG_COOKIES = [
  "__Host-goog_state",
  "__Host-goog_verifier",
  "__Host-goog_nonce",
  "__Host-goog_mode",
  "__Host-goog_next",
] as const;

const isStaffRole = (role: string) =>
  (STAFF_ROLES as readonly string[]).includes(role);

function redirectTo(origin: string, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, origin));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const jar = await cookies();
  const stash = Object.fromEntries(
    GOOG_COOKIES.map((n) => [n, jar.get(n)?.value ?? null]),
  ) as Record<(typeof GOOG_COOKIES)[number], string | null>;
  for (const n of GOOG_COOKIES) jar.delete(n);

  if (!isGoogleAuthConfigured()) {
    return redirectTo(origin, "/?signin=1&auth_error=google-not-configured");
  }

  const mode = stash["__Host-goog_mode"] === "link" ? "link" : "signin";
  const next = safeNextPath(stash["__Host-goog_next"]);
  const linkReturn = "/admin/account";

  // A failed sign-in reopens the sign-in modal. Carry `next` so a staff member
  // who started from `/admin` gets the Studio-flavoured modal, not the shopper
  // one (the deep-link handler reads `next` off the URL).
  const signinError = (code: string) => {
    const p = new URLSearchParams({ signin: "1", auth_error: code });
    if (next !== "/account") p.set("next", next);
    return `/?${p.toString()}`;
  };

  // provider-side error, or the user cancelled at the consent screen
  const providerError = url.searchParams.get("error");
  if (providerError) {
    return redirectTo(
      origin,
      mode === "link"
        ? `${linkReturn}?google_error=cancelled`
        : signinError("google-cancelled"),
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (
    !code ||
    !state ||
    !stash["__Host-goog_state"] ||
    state !== stash["__Host-goog_state"] ||
    !stash["__Host-goog_verifier"] ||
    !stash["__Host-goog_nonce"]
  ) {
    return redirectTo(
      origin,
      mode === "link"
        ? `${linkReturn}?google_error=bad-request`
        : signinError("google-bad-request"),
    );
  }

  let identity: GoogleIdentity;
  try {
    identity = await completeOAuth({
      code,
      codeVerifier: stash["__Host-goog_verifier"]!,
      nonce: stash["__Host-goog_nonce"]!,
      redirectUri: googleRedirectUri(request),
    });
  } catch (err) {
    console.error("[auth] google callback exchange failed", err);
    return redirectTo(
      origin,
      mode === "link"
        ? `${linkReturn}?google_error=exchange-failed`
        : signinError("google-exchange-failed"),
    );
  }

  await dbConnect();
  const reqCtx = await requestContext();

  // ── link ─────────────────────────────────────────────────────────────
  if (mode === "link") {
    const auth = await getAuth();
    if (!auth) {
      return redirectTo(origin, "/?signin=1&next=/admin/account");
    }
    if (!identity.emailVerified) {
      return redirectTo(origin, `${linkReturn}?google_error=email-unverified`);
    }

    const clash = await User.findOne({ "google.sub": identity.sub })
      .select("_id")
      .lean<{ _id: unknown } | null>();
    if (clash && String(clash._id) !== auth.user.id) {
      return redirectTo(origin, `${linkReturn}?google_error=already-linked`);
    }

    const emailOwner = await User.findOne({
      email: identity.email,
      emailVerifiedAt: { $ne: null },
    })
      .select("_id")
      .lean<{ _id: unknown } | null>();
    if (emailOwner && String(emailOwner._id) !== auth.user.id) {
      return redirectTo(origin, `${linkReturn}?google_error=email-taken`);
    }

    const user = await User.findById(auth.user.id);
    if (!user) {
      return redirectTo(origin, "/?signin=1&next=/admin/account");
    }

    user.google = {
      sub: identity.sub,
      email: identity.email,
      emailVerified: identity.emailVerified,
      name: identity.name,
      picture: identity.picture,
      hostedDomain: identity.hostedDomain,
      linkedAt: new Date(),
      lastUsedAt: null,
    };
    if (!user.email) {
      user.email = identity.email;
      user.emailVerifiedAt = new Date();
    }
    await user.save();

    await recordAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "auth.google_link",
      targetType: "User",
      targetId: String(user._id),
      after: { googleSub: identity.sub, googleEmail: identity.email },
      ip: reqCtx.ip,
      userAgent: reqCtx.userAgent,
    });

    return redirectTo(origin, `${next.startsWith("/admin") ? next : linkReturn}?google=linked`);
  }

  // ── signin ───────────────────────────────────────────────────────────
  let user: (UserDoc & { save: () => Promise<unknown> }) | null =
    await User.findOne({ "google.sub": identity.sub });

  let linkedNow = false;
  if (!user && identity.emailVerified) {
    const byEmail = await User.findOne({
      email: identity.email,
      emailVerifiedAt: { $ne: null },
    });
    if (byEmail && (byEmail.google == null || byEmail.google.sub === identity.sub)) {
      user = byEmail;
      linkedNow = byEmail.google == null;
    }
  }

  if (!user) {
    return redirectTo(origin, signinError("google-no-match"));
  }
  if (user.status !== "active") {
    return redirectTo(origin, signinError("google-account-inactive"));
  }

  const domains = googleStaffDomains();
  if (
    isStaffRole(user.role) &&
    domains.length > 0 &&
    (!identity.hostedDomain || !domains.includes(identity.hostedDomain))
  ) {
    return redirectTo(origin, signinError("google-staff-domain"));
  }

  const now = new Date();
  if (linkedNow) {
    user.google = {
      sub: identity.sub,
      email: identity.email,
      emailVerified: identity.emailVerified,
      name: identity.name,
      picture: identity.picture,
      hostedDomain: identity.hostedDomain,
      linkedAt: now,
      lastUsedAt: now,
    };
  } else if (user.google) {
    user.google.lastUsedAt = now;
  }
  user.lastLoginAt = now;
  user.lastLoginIp = reqCtx.ip;
  await user.save();

  const session = await createSession(user, reqCtx);

  after(async () => {
    try {
      const isNew = await isFirstSeenDevice(
        user!._id,
        session._id,
        session.device,
      );
      if (isNew) {
        await notifyNewDevice({
          userId: String(user!._id),
          email: user!.email,
          name: user!.name,
          device: session.device,
          ip: reqCtx.ip,
        });
        if (isStaffRole(user!.role)) {
          await notifyStaffLogin({
            name: user!.name || "A staff member",
            role: user!.role,
            device:
              [session.device.browser, session.device.os]
                .filter(Boolean)
                .join(" on ") || "a new device",
            ip: reqCtx.ip,
          });
        }
      }
    } catch (err) {
      console.error("[auth] new-device notice failed", err);
    }
  });

  await recordAudit({
    actorId: user._id,
    actorRole: user.role,
    action: "auth.login",
    targetType: "User",
    targetId: String(user._id),
    after: {
      method: "google",
      sessionId: session._id.slice(0, 8),
      device: session.device,
      linkedNow,
    },
    ip: reqCtx.ip,
    userAgent: reqCtx.userAgent,
  });

  // Landing: honour a real `next`; a staff member with only the default
  // (`/account`) is sent to Studio instead.
  const landing =
    next === "/account" && isStaffRole(user.role) ? "/admin" : next;
  return redirectTo(origin, landing);
}

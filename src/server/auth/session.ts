import "server-only";

import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";

import { dbConnect } from "@/server/db";
import { Session, User, type SessionDoc, type UserDoc } from "@/server/models";
import { isProduction } from "@/server/env";
import {
  CUSTOMER_SESSION_DAYS,
  SESSION_COOKIE,
  STAFF_SESSION_HOURS,
  type SessionUser,
} from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/validation/user";

/**
 * Revocable database sessions.
 *
 * The cookie holds only an opaque 256-bit token (the session `_id`). Validity,
 * role and the sudo window all live in the row, so a role change, a suspension
 * or "log out everywhere" takes effect on the very next request — something a
 * stateless JWT cannot do. This is why the auth here is hand-rolled rather than
 * Auth.js (whose Credentials provider forces JWT sessions).
 */

const isStaffRole = (role: string) =>
  (STAFF_ROLES as readonly string[]).includes(role);

function sessionTtlMs(role: string): number {
  return isStaffRole(role)
    ? STAFF_SESSION_HOURS * 3600_000
    : CUSTOMER_SESSION_DAYS * 86_400_000;
}

function parseUA(ua: string | null): { browser: string | null; os: string | null } {
  if (!ua) return { browser: null, os: null };
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : null;
  const os =
    /Windows/.test(ua) ? "Windows"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iOS/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : null;
  return { browser, os };
}

function toSessionUser(user: UserDoc): SessionUser {
  return {
    id: String(user._id),
    phone: user.phone,
    name: user.name,
    email: user.email,
    role: user.role,
    isStaff: isStaffRole(user.role),
  };
}

// ── create / cookie ─────────────────────────────────────────────────────

export interface CreateSessionCtx {
  ip: string | null;
  userAgent: string | null;
}

/** Mint a session for a user, persist it, and set the cookie. */
export async function createSession(
  user: Pick<UserDoc, "_id" | "role">,
  ctx: CreateSessionCtx,
): Promise<SessionDoc> {
  await dbConnect();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionTtlMs(user.role));

  const session = await Session.create({
    _id: token,
    userId: user._id,
    role: user.role,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    device: parseUA(ctx.userAgent),
    revokedAt: null,
    sudoUntil: null,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true, // works on http://localhost (a trustworthy origin)
    sameSite: "lax", // survives the payment-gateway return redirect
    path: "/",
    expires: expiresAt,
  });

  return session;
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// ── read (request-cached) ───────────────────────────────────────────────

export interface AuthContext {
  session: SessionDoc;
  user: SessionUser;
}

async function loadSession(): Promise<AuthContext | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  await dbConnect();
  const session = await Session.findById(token).lean<SessionDoc | null>();
  if (!session) return null;
  if (session.revokedAt || session.expiresAt.getTime() < Date.now()) return null;

  const user = await User.findById(session.userId).lean<UserDoc | null>();
  if (!user || user.status !== "active") return null;

  // Role drift: if the account's role changed since the session was minted,
  // the session is stale — force a fresh sign-in.
  if (user.role !== session.role) return null;

  return { session, user: toSessionUser(user) };
}

/** The current auth context, memoised for the lifetime of the request. */
export const getAuth = cache(loadSession);

export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await getAuth())?.user ?? null;
}

// ── slide / revoke / list ───────────────────────────────────────────────

/** Extend a session on activity. Called from `/api/auth/session`, throttled. */
export async function touchSession(token: string): Promise<void> {
  await dbConnect();
  const session = await Session.findById(token);
  if (!session || session.revokedAt) return;
  const now = Date.now();
  if (session.expiresAt.getTime() < now) return;
  // only write if it's been a while — avoids a write on every page view
  if (now - session.lastSeenAt.getTime() < 30 * 60_000) return;
  session.lastSeenAt = new Date(now);
  session.expiresAt = new Date(now + sessionTtlMs(session.role));
  await session.save();
}

export async function revokeSession(token: string): Promise<void> {
  await dbConnect();
  await Session.updateOne(
    { _id: token, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function revokeOtherSessions(
  userId: string,
  keepToken: string,
): Promise<number> {
  await dbConnect();
  const res = await Session.updateMany(
    { userId, _id: { $ne: keepToken }, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  return res.modifiedCount;
}

export async function revokeAllSessions(userId: string): Promise<number> {
  await dbConnect();
  const res = await Session.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  return res.modifiedCount;
}

export interface SessionSummary {
  id: string;
  current: boolean;
  device: { browser: string | null; os: string | null };
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
}

export async function listUserSessions(
  userId: string,
  currentToken: string,
): Promise<SessionSummary[]> {
  await dbConnect();
  const rows = await Session.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastSeenAt: -1 })
    .lean<SessionDoc[]>();
  return rows.map((s) => ({
    id: s._id === currentToken ? "current" : hashId(s._id),
    current: s._id === currentToken,
    device: s.device,
    ip: s.ip,
    createdAt: s.createdAt.toISOString(),
    lastSeenAt: s.lastSeenAt.toISOString(),
  }));
}

/** Short non-reversible label so the UI can list sessions without leaking tokens. */
function hashId(token: string): string {
  let h = 0;
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 6);
}

// ── request context helper ──────────────────────────────────────────────

export async function requestContext(): Promise<CreateSessionCtx> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0]!.trim() : h.get("x-real-ip");
  return { ip: ip || null, userAgent: h.get("user-agent") };
}

export { isProduction };

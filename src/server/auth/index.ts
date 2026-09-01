import "server-only";

import { redirect } from "next/navigation";

import { getAuth } from "./session";
import type { AuthContext } from "./session";
import type { SessionUser } from "@/lib/auth";
import { USER_ROLES, type UserRole } from "@/lib/validation/user";

export {
  createSession,
  clearSessionCookie,
  isFirstSeenDevice,
  getAuth,
  getCurrentUser,
  touchSession,
  revokeSession,
  revokeOtherSessions,
  revokeAllSessions,
  listUserSessions,
  requestContext,
} from "./session";
export type { AuthContext, SessionSummary } from "./session";
export { sendOtp, checkOtp, recentOtpFailures } from "./otp";
export { upsertVerifiedUser } from "./user";
export { checkRate } from "./rate-limit";
export type { RateRule, RateResult } from "./rate-limit";
export { verifyTurnstile, isTurnstileConfigured } from "./turnstile";

/** The RBAC ladder. `hasRole`/`requireRole` compare against this; the admin
 *  guards in `@/server/auth/admin` reuse it. `support` and `catalog_manager`
 *  are siblings (neither outranks the other) — section access is checked by
 *  explicit role, not only by rank. */
export const roleRank: Record<UserRole, number> = {
  customer: 0,
  support: 1,
  catalog_manager: 1,
  operations: 2,
  admin: 3,
  superadmin: 4,
};

/** Redirect home (sign-in modal auto-opens) unless there is a valid session. */
export async function requireUser(nextPath?: string): Promise<AuthContext> {
  const ctx = await getAuth();
  if (!ctx) {
    const params = new URLSearchParams({ signin: "1" });
    if (nextPath) params.set("next", nextPath);
    redirect(`/?${params.toString()}`);
  }
  return ctx;
}

/** Require at least `role`. `superadmin` clears everything. */
export async function requireRole(role: UserRole): Promise<AuthContext> {
  const ctx = await requireUser();
  if (roleRank[ctx.user.role] < roleRank[role]) {
    redirect("/");
  }
  return ctx;
}

export function hasRole(user: SessionUser | null, role: UserRole): boolean {
  if (!user) return false;
  return roleRank[user.role] >= roleRank[role];
}

export { USER_ROLES };
export type { SessionUser, UserRole };

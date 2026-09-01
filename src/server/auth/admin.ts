import "server-only";

import { notFound, redirect } from "next/navigation";

import { getAuth, roleRank } from "./index";
import type { AuthContext } from "./session";
import type { UserRole } from "@/lib/validation/user";

/**
 * Admin-area guards.
 *
 * A signed-out visitor is sent to the sign-in modal; a signed-in **non-staff**
 * account gets a plain 404 (`notFound()`) rather than a redirect, so `/admin`'s
 * existence is never disclosed to a customer. Section-level access is a rank
 * comparison against `roleRank` — `admin` and `superadmin` clear everything.
 *
 * Dangerous actions additionally require a fresh `sudo` re-auth (a phone OTP
 * that sets `session.sudoUntil`); `assertSudo` throws `SudoRequiredError`, which
 * the admin route handlers translate to `409 { error: "sudo-required" }` so the
 * client can pop the `<SudoGate>`.
 */

export class SudoRequiredError extends Error {
  constructor() {
    super("sudo-required");
    this.name = "SudoRequiredError";
  }
}

/** No session → sign-in; session but not staff → 404. */
export async function requireStaff(): Promise<AuthContext> {
  const ctx = await getAuth();
  if (!ctx) {
    redirect(`/?signin=1&next=${encodeURIComponent("/admin")}`);
  }
  if (!ctx.user.isStaff) notFound();
  return ctx;
}

/** `requireStaff` + at least `min` on the role ladder (else 404). */
export async function requireAdminRole(min: UserRole): Promise<AuthContext> {
  const ctx = await requireStaff();
  if (roleRank[ctx.user.role] < roleRank[min]) notFound();
  return ctx;
}

/** The numeric rank for a role — for role-gating nav / UI. */
export function roleRankFor(role: UserRole): number {
  return roleRank[role] ?? 0;
}

/** True when the session is inside its elevated `sudo` window. */
export function hasSudo(ctx: AuthContext): boolean {
  const until = ctx.session.sudoUntil;
  return until != null && new Date(until).getTime() > Date.now();
}

/** Throw `SudoRequiredError` unless the session has a live `sudo` window. */
export function assertSudo(ctx: AuthContext): void {
  if (!hasSudo(ctx)) throw new SudoRequiredError();
}

/** Milliseconds left on the sudo window (0 when not elevated). */
export function sudoRemainingMs(ctx: AuthContext): number {
  const until = ctx.session.sudoUntil;
  if (!until) return 0;
  return Math.max(0, new Date(until).getTime() - Date.now());
}

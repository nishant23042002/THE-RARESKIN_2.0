import "server-only";

import { forbidden, redirect } from "next/navigation";

import { getAuth, roleRank } from "./index";
import type { AuthContext } from "./session";
import type { UserRole } from "@/lib/validation/user";

/**
 * Admin-area guards.
 *
 * A signed-out visitor is sent to the sign-in modal; a signed-in account that
 * isn't staff (or is staff but under-ranked for a section) gets a real **403**
 * via `forbidden()` — Next renders the nearest `forbidden.tsx` (a styled
 * "no access" screen) and sends a `403` status with `noindex`. Section-level
 * access is a rank comparison against `roleRank` — `admin` and `superadmin`
 * clear everything.
 *
 * `forbidden()` needs `experimental.authInterrupts` (set in `next.config.ts`)
 * and must be called on the render path — every guard here is `await`ed by a
 * layout, page or route handler, so the throw is always caught by a boundary.
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

/** No session → sign-in; session but not staff → 403. */
export async function requireStaff(): Promise<AuthContext> {
  const ctx = await getAuth();
  if (!ctx) {
    redirect(`/?signin=1&next=${encodeURIComponent("/admin")}`);
  }
  if (!ctx.user.isStaff) forbidden();
  return ctx;
}

/** `requireStaff` + at least `min` on the role ladder (else 403). */
export async function requireAdminRole(min: UserRole): Promise<AuthContext> {
  const ctx = await requireStaff();
  if (roleRank[ctx.user.role] < roleRank[min]) forbidden();
  return ctx;
}

/** The numeric rank for a role — for role-gating nav / UI. */
export function roleRankFor(role: UserRole): number {
  return roleRank[role] ?? 0;
}

/**
 * Can `actor` set an account's role to / away from `target`?
 *
 * - `superadmin` can touch any role.
 * - `admin` can manage everything **below** `admin` (customer / support /
 *   catalog_manager / operations) but can neither create nor demote an
 *   `admin` / `superadmin`.
 * - anyone else: no.
 *
 * A role *change* must satisfy this for both the current and the new role.
 */
export function canEditRole(actor: UserRole, target: UserRole): boolean {
  if (actor === "superadmin") return true;
  if (actor !== "admin") return false;
  return roleRank[target] < roleRank.admin;
}

/**
 * `support` and `catalog_manager` sit at the same rank but are parallel
 * specialisations — a rank check alone lets `support` into the catalogue, which
 * isn't their job. Catalogue work needs the `catalog_manager` role itself, or
 * `operations`+ (a more senior operator who also covers stock).
 */
export function canManageCatalogue(role: UserRole): boolean {
  return role === "catalog_manager" || roleRank[role] >= roleRank.operations;
}

/** `requireStaff` + `canManageCatalogue` (else 403). */
export async function requireCatalogueRole(): Promise<AuthContext> {
  const ctx = await requireStaff();
  if (!canManageCatalogue(ctx.user.role)) forbidden();
  return ctx;
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

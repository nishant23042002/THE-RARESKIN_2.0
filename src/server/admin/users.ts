import "server-only";

import { dbConnect } from "@/server/db";
import { User, Order, AuditLog, type UserDoc } from "@/server/models";
import { getAccountOverview, type AccountOverview } from "@/server/data/account";
import { listAddresses, type AddressView } from "@/server/data/addresses";
import { listUserOrders, type OrderSummary } from "@/server/data/orders";
import { listUserSessions, type SessionSummary } from "@/server/auth";
import { getStoreCreditBalance } from "@/server/commerce";
import { maskPhone } from "@/lib/auth";
import {
  USER_ROLES,
  USER_STATUSES,
  type UserRole,
  type UserStatus,
} from "@/lib/validation/user";

/**
 * Customer / account reads for the admin. Not cached — support always needs the
 * current state. `phone` is masked in every DTO; the raw number never leaves
 * the server.
 */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── list ───────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  name: string;
  phone: string; // masked
  email: string | null;
  role: UserRole;
  status: UserStatus;
  orderCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserList {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

export interface ListUsersParams {
  role?: UserRole | "all";
  status?: UserStatus | "all";
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function listUsers(
  params: ListUsersParams = {},
): Promise<AdminUserList> {
  await dbConnect();
  const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);
  const page = Math.max(params.page ?? 1, 1);

  const filter: Record<string, unknown> = {};
  if (
    params.role &&
    params.role !== "all" &&
    (USER_ROLES as readonly string[]).includes(params.role)
  ) {
    filter.role = params.role;
  }
  if (
    params.status &&
    params.status !== "all" &&
    (USER_STATUSES as readonly string[]).includes(params.status)
  ) {
    filter.status = params.status;
  }
  const q = params.q?.trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ phone: rx }, { name: rx }, { email: rx }];
  }

  const [total, docs] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select("name phone email role status createdAt lastLoginAt")
      .lean<UserDoc[]>(),
  ]);

  const ids = docs.map((d) => d._id);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const grouped = await Order.aggregate<{ _id: unknown; n: number }>([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: "$userId", n: { $sum: 1 } } },
    ]);
    for (const g of grouped) counts.set(String(g._id), g.n);
  }

  return {
    rows: docs.map((d) => ({
      id: String(d._id),
      name: d.name,
      phone: maskPhone(d.phone),
      email: d.email,
      role: d.role,
      status: d.status,
      orderCount: counts.get(String(d._id)) ?? 0,
      createdAt: d.createdAt.toISOString(),
      lastLoginAt: d.lastLoginAt ? d.lastLoginAt.toISOString() : null,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

// ── detail ─────────────────────────────────────────────────────────────

export interface AdminAuditRow {
  action: string;
  actorRole: string;
  at: string;
  note: string | null;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  phone: string; // masked
  phoneVerified: boolean;
  email: string | null;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  suspendedReason: string | null;
  google: { email: string; linkedAt: string } | null;
  createdAt: string;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  overview: AccountOverview;
  recentOrders: OrderSummary[];
  addresses: AddressView[];
  storeCreditPaise: number;
  sessions: SessionSummary[];
  auditTrail: AdminAuditRow[];
}

export async function getUserForAdmin(
  id: string,
): Promise<AdminUserDetail | null> {
  await dbConnect();
  const u = await User.findById(id).lean<UserDoc | null>();
  if (!u) return null;
  const uid = String(u._id);

  const [overview, recentOrders, addresses, storeCreditPaise, sessions, audits] =
    await Promise.all([
      getAccountOverview(uid),
      listUserOrders(uid),
      listAddresses(uid),
      getStoreCreditBalance(uid),
      // nothing is "current" from the admin's point of view
      listUserSessions(uid, ""),
      AuditLog.find({ targetType: "User", targetId: uid })
        .sort({ at: -1 })
        .limit(15)
        .lean(),
    ]);

  return {
    id: uid,
    name: u.name,
    phone: maskPhone(u.phone),
    phoneVerified: u.phoneVerifiedAt != null,
    email: u.email,
    emailVerified: u.emailVerifiedAt != null,
    role: u.role,
    status: u.status,
    suspendedReason: u.suspendedReason,
    google: u.google
      ? {
          email: u.google.email,
          linkedAt: new Date(u.google.linkedAt).toISOString(),
        }
      : null,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    lastLoginIp: u.lastLoginIp,
    overview,
    recentOrders: recentOrders.slice(0, 10),
    addresses,
    storeCreditPaise,
    sessions,
    auditTrail: audits.map((a) => ({
      action: a.action,
      actorRole: a.actorRole,
      at: new Date(a.at).toISOString(),
      note: a.note ?? null,
    })),
  };
}

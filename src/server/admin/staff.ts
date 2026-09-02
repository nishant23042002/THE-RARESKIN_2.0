import "server-only";

import { dbConnect } from "@/server/db";
import { User, type UserDoc } from "@/server/models";
import { roleRankFor } from "@/server/auth/admin";
import { maskPhone } from "@/lib/auth";
import { STAFF_ROLES, type UserRole, type UserStatus } from "@/lib/validation/user";

export interface AdminStaffRow {
  id: string;
  name: string;
  phone: string; // masked
  email: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

/** Every account with a staff role, most senior first. */
export async function listStaff(): Promise<AdminStaffRow[]> {
  await dbConnect();
  const docs = await User.find({ role: { $in: STAFF_ROLES } })
    .select("name phone email role status lastLoginAt createdAt")
    .lean<UserDoc[]>();

  return docs
    .map((d) => ({
      id: String(d._id),
      name: d.name,
      phone: maskPhone(d.phone),
      email: d.email,
      role: d.role,
      status: d.status,
      lastLoginAt: d.lastLoginAt ? d.lastLoginAt.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
    }))
    .sort(
      (a, b) =>
        roleRankFor(b.role) - roleRankFor(a.role) ||
        a.name.localeCompare(b.name),
    );
}

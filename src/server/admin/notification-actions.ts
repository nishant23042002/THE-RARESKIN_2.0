import "server-only";

import { Types } from "mongoose";

import { dbConnect } from "@/server/db";
import { Notification } from "@/server/models";
import { roleRank } from "@/server/auth";
import type { UserRole } from "@/lib/validation/user";
import type {
  NotificationCategory,
  NotificationReadInput,
} from "@/lib/validation/notification";

function visibleRoles(role: UserRole): UserRole[] {
  const rank = roleRank[role] ?? 0;
  return (Object.keys(roleRank) as UserRole[]).filter(
    (r) => (roleRank[r] ?? 0) <= rank,
  );
}

/**
 * Mark notifications read *for this staff member* — adds the id to `readBy`
 * (per-staff state, so one reader marking a row read doesn't hide it from
 * another). Returns the caller's fresh unread count.
 */
export async function markNotificationsRead(
  viewer: { userId: string; role: UserRole },
  input: NotificationReadInput,
): Promise<{ ok: true; unread: number }> {
  await dbConnect();
  const uid = new Types.ObjectId(viewer.userId);

  const filter: Record<string, unknown> = {
    minRole: { $in: visibleRoles(viewer.role) },
    readBy: { $ne: uid },
  };
  if (!input.all && input.ids) {
    filter._id = { $in: input.ids.map((id) => new Types.ObjectId(id)) };
  }
  if (input.category) {
    filter.category = input.category as NotificationCategory;
  }

  await Notification.updateMany(filter, { $addToSet: { readBy: uid } });

  const unread = await Notification.countDocuments({
    minRole: { $in: visibleRoles(viewer.role) },
    readBy: { $ne: uid },
  });
  return { ok: true, unread };
}

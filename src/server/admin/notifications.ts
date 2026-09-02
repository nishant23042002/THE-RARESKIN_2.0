import "server-only";

import { dbConnect } from "@/server/db";
import { Notification, type NotificationDoc } from "@/server/models";
import { roleRank } from "@/server/auth";
import type { UserRole } from "@/lib/validation/user";
import type {
  NotificationCategory,
  NotificationSeverity,
} from "@/lib/validation/notification";

/**
 * Notification reads for the admin. Not cached — the feed and the poll must
 * always be current. `minRole` is filtered in the query so a `support` account
 * never sees an `admin`-only row.
 */

export interface NotificationRow {
  id: string;
  type: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  href: string | null;
  actor: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationFeed {
  rows: NotificationRow[];
  nextCursor: string | null;
  unread: number;
}

/** Roles at or below the viewer's rank — the `minRole` values they may see. */
function visibleRoles(role: UserRole): UserRole[] {
  const rank = roleRank[role] ?? 0;
  return (Object.keys(roleRank) as UserRole[]).filter(
    (r) => (roleRank[r] ?? 0) <= rank,
  );
}

function toRow(doc: NotificationDoc, userId: string): NotificationRow {
  return {
    id: String(doc._id),
    type: doc.type,
    category: doc.category,
    severity: doc.severity,
    title: doc.title,
    body: doc.body,
    href: doc.href,
    actor: doc.actor,
    read: doc.readBy.some((id) => String(id) === userId),
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listNotifications(
  params: { category?: NotificationCategory; cursor?: string; limit?: number },
  viewer: { userId: string; role: UserRole },
): Promise<NotificationFeed> {
  await dbConnect();
  const limit = Math.min(Math.max(params.limit ?? 30, 1), 100);

  const filter: Record<string, unknown> = {
    minRole: { $in: visibleRoles(viewer.role) },
  };
  if (params.category) filter.category = params.category;
  if (params.cursor) filter.createdAt = { $lt: new Date(params.cursor) };

  const [docs, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean<NotificationDoc[]>(),
    countUnread(viewer),
  ]);

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;

  return {
    rows: page.map((d) => toRow(d, viewer.userId)),
    nextCursor: hasMore
      ? page[page.length - 1].createdAt.toISOString()
      : null,
    unread,
  };
}

async function countUnread(viewer: {
  userId: string;
  role: UserRole;
}): Promise<number> {
  return Notification.countDocuments({
    minRole: { $in: visibleRoles(viewer.role) },
    readBy: { $ne: viewer.userId },
  });
}

export interface NotificationSummary {
  unread: number;
  latest: NotificationRow[];
}

export async function notificationSummary(viewer: {
  userId: string;
  role: UserRole;
}): Promise<NotificationSummary> {
  await dbConnect();
  const [latest, unread] = await Promise.all([
    Notification.find({ minRole: { $in: visibleRoles(viewer.role) } })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean<NotificationDoc[]>(),
    countUnread(viewer),
  ]);
  return {
    unread,
    latest: latest.map((d) => toRow(d, viewer.userId)),
  };
}

import "server-only";

import { dbConnect } from "@/server/db";
import { Notification } from "@/server/models";
import type {
  NotificationCategory,
  NotificationSeverity,
} from "@/lib/validation/notification";
import type { UserRole } from "@/lib/validation/user";

export interface CreateNotificationInput {
  type: string;
  category: NotificationCategory;
  severity?: NotificationSeverity;
  title: string;
  body?: string;
  href?: string | null;
  entity?: { type: string; id: string; label: string } | null;
  actor?: string;
  minRole?: UserRole;
  /** the same event must never double — include the entity id + a discriminator */
  dedupeKey: string;
}

/**
 * Insert a notification. **Never throws** — a notification failure must not roll
 * back the order / payment / review that triggered it. Idempotent on
 * `dedupeKey` (`11000` → treated as already-created).
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<{ id: string | null; deduped: boolean }> {
  try {
    await dbConnect();
    const doc = await Notification.create({
      type: input.type,
      category: input.category,
      severity: input.severity ?? "info",
      title: input.title,
      body: input.body ?? "",
      href: input.href ?? null,
      entity: input.entity ?? null,
      actor: input.actor ?? "System",
      minRole: input.minRole ?? "support",
      dedupeKey: input.dedupeKey,
      readBy: [],
    });
    return { id: String(doc._id), deduped: false };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      (err as { code?: number }).code === 11000
    ) {
      return { id: null, deduped: true };
    }
    console.error("[notify] create failed", input.dedupeKey, err);
    return { id: null, deduped: false };
  }
}

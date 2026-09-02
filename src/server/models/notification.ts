import { Schema, model, models, type Model, type Types } from "mongoose";

import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_SEVERITIES,
} from "@/lib/validation/notification";
import { USER_ROLES } from "@/lib/validation/user";

/**
 * A staff-facing activity signal. Distinct from `AuditLog` — that is the
 * immutable accountability record of admin *actions*; this is transient *work
 * to triage*, with per-staff read state and a 60-day TTL.
 *
 * Created best-effort by `@/server/notifications` from lifecycle events (orders,
 * payments, reviews, sign-ins, …). Never blocks the event that raised it.
 *
 * `readBy` holds the ids of staff who have seen it — "unread for me" means my id
 * is not in the array. `minRole` gates visibility: the feed only shows rows
 * where `roleRank(viewer) >= roleRank(minRole)`.
 */
export interface NotificationDoc {
  _id: Types.ObjectId;
  type: string;
  category: (typeof NOTIFICATION_CATEGORIES)[number];
  severity: (typeof NOTIFICATION_SEVERITIES)[number];
  title: string;
  body: string;
  href: string | null;
  entity: { type: string; id: string; label: string } | null;
  actor: string;
  minRole: (typeof USER_ROLES)[number];
  dedupeKey: string;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDoc>(
  {
    type: { type: String, required: true },
    category: { type: String, enum: NOTIFICATION_CATEGORIES, required: true },
    severity: {
      type: String,
      enum: NOTIFICATION_SEVERITIES,
      default: "info",
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    href: { type: String, default: null },
    entity: { type: Schema.Types.Mixed, default: null },
    actor: { type: String, default: "System" },
    minRole: { type: String, enum: USER_ROLES, default: "support" },
    dedupeKey: { type: String, required: true },
    readBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true, minimize: false },
);

// The feed, newest first — also the TTL (60 days).
notificationSchema.index(
  { createdAt: -1 },
  { name: "createdAt_desc", expireAfterSeconds: 60 * 24 * 60 * 60 },
);
notificationSchema.index(
  { dedupeKey: 1 },
  { name: "dedupeKey_unique", unique: true },
);
notificationSchema.index(
  { category: 1, createdAt: -1 },
  { name: "category_created" },
);
notificationSchema.index({ minRole: 1, createdAt: -1 }, { name: "role_created" });

export const Notification: Model<NotificationDoc> =
  (models.Notification as Model<NotificationDoc>) ??
  model<NotificationDoc>("Notification", notificationSchema);

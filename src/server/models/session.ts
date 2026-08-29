import { Schema, model, models, type Model, type Types } from "mongoose";

import { USER_ROLES } from "@/lib/validation/user";

/**
 * A server session. The `_id` **is** the session token — a 256-bit CSPRNG
 * value, stored only in the client's `__Host-` cookie and here. DB sessions
 * (rather than a JWT) are what make "log out everywhere", instant suspension,
 * and role-change invalidation possible.
 */
export interface SessionDoc {
  _id: string;
  userId: Types.ObjectId;
  /** denormalised so the request guard doesn't need a User lookup */
  role: (typeof USER_ROLES)[number];
  createdAt: Date;
  lastSeenAt: Date;
  /** sliding — extended on activity, TTL-purged when it passes */
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
  device: { browser: string | null; os: string | null };
  revokedAt: Date | null;
  /** elevated window for dangerous admin actions (re-auth) */
  sudoUntil: Date | null;
}

const sessionSchema = new Schema<SessionDoc>(
  {
    _id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: USER_ROLES, required: true },
    createdAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    device: {
      browser: { type: String, default: null },
      os: { type: String, default: null },
    },
    revokedAt: { type: Date, default: null },
    sudoUntil: { type: Date, default: null },
  },
  { versionKey: false, _id: false },
);

sessionSchema.index({ userId: 1, createdAt: -1 }, { name: "user_created" });
// TTL: Mongo drops the doc soon after expiresAt; the guard also checks it.
sessionSchema.index({ expiresAt: 1 }, { name: "ttl", expireAfterSeconds: 0 });

export const Session: Model<SessionDoc> =
  (models.Session as Model<SessionDoc>) ??
  model<SessionDoc>("Session", sessionSchema);

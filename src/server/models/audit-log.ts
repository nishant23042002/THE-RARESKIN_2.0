import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Append-only record of every mutating action taken through the admin (and a
 * few system events like `seed.run`). Nothing in the app updates or deletes
 * these rows — they are the accountability backbone of RBAC.
 */
export interface AuditLogDoc {
  _id: Types.ObjectId;
  actorId: Types.ObjectId | null; // null = system
  actorRole: string;
  action: string; // "product.update", "order.refund", "user.role_change" …
  targetType: string; // "Product", "Order", "User" …
  targetId: string | null;
  /** shallow before/after diff, secrets already stripped by the caller */
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  note?: string;
  at: Date;
}

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, default: "system" },
    action: { type: String, required: true, index: { name: "action" } },
    targetType: { type: String, required: true },
    targetId: { type: String, default: null },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    note: String,
    at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

auditLogSchema.index({ at: -1 }, { name: "at_desc" });
auditLogSchema.index(
  { targetType: 1, targetId: 1, at: -1 },
  { name: "target_at" },
);
auditLogSchema.index({ actorId: 1, at: -1 }, { name: "actor_at" });

// Guard: block updates and deletes at the model level — this collection is
// insert-only. Matches updateOne/updateMany/deleteOne/deleteMany/findOneAndUpdate
// /findOneAndDelete/findOneAndReplace.
auditLogSchema.pre(
  /^(update|delete|findOneAndUpdate|findOneAndDelete|findOneAndReplace|replaceOne)$/i,
  function () {
    throw new Error("auditLog is append-only");
  },
);

export const AuditLog: Model<AuditLogDoc> =
  (models.AuditLog as Model<AuditLogDoc>) ??
  model<AuditLogDoc>("AuditLog", auditLogSchema);

/** Convenience writer. `actorId: null` records a system action. */
export async function recordAudit(
  entry: Omit<AuditLogDoc, "_id" | "at"> & { at?: Date },
): Promise<void> {
  await AuditLog.create({ ...entry, at: entry.at ?? new Date() });
}

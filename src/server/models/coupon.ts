import { Schema, model, models, type Model, type Types } from "mongoose";

import {
  COUPON_STATUSES,
  COUPON_TYPES,
} from "@/lib/validation/commerce";

/**
 * A discount code. Even a single launch coupon needs scoping, per-user limits
 * and usage tracking, so this is a real collection rather than a config string.
 * `usedCount` is bumped atomically inside the order transaction; per-user use is
 * counted from placed orders that carry the code.
 */
export interface CouponDoc {
  _id: Types.ObjectId;
  code: string;
  type: (typeof COUPON_TYPES)[number];
  /** percent 0–100, or a paise amount — per `type`; unused for free_shipping */
  value: number;
  minSubtotalPaise: number;
  /** 0 = unlimited */
  maxUses: number;
  /** 0 = unlimited */
  usesPerUser: number;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  stackable: boolean;
  status: (typeof COUPON_STATUSES)[number];
  note?: string;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<CouponDoc>(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: { unique: true, name: "code_unique" },
    },
    type: { type: String, enum: COUPON_TYPES, required: true },
    value: { type: Number, default: 0, min: 0 },
    minSubtotalPaise: { type: Number, default: 0, min: 0 },
    maxUses: { type: Number, default: 0, min: 0 },
    usesPerUser: { type: Number, default: 1, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    stackable: { type: Boolean, default: false },
    status: { type: String, enum: COUPON_STATUSES, default: "active" },
    note: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

couponSchema.index({ status: 1, endsAt: 1 }, { name: "status_ends" });

export const Coupon: Model<CouponDoc> =
  (models.Coupon as Model<CouponDoc>) ??
  model<CouponDoc>("Coupon", couponSchema);

import { Schema, model, models, type Model, type Types } from "mongoose";

import { USER_ROLES, USER_STATUSES } from "@/lib/validation/user";

/**
 * An account. Phone-first and passwordless — authentication is Twilio OTP,
 * wired in a later phase, so there is deliberately no password field. A
 * lightweight `customer` row is created the first time someone verifies a
 * phone number (including at guest checkout).
 */

interface AddressSub {
  _id: Types.ObjectId;
  label?: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: Date;
}

const addressSchema = new Schema<AddressSub>(
  {
    label: String,
    name: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    landmark: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

export interface UserDoc {
  _id: Types.ObjectId;
  phone: string;
  phoneVerifiedAt: Date | null;
  name: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  role: (typeof USER_ROLES)[number];
  status: (typeof USER_STATUSES)[number];
  suspendedReason: string | null;
  addresses: AddressSub[];
  marketingConsent: {
    email: boolean;
    sms: boolean;
    consentedAt: Date | null;
    source: string | null;
  };
  twoFactor: {
    enabled: boolean;
    secret: string | null;
    backupCodes: string[];
  };
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      index: { unique: true, name: "phone_unique" },
    },
    phoneVerifiedAt: { type: Date, default: null },
    name: { type: String, default: "" },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      // sparse unique: many nulls allowed, real values must be distinct
      index: { unique: true, sparse: true, name: "email_unique_sparse" },
    },
    emailVerifiedAt: { type: Date, default: null },
    role: { type: String, enum: USER_ROLES, default: "customer" },
    status: { type: String, enum: USER_STATUSES, default: "active" },
    suspendedReason: { type: String, default: null },
    addresses: { type: [addressSchema], default: [] },
    marketingConsent: {
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      consentedAt: { type: Date, default: null },
      source: { type: String, default: null },
    },
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, default: null },
      backupCodes: { type: [String], default: [] },
    },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
  },
  { timestamps: true },
);

// Serves admin "staff" / "suspended" filters and `{ role }` prefix lookups.
userSchema.index({ role: 1, status: 1 }, { name: "role_status" });
userSchema.index({ createdAt: -1 }, { name: "createdAt_desc" });

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) ?? model<UserDoc>("User", userSchema);

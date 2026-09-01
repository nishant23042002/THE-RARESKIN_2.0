import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Our record of an OTP request. Twilio Verify owns the code itself (generation,
 * delivery, expiry, its own attempt cap); this row is for our audit trail, our
 * own attempt counter, and "is there a live challenge for this phone" UX.
 */
export interface OtpChallengeDoc {
  _id: Types.ObjectId;
  phone: string;
  purpose: "login" | "add_phone" | "sudo";
  attempts: number;
  maxAttempts: number;
  ip: string | null;
  userAgent: string | null;
  requestedAt: Date;
  consumedAt: Date | null;
  /** TTL — a little longer than Twilio's 10-minute code lifetime */
  expiresAt: Date;
}

const otpChallengeSchema = new Schema<OtpChallengeDoc>(
  {
    phone: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["login", "add_phone", "sudo"],
      default: "login",
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    requestedAt: { type: Date, default: Date.now },
    consumedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

otpChallengeSchema.index({ phone: 1, purpose: 1 }, { name: "phone_purpose" });
otpChallengeSchema.index(
  { expiresAt: 1 },
  { name: "ttl", expireAfterSeconds: 0 },
);

export const OtpChallenge: Model<OtpChallengeDoc> =
  (models.OtpChallenge as Model<OtpChallengeDoc>) ??
  model<OtpChallengeDoc>("OtpChallenge", otpChallengeSchema);

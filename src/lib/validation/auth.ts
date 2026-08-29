import { z } from "zod";

import { OTP_LENGTH } from "@/lib/auth";

/** Body of `POST /api/auth/otp/start`. */
export const otpStartInput = z.object({
  phone: z.string().min(6).max(20),
  // client sends `null` when Turnstile isn't rendered
  turnstileToken: z.string().max(4000).nullish(),
});
export type OtpStartInput = z.infer<typeof otpStartInput>;

/** Body of `POST /api/auth/otp/verify`. */
export const otpVerifyInput = z.object({
  phone: z.string().min(6).max(20),
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code`),
});
export type OtpVerifyInput = z.infer<typeof otpVerifyInput>;

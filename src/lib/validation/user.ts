/**
 * User & address validation.
 *
 * Accounts are phone-first and passwordless (Twilio OTP, wired in a later
 * phase). The `role` ladder drives RBAC in the admin; `customer` is the
 * default and covers everyone shopping.
 */
import { z } from "zod";
import {
  email,
  indianMobileE164,
  pincode,
  shortText,
} from "./primitives";

export const USER_ROLES = [
  "customer",
  "support",
  "catalog_manager",
  "operations",
  "admin",
  "superadmin",
] as const;
/** Every role except `customer` — the ones that can reach the admin. */
export const STAFF_ROLES = [
  "support",
  "catalog_manager",
  "operations",
  "admin",
  "superadmin",
] as const;
export const USER_STATUSES = ["active", "suspended"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export const address = z.object({
  label: shortText(40).optional(),
  name: shortText(120),
  phone: indianMobileE164,
  line1: shortText(160),
  line2: shortText(160).optional(),
  landmark: shortText(120).optional(),
  city: shortText(80),
  state: shortText(80),
  pincode,
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof address>;

export const marketingConsent = z
  .object({
    email: z.boolean().default(false),
    sms: z.boolean().default(false),
  })
  .prefault({});

/** Fields a signed-in customer can change about themselves. */
export const profileUpdateInput = z.object({
  name: shortText(120).optional(),
  email: email.optional(),
  marketingConsent: marketingConsent.optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateInput>;

/** Payload to create / promote a staff member (superadmin only). */
export const staffInviteInput = z.object({
  phone: indianMobileE164,
  name: shortText(120),
  email: email.optional(),
  role: z.enum(STAFF_ROLES),
});
export type StaffInviteInput = z.infer<typeof staffInviteInput>;

/** Admin action on a customer / staff account. */
export const userAdminUpdateInput = z.object({
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  suspendedReason: shortText(240).optional(),
});
export type UserAdminUpdateInput = z.infer<typeof userAdminUpdateInput>;

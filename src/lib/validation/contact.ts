/**
 * Contact form. Isomorphic — the storefront `/contact` form and `/api/contact`
 * parse the same shape. The client contract is unchanged from the old stub
 * (name / email / message, optional topic).
 */
import { z } from "zod";

import { email as emailPrimitive, shortText } from "./primitives";

export const CONTACT_MESSAGE_MAX = 4000;

export const contactMessageInput = z.object({
  name: shortText(120),
  email: emailPrimitive,
  message: z.string().trim().min(10, "Tell us a little more so we can help.").max(
    CONTACT_MESSAGE_MAX,
    `Keep this under ${CONTACT_MESSAGE_MAX} characters`,
  ),
  /** the storefront form calls this "Subject" */
  subject: shortText(120).optional(),
  phone: shortText(24).optional(),
});
export type ContactMessageInput = z.infer<typeof contactMessageInput>;

/** `PATCH /api/admin/messages/[id]`. */
export const contactMessageActionInput = z.object({
  action: z.literal("handle"),
  note: shortText(300).optional(),
});
export type ContactMessageActionInput = z.infer<
  typeof contactMessageActionInput
>;

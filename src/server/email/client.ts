import "server-only";

import { Resend } from "resend";

import { getResendApiKey } from "@/server/env";

export { isEmailConfigured, getEmailFrom } from "@/server/env";

let cached: Resend | null = null;

/** The Resend client, built once. Throws if `RESEND_API_KEY` is unset — callers
 *  gate on `isEmailConfigured()` first (the dev `.mail/` path never gets here). */
export function getResend(): Resend {
  return (cached ??= new Resend(getResendApiKey()));
}

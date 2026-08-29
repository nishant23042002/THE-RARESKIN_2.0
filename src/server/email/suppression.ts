import "server-only";

import { dbConnect } from "@/server/db";
import { EmailSuppression, type SuppressionReason } from "@/server/models";

/** Is this address on the do-not-email list (hard bounce / spam complaint)? */
export async function isSuppressed(email: string): Promise<boolean> {
  const clean = email.trim().toLowerCase();
  if (!clean) return false;
  await dbConnect();
  return Boolean(
    await EmailSuppression.exists({ email: clean }),
  );
}

/** Add an address to the suppression list. `$setOnInsert` — the first signal
 *  wins, so a later bounce never overwrites an earlier spam complaint. */
export async function suppressEmail(input: {
  email: string;
  reason: SuppressionReason;
  source: string;
}): Promise<void> {
  const clean = input.email.trim().toLowerCase();
  if (!clean) return;
  await dbConnect();
  await EmailSuppression.updateOne(
    { email: clean },
    { $setOnInsert: { reason: input.reason, source: input.source, at: new Date() } },
    { upsert: true },
  );
}

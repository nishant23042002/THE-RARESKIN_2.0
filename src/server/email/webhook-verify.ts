import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getResendWebhookSecret } from "@/server/env";

/**
 * Resend delivers webhooks through Svix. The signed content is
 * `${svix-id}.${svix-timestamp}.${rawBody}`, HMAC-SHA256 with the secret
 * (`whsec_` + base64), digest base64. The `svix-signature` header carries one
 * or more space-separated `v1,<sig>` tokens; any match passes. A timestamp more
 * than 5 minutes from now is a replay and is rejected.
 */
export function verifyResendSignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignatureHeader: string,
): boolean {
  const secret = getResendWebhookSecret();
  if (!secret || !svixId || !svixTimestamp || !svixSignatureHeader) return false;

  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return false;
  }

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${svixId}.${svixTimestamp}.${rawBody}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  return svixSignatureHeader.split(" ").some((token) => {
    const sig = token.split(",")[1] ?? "";
    const sigBuf = Buffer.from(sig);
    return (
      sigBuf.length === expectedBuf.length &&
      timingSafeEqual(sigBuf, expectedBuf)
    );
  });
}

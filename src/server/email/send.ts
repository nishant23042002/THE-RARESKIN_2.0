import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { isProduction } from "@/server/env";
import type { EmailMessageDoc } from "@/server/models";

import { getEmailFrom, getResend, isEmailConfigured } from "./client";
import { isSuppressed } from "./suppression";
import { renderElement, renderHtml } from "./render";
import type { EmailPropsFor } from "./types";

export type SendOutcome =
  | { kind: "ok"; providerId: string }
  | { kind: "suppressed" }
  | { kind: "retryable"; error: string }
  | { kind: "fatal"; error: string };

/** Resend error codes worth another attempt (transient / capacity). */
const RETRYABLE_CODES = new Set([
  "rate_limit_exceeded",
  "application_error",
  "internal_server_error",
  "concurrent_idempotent_requests",
]);

/**
 * Render one outbox row and deliver it — via Resend when configured, otherwise
 * to `.mail/<key>.html` for local review. Never throws; the caller (`drainOutbox`)
 * maps the outcome onto the row's next state.
 */
export async function sendEmailMessage(
  msg: EmailMessageDoc,
): Promise<SendOutcome> {
  if (await isSuppressed(msg.to)) return { kind: "suppressed" };

  const props = msg.props as unknown as EmailPropsFor<typeof msg.template>;

  if (isEmailConfigured()) {
    try {
      const { data, error } = await getResend().emails.send(
        {
          from: getEmailFrom(),
          to: msg.to,
          subject: msg.subject,
          react: renderElement(msg.template, props),
        },
        // keyed by the outbox row, not the dedupeKey — the row's props are
        // frozen at enqueue, so retries of it are byte-identical, while a
        // re-queued email (new row) or a changed template gets a fresh key.
        { idempotencyKey: `msg_${String(msg._id)}` },
      );
      if (error) {
        const retryable =
          RETRYABLE_CODES.has(error.name) ||
          (error.statusCode != null &&
            (error.statusCode >= 500 || error.statusCode === 429));
        return retryable
          ? { kind: "retryable", error: `${error.name}: ${error.message}` }
          : { kind: "fatal", error: `${error.name}: ${error.message}` };
      }
      return { kind: "ok", providerId: data?.id ?? "resend-unknown" };
    } catch (err) {
      // network / DNS / timeout — always worth a retry
      return {
        kind: "retryable",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ── dev fallback: no key ──────────────────────────────────────────────
  if (isProduction()) {
    console.error(
      "[email] RESEND_API_KEY unset in production — dropping",
      msg.template,
      msg.dedupeKey,
    );
    return { kind: "fatal", error: "email not configured in production" };
  }

  try {
    const html = await renderHtml(msg.template, props);
    const dir = path.join(process.cwd(), ".mail");
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(
      dir,
      `${msg.dedupeKey.replace(/[^a-z0-9._-]+/gi, "_")}.html`,
    );
    await fs.writeFile(file, html, "utf8");
    console.log(`[email:dev] ${msg.template} → ${path.relative(process.cwd(), file)}`);
    return { kind: "ok", providerId: `dev-${Date.now().toString(36)}` };
  } catch (err) {
    return {
      kind: "retryable",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

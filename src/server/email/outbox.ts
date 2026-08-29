import "server-only";

import { after } from "next/server";
import type { Types } from "mongoose";

import { dbConnect } from "@/server/db";
import { EmailMessage, type EmailTemplate } from "@/server/models";

import { emailSubject } from "./render";
import { sendEmailMessage } from "./send";
import type { EmailPropsFor } from "./types";

// ── enqueue ────────────────────────────────────────────────────────────

export interface EnqueueEmailInput<T extends EmailTemplate = EmailTemplate> {
  template: T;
  to: string;
  props: EmailPropsFor<T>;
  /** the idempotency handle — `<template>:<orderNumber>` etc. */
  dedupeKey: string;
  orderId?: Types.ObjectId | string | null;
  orderNumber?: string | null;
  userId?: Types.ObjectId | string | null;
}

/** Insert a `queued` row. Idempotent on `dedupeKey`. **Never throws** — a
 *  failure here must not break a payment path. */
export async function enqueueEmail<T extends EmailTemplate>(
  input: EnqueueEmailInput<T>,
): Promise<{ id: string | null; deduped: boolean }> {
  const to = input.to.trim().toLowerCase();
  if (!to || !to.includes("@")) {
    console.warn("[email] enqueue skipped — no recipient", input.dedupeKey);
    return { id: null, deduped: false };
  }

  try {
    await dbConnect();
    const doc = await EmailMessage.create({
      to,
      template: input.template,
      subject: emailSubject(input.template, input.props),
      dedupeKey: input.dedupeKey,
      orderId: input.orderId ?? null,
      orderNumber: input.orderNumber ?? null,
      userId: input.userId ?? null,
      props: input.props as unknown as Record<string, unknown>,
      status: "queued",
      attempts: 0,
      maxAttempts: 5,
      nextAttemptAt: new Date(),
      queuedAt: new Date(),
    });
    return { id: String(doc._id), deduped: false };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      (err as { code?: number }).code === 11000
    ) {
      const existing = await EmailMessage.findOne({
        dedupeKey: input.dedupeKey,
      })
        .select("_id")
        .lean<{ _id: unknown } | null>();
      return { id: existing ? String(existing._id) : null, deduped: true };
    }
    console.error("[email] enqueue failed", input.dedupeKey, err);
    return { id: null, deduped: false };
  }
}

// ── drain ──────────────────────────────────────────────────────────────

export interface DrainOptions {
  limit?: number;
  ids?: string[];
  now?: Date;
}
export interface DrainResult {
  picked: number;
  sent: number;
  failed: number;
  suppressed: number;
  retryScheduled: number;
}

const STALE_LOCK_MS = 2 * 60_000;

/** exponential + jitter, capped at 60 min. `attempt` is 1..maxAttempts. */
function backoffMs(attempt: number): number {
  const exp = Math.min(60 * 60_000, 60_000 * 2 ** (attempt - 1));
  return exp + Math.floor(Math.random() * 15_000);
}

/**
 * Send queued rows that are due. Claims one row at a time with an atomic
 * `findOneAndUpdate` so a concurrent cron sweep and an `after()` drain can't
 * both grab the same message.
 */
export async function drainOutbox(
  opts: DrainOptions = {},
): Promise<DrainResult> {
  await dbConnect();
  const limit = opts.limit ?? 25;
  const now = opts.now ?? new Date();
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);

  const out: DrainResult = {
    picked: 0,
    sent: 0,
    failed: 0,
    suppressed: 0,
    retryScheduled: 0,
  };

  for (let i = 0; i < limit; i++) {
    const msg = await EmailMessage.findOneAndUpdate(
      {
        ...(opts.ids ? { _id: { $in: opts.ids } } : {}),
        status: "queued",
        nextAttemptAt: { $lte: now },
        $expr: { $lt: ["$attempts", "$maxAttempts"] },
        $or: [{ lockedAt: null }, { lockedAt: { $lt: staleBefore } }],
      },
      { $set: { status: "sending", lockedAt: now }, $inc: { attempts: 1 } },
      { sort: { nextAttemptAt: 1, queuedAt: 1 }, new: true },
    );
    if (!msg) break;
    out.picked++;

    const outcome = await sendEmailMessage(msg);

    if (outcome.kind === "ok") {
      await EmailMessage.updateOne(
        { _id: msg._id },
        {
          $set: {
            status: "sent",
            providerId: outcome.providerId,
            sentAt: new Date(),
            lockedAt: null,
            lastError: null,
          },
        },
      );
      out.sent++;
    } else if (outcome.kind === "suppressed") {
      await EmailMessage.updateOne(
        { _id: msg._id },
        { $set: { status: "suppressed", lockedAt: null } },
      );
      out.suppressed++;
    } else if (outcome.kind === "retryable") {
      const exhausted = msg.attempts >= msg.maxAttempts;
      await EmailMessage.updateOne(
        { _id: msg._id },
        {
          $set: {
            status: exhausted ? "failed" : "queued",
            nextAttemptAt: new Date(now.getTime() + backoffMs(msg.attempts)),
            lockedAt: null,
            lastError: outcome.error,
          },
        },
      );
      if (exhausted) out.failed++;
      else out.retryScheduled++;
    } else {
      await EmailMessage.updateOne(
        { _id: msg._id },
        {
          $set: {
            status: "failed",
            lockedAt: null,
            lastError: outcome.error,
          },
        },
      );
      out.failed++;
    }
  }

  return out;
}

/** enqueue, then best-effort drain just this row after the response is sent. */
export async function enqueueAndDrain<T extends EmailTemplate>(
  input: EnqueueEmailInput<T>,
): Promise<void> {
  const { id, deduped } = await enqueueEmail(input);
  if (!id || deduped) return;
  try {
    after(() => drainOutbox({ ids: [id], limit: 1 }));
  } catch {
    // not inside a request scope (e.g. a cron/script call) — the sweep gets it
  }
}

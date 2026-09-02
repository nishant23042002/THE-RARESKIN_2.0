import "server-only";

import { Types } from "mongoose";

import { dbConnect } from "@/server/db";
import { ContactMessage, recordAudit } from "@/server/models";
import type { AuthContext } from "@/server/auth/session";
import type { ContactMessageActionInput } from "@/lib/validation/contact";

export type MessageActionResult =
  | { ok: true }
  | { ok: false; error: "not-found" | "noop" };

interface Req {
  ip: string | null;
  userAgent: string | null;
}

export async function markMessageHandled(
  id: string,
  input: ContactMessageActionInput,
  ctx: AuthContext,
  req: Req,
): Promise<MessageActionResult> {
  await dbConnect();
  const actor = new Types.ObjectId(ctx.user.id);

  const msg = await ContactMessage.findById(id);
  if (!msg) return { ok: false, error: "not-found" };
  if (msg.status === "handled") return { ok: false, error: "noop" };

  msg.status = "handled";
  msg.handledBy = actor;
  msg.handledAt = new Date();
  if (input.note) msg.note = input.note;
  await msg.save();

  await recordAudit({
    actorId: actor,
    actorRole: ctx.user.role,
    action: "message.handled",
    targetType: "ContactMessage",
    targetId: id,
    after: { note: input.note ?? "" },
    ip: req.ip,
    userAgent: req.userAgent,
  });

  return { ok: true };
}

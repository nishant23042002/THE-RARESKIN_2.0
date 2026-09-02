import { NextResponse } from "next/server";
import { z } from "zod";

import { contactMessageActionInput } from "@/lib/validation/contact";
import { requireAdminRole } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { markMessageHandled } from "@/server/admin";

/** `PATCH /api/admin/messages/<id>` — `{ action: "handle", note? }`. `support`+. */
export const dynamic = "force-dynamic";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i);

export async function PATCH(
  request: Request,
  ctxArg: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAdminRole("support");
  const { id } = await ctxArg.params;
  if (!objectId.safeParse(id).success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const parsed = contactMessageActionInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const req = await requestContext();
  const result = await markMessageHandled(id, parsed.data, ctx, req);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.error === "not-found" ? 404 : 422,
    });
  }
  return NextResponse.json(result);
}

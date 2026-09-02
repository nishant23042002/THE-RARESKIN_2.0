import { NextResponse } from "next/server";
import { z } from "zod";

import { userAdminUpdateInput } from "@/lib/validation/user";
import {
  requireAdminRole,
  SudoRequiredError,
} from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { updateUserAccount, signOutUserEverywhere } from "@/server/admin";

/**
 * `PATCH /api/admin/users/<id>` — role / status (sudo; superadmin gate).
 * `POST  /api/admin/users/<id>` — `{ action: "revoke-sessions" }`.
 * `admin`+.
 */
export const dynamic = "force-dynamic";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
const userPostInput = z.object({ action: z.literal("revoke-sessions") });

function badId() {
  return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
}

export async function PATCH(
  request: Request,
  ctxArg: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAdminRole("admin");
  const { id } = await ctxArg.params;
  if (!objectId.safeParse(id).success) return badId();

  const parsed = userAdminUpdateInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const req = await requestContext();
  try {
    const result = await updateUserAccount(id, parsed.data, ctx, req);
    if (!result.ok) {
      const status =
        result.error === "not-found"
          ? 404
          : result.error === "requires-superadmin"
            ? 403
            : 422;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SudoRequiredError) {
      return NextResponse.json(
        { ok: false, error: "sudo-required" },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function POST(
  request: Request,
  ctxArg: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAdminRole("admin");
  const { id } = await ctxArg.params;
  if (!objectId.safeParse(id).success) return badId();

  const parsed = userPostInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const req = await requestContext();
  const result = await signOutUserEverywhere(id, ctx, req);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.error === "not-found" ? 404 : 422,
    });
  }
  return NextResponse.json(result);
}

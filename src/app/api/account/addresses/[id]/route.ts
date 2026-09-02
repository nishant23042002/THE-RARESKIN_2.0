import { NextResponse } from "next/server";
import { z } from "zod";

import { address as addressSchema } from "@/lib/validation/user";
import { objectIdString } from "@/lib/validation/primitives";
import { getAuth } from "@/server/auth";
import { deleteAddress, updateAddress } from "@/server/data/addresses";

export const dynamic = "force-dynamic";

// `.partial()` keeps `isDefault`'s `.default(false)` — an omitted `isDefault`
// would then parse to `false` and silently un-set the default address. Redefine
// it as a bare optional so an absent key stays absent.
const patchSchema = addressSchema
  .partial()
  .extend({ isDefault: z.boolean().optional() });

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/account/addresses/[id]">,
) {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!objectIdString.safeParse(id).success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }
  const updated = await updateAddress(auth.user.id, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, address: updated });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/account/addresses/[id]">,
) {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!objectIdString.safeParse(id).success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  const removed = await deleteAddress(auth.user.id, id);
  if (!removed) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

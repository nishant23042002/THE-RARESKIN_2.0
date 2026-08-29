import { NextResponse } from "next/server";

import { address as addressSchema } from "@/lib/validation/user";
import { getAuth } from "@/server/auth";
import { addAddress, listAddresses } from "@/server/data/addresses";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, addresses: await listAddresses(auth.user.id) });
}

export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
  }
  const parsed = addressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }
  const created = await addAddress(auth.user.id, parsed.data);
  return NextResponse.json({ ok: true, address: created }, { status: 201 });
}

import { NextResponse } from "next/server";

import { staffInviteInput } from "@/lib/validation/user";
import {
  requireAdminRole,
  SudoRequiredError,
} from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { createOrPromoteStaff } from "@/server/admin";

/**
 * `POST /api/admin/staff` — create or promote a staff account by phone + role.
 * `admin`+; `superadmin` for `admin` / `superadmin` roles. Sudo-gated.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireAdminRole("admin");

  const parsed = staffInviteInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 6) },
      { status: 400 },
    );
  }

  const req = await requestContext();
  try {
    const result = await createOrPromoteStaff(parsed.data, ctx, req);
    if (!result.ok) {
      const status = result.error === "requires-superadmin" ? 403 : 422;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
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

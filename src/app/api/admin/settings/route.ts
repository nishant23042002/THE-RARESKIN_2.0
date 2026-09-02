import { NextResponse } from "next/server";

import { siteSettingsUpdateInput } from "@/lib/validation/site-settings";
import {
  requireAdminRole,
  assertSudo,
  SudoRequiredError,
} from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { updateSiteSettings, settingsPatchFlipsLaunchFlag } from "@/server/admin";

/**
 * `PATCH /api/admin/settings` — edit the site-settings singleton (partial).
 * `admin`+. A patch that flips `flags.storeLive` / `flags.maintenanceMode`
 * additionally needs a live `sudo` window (else 409 `sudo-required`).
 */
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const ctx = await requireAdminRole("admin");

  const parsed = siteSettingsUpdateInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }

  const req = await requestContext();

  try {
    if (await settingsPatchFlipsLaunchFlag(parsed.data)) {
      assertSudo(ctx);
    }
    const result = await updateSiteSettings(parsed.data, ctx, req);
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
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

import { NextResponse } from "next/server";

import { orderPatchInput } from "@/lib/validation/commerce";
import { requireAdminRole, SudoRequiredError } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { advanceOrderStatus, addInternalNote } from "@/server/admin";

/**
 * `PATCH /api/admin/orders/<orderNumber>` — advance the status (with tracking
 * details on `shipped`) or add an internal note. `operations`+ required.
 */
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  ctxArg: { params: Promise<{ orderNumber: string }> },
) {
  const ctx = await requireAdminRole("operations");
  const { orderNumber } = await ctxArg.params;
  const decoded = decodeURIComponent(orderNumber);

  const parsed = orderPatchInput.safeParse(
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
    const result =
      parsed.data.action === "status"
        ? await advanceOrderStatus(
            decoded,
            {
              to: parsed.data.to,
              carrier: parsed.data.carrier ?? null,
              trackingNumber: parsed.data.trackingNumber ?? null,
              trackingUrl: parsed.data.trackingUrl ?? null,
              eta: parsed.data.eta ?? null,
            },
            ctx,
            req,
          )
        : await addInternalNote(decoded, parsed.data.text, ctx, req);

    if (!result.ok) {
      const status = result.error === "not-found" ? 404 : 422;
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

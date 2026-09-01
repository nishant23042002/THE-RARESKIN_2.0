import { NextResponse } from "next/server";

import { orderCancelInput } from "@/lib/validation/commerce";
import { requireAdminRole, SudoRequiredError } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { cancelOrderByAdmin } from "@/server/admin";

/**
 * `POST /api/admin/orders/<orderNumber>/cancel` — cancel a COD order (stock,
 * credit and coupon are released). `admin`+ and a live `sudo` window. A paid
 * online order is cancelled by issuing a full refund instead.
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctxArg: { params: Promise<{ orderNumber: string }> },
) {
  const ctx = await requireAdminRole("admin");
  const { orderNumber } = await ctxArg.params;
  const decoded = decodeURIComponent(orderNumber);

  const parsed = orderCancelInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const req = await requestContext();

  try {
    const result = await cancelOrderByAdmin(decoded, parsed.data.reason, ctx, req);
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

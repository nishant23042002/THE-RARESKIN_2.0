import { NextResponse } from "next/server";

import { refundInput } from "@/lib/validation/commerce";
import { requireAdminRole, SudoRequiredError } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { refundOrder } from "@/server/admin";

/**
 * `POST /api/admin/orders/<orderNumber>/refund` — issue a Razorpay refund.
 * `admin`+ and a live `sudo` window (else 409 `sudo-required`).
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctxArg: { params: Promise<{ orderNumber: string }> },
) {
  const ctx = await requireAdminRole("admin");
  const { orderNumber } = await ctxArg.params;
  const decoded = decodeURIComponent(orderNumber);

  const parsed = refundInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const req = await requestContext();

  try {
    const result = await refundOrder(
      decoded,
      { amountPaise: parsed.data.amountPaise, reason: parsed.data.reason },
      ctx,
      req,
    );
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

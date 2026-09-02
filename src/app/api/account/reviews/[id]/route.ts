import { NextResponse } from "next/server";

import { reviewEditInput, reviewIdParam } from "@/lib/validation/review";
import { getAuth, checkRate } from "@/server/auth";
import { editReview } from "@/server/reviews/submit";

export const dynamic = "force-dynamic";

/** `PATCH /api/account/reviews/[id]` — edit an own review while it's pending. */
export async function PATCH(
  request: Request,
  ctxArg: { params: Promise<{ id: string }> },
) {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: "auth-required" },
      { status: 401 },
    );
  }

  const { id } = await ctxArg.params;
  if (!reviewIdParam.safeParse(id).success) {
    return NextResponse.json(
      { ok: false, error: "bad-request" },
      { status: 400 },
    );
  }

  const rate = await checkRate("account:review:user", auth.user.id);
  if (!rate.success) {
    return NextResponse.json(
      { ok: false, error: "rate-limited" },
      { status: 429 },
    );
  }

  const parsed = reviewEditInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }

  const result = await editReview(id, parsed.data, auth.user.id);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.error === "not-found" ? 404 : 422,
    });
  }
  return NextResponse.json(result);
}

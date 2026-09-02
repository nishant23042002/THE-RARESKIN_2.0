import { NextResponse } from "next/server";

import { reviewSubmitInput } from "@/lib/validation/review";
import { getAuth, checkRate } from "@/server/auth";
import { submitReview } from "@/server/reviews/submit";

export const dynamic = "force-dynamic";

/** `POST /api/account/reviews` — a signed-in buyer submits a review (→ pending). */
export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: "auth-required" },
      { status: 401 },
    );
  }

  const rate = await checkRate("account:review:user", auth.user.id);
  if (!rate.success) {
    return NextResponse.json(
      { ok: false, error: "rate-limited" },
      { status: 429 },
    );
  }

  const parsed = reviewSubmitInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }

  const result = await submitReview(
    parsed.data,
    auth.user.id,
    auth.user.name ?? null,
  );
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result, { status: 201 });
}

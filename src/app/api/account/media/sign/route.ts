import { NextResponse } from "next/server";

import { accountUploadInput } from "@/lib/validation/media";
import { getAuth, checkRate } from "@/server/auth";
import { signUpload } from "@/server/cloudinary";
import { isCloudinaryConfigured } from "@/server/env";

/**
 * `POST /api/account/media/sign` — a signed, single-use Cloudinary upload for a
 * signed-in customer. `purpose` maps to a fixed folder server-side; the client
 * never picks one. Review photos → `reviews/`, profile photo → `avatars/`.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: "auth-required" },
      { status: 401 },
    );
  }

  const rate = await checkRate("account:upload:user", auth.user.id);
  if (!rate.success) {
    return NextResponse.json(
      { ok: false, error: "rate-limited" },
      { status: 429 },
    );
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { ok: false, error: "cloudinary-unconfigured" },
      { status: 503 },
    );
  }

  const parsed = accountUploadInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const folder = parsed.data.purpose === "avatar" ? "avatars" : "reviews";
  try {
    const signed = signUpload({ folder });
    return NextResponse.json({ ok: true, upload: signed });
  } catch (err) {
    console.error("[account/media] sign failed", err);
    return NextResponse.json(
      { ok: false, error: "cloudinary-unconfigured" },
      { status: 503 },
    );
  }
}

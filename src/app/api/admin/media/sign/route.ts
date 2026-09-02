import { NextResponse } from "next/server";

import { signUploadInput } from "@/lib/validation/media";
import { requireCatalogueRole } from "@/server/auth/admin";
import { signUpload } from "@/server/cloudinary";
import { isCloudinaryConfigured } from "@/server/env";

/**
 * `POST /api/admin/media/sign` — hand the browser a short-lived signature so it
 * can PUT one file straight to Cloudinary. The allowed folder + transformation
 * are pinned server-side. `catalog_manager`+.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await requireCatalogueRole();

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { ok: false, error: "cloudinary-unconfigured" },
      { status: 503 },
    );
  }

  const parsed = signUploadInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  try {
    const signed = signUpload(parsed.data);
    return NextResponse.json({ ok: true, upload: signed });
  } catch (err) {
    console.error("[media] sign failed", err);
    return NextResponse.json(
      { ok: false, error: "cloudinary-unconfigured" },
      { status: 503 },
    );
  }
}

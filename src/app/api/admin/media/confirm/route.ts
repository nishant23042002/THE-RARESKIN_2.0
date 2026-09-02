import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { mediaConfirmInput } from "@/lib/validation/media";
import { requireCatalogueRole } from "@/server/auth/admin";
import { dbConnect } from "@/server/db";
import { MediaAsset } from "@/server/models";

/**
 * `POST /api/admin/media/confirm` — the browser has just uploaded a file
 * straight to Cloudinary; it echoes the metadata back here and we persist a
 * `MediaAsset` record (idempotent on `cloudinaryPublicId`). Returns a `mediaRef`
 * the product form attaches to a slot. `catalog_manager`+.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireCatalogueRole();

  const parsed = mediaConfirmInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 6) },
      { status: 400 },
    );
  }
  const d = parsed.data;

  await dbConnect();
  let asset;
  try {
    asset = await MediaAsset.create({
      cloudinaryPublicId: d.cloudinaryPublicId,
      secureUrl: d.secureUrl,
      format: d.format,
      width: d.width,
      height: d.height,
      bytes: d.bytes,
      folder: d.folder,
      alt: d.alt ?? "",
      tags: d.tags,
      uploadedBy: new Types.ObjectId(ctx.user.id),
      usedIn: [],
    });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      asset = await MediaAsset.findOne({
        cloudinaryPublicId: d.cloudinaryPublicId,
      }).lean();
    } else {
      throw e;
    }
  }
  if (!asset) {
    return NextResponse.json({ ok: false, error: "not-saved" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ref: {
      assetId: String(asset._id),
      url: asset.secureUrl,
      alt: asset.alt ?? "",
      width: asset.width,
      height: asset.height,
    },
  });
}

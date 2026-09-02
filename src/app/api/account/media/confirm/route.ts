import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";

import { mediaConfirmInput } from "@/lib/validation/media";
import { getAuth } from "@/server/auth";
import { dbConnect } from "@/server/db";
import { MediaAsset } from "@/server/models";

/**
 * `POST /api/account/media/confirm` — the customer's browser just uploaded a
 * file straight to Cloudinary; it echoes the metadata here and we persist a
 * `MediaAsset` (idempotent on `cloudinaryPublicId`), returning a `mediaRef` the
 * review form / avatar control attaches. Folder is locked to `reviews` /
 * `avatars`.
 */
export const dynamic = "force-dynamic";

const customerConfirm = mediaConfirmInput.extend({
  folder: z.enum(["reviews", "avatars"]),
});

export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: "auth-required" },
      { status: 401 },
    );
  }

  const parsed = customerConfirm.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 6) },
      { status: 400 },
    );
  }
  const d = parsed.data;

  try {
    await dbConnect();
    let asset: {
      _id: unknown;
      secureUrl: string;
      alt?: string;
      width: number;
      height: number;
    } | null = null;

    try {
      const doc = await MediaAsset.create({
        cloudinaryPublicId: d.cloudinaryPublicId,
        secureUrl: d.secureUrl,
        format: d.format,
        width: d.width,
        height: d.height,
        bytes: d.bytes,
        folder: d.folder,
        alt: d.alt ?? "",
        tags: d.tags,
        uploadedBy: new Types.ObjectId(auth.user.id),
        usedIn:
          d.folder === "avatars"
            ? [`avatar:${auth.user.id}`]
            : ["review:pending"],
      });
      asset = doc;
    } catch (e) {
      // an earlier confirm for the same file — reuse the existing row
      if ((e as { code?: number }).code === 11000) {
        asset = await MediaAsset.findOne({
          cloudinaryPublicId: d.cloudinaryPublicId,
        }).lean();
      } else {
        throw e;
      }
    }

    if (!asset) {
      return NextResponse.json(
        { ok: false, error: "not-saved" },
        { status: 500 },
      );
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
  } catch (err) {
    console.error("[account/media] confirm failed", {
      folder: d.folder,
      format: d.format,
      publicId: d.cloudinaryPublicId,
      err,
    });
    return NextResponse.json(
      { ok: false, error: "save-failed" },
      { status: 502 },
    );
  }
}

import { v2 as cloudinary } from "cloudinary";

import { getCloudinaryEnv } from "@/server/env";
import type { SignUploadInput } from "@/lib/validation/media";

/**
 * Cloudinary — server side only.
 *
 * Uploads never pass through a route handler. The browser gets a short-lived
 * signature from us, then PUTs the file straight to Cloudinary. We only see the
 * metadata it reports back, which we re-validate before storing a `MediaAsset`.
 */
if (typeof window !== "undefined") {
  throw new Error("@/server/cloudinary must never be imported into client code");
}

const ROOT_FOLDER = "rareskin";

let configured = false;

function getClient() {
  if (!configured) {
    const { cloudName, apiKey, apiSecret } = getCloudinaryEnv();
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export function folderPath(folder: SignUploadInput["folder"], sub?: string) {
  return sub ? `${ROOT_FOLDER}/${folder}/${sub}` : `${ROOT_FOLDER}/${folder}`;
}

export interface SignedUpload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId?: string;
  uploadUrl: string;
  /** what the browser must echo back in the multipart form */
  params: Record<string, string | number>;
}

/**
 * Produce the fields for one signed, single-use direct upload. The allowed
 * formats and transformations are pinned server-side so the client cannot widen
 * them.
 */
export function signUpload(input: SignUploadInput): SignedUpload {
  const client = getClient();
  const { cloudName, apiKey, apiSecret } = getCloudinaryEnv();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = folderPath(input.folder);

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder,
    // strip location metadata, normalise very large uploads
    transformation: "f_auto,q_auto",
  };
  if (input.publicId) paramsToSign.public_id = input.publicId;

  const signature = client.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    publicId: input.publicId,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    params: { ...paramsToSign, api_key: apiKey, signature },
  };
}

/** Permanently delete an asset. Only call after confirming nothing references it. */
export async function destroyAsset(publicId: string): Promise<void> {
  await getClient().uploader.destroy(publicId, { invalidate: true });
}

/** Build a delivery URL for a stored public id (used by the `next/image` loader). */
export function deliveryUrl(
  publicId: string,
  opts: { width?: number; quality?: number | "auto" } = {},
): string {
  return getClient().url(publicId, {
    secure: true,
    fetch_format: "auto",
    quality: opts.quality ?? "auto",
    ...(opts.width ? { width: opts.width, crop: "limit" } : {}),
  });
}

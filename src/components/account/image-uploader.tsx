"use client";

import { useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { cloudinaryVariant } from "@/lib/catalog";
import type { AccountUploadInput, MediaRef } from "@/lib/validation/media";

/**
 * Customer image upload. Picks a file → signs with us → PUTs straight to
 * Cloudinary → confirms the metadata (writes a `MediaAsset`) → hands the parent
 * the url / `mediaRef`. Same three-step flow as the admin `UploadField`.
 */

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
const FORMAT_MAP: Record<string, string> = {
  jpeg: "jpeg",
  jpg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
};

type Purpose = AccountUploadInput["purpose"];

async function uploadOne(
  file: File,
  purpose: Purpose,
): Promise<{ ok: true; ref: MediaRef } | { ok: false; error: string }> {
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "That image is over 10 MB — compress it first." };
  }

  const signRes = await fetch("/api/account/media/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ purpose }),
  });
  const signJson = await signRes.json().catch(() => null);
  if (!signRes.ok || !signJson?.ok) {
    return {
      ok: false,
      error:
        signJson?.error === "cloudinary-unconfigured"
          ? "Photo uploads aren't set up on this site yet."
          : signJson?.error === "rate-limited"
            ? "Too many uploads just now. Try again shortly."
            : "Couldn't start the upload.",
    };
  }

  const { upload } = signJson as {
    upload: { uploadUrl: string; params: Record<string, string | number> };
  };
  const form = new FormData();
  form.append("file", file);
  for (const [k, v] of Object.entries(upload.params)) form.append(k, String(v));

  const cloudRes = await fetch(upload.uploadUrl, { method: "POST", body: form });
  if (!cloudRes.ok) return { ok: false, error: "The upload was rejected." };
  const cloud = (await cloudRes.json()) as {
    public_id: string;
    secure_url: string;
    format: string;
    width: number;
    height: number;
    bytes: number;
  };

  const confirmRes = await fetch("/api/account/media/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      cloudinaryPublicId: cloud.public_id,
      secureUrl: cloud.secure_url,
      format: FORMAT_MAP[cloud.format] ?? "jpg",
      width: cloud.width,
      height: cloud.height,
      bytes: cloud.bytes,
      folder: purpose === "avatar" ? "avatars" : "reviews",
    }),
  });
  const confirmJson = await confirmRes.json().catch(() => null);
  if (!confirmRes.ok || !confirmJson?.ok) {
    return { ok: false, error: "Uploaded, but couldn't save it. Try again." };
  }
  return { ok: true, ref: confirmJson.ref as MediaRef };
}

// ── avatar ─────────────────────────────────────────────────────────────

export function AvatarUploader({
  value,
  name,
  onChange,
  size = 72,
}: {
  value: string | null;
  name: string;
  onChange: (url: string | null) => Promise<void> | void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File) {
    setError(null);
    setBusy(true);
    const res = await uploadOne(file, "avatar");
    if (res.ok) {
      await onChange(res.ref.url);
    } else {
      setError(res.error);
    }
    setBusy(false);
  }

  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "★";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={value ? "Change profile photo" : "Add profile photo"}
        className="group relative shrink-0 overflow-hidden rounded-full border border-line-2 bg-surface-2 disabled:opacity-60"
        style={{ width: size, height: size }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cloudinaryVariant(value, { w: size * 2, h: size * 2, fill: true }) ?? value}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-[15px] font-medium tracking-[0.04em] text-ink-3">
            {initials}
          </span>
        )}
        <span className="absolute inset-0 grid place-items-center bg-ink/45 text-w0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Icon name="download" className="size-4 rotate-180" />
        </span>
      </button>

      <div className="min-w-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="text-[11px] font-medium tracking-[0.1em] text-ink-2 uppercase underline-offset-2 hover:text-ink hover:underline disabled:opacity-50"
        >
          {busy ? "Uploading…" : value ? "Change photo" : "Add a photo"}
        </button>
        {value && !busy && (
          <button
            type="button"
            onClick={() => void onChange(null)}
            className="ml-3 text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-error"
          >
            Remove
          </button>
        )}
        {error && <p className="mt-1 text-[11px] text-error">{error}</p>}
        {!error && (
          <p className="mt-1 text-[11px] text-ink-3">
            Shown on your reviews. JPG/PNG/WebP, up to 10&nbsp;MB.
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void pick(f);
        }}
      />
    </div>
  );
}

// ── review photos ──────────────────────────────────────────────────────

export function ReviewPhotoUploader({
  value,
  onChange,
  max = 3,
}: {
  value: MediaRef[];
  onChange: (next: MediaRef[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = max - value.length;

  async function pick(files: FileList) {
    setError(null);
    setBusy(true);
    const take = Array.from(files).slice(0, remaining);
    const added: MediaRef[] = [];
    for (const f of take) {
      const res = await uploadOne(f, "review-photo");
      if (res.ok) added.push(res.ref);
      else {
        setError(res.error);
        break;
      }
    }
    if (added.length) onChange([...value, ...added]);
    setBusy(false);
  }

  return (
    <div>
      <span className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase">
        Photos <span className="text-ink-3/70">· optional, up to {max}</span>
      </span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {value.map((p, i) => (
          <span
            key={p.assetId + String(i)}
            className="relative size-16 overflow-hidden rounded-[3px] border border-line-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cloudinaryVariant(p.url, { w: 200, h: 200, fill: true }) ?? p.url}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label="Remove photo"
              className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-ink/70 text-w0"
            >
              <Icon name="close" className="size-2.5" />
            </button>
          </span>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={cn(
              "grid size-16 place-items-center rounded-[3px] border border-dashed border-line-2 text-ink-3 transition-colors hover:border-ink-3 disabled:opacity-60",
            )}
          >
            <span className="flex flex-col items-center gap-0.5">
              <Icon name="plus" className="size-4" />
              <span className="text-[8.5px] tracking-[0.06em] uppercase">
                {busy ? "…" : "Add"}
              </span>
            </span>
          </button>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-[11px] text-error">{error}</p>
      ) : (
        <p className="mt-1.5 text-[11px] text-ink-3">
          A photo of the bottle or how it wears helps other shoppers most.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const fs = e.target.files;
          e.target.value = "";
          if (fs && fs.length) void pick(fs);
        }}
      />
    </div>
  );
}

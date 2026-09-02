"use client";

import { useRef, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { InfoTip } from "@/components/admin/info-tip";
import { cn } from "@/lib/cn";
import type { MediaFolder } from "@/lib/validation/media";
import type { MediaRefDTO } from "@/server/admin";

/**
 * One image slot. Picks a file → gets a signature from us → PUTs straight to
 * Cloudinary → confirms the metadata with us (which writes a `MediaAsset`) →
 * hands the parent a `mediaRef`. "Remove" just drops the ref (the Cloudinary
 * asset is left in place — it may be reused).
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

export function UploadField({
  label,
  info,
  value,
  onChange,
  className,
  folder = "products",
}: {
  label: string;
  /** a "where does this image go" note behind a `?` on hover */
  info?: ReactNode;
  value: MediaRefDTO | null;
  onChange: (ref: MediaRefDTO | null) => void;
  className?: string;
  /** Cloudinary folder — pins where the file lands + the confirm record */
  folder?: MediaFolder;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "signing" | "uploading" | "saving">(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("That file is over 10 MB — compress it first.");
      return;
    }
    try {
      setBusy("signing");
      const signRes = await fetch("/api/admin/media/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      const signJson = await signRes.json();
      if (!signJson.ok) {
        setError(
          signJson.error === "cloudinary-unconfigured"
            ? "Image uploads aren't configured on this environment."
            : "Couldn't start the upload.",
        );
        setBusy(null);
        return;
      }

      const { upload } = signJson as {
        upload: { uploadUrl: string; params: Record<string, string | number> };
      };
      const form = new FormData();
      form.append("file", file);
      for (const [k, v] of Object.entries(upload.params)) {
        form.append(k, String(v));
      }

      setBusy("uploading");
      const cloudRes = await fetch(upload.uploadUrl, { method: "POST", body: form });
      if (!cloudRes.ok) {
        setError("Cloudinary rejected the upload.");
        setBusy(null);
        return;
      }
      const cloud = (await cloudRes.json()) as {
        public_id: string;
        secure_url: string;
        format: string;
        width: number;
        height: number;
        bytes: number;
      };

      setBusy("saving");
      const confirmRes = await fetch("/api/admin/media/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cloudinaryPublicId: cloud.public_id,
          secureUrl: cloud.secure_url,
          format: FORMAT_MAP[cloud.format] ?? "jpg",
          width: cloud.width,
          height: cloud.height,
          bytes: cloud.bytes,
          folder,
        }),
      });
      const confirmJson = await confirmRes.json();
      if (!confirmJson.ok) {
        setError("Uploaded, but couldn't save the record. Try again.");
        setBusy(null);
        return;
      }
      onChange(confirmJson.ref as MediaRefDTO);
      setBusy(null);
    } catch {
      setError("Upload failed. Check your connection and retry.");
      setBusy(null);
    }
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10.5px] font-medium tracking-[0.1em] text-ink-3 uppercase">
          {label}
          {info && <InfoTip>{info}</InfoTip>}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10px] tracking-[0.04em] text-ink-3 uppercase hover:text-error"
          >
            Remove
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy != null}
        className={cn(
          "mt-1 grid aspect-[4/5] w-full place-items-center overflow-hidden border border-dashed border-line-2 bg-surface-2/50 transition-colors hover:border-ink-3",
          busy != null && "opacity-60",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value.url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-ink-3">
            <Icon name="download" className="size-5 rotate-180" />
            <span className="text-[10.5px] tracking-[0.06em] uppercase">
              {busy === "signing"
                ? "Preparing…"
                : busy === "uploading"
                  ? "Uploading…"
                  : busy === "saving"
                    ? "Saving…"
                    : "Upload"}
            </span>
          </span>
        )}
      </button>

      {busy != null && value && (
        <p className="mt-1 text-[10.5px] text-ink-3">
          {busy === "uploading" ? "Uploading…" : "Saving…"}
        </p>
      )}
      {error && <p className="mt-1 text-[11px] text-error">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}

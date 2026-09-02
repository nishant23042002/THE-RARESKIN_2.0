"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { Stars } from "@/components/ui/stars";
import {
  ReviewLightbox,
  type LightboxPhoto,
} from "@/components/product/review-lightbox";
import { cn } from "@/lib/cn";
import { cloudinaryVariant } from "@/lib/catalog";
import { initialsFrom } from "@/lib/reviews";
import type { AdminReviewRow } from "@/server/admin";
import type { ReviewStatus } from "@/lib/validation/review";

const TONE: Record<ReviewStatus, string> = {
  pending: "border-gilt/50 text-warn",
  approved: "border-ok/50 text-ok",
  rejected: "border-error/40 text-error",
};
const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Pending",
  approved: "Published",
  rejected: "Rejected",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function Row({ review }: { review: AdminReviewRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const photos: LightboxPhoto[] = review.photos.map((p) => ({
    url: p.url,
    alt: p.alt || `Photo from ${review.authorName}`,
  }));

  async function moderate(action: "approve" | "reject") {
    setBusy(true);
    setErr(false);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        setErr(true);
        return;
      }
      router.refresh();
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-line p-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <Avatar
            src={review.avatarUrl}
            initials={initialsFrom(review.authorName)}
            size={34}
            className="mt-0.5"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[13px] font-medium tracking-[0.04em]">
                {review.productName}
              </span>
              <Stars value={review.rating} starClassName="size-3.5" />
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[9px] font-medium tracking-[0.1em] uppercase",
                  TONE[review.status],
                )}
              >
                {STATUS_LABEL[review.status]}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-ink-3">
              {review.authorName}
              {review.customer ? ` · ${review.customer.contact}` : ""} ·{" "}
              <Link
                href={`/admin/orders/${review.orderNumber}`}
                className="hover:text-ink hover:underline"
              >
                {review.orderNumber}
              </Link>{" "}
              · {fmtDate(review.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {review.status !== "approved" && (
            <button
              type="button"
              onClick={() => moderate("approve")}
              disabled={busy}
              className="rounded-[2px] border border-ok/60 px-2.5 py-1 text-[10px] tracking-[0.1em] text-ok uppercase hover:bg-ok hover:text-w0 disabled:opacity-40"
            >
              Approve
            </button>
          )}
          {review.status !== "rejected" && (
            <button
              type="button"
              onClick={() => moderate("reject")}
              disabled={busy}
              className="rounded-[2px] border border-line-2 px-2.5 py-1 text-[10px] tracking-[0.1em] text-ink-2 uppercase hover:border-error hover:text-error disabled:opacity-40"
            >
              {review.status === "approved" ? "Hide" : "Reject"}
            </button>
          )}
        </div>
      </div>

      <p className="mt-2.5 text-[12.5px] font-medium text-ink">{review.title}</p>
      <p className="mt-1 max-w-[70ch] text-[12.5px] leading-relaxed text-ink-2">
        {review.body}
      </p>

      {photos.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {photos.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightbox(i)}
              className="size-14 overflow-hidden rounded-[3px] border border-line-2 transition-opacity hover:opacity-90"
              aria-label="View photo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cloudinaryVariant(p.url, { w: 200, h: 200, fill: true }) ?? p.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {err && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-error">
          <Icon name="alert" className="size-3.5" />
          Couldn&rsquo;t save. Try again.
        </p>
      )}

      <ReviewLightbox
        photos={photos}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndex={setLightbox}
      />
    </div>
  );
}

export function ReviewsList({ reviews }: { reviews: AdminReviewRow[] }) {
  return (
    <div>
      {reviews.map((r) => (
        <Row key={r.id} review={r} />
      ))}
    </div>
  );
}

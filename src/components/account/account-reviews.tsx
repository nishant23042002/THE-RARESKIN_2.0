"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { OrderThumb } from "@/components/account/order-thumb";
import { ProfilePhoto } from "@/components/account/profile-photo";
import { ReviewPhotoUploader } from "@/components/account/image-uploader";
import { Star, Stars } from "@/components/ui/stars";
import { cn } from "@/lib/cn";
import { cloudinaryVariant } from "@/lib/catalog";
import {
  REVIEW_BODY_MAX,
  REVIEW_MAX_PHOTOS,
  REVIEW_TITLE_MAX,
} from "@/lib/validation/review";
import type { MediaRef } from "@/lib/validation/media";
import type { MyReview, ReviewableItem } from "@/server/data/reviews";

const STATUS_COPY: Record<
  MyReview["status"],
  { label: string; tone: string }
> = {
  pending: { label: "In review", tone: "border-gilt/50 text-warn" },
  approved: { label: "Published", tone: "border-ok/50 text-ok" },
  rejected: { label: "Not published", tone: "border-line-2 text-ink-3" },
};

// ── rating picker ──────────────────────────────────────────────────────

function RatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div
      className="flex gap-1.5 text-gilt"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} out of 5`}
          aria-pressed={value === n}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform duration-150 hover:scale-110 motion-reduce:transition-none"
        >
          <Star filled={n <= shown} className="size-6" />
        </button>
      ))}
    </div>
  );
}

// ── the form (submit new / edit existing) ──────────────────────────────

type FormState = {
  rating: number;
  title: string;
  body: string;
  photos: MediaRef[];
};

function ReviewForm({
  initial,
  submitLabel,
  onCancel,
  onSubmit,
  avatarUrl,
  userName,
}: {
  initial: FormState;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (v: FormState) => Promise<string | null>;
  avatarUrl: string | null;
  userName: string;
}) {
  const [v, setV] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (v.rating < 1) {
      setError("Pick a star rating.");
      return;
    }
    if (!v.title.trim() || !v.body.trim()) {
      setError("Add a headline and a few words.");
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onSubmit(v);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <RatingPicker
        value={v.rating}
        onChange={(rating) => setV((p) => ({ ...p, rating }))}
      />

      <label className="mt-4 block">
        <span className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase">
          Headline
        </span>
        <input
          value={v.title}
          maxLength={REVIEW_TITLE_MAX}
          onChange={(e) => setV((p) => ({ ...p, title: e.target.value }))}
          placeholder="Sums it up in a line"
          className="mt-1.5 w-full border-0 border-b border-line-2 bg-transparent pb-2 text-[15px] text-ink focus:border-ink focus:outline-none placeholder:text-ink-3"
        />
      </label>

      <label className="mt-4 block">
        <span className="flex items-baseline justify-between">
          <span className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase">
            Your review
          </span>
          <span className="text-[10px] text-ink-3 tabular-nums">
            {v.body.length}/{REVIEW_BODY_MAX}
          </span>
        </span>
        <textarea
          value={v.body}
          rows={4}
          maxLength={REVIEW_BODY_MAX}
          onChange={(e) => setV((p) => ({ ...p, body: e.target.value }))}
          placeholder="How does it wear? When do you reach for it? Would you buy it again?"
          className="mt-1.5 w-full resize-y border border-line-2 bg-surface p-2.5 text-[13.5px] leading-relaxed text-ink focus:border-ink focus:outline-none placeholder:text-ink-3"
        />
      </label>

      <div className="mt-4">
        <ReviewPhotoUploader
          value={v.photos}
          max={REVIEW_MAX_PHOTOS}
          onChange={(photos) => setV((p) => ({ ...p, photos }))}
        />
      </div>

      {!avatarUrl && (
        <div className="mt-4 rounded-[3px] border border-line-2 bg-surface-2/40 p-3">
          <p className="text-[11.5px] text-ink-2">
            Add a profile photo — it shows on your review and helps other
            shoppers trust it.
          </p>
          <div className="mt-2">
            <ProfilePhoto initial={null} name={userName} />
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-error">
          <Icon name="alert" className="size-3.5" />
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-[2px] bg-cta px-4 py-2 text-[11px] tracking-[0.12em] text-w0 uppercase hover:bg-cta-hover disabled:opacity-40"
        >
          {busy ? "Sending…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-[2px] border border-line-2 px-4 py-2 text-[11px] tracking-[0.12em] text-ink-2 uppercase hover:border-ink hover:text-ink disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
        Reviews and photos are checked by our team before they appear. You&rsquo;ll
        be shown as your first name and last initial, with a Verified Buyer badge.
      </p>
    </div>
  );
}

// ── panel ──────────────────────────────────────────────────────────────

export function AccountReviews({
  reviewable,
  mine,
  avatarUrl,
  userName,
}: {
  reviewable: ReviewableItem[];
  mine: MyReview[];
  avatarUrl: string | null;
  userName: string;
}) {
  const router = useRouter();
  const [openSku, setOpenSku] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function submitNew(item: ReviewableItem, v: FormState) {
    const res = await fetch("/api/account/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderNumber: item.orderNumber,
        sku: item.sku,
        ...v,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      return errorMessage(json?.error);
    }
    setOpenSku(null);
    router.refresh();
    return null;
  }

  async function saveEdit(id: string, v: FormState) {
    const res = await fetch(`/api/account/reviews/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(v),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      return errorMessage(json?.error);
    }
    setEditingId(null);
    router.refresh();
    return null;
  }

  return (
    <div className="space-y-12">
      {/* to review */}
      <section>
        <h2 className="text-[11px] font-medium tracking-[0.14em] text-ink-3 uppercase">
          To review
        </h2>
        {reviewable.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-2">
            Nothing waiting. Once an order is delivered, the pieces from it show
            up here to review.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {reviewable.map((item) => (
              <li
                key={item.sku}
                className="rounded-[4px] border border-line-2 bg-surface p-4"
              >
                <div className="flex items-start gap-3.5">
                  <OrderThumb
                    slug={item.slug}
                    image={item.image}
                    isFragrance={item.isFragrance}
                    alt={item.name}
                    className="size-14 rounded-[3px]"
                    flaconClass="w-[52%]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] tracking-[0.06em]">{item.name}</p>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      Order {item.orderNumber}
                    </p>
                  </div>
                  {openSku !== item.sku && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenSku(item.sku);
                        setEditingId(null);
                      }}
                      className="shrink-0 rounded-[2px] border border-ink px-3 py-1.5 text-[10.5px] tracking-[0.12em] text-ink uppercase transition-colors hover:bg-ink hover:text-w0"
                    >
                      Write a review
                    </button>
                  )}
                </div>
                {openSku === item.sku && (
                  <ReviewForm
                    initial={{ rating: 0, title: "", body: "", photos: [] }}
                    submitLabel="Submit review"
                    onCancel={() => setOpenSku(null)}
                    onSubmit={(v) => submitNew(item, v)}
                    avatarUrl={avatarUrl}
                    userName={userName}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* your reviews */}
      {mine.length > 0 && (
        <section>
          <h2 className="text-[11px] font-medium tracking-[0.14em] text-ink-3 uppercase">
            Your reviews
          </h2>
          <ul className="mt-4 space-y-3">
            {mine.map((r) => {
              const status = STATUS_COPY[r.status];
              return (
                <li
                  key={r.id}
                  className="rounded-[4px] border border-line-2 bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2.5">
                      {r.href ? (
                        <Link
                          href={r.href}
                          className="text-[14px] tracking-[0.06em] hover:text-ink-2"
                        >
                          {r.productName}
                        </Link>
                      ) : (
                        <span className="text-[14px] tracking-[0.06em]">
                          {r.productName}
                        </span>
                      )}
                      <Stars value={r.rating} starClassName="size-3.5" />
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[9px] font-medium tracking-[0.12em] uppercase",
                        status.tone,
                      )}
                    >
                      {status.label}
                    </span>
                  </div>

                  {editingId === r.id ? (
                    <ReviewForm
                      initial={{
                        rating: r.rating,
                        title: r.title,
                        body: r.body,
                        photos: r.photos.map((p) => ({
                          assetId: p.assetId,
                          url: p.url,
                          alt: p.alt,
                          width: p.width,
                          height: p.height,
                        })),
                      }}
                      submitLabel="Save changes"
                      onCancel={() => setEditingId(null)}
                      onSubmit={(v) => saveEdit(r.id, v)}
                      avatarUrl={avatarUrl}
                      userName={userName}
                    />
                  ) : (
                    <>
                      <p className="mt-2.5 text-[13px] font-medium">{r.title}</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                        {r.body}
                      </p>
                      {r.photos.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {r.photos.map((p, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={
                                cloudinaryVariant(p.url, {
                                  w: 160,
                                  h: 160,
                                  fill: true,
                                }) ?? p.url
                              }
                              alt=""
                              className="size-14 rounded-[3px] border border-line-2 object-cover"
                            />
                          ))}
                        </div>
                      )}
                      {r.editable && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(r.id);
                            setOpenSku(null);
                          }}
                          className="mt-3 text-[10.5px] tracking-[0.1em] text-ink-3 uppercase hover:text-ink"
                        >
                          Edit
                        </button>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function errorMessage(error: string | undefined): string {
  switch (error) {
    case "already-reviewed":
      return "You've already reviewed this one — edit your existing review instead.";
    case "not-delivered":
      return "This order hasn't been marked delivered yet.";
    case "item-not-in-order":
    case "order-not-found":
      return "We couldn't match that to one of your orders.";
    case "not-editable":
      return "This review is already published and can't be edited here.";
    case "rate-limited":
      return "Too many attempts just now. Try again in a bit.";
    default:
      return "Something went wrong. Try again.";
  }
}

import Link from "next/link";

import { requireAdminRole } from "@/server/auth/admin";
import { listReviews } from "@/server/admin";
import { PageHeader, Card, EmptyState } from "@/components/admin/ui";
import { ReviewsFilters } from "@/components/admin/reviews/reviews-filters";
import { ReviewsList } from "@/components/admin/reviews/reviews-list";
import { REVIEW_STATUSES, type ReviewStatus } from "@/lib/validation/review";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews · Studio" };

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminRole("support");
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const statusRaw = one(sp.status);
  const status: ReviewStatus | "all" =
    statusRaw === "all"
      ? "all"
      : (REVIEW_STATUSES as readonly string[]).includes(statusRaw ?? "")
        ? (statusRaw as ReviewStatus)
        : "pending";
  const q = one(sp.q)?.trim() ?? "";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const list = await listReviews({ status, q, page });

  return (
    <>
      <PageHeader eyebrow="Studio" title="Reviews">
        {list.counts.pending} awaiting review · {list.counts.approved} published
      </PageHeader>

      <ReviewsFilters status={status} q={q} counts={list.counts} />

      <Card className="mt-4 !p-0">
        {list.rows.length === 0 ? (
          <EmptyState icon="search">
            {status === "pending"
              ? "Nothing waiting. New reviews land here for approval."
              : "No reviews match this view."}
          </EmptyState>
        ) : (
          <ReviewsList reviews={list.rows} />
        )}
      </Card>

      {list.pages > 1 && (
        <Pagination page={list.page} pages={list.pages} sp={sp} />
      )}
    </>
  );
}

function Pagination({
  page,
  pages,
  sp,
}: {
  page: number;
  pages: number;
  sp: Record<string, string | string[] | undefined>;
}) {
  const build = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "page" || v == null) continue;
      params.set(k, Array.isArray(v) ? (v[0] ?? "") : v);
    }
    params.set("page", String(p));
    return `/admin/reviews?${params.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-[11.5px] text-ink-2">
      <span className="tabular-nums">
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={build(page - 1)}
            className="rounded-[3px] border border-line-2 px-2.5 py-1 hover:border-ink hover:text-ink"
          >
            Previous
          </Link>
        )}
        {page < pages && (
          <Link
            href={build(page + 1)}
            className="rounded-[3px] border border-line-2 px-2.5 py-1 hover:border-ink hover:text-ink"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

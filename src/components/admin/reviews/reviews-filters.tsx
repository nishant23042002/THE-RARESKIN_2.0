"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Icon } from "@/components/ui/icon";

const LABEL: Record<string, string> = {
  all: "All",
  pending: "Pending",
  approved: "Published",
  rejected: "Rejected",
};

export function ReviewsFilters({
  status,
  q,
  counts,
}: {
  status: string;
  q: string;
  counts: { pending: number; approved: number; rejected: number };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(q);
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    setTerm(q);
  }

  function push(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "" || v === "all") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page");
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`));
  }

  const tabs = ["pending", "approved", "rejected", "all"] as const;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {tabs.map((t) => {
          const active = (status || "pending") === t;
          const badge =
            t === "pending"
              ? counts.pending
              : t === "approved"
                ? counts.approved
                : t === "rejected"
                  ? counts.rejected
                  : null;
          return (
            <button
              key={t}
              type="button"
              onClick={() => push({ status: t })}
              className={
                active
                  ? "rounded-full bg-ink px-3 py-1 text-[11px] tracking-[0.06em] text-w0 uppercase"
                  : "rounded-full border border-line-2 px-3 py-1 text-[11px] tracking-[0.06em] text-ink-2 uppercase hover:border-ink hover:text-ink"
              }
            >
              {LABEL[t]}
              {badge != null && badge > 0 ? ` · ${badge}` : ""}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: term.trim() || null });
        }}
        className="flex items-center gap-1.5 border border-line-2 bg-surface px-2.5 py-1.5"
      >
        <Icon name="search" className="size-3.5 text-ink-3" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Product, author, order no."
          className="w-48 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3"
        />
      </form>

      {q && (
        <button
          type="button"
          onClick={() => push({ q: null })}
          className="text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
        >
          Clear
        </button>
      )}
      {pending && <span className="text-[11px] text-ink-3">…</span>}
    </div>
  );
}

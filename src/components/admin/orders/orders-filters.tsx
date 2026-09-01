"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { ADMIN_STATUS_LABEL } from "@/lib/admin";
import { ORDER_STATUSES, PAYMENT_METHODS } from "@/lib/validation/commerce";

/**
 * Status / method / search controls for the orders table. Everything lives in
 * the URL so the server component re-queries and the view is shareable.
 */
export function OrdersFilters({
  status,
  method,
  q,
}: {
  status: string;
  method: string;
  q: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(q);
  // keep the box in sync when the URL query changes from elsewhere (Clear,
  // back/forward) — the "adjust state during render" pattern, no effect.
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

  return (
    <div className="flex flex-wrap items-center gap-2">
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
          placeholder="Order no., name, phone, email"
          className="w-56 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3"
        />
      </form>

      <select
        value={status}
        onChange={(e) => push({ status: e.target.value })}
        className="border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink"
      >
        <option value="all">All statuses</option>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ADMIN_STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <select
        value={method}
        onChange={(e) => push({ method: e.target.value })}
        className="border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink uppercase"
      >
        <option value="all">All methods</option>
        {PAYMENT_METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      {(status !== "all" || method !== "all" || q) && (
        <button
          type="button"
          onClick={() => push({ status: null, method: null, q: null })}
          className="text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
        >
          Clear
        </button>
      )}
      {pending && <span className="text-[11px] text-ink-3">…</span>}
    </div>
  );
}

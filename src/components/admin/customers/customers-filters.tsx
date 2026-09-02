"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { ROLE_LABEL } from "@/lib/admin";
import { USER_ROLES, USER_STATUSES } from "@/lib/validation/user";

/** Role / status / search for the customers table — all in the URL. */
export function CustomersFilters({
  role,
  status,
  q,
}: {
  role: string;
  status: string;
  q: string;
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
          placeholder="Phone, name, email"
          className="w-52 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3"
        />
      </form>

      <select
        value={role}
        onChange={(e) => push({ role: e.target.value })}
        className="border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink"
      >
        <option value="all">All roles</option>
        {USER_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r] ?? r}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => push({ status: e.target.value })}
        className="border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink capitalize"
      >
        <option value="all">Any status</option>
        {USER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {(role !== "all" || status !== "all" || q) && (
        <button
          type="button"
          onClick={() => push({ role: null, status: null, q: null })}
          className="text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
        >
          Clear
        </button>
      )}
      {pending && <span className="text-[11px] text-ink-3">…</span>}
    </div>
  );
}

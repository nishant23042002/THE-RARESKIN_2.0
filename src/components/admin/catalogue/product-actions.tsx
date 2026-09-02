"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";

/** Small header actions for the product edit page — for now, just Duplicate. */
export function DuplicateButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/catalogue/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      const json = await res.json();
      if (json.ok) router.push(`/admin/catalogue/${json.slug}/edit`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-2 px-2.5 py-1.5 text-[11px] tracking-[0.06em] text-ink-2 uppercase hover:border-ink hover:text-ink disabled:opacity-40"
    >
      <Icon name="box" className="size-3.5" />
      {busy ? "…" : "Duplicate"}
    </button>
  );
}

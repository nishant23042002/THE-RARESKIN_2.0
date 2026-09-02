"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, EmptyState } from "@/components/admin/ui";
import { Icon } from "@/components/ui/icon";
import { formatPaise } from "@/lib/money";
import { PRODUCT_STATUSES } from "@/lib/validation/product";
import type { AdminProductRow } from "@/server/admin";

/**
 * The catalogue list. Inline status change per row; reorder is a deliberate
 * drag + "Save order" (not autosave).
 */
export function CatalogueTable({ rows: initial }: { rows: AdminProductRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  async function changeStatus(slug: string, status: string) {
    setRows((r) => r.map((x) => (x.slug === slug ? { ...x, status: status as AdminProductRow["status"] } : x)));
    await fetch(`/api/admin/catalogue/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "status", status }),
    });
    router.refresh();
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    setRows((r) => {
      const next = [...r];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
    setDirty(true);
  }

  async function saveOrder() {
    setBusy(true);
    try {
      await fetch("/api/admin/catalogue/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slugs: rows.map((r) => r.slug) }),
      });
      setDirty(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (rows.length === 0) {
    return (
      <Card className="!p-0">
        <EmptyState>No products yet.</EmptyState>
      </Card>
    );
  }

  return (
    <>
      {dirty && (
        <div className="mb-3 flex items-center justify-between border border-gilt/40 bg-gilt/5 px-3 py-2 text-[12px]">
          <span className="text-ink-2">Order changed.</span>
          <button
            onClick={saveOrder}
            disabled={busy}
            className="rounded-[3px] bg-cta px-3 py-1 text-[10.5px] tracking-[0.1em] text-w0 uppercase hover:bg-black disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save order"}
          </button>
        </div>
      )}
      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[10px] tracking-[0.1em] text-ink-3 uppercase">
                <th className="w-8 px-2 py-2.5" />
                <th className="px-3 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 font-medium">Kind</th>
                <th className="px-3 py-2.5 font-medium">Price</th>
                <th className="px-3 py-2.5 font-medium">Stock</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p, i) => {
                const low = p.trackInventory && p.stock <= p.lowStockThreshold;
                return (
                  <tr
                    key={p.slug}
                    draggable
                    onDragStart={() => setDragFrom(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragFrom != null) reorder(dragFrom, i);
                      setDragFrom(null);
                    }}
                    className="hover:bg-surface-2/60"
                  >
                    <td className="px-2 py-2 text-center text-ink-3">
                      <Icon name="list" className="size-3.5 cursor-grab" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center overflow-hidden border border-line bg-surface-2">
                          {p.heroThumb ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.heroThumb}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Icon name="box" className="size-4 text-ink-3" />
                          )}
                        </span>
                        <Link
                          href={`/admin/catalogue/${encodeURIComponent(p.slug)}/edit`}
                          className="text-ink hover:underline"
                        >
                          {p.name}
                          <span className="block text-[10.5px] text-ink-3">
                            {p.slug}
                          </span>
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-ink-2">{p.kind}</td>
                    <td className="px-3 py-2 tabular-nums text-ink">
                      {formatPaise(p.pricePaise)}
                      {p.mrpPaise > p.pricePaise && (
                        <span className="ml-1.5 text-[11px] text-ink-3 line-through">
                          {formatPaise(p.mrpPaise)}
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-2 tabular-nums ${low ? "text-error" : "text-ink"}`}>
                      {p.trackInventory ? p.stock : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={p.status}
                        onChange={(e) => changeStatus(p.slug, e.target.value)}
                        className="border border-line-2 bg-surface px-2 py-1 text-[11.5px] text-ink"
                      >
                        {PRODUCT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

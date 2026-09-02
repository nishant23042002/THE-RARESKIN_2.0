"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { NOTIFICATION_META } from "@/lib/notifications";
import { NOTIFICATION_CATEGORIES } from "@/lib/validation/notification";
import type { NotificationRow } from "@/server/admin";

import { NotificationList } from "./notification-list";

export function NotificationsView({
  initialRows,
  initialCursor,
  category,
}: {
  initialRows: NotificationRow[];
  initialCursor: string | null;
  category: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [rows, setRows] = useState(initialRows);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);

  // re-sync when the server hands a fresh page (filter change / refresh)
  const [seen, setSeen] = useState(initialRows);
  if (initialRows !== seen) {
    setSeen(initialRows);
    setRows(initialRows);
    setCursor(initialCursor);
  }

  function setCategory(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next === "all") sp.delete("category");
    else sp.set("category", next);
    router.replace(`${pathname}?${sp.toString()}`);
  }

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (category !== "all") sp.set("category", category);
      sp.set("cursor", cursor);
      const res = await fetch(`/api/admin/notifications?${sp.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = (await res.json()) as {
          rows: NotificationRow[];
          nextCursor: string | null;
        };
        setRows((r) => [...r, ...json.rows]);
        setCursor(json.nextCursor);
      }
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    const res = await fetch("/api/admin/notifications/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        category === "all" ? { all: true } : { all: true, category },
      ),
    });
    if (res.ok) {
      setRows((r) => r.map((x) => ({ ...x, read: true })));
      window.dispatchEvent(new Event("rrs:notif-refresh"));
      router.refresh();
    }
  }

  const tabs = ["all", ...NOTIFICATION_CATEGORIES] as const;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => {
            const active = category === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setCategory(t)}
                className={
                  active
                    ? "rounded-full bg-ink px-2.5 py-1 text-[10.5px] tracking-[0.06em] text-w0 uppercase"
                    : "rounded-full border border-line-2 px-2.5 py-1 text-[10.5px] tracking-[0.06em] text-ink-2 uppercase hover:border-ink hover:text-ink"
                }
              >
                {t === "all" ? "All" : NOTIFICATION_META[t].label}
              </button>
            );
          })}
        </div>
        {rows.some((r) => !r.read) && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-[10.5px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
          >
            Mark all read
          </button>
        )}
      </div>

      <NotificationList
        rows={rows}
        mode="page"
        onActivate={(n) => {
          if (!n.read) {
            setRows((r) =>
              r.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
            );
            void fetch("/api/admin/notifications/read", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ids: [n.id] }),
            }).then(() =>
              window.dispatchEvent(new Event("rrs:notif-refresh")),
            );
          }
        }}
      />

      {cursor && (
        <div className="border-t border-line px-3 py-2 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="text-[10.5px] tracking-[0.1em] text-ink-2 uppercase hover:text-ink disabled:opacity-40"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

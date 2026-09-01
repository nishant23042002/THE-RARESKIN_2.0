"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";

/**
 * Internal notes — staff-only, never shown to the customer or in the account
 * order page.
 */
export function OrderNotes({
  orderNumber,
  notes,
}: {
  orderNumber: string;
  notes: { at: string; actorName: string | null; text: string }[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "note", text: t }),
        },
      );
      const json = await res.json();
      if (json.ok) {
        setText("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <Card title="Internal notes">
      {notes.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2.5">
          {notes
            .slice()
            .reverse()
            .map((n, i) => (
              <li key={i} className="text-[12px]">
                <p className="text-ink">{n.text}</p>
                <p className="mt-0.5 text-[10.5px] tracking-[0.04em] text-ink-3 uppercase">
                  {n.actorName ?? "staff"} · {fmt(n.at)}
                </p>
              </li>
            ))}
        </ul>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Add a note for the team…"
        className="w-full resize-none border border-line-2 bg-surface px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-ink placeholder:text-ink-3"
      />
      <button
        onClick={add}
        disabled={busy || !text.trim()}
        className="mt-2 rounded-[3px] border border-line-2 px-3 py-1.5 text-[11px] tracking-[0.08em] text-ink-2 uppercase hover:border-ink hover:text-ink disabled:opacity-40"
      >
        {busy ? "Saving…" : "Add note"}
      </button>
    </Card>
  );
}

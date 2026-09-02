"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { AdminMessageRow } from "@/server/admin";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MessageCard({ m }: { m: AdminMessageRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function handle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/messages/${m.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "handle", note: note.trim() || undefined }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const mailto = `mailto:${m.email}?subject=${encodeURIComponent(
    `Re: your message to THE RARESKIN${m.topic ? ` (${m.topic})` : ""}`,
  )}`;

  return (
    <div className="border-b border-line p-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-ink">{m.name}</span>
            <span className="text-[11px] text-ink-3">{m.email}</span>
            {m.topic && (
              <span className="rounded-full border border-line-2 px-1.5 py-0.5 text-[9px] tracking-[0.08em] text-ink-3 uppercase">
                {m.topic}
              </span>
            )}
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[9px] font-medium tracking-[0.1em] uppercase",
                m.status === "new"
                  ? "border-warn/50 text-warn"
                  : "border-ok/50 text-ok",
              )}
            >
              {m.status === "new" ? "New" : "Handled"}
            </span>
          </span>
          <p
            className={cn(
              "mt-1 text-[12px] text-ink-2",
              open ? "whitespace-pre-wrap" : "line-clamp-1",
            )}
          >
            {m.message}
          </p>
        </div>
        <span className="shrink-0 text-[10.5px] text-ink-3 tabular-nums">
          {fmt(m.createdAt)}
        </span>
      </button>

      {open && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-2 text-[11px] text-ink-3">
            {m.phone ? `Phone: ${m.phone}` : "No phone given"}
            {m.account ? ` · signed-in account (${m.account.phone})` : ""}
          </p>
          {m.status === "handled" ? (
            <p className="text-[11.5px] text-ink-3">
              Handled by {m.handledBy}
              {m.handledAt ? ` · ${fmt(m.handledAt)}` : ""}
              {m.note ? ` — ${m.note}` : ""}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={mailto}
                className="inline-flex items-center gap-1.5 rounded-[2px] border border-ink px-3 py-1.5 text-[10.5px] tracking-[0.1em] text-ink uppercase hover:bg-ink hover:text-w0"
              >
                <Icon name="mail" className="size-3.5" />
                Reply by email
              </a>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="min-w-0 flex-1 border border-line-2 bg-surface px-2.5 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-3"
              />
              <button
                type="button"
                onClick={handle}
                disabled={busy}
                className="rounded-[2px] bg-cta px-3 py-1.5 text-[10.5px] tracking-[0.1em] text-w0 uppercase hover:bg-cta-hover disabled:opacity-40"
              >
                {busy ? "…" : "Mark handled"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MessagesView({
  rows,
  status,
  q,
  counts,
}: {
  rows: AdminMessageRow[];
  status: string;
  q: string;
  counts: { new: number; handled: number };
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
      if (v === null || v === "" || v === "new") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page");
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <div className="flex gap-1">
          {(["new", "handled", "all"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => push({ status: t })}
              className={
                (status || "new") === t
                  ? "rounded-full bg-ink px-3 py-1 text-[11px] tracking-[0.06em] text-w0 uppercase"
                  : "rounded-full border border-line-2 px-3 py-1 text-[11px] tracking-[0.06em] text-ink-2 uppercase hover:border-ink hover:text-ink"
              }
            >
              {t}
              {t === "new" && counts.new > 0 ? ` · ${counts.new}` : ""}
            </button>
          ))}
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
            placeholder="Name, email, text"
            className="w-44 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3"
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

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-[12.5px] text-ink-2">
          No messages match this view.
        </p>
      ) : (
        rows.map((m) => <MessageCard key={m.id} m={m} />)
      )}
    </div>
  );
}

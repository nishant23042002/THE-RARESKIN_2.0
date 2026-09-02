"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";
import { Field, TextInput, Select, TextArea } from "@/components/admin/field";
import { Icon } from "@/components/ui/icon";

const REASONS = ["restock", "correction", "damage", "return", "write_off"] as const;

/**
 * Ledgered stock adjustment for one product. A delta (signed) + a reason + an
 * optional note; the server guards against going below zero and writes a
 * `stockLedger` row.
 */
export function StockPanel({
  slug,
  stock,
  threshold,
  ledger,
}: {
  slug: string;
  stock: number;
  threshold: number;
  ledger: {
    at: string;
    delta: number;
    reason: string;
    balanceAfter: number;
    note: string | null;
  }[];
}) {
  const router = useRouter();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("restock");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const low = stock <= threshold;

  async function submit() {
    const n = Number(delta);
    if (!Number.isInteger(n) || n === 0) {
      setError("Enter a whole non-zero number (e.g. 20 or -3).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/catalogue/${encodeURIComponent(slug)}/stock`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ delta: n, reason, note: note.trim() || undefined }),
        },
      );
      const json = await res.json();
      if (!json.ok) {
        setError(
          json.error === "would-go-negative"
            ? "That would drop stock below zero."
            : "Couldn't adjust the stock.",
        );
        return;
      }
      setDelta("");
      setNote("");
      router.refresh();
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
    <Card title="Inventory">
      <div className="flex items-baseline gap-2">
        <span
          className={`text-[1.6rem] leading-none tabular-nums ${low ? "text-error" : "text-ink"}`}
        >
          {stock}
        </span>
        <span className="text-[11px] text-ink-3">in stock · alert ≤ {threshold}</span>
      </div>

      <div className="mt-4 grid gap-2.5">
        <Field
          label="Adjust by"
          hint="+ adds, − removes"
          info="A whole number. Positive adds stock (a delivery arrived), negative removes it. Every change is recorded below with your name."
        >
          <TextInput
            inputMode="numeric"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="20"
          />
        </Field>
        <Field
          label="Reason"
          info="restock = new inventory in. correction = fixing a miscount. damage / write_off = units lost. return = a returned unit put back on the shelf. The reason is kept on the ledger row."
        >
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note" hint="optional">
          <TextArea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        {error && (
          <p className="flex items-center gap-1.5 text-[11.5px] text-error">
            <Icon name="alert" className="size-3.5" />
            {error}
          </p>
        )}
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-[3px] border border-line-2 px-3 py-1.5 text-[11px] tracking-[0.1em] text-ink-2 uppercase hover:border-ink hover:text-ink disabled:opacity-40"
        >
          {busy ? "Working…" : "Apply adjustment"}
        </button>
      </div>

      {ledger.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <span className="text-[10px] font-medium tracking-[0.12em] text-ink-3 uppercase">
            Recent movements
          </span>
          <ul className="mt-2 flex flex-col gap-1.5 text-[11.5px]">
            {ledger.map((l, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2">
                <span className="text-ink-2">
                  <span
                    className={`tabular-nums ${l.delta > 0 ? "text-ok" : "text-error"}`}
                  >
                    {l.delta > 0 ? "+" : ""}
                    {l.delta}
                  </span>{" "}
                  {l.note ?? l.reason}
                </span>
                <span className="shrink-0 text-ink-3 tabular-nums">
                  → {l.balanceAfter} · {fmt(l.at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

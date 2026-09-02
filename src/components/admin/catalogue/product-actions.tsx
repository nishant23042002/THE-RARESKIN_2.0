"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { SudoGate } from "@/components/admin/sudo-gate";

/** Header actions for the product edit page. */
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

/**
 * Hard delete — only rendered for a `draft` product. Server-side it's rejected
 * unless the draft has zero orders referencing it (otherwise: archive instead).
 * A type-the-slug confirm + a sudo re-check.
 */
export function DeleteButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sudoOpen, setSudoOpen] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/catalogue/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      });
      const json = await res.json();
      if (res.status === 409 && json.error === "sudo-required") {
        setSudoOpen(true);
        return;
      }
      if (!json.ok) {
        setError(
          json.error === "has-orders"
            ? "Orders reference this product — archive it instead."
            : json.error === "not-draft"
              ? "Only a draft can be deleted. Set it to draft, or archive it."
              : "Couldn't delete this product.",
        );
        return;
      }
      router.push("/admin/catalogue");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-[3px] border border-error/40 px-2.5 py-1.5 text-[11px] tracking-[0.06em] text-error uppercase hover:bg-error hover:text-w0"
      >
        <Icon name="alert" className="size-3.5" />
        Delete
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[3px] border border-error/40 bg-error/5 p-3">
      <p className="text-[11.5px] text-ink-2">
        Permanently delete this draft. Type <b className="text-ink">{slug}</b> to
        confirm.
      </p>
      <input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder={slug}
        className="border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-ink"
      />
      {error && (
        <p className="flex items-center gap-1.5 text-[11px] text-error">
          <Icon name="alert" className="size-3.5" />
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={run}
          disabled={busy || confirm !== slug}
          className="rounded-[3px] bg-error px-3 py-1.5 text-[11px] tracking-[0.08em] text-w0 uppercase hover:bg-error/90 disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setConfirm("");
            setError(null);
          }}
          className="rounded-[3px] border border-line-2 px-3 py-1.5 text-[11px] tracking-[0.08em] text-ink-2 uppercase hover:border-ink hover:text-ink"
        >
          Cancel
        </button>
      </div>

      <SudoGate
        open={sudoOpen}
        title="Confirm the delete"
        detail="Deleting a product is permanent. Enter the code we just sent to your phone."
        onCancel={() => setSudoOpen(false)}
        onConfirmed={() => {
          setSudoOpen(false);
          void run();
        }}
      />
    </div>
  );
}

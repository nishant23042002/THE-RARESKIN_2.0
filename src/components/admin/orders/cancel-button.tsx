"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";
import { Icon } from "@/components/ui/icon";
import { SudoGate } from "@/components/admin/sudo-gate";
import type { OrderStatus } from "@/lib/validation/commerce";

/**
 * Cancel a COD order (stock is restored, credit + coupon released). Sudo-gated.
 * Paid online orders are cancelled by issuing a full refund instead.
 */
export function CancelButton({
  orderNumber,
  status,
}: {
  orderNumber: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sudoOpen, setSudoOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const cancellable = ["pending", "confirmed", "processing"].includes(status);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}/cancel`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() || "Cancelled by staff" }),
        },
      );
      const json = await res.json();
      if (res.status === 409 && json.error === "sudo-required") {
        setSudoOpen(true);
        return;
      }
      if (!json.ok) {
        setError(
          json.error === "use-refund"
            ? "This order is paid — issue a refund instead."
            : "Couldn't cancel this order.",
        );
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!cancellable) return null;

  return (
    <Card title="Cancel order">
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full rounded-[3px] border border-line-2 px-3 py-2 text-[11px] tracking-[0.1em] text-ink-2 uppercase hover:border-error hover:text-error"
        >
          Cancel this COD order
        </button>
      ) : (
        <>
          <label className="block">
            <span className="block text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
              Reason
            </span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. customer requested"
              className="mt-1 w-full border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-ink placeholder:text-ink-3"
            />
          </label>
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-error">
              <Icon name="alert" className="size-3.5" />
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-[3px] border border-line-2 px-3 py-2 text-[11px] tracking-[0.08em] text-ink-2 uppercase hover:border-ink hover:text-ink"
            >
              Keep
            </button>
            <button
              onClick={run}
              disabled={busy}
              className="flex-1 rounded-[3px] border border-error/50 px-3 py-2 text-[11px] tracking-[0.08em] text-error uppercase hover:bg-error hover:text-w0 disabled:opacity-40"
            >
              {busy ? "…" : "Cancel order"}
            </button>
          </div>
        </>
      )}

      <SudoGate
        open={sudoOpen}
        title="Confirm the cancellation"
        detail="Cancelling restores stock and releases the coupon. Enter the code we just sent to your phone."
        onCancel={() => setSudoOpen(false)}
        onConfirmed={() => {
          setSudoOpen(false);
          void run();
        }}
      />
    </Card>
  );
}

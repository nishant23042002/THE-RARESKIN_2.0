"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";
import { Icon } from "@/components/ui/icon";
import { SudoGate } from "@/components/admin/sudo-gate";
import { formatPaise, toPaise } from "@/lib/money";

/**
 * Issue a Razorpay refund — full remaining amount by default, or a partial
 * amount. Sudo-gated: a `409 { error: "sudo-required" }` opens the `<SudoGate>`,
 * and the refund re-runs once the session is elevated.
 */
export function RefundPanel({
  orderNumber,
  remainingPaise,
  paymentStatus,
}: {
  orderNumber: string;
  remainingPaise: number;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sudoOpen, setSudoOpen] = useState(false);

  const refundable = ["paid", "partially_refunded"].includes(paymentStatus) && remainingPaise > 0;

  async function run() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body: { reason: string; amountPaise?: number } = {
        reason: reason.trim() || "Refund issued by staff",
      };
      const rupees = Number(amount);
      if (amount.trim() && Number.isFinite(rupees) && rupees > 0) {
        body.amountPaise = toPaise(rupees);
      }
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}/refund`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (res.status === 409 && json.error === "sudo-required") {
        setSudoOpen(true);
        return;
      }
      if (!json.ok) {
        setError(refundError(json.error));
        return;
      }
      setMessage(json.message ?? "Refund issued.");
      setAmount("");
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!refundable) {
    return (
      <Card title="Refund">
        <p className="text-[12px] text-ink-3">
          Nothing left to refund on this order.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Refund">
      <p className="text-[11.5px] text-ink-3">
        Up to {formatPaise(remainingPaise)} refundable.
      </p>
      <label className="mt-2 block">
        <span className="block text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
          Amount (₹) — blank = full
        </span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder={String(remainingPaise / 100)}
          className="mt-1 w-full border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-ink"
        />
      </label>
      <label className="mt-2 block">
        <span className="block text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
          Reason
        </span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. damaged in transit"
          className="mt-1 w-full border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-ink placeholder:text-ink-3"
        />
      </label>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-error">
          <Icon name="alert" className="size-3.5" />
          {error}
        </p>
      )}
      {message && <p className="mt-2 text-[11.5px] text-ok">{message}</p>}

      <button
        onClick={run}
        disabled={busy}
        className="mt-3 w-full rounded-[3px] border border-error/50 px-3 py-2 text-[11px] tracking-[0.1em] text-error uppercase hover:bg-error hover:text-w0 disabled:opacity-40"
      >
        {busy ? "Working…" : "Issue refund"}
      </button>

      <SudoGate
        open={sudoOpen}
        title="Confirm the refund"
        detail="Refunds move real money. Enter the code we just sent to your phone."
        onCancel={() => setSudoOpen(false)}
        onConfirmed={() => {
          setSudoOpen(false);
          void run();
        }}
      />
    </Card>
  );
}

function refundError(code: string | undefined): string {
  switch (code) {
    case "not-refundable-cod":
      return "COD orders have no captured payment to refund.";
    case "not-refundable-status":
      return "This order's payment can't be refunded.";
    case "amount-out-of-range":
      return "That amount is more than what's left to refund.";
    case "provider-error":
      return "Razorpay rejected the refund. Check the dashboard.";
    default:
      return "Couldn't issue the refund.";
  }
}

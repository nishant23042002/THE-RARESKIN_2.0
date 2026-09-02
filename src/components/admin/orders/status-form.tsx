"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";
import { Icon } from "@/components/ui/icon";
import { ADMIN_STATUS_LABEL } from "@/lib/admin";
import type { OrderStatus } from "@/lib/validation/commerce";

/**
 * Advance an order to its next state. Choosing `shipped` reveals the carrier +
 * tracking fields, which flow into the `order-shipped` email.
 */
export function OrderStatusForm({
  orderNumber,
  status,
  allowed,
}: {
  orderNumber: string;
  status: OrderStatus;
  allowed: OrderStatus[];
}) {
  const router = useRouter();
  const [to, setTo] = useState<OrderStatus | "">("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [eta, setEta] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // don't offer refunded/returned here — those come from the refund flow
  const options = allowed.filter((s) => s !== "refunded" && s !== "returned");

  if (options.length === 0) {
    return (
      <Card title="Status">
        <p className="text-[12px] text-ink-3">
          {ADMIN_STATUS_LABEL[status]} — no further transitions.
        </p>
      </Card>
    );
  }

  async function submit() {
    if (!to) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "status",
            to,
            carrier: carrier.trim() || undefined,
            trackingNumber: tracking.trim() || undefined,
            trackingUrl: trackingUrl.trim() || undefined,
            eta: eta.trim() || undefined,
          }),
        },
      );
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Couldn't update the status.");
        return;
      }
      setTo("");
      setCarrier("");
      setTracking("");
      setTrackingUrl("");
      setEta("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Advance status">
      <label className="block text-[11px] tracking-[0.1em] text-ink-3 uppercase">
        Next status
      </label>
      <select
        value={to}
        onChange={(e) => setTo(e.target.value as OrderStatus)}
        className="mt-1.5 w-full border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink"
      >
        <option value="">Choose…</option>
        {options.map((s) => (
          <option key={s} value={s}>
            {ADMIN_STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      {to === "shipped" && (
        <div className="mt-3 flex flex-col gap-2">
          <Input label="Carrier" value={carrier} onChange={setCarrier} placeholder="Delhivery" />
          <Input label="Tracking number" value={tracking} onChange={setTracking} />
          <Input label="Tracking URL" value={trackingUrl} onChange={setTrackingUrl} placeholder="https://…" />
          <Input label="ETA (shown in the email)" value={eta} onChange={setEta} placeholder="in 3–4 days" />
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-error">
          <Icon name="alert" className="size-3.5" />
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={!to || busy}
        className="mt-3 w-full rounded-[3px] bg-cta px-3 py-2 text-[11px] tracking-[0.1em] text-w0 uppercase hover:bg-cta-hover disabled:opacity-40"
      >
        {busy ? "Updating…" : "Update status"}
      </button>
    </Card>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-ink placeholder:text-ink-3"
      />
    </label>
  );
}

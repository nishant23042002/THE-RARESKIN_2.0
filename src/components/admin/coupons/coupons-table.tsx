"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatPaise } from "@/lib/money";
import { COUPON_STATUSES } from "@/lib/validation/commerce";
import type { AdminCouponRow, CouponEffectiveStatus } from "@/server/admin";

const TONE: Record<CouponEffectiveStatus, string> = {
  active: "border-ok/50 text-ok",
  scheduled: "border-gilt/50 text-[#8f6118]",
  paused: "border-line-2 text-ink-3",
  expired: "border-error/40 text-error",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export function CouponsTable({ coupons }: { coupons: AdminCouponRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(code: string, status: string) {
    setBusy(code);
    try {
      await fetch(`/api/admin/coupons/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "status", status }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-line text-[10px] tracking-[0.1em] text-ink-3 uppercase">
            <th className="px-4 py-2.5 font-medium">Code</th>
            <th className="px-4 py-2.5 font-medium">Value</th>
            <th className="px-4 py-2.5 font-medium">Min</th>
            <th className="px-4 py-2.5 font-medium">Used</th>
            <th className="px-4 py-2.5 font-medium">Window</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {coupons.map((c) => (
            <tr key={c.id} className="hover:bg-surface-2/60">
              <td className="px-4 py-2.5">
                <Link
                  href={`/admin/coupons/${encodeURIComponent(c.code)}/edit`}
                  className="font-medium tracking-[0.04em] text-ink hover:underline"
                >
                  {c.code}
                </Link>
                {c.stackable && (
                  <span className="ml-2 text-[9.5px] tracking-[0.1em] text-ink-3 uppercase">
                    stackable
                  </span>
                )}
                {c.note && (
                  <span className="block text-[11px] text-ink-3">{c.note}</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-ink">{c.valueLabel}</td>
              <td className="px-4 py-2.5 text-ink-2 tabular-nums">
                {c.minSubtotalPaise > 0 ? formatPaise(c.minSubtotalPaise) : "—"}
              </td>
              <td className="px-4 py-2.5 text-ink-2 tabular-nums">
                {c.usedCount}
                {c.maxUses > 0 ? `/${c.maxUses}` : ""}
                <span className="block text-[10.5px] text-ink-3">
                  {c.usesPerUser > 0 ? `${c.usesPerUser}/user` : "∞/user"}
                </span>
              </td>
              <td className="px-4 py-2.5 text-[11.5px] text-ink-3 tabular-nums">
                {c.startsAt || c.endsAt
                  ? `${fmtDate(c.startsAt)} → ${fmtDate(c.endsAt)}`
                  : "always"}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={`mr-2 inline-block rounded-full border px-2 py-0.5 text-[9.5px] font-medium tracking-[0.09em] uppercase ${TONE[c.effectiveStatus]}`}
                >
                  {c.effectiveStatus}
                </span>
                <select
                  value={c.status}
                  disabled={busy === c.code}
                  onChange={(e) => setStatus(c.code, e.target.value)}
                  className="border border-line-2 bg-surface px-1.5 py-1 text-[11px] text-ink"
                >
                  {COUPON_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

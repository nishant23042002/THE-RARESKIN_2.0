"use client";

import { useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { PaymentMarks, IndiaFlag } from "@/components/ui/payment-marks";

/**
 * The base of the menu overlay — the reassurances a shopper wants before they
 * buy (delivery, payment, the flag), plus the counter's own signature: the
 * tri-juice rule and a live clock for Roha. Compact on purpose; pinned below
 * the scrolling nav.
 */

const TRUST: { icon: IconName; label: string }[] = [
  { icon: "truck", label: "Free shipping" },
  { icon: "banknote", label: "Cash on delivery" },
  { icon: "returns", label: "7-day returns" },
];

const IST = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function RohaClock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(IST.format(new Date()).toLowerCase());
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.06em] text-ink-3 uppercase tabular-nums">
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok/60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-ok" />
      </span>
      Roha{now ? ` · ${now}` : ""}
    </span>
  );
}

export function MenuFooter() {
  return (
    <div className="shrink-0 pt-5" data-stagger>
      <span
        aria-hidden
        className="block h-[2px] w-full rounded-full"
        style={{
          backgroundImage:
            "linear-gradient(90deg,#e0d7bf 0%,#c5872f 52%,#3d2712 100%)",
        }}
      />

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {TRUST.map((t) => (
          <span
            key={t.label}
            className="inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.08em] text-ink-2 uppercase"
          >
            <Icon name={t.icon} className="size-[13px] text-ink-3" />
            {t.label}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-line pt-4">
        <PaymentMarks compact />
        <span className="inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.06em] text-ink-3 uppercase">
          <IndiaFlag className="!h-3" />
          Made in India
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-[9.5px] tracking-[0.06em] text-ink-3 uppercase">
        <span>&#8377; INR &middot; Secured by Razorpay</span>
        <RohaClock />
      </div>
    </div>
  );
}

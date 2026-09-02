"use client";

import { useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { PaymentMarks, IndiaFlag } from "@/components/ui/payment-marks";

/**
 * The base of the menu overlay — the reassurances a shopper wants before they
 * buy (delivery, payment, provenance), plus the counter's signature tri-juice
 * rule and a live clock for Roha. Laid out as three calm tiers with real air
 * between them so it never stacks into a cramped block on a narrow phone.
 */

const TRUST: { icon: IconName; label: string; sub: string }[] = [
  { icon: "truck", label: "Free shipping", sub: "All India" },
  { icon: "banknote", label: "Cash on delivery", sub: "Pay on arrival" },
  { icon: "returns", label: "7-day returns", sub: "No questions" },
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
    <span className="inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.08em] text-ink-3 uppercase tabular-nums">
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
    <div className="shrink-0 pt-6" data-stagger>
      <span
        aria-hidden
        className="block h-[2px] w-full rounded-full"
        style={{
          backgroundImage:
            "linear-gradient(90deg,#e0d7bf 0%,#c5872f 52%,#3d2712 100%)",
        }}
      />

      {/* tier 1 — the three promises, always three columns so they never wrap */}
      <ul className="mt-5 grid grid-cols-3 gap-x-3">
        {TRUST.map((t) => (
          <li key={t.label} className="flex flex-col items-center gap-1.5 text-center">
            <Icon name={t.icon} className="size-[18px] text-ink-2" />
            <span className="text-[9px] leading-tight font-medium tracking-[0.08em] text-ink uppercase">
              {t.label}
            </span>
            <span className="text-[8px] tracking-[0.06em] text-ink-3 uppercase">
              {t.sub}
            </span>
          </li>
        ))}
      </ul>

      {/* tier 2 — how you pay */}
      <div className="mt-6 border-t border-line pt-5">
        <p className="text-[8.5px] font-medium tracking-[0.2em] text-ink-3 uppercase">
          Pay your way
        </p>
        <PaymentMarks compact className="mt-3 gap-x-5 gap-y-2.5" />
        <p className="mt-3 text-[9px] tracking-[0.06em] text-ink-3 uppercase">
          Secured by Razorpay &middot; card details never reach us
        </p>
      </div>

      {/* tier 3 — provenance + the live counter */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-4">
        <span className="inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.08em] text-ink-3 uppercase">
          <IndiaFlag className="!h-3" />
          Made in India &middot; &#8377; INR
        </span>
        <RohaClock />
      </div>
    </div>
  );
}

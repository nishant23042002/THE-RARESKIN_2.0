import { cn } from "@/lib/cn";

/**
 * Accepted-payment marks.
 *
 * Card networks (Visa / Mastercard / RuPay) and the BHIM (UPI) tile are the
 * official SVGs from `payments-icons-library` (Cashfree), vendored into
 * `/public/pay/` with their white backing plate stripped. Google Pay, PhonePe
 * and Paytm are the brand marks — every UPI app settles over UPI, so they stand
 * in for "pay with any UPI app". COD is not a network, so it stays a small
 * first-party glyph.
 */
const CARD_MARKS = [
  { src: "/pay/visa.svg", label: "Visa" },
  { src: "/pay/mastercard.svg", label: "Mastercard" },
  { src: "/pay/rupay.svg", label: "RuPay" },
  { src: "/pay/bhim.svg", label: "UPI" },
];

/** UPI apps — shown on trust surfaces so the shopper sees their app is accepted. */
export const UPI_APP_MARKS = [
  { src: "/pay/gpay.svg", label: "Google Pay" },
  { src: "/pay/phonepe.svg", label: "PhonePe" },
  { src: "/pay/paytm.svg", label: "Paytm" },
];

export function PaymentMarks({
  className,
  compact = false,
}: {
  className?: string;
  /** smaller marks for tight surfaces (the menu overlay) */
  compact?: boolean;
}) {
  const h = compact ? 20 : 30;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center",
        compact ? "gap-x-4 gap-y-2" : "gap-x-7 gap-y-3.5",
        className,
      )}
    >
      {CARD_MARKS.map((m) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={m.label}
          src={m.src}
          alt={m.label}
          width={Math.round(h * 1.5)}
          height={h}
          loading="lazy"
          decoding="async"
          // multiply drops the marks' white backing plate into the ground
          className="w-auto mix-blend-multiply"
          style={{ height: h }}
        />
      ))}
      <span
        className="flex items-center gap-1.5 text-ink-3"
        title="Cash on delivery"
      >
        <svg
          viewBox="0 0 24 16"
          className="w-auto"
          style={{ height: Math.round(h * 0.53) }}
          aria-hidden
        >
          <rect
            x="1"
            y="2"
            width="22"
            height="12"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <circle
            cx="12"
            cy="8"
            r="2.7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </svg>
        <span
          className={cn(
            "font-medium tracking-[0.08em] uppercase",
            compact ? "text-[9px]" : "text-[10px]",
          )}
        >
          COD
        </span>
      </span>
    </div>
  );
}

/**
 * A quiet strip of UPI-app marks (Google Pay · PhonePe · Paytm · UPI) for use
 * beside the "Card · UPI · Netbanking" option in checkout — it turns an abstract
 * label into "yes, my app works here". Each mark sits on its own white tile so
 * the brand colours read on any ground.
 */
export function UpiAppStrip({ className }: { className?: string }) {
  const marks = [...UPI_APP_MARKS, { src: "/pay/bhim.svg", label: "UPI" }];
  return (
    <span className={cn("flex items-center gap-1.5", className)} aria-hidden>
      {marks.map((m) => (
        <span
          key={m.label}
          className="grid h-[22px] w-[34px] place-items-center rounded-[4px] bg-white ring-1 ring-black/[0.06]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.src}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-[15px] w-auto"
          />
        </span>
      ))}
    </span>
  );
}

/**
 * Payment marks for the checkout CTA area. Larger, clearly legible tiles — a mix
 * of card networks and the UPI apps a shopper actually uses. Each mark sits on
 * its own white tile so the network / brand colours read at any size against the
 * dark footer.
 */
export function PaymentBadges({ className }: { className?: string }) {
  const marks = [
    { src: "/pay/visa.svg", label: "Visa" },
    { src: "/pay/mastercard.svg", label: "Mastercard" },
    { src: "/pay/rupay.svg", label: "RuPay" },
    { src: "/pay/gpay.svg", label: "Google Pay" },
    { src: "/pay/phonepe.svg", label: "PhonePe" },
    { src: "/pay/paytm.svg", label: "Paytm" },
  ];
  return (
    <span
      className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}
      aria-hidden
    >
      {marks.map((m) => (
        <span
          key={m.label}
          className="grid h-[26px] w-[38px] place-items-center rounded-[4px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.18)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.src}
            alt=""
            width={30}
            height={18}
            loading="lazy"
            decoding="async"
            className="h-[17px] w-auto"
          />
        </span>
      ))}
    </span>
  );
}

/** Official India flag (flagcdn `in.svg`), vendored to `/public/pay/india.svg`. */
export function IndiaFlag({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/pay/india.svg"
      alt="India"
      width={21}
      height={14}
      className={cn("h-3.5 w-auto rounded-[1.5px] ring-1 ring-line-2", className)}
    />
  );
}

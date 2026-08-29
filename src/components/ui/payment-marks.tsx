import { cn } from "@/lib/cn";

/**
 * Accepted-payment marks for the footer. Razorpay is the payment partner.
 *
 * Visa / Mastercard / RuPay and the BHIM (UPI) tile are the official SVGs from
 * `payments-icons-library` (Cashfree), vendored into `/public/pay/` with their
 * white backing plate stripped so the marks sit directly on the footer ground.
 * COD is not a network, so it stays a small first-party glyph.
 */
const MARKS = [
  { src: "/pay/visa.svg", label: "Visa" },
  { src: "/pay/mastercard.svg", label: "Mastercard" },
  { src: "/pay/rupay.svg", label: "RuPay" },
  { src: "/pay/bhim.svg", label: "UPI" },
];

export function PaymentMarks({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-7 gap-y-3.5",
        className,
      )}
    >
      {MARKS.map((m) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={m.label}
          src={m.src}
          alt={m.label}
          width={44}
          height={30}
          loading="lazy"
          decoding="async"
          // multiply drops the marks' white backing plate into the footer ground
          className="h-[30px] w-auto mix-blend-multiply"
        />
      ))}
      <span
        className="flex items-center gap-1.5 text-ink-3"
        title="Cash on delivery"
      >
        <svg viewBox="0 0 24 16" className="h-4 w-auto" aria-hidden>
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
        <span className="text-[10px] font-medium tracking-[0.08em] uppercase">
          COD
        </span>
      </span>
    </div>
  );
}

/**
 * Compact payment marks for a **dark** surface (the "Place order" CTA). Each
 * mark sits on its own white tile so the network colours read at any size. The
 * UPI (BHIM) tile stands in for every UPI app — Google Pay, PhonePe, Paytm,
 * Navi and the rest all settle over UPI.
 */
export function PaymentBadges({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-1", className)} aria-hidden>
      {MARKS.map((m) => (
        <span
          key={m.label}
          className="grid h-[18px] w-[26px] place-items-center rounded-[3px] bg-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.src}
            alt=""
            width={22}
            height={14}
            loading="lazy"
            decoding="async"
            className="h-[13px] w-auto"
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

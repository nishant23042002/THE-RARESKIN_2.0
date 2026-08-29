import "server-only";

import { ORIGIN_STATE_CODE } from "@/lib/pincode";
import type { OrderPricing } from "@/server/models";
import type { SiteSettingsInput } from "@/lib/validation/site-settings";
import type { PaymentMethod } from "@/lib/validation/commerce";

/**
 * The pricing / GST engine.
 *
 * Pure and deterministic — no DB, no clock. Given priced line items and the
 * delivery state, it computes the full breakdown the order stores and the
 * review screen shows. This runs at `/checkout/quote` (a hint) and again,
 * authoritatively, inside the place-order transaction.
 *
 * Model: **tax-inclusive** (`settings.gst.pricesIncludeTax`). Catalogue prices
 * already contain GST, so the grand total is built from those prices and the
 * tax shown is the tax *within* it:
 *
 *   grandTotal   = items − discount − credit + shipping + codFee
 *   taxableValue = round(grandTotal × 100 / (100 + rate))
 *   taxTotal     = grandTotal − taxableValue
 *
 * Split: intra-Maharashtra → CGST + SGST (half each); inter-state → IGST.
 */

export interface PricingLine {
  unitPricePaise: number;
  mrpPaise: number;
  qty: number;
}

export interface PricingInput {
  lines: PricingLine[];
  settings: SiteSettingsInput;
  method: PaymentMethod;
  /** two-digit GST state code of the delivery address; null = unknown yet */
  shipStateCode: string | null;
  /** already-validated coupon effect, in the engine's terms */
  coupon?: {
    code: string;
    type: "percent" | "fixed" | "free_shipping";
    /** percent value (0–100) for `percent`, else paise; unused for free_shipping */
    value: number;
  } | null;
  /** paise of store credit the caller wants applied (capped here) */
  requestedCreditPaise?: number;
}

export interface PricingResult extends OrderPricing {
  /** paise of credit actually applied after capping */
  creditAppliedPaise: number;
  /** discount the coupon produced, in paise (0 if none / not applicable) */
  discountPaise: number;
  freeShipping: boolean;
}

const half = (n: number) => {
  const a = Math.round(n / 2);
  return [a, n - a] as const;
};

export function computePricing(input: PricingInput): PricingResult {
  const { lines, settings, method, shipStateCode, coupon } = input;
  const rate = settings.gst.ratePercent;

  const itemsSubtotal = lines.reduce(
    (sum, l) => sum + Math.round(l.unitPricePaise) * l.qty,
    0,
  );

  // ── coupon discount (applies to the item subtotal) ────────────────────
  let discount = 0;
  let freeShipping = false;
  if (coupon) {
    if (coupon.type === "percent") {
      discount = Math.floor((itemsSubtotal * clamp(coupon.value, 0, 100)) / 100);
    } else if (coupon.type === "fixed") {
      discount = Math.min(coupon.value, itemsSubtotal);
    } else if (coupon.type === "free_shipping") {
      freeShipping = true;
    }
  }
  discount = Math.min(Math.max(discount, 0), itemsSubtotal);
  const afterDiscount = itemsSubtotal - discount;

  // ── store credit (capped at the remaining item value) ────────────────
  const creditApplied = Math.min(
    Math.max(input.requestedCreditPaise ?? 0, 0),
    afterDiscount,
  );
  const afterCredit = afterDiscount - creditApplied;

  // ── shipping ─────────────────────────────────────────────────────────
  let shipping = 0;
  const { freeAbovePaise, flatRatePaise } = settings.shipping;
  if (!freeShipping) {
    if (freeAbovePaise === 0) shipping = 0; // always-free store
    else if (afterDiscount >= freeAbovePaise) shipping = 0;
    else shipping = flatRatePaise;
  }

  const codFee =
    method === "cod" && settings.cod.enabled ? settings.cod.feePaise : 0;

  const grandTotal = afterCredit + shipping + codFee;

  // ── GST split (tax-inclusive) ────────────────────────────────────────
  const taxableValue = Math.round((grandTotal * 100) / (100 + rate));
  const taxTotal = grandTotal - taxableValue;

  const intraState =
    shipStateCode != null &&
    shipStateCode === (settings.gst.originStateCode || ORIGIN_STATE_CODE);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (intraState) {
    [cgst, sgst] = half(taxTotal);
  } else {
    igst = taxTotal;
  }

  return {
    itemsSubtotalPaise: itemsSubtotal,
    discountPaise: discount,
    creditAppliedPaise: creditApplied,
    shippingPaise: shipping,
    codFeePaise: codFee,
    taxableValuePaise: taxableValue,
    gst: {
      ratePercent: rate,
      cgstPaise: cgst,
      sgstPaise: sgst,
      igstPaise: igst,
      totalPaise: taxTotal,
    },
    grandTotalPaise: grandTotal,
    currency: "INR",
    freeShipping,
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

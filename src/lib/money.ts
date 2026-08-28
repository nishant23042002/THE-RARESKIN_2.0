/**
 * Money handling for the platform.
 *
 * Rule: every monetary value that touches the database or a payment gateway is
 * an **integer number of paise** (1 rupee = 100 paise). Floating-point rupees
 * are never stored or transmitted — they only exist at the very edge, for
 * display. Razorpay's API also expects paise, so this keeps one representation
 * end to end.
 *
 * This module is isomorphic: the storefront, the admin and the server all
 * format money the same way.
 */

/** Smallest currency unit. All DB / gateway amounts use this type. */
export type Paise = number;

const PAISE_PER_RUPEE = 100;

/** `799` (rupees) → `79900` (paise). Rejects non-finite / fractional-paise input. */
export function toPaise(rupees: number): Paise {
  if (!Number.isFinite(rupees)) {
    throw new RangeError(`toPaise: expected a finite number, got ${rupees}`);
  }
  const paise = Math.round(rupees * PAISE_PER_RUPEE);
  if (!Number.isSafeInteger(paise)) {
    throw new RangeError(`toPaise: result ${paise} is out of safe integer range`);
  }
  return paise;
}

/** `79900` (paise) → `799` (rupees, may be fractional). Display only. */
export function toRupees(paise: Paise): number {
  assertPaise(paise);
  return paise / PAISE_PER_RUPEE;
}

/**
 * Format paise the way the brand writes prices: `₹799`, `₹1,199`, `₹79,900`.
 * Whole rupees show no decimals; a fractional remainder shows exactly two.
 */
export function formatPaise(paise: Paise): string {
  assertPaise(paise);
  const rupees = paise / PAISE_PER_RUPEE;
  const hasFraction = paise % PAISE_PER_RUPEE !== 0;
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Legacy helper kept for the static storefront, which still passes whole
 * rupees. New code should store paise and call {@link formatPaise}.
 */
export function formatINR(rupees: number): string {
  return `₹${rupees.toLocaleString("en-IN")}`;
}

/** Sum a list of paise amounts, guarding against overflow. */
export function sumPaise(amounts: readonly Paise[]): Paise {
  return amounts.reduce((total, amount) => {
    assertPaise(amount);
    const next = total + amount;
    if (!Number.isSafeInteger(next)) {
      throw new RangeError("sumPaise: running total exceeded safe integer range");
    }
    return next;
  }, 0);
}

/** A whole-paise, non-negative amount. Throws otherwise. */
export function assertPaise(value: unknown): asserts value is Paise {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `Expected a non-negative integer amount of paise, got ${String(value)}`,
    );
  }
}

/** Discount of `mrp` vs `price`, both in paise — e.g. `{ amount: 40000, percent: 33 }`. */
export function savings(
  pricePaise: Paise,
  mrpPaise: Paise,
): { amount: Paise; percent: number } {
  assertPaise(pricePaise);
  assertPaise(mrpPaise);
  if (mrpPaise <= pricePaise) return { amount: 0, percent: 0 };
  const amount = mrpPaise - pricePaise;
  return { amount, percent: Math.round((amount / mrpPaise) * 100) };
}

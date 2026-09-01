import "server-only";

/**
 * Commerce engine — the server-side money, stock and order layer.
 *
 * Nothing here trusts the client with a number: prices, tax, discounts, credit
 * and stock are all computed from the live catalogue and Site Settings.
 */

export { computePricing } from "./pricing";
export type { PricingInput, PricingLine, PricingResult } from "./pricing";

export {
  checkServiceability,
  availableMethods,
} from "./serviceability";
export type { ServiceabilityResult } from "./serviceability";

export { validateCoupon, couponRejectionMessage } from "./coupons";
export type { CouponEffect, CouponValidation, CouponRejection } from "./coupons";

export {
  getStoreCreditBalance,
  spendStoreCredit,
  refundStoreCreditForOrder,
  grantStoreCredit,
} from "./store-credit";

export {
  commitStockForOrder,
  restoreStockForOrder,
} from "./inventory";
export type { StockLine, StockCommitResult } from "./inventory";

export { quoteOrder, placeOrder, creditBalanceFor } from "./orders";
export type {
  CheckoutQuote,
  QuoteError,
  QuoteWarning,
  PlaceOrderContext,
  PlaceOrderResult,
  PlaceOrderFailure,
} from "./orders";

import "server-only";

/**
 * Payments — Razorpay hosted checkout, verified webhooks, and the order state
 * machine. The webhook is authoritative; the client callback is a fast path for
 * the confirmation screen only. All processors are idempotent.
 */

export {
  createRazorpayOrder,
  fetchRazorpayPayment,
  fetchRazorpayOrderPayments,
  createRazorpayRefund,
  verifyCallbackSignature,
  verifyWebhookSignature,
} from "./razorpay";
export type {
  RazorpayOrder,
  RazorpayPayment,
  RazorpayRefund,
} from "./razorpay";

export { buildCheckoutPayment } from "./checkout";
export type { CheckoutPayment } from "./checkout";

export {
  canTransition,
  transitionOrder,
  confirmPaidOrder,
  markPaymentFailed,
  cancelUnpaidOrder,
  recordRefund,
} from "./process";
export type { ConfirmPaymentInput, ConfirmResult } from "./process";

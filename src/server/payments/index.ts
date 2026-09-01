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

export {
  canTransition,
  transitionOrder,
  finalizeOnlineCheckout,
  markIntentFailed,
  cancelUnpaidOrder,
  recordRefund,
} from "./process";
export type { FinalizeInput, FinalizeResult } from "./process";

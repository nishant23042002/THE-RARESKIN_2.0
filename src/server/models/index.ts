/**
 * Model registry.
 *
 * Importing this module registers every Mongoose model exactly once (the
 * `models.X ?? model(...)` guard in each file makes re-import safe under Next's
 * hot reload). `dbConnect()` calls `registerModels()` before connecting so that
 * `ref` population and discriminators resolve.
 */
import { AuditLog } from "./audit-log";
import { Cart } from "./cart";
import { CheckoutIntent } from "./checkout-intent";
import { Counter } from "./counter";
import { Coupon } from "./coupon";
import { EmailMessage } from "./email-message";
import { EmailSuppression } from "./email-suppression";
import { MediaAsset } from "./media-asset";
import { Order } from "./order";
import { OtpChallenge } from "./otp-challenge";
import { Payment } from "./payment";
import { Product } from "./product";
import { Review } from "./review";
import { Session } from "./session";
import { SiteSettings } from "./site-settings";
import { StockLedger } from "./stock-ledger";
import { StoreCredit } from "./store-credit";
import { User } from "./user";
import { WebhookEvent } from "./webhook-event";

export { AuditLog, recordAudit } from "./audit-log";
export { Cart } from "./cart";
export {
  CheckoutIntent,
  CHECKOUT_INTENT_STATUSES,
} from "./checkout-intent";
export { Counter, nextSequence } from "./counter";
export { Coupon } from "./coupon";
export {
  EmailMessage,
  EMAIL_TEMPLATES,
  EMAIL_STATUSES,
} from "./email-message";
export { EmailSuppression, SUPPRESSION_REASONS } from "./email-suppression";
export { MediaAsset } from "./media-asset";
export { Order } from "./order";
export { OtpChallenge } from "./otp-challenge";
export { Payment, recordPayment } from "./payment";
export { Product } from "./product";
export { Review } from "./review";
export { Session } from "./session";
export { SiteSettings } from "./site-settings";
export { StockLedger } from "./stock-ledger";
export { StoreCredit } from "./store-credit";
export { User } from "./user";
export { WebhookEvent } from "./webhook-event";

export type { AuditLogDoc } from "./audit-log";
export type { CartDoc, CartItemSub } from "./cart";
export type { CheckoutIntentDoc } from "./checkout-intent";
export type { CounterDoc } from "./counter";
export type { CouponDoc } from "./coupon";
export type {
  EmailMessageDoc,
  EmailTemplate,
  EmailStatus,
} from "./email-message";
export type {
  EmailSuppressionDoc,
  SuppressionReason,
} from "./email-suppression";
export type { MediaAssetDoc } from "./media-asset";
export type {
  OrderDoc,
  OrderPricing,
  OrderTimelineSub,
} from "./order";
export type { OtpChallengeDoc } from "./otp-challenge";
export type { PaymentDoc } from "./payment";
export type { ProductDoc } from "./product";
export type { ReviewDoc } from "./review";
export type { SessionDoc } from "./session";
export type { SiteSettingsDoc } from "./site-settings";
export type { StockLedgerDoc } from "./stock-ledger";
export type { StoreCreditDoc } from "./store-credit";
export type { UserDoc } from "./user";
export type { WebhookEventDoc } from "./webhook-event";

let registered = false;

export function registerModels(): void {
  if (registered) return;
  // Touch each model so its `model()` call runs.
  void AuditLog;
  void Cart;
  void CheckoutIntent;
  void Counter;
  void Coupon;
  void EmailMessage;
  void EmailSuppression;
  void MediaAsset;
  void Order;
  void OtpChallenge;
  void Payment;
  void Product;
  void Review;
  void Session;
  void SiteSettings;
  void StockLedger;
  void StoreCredit;
  void User;
  void WebhookEvent;
  registered = true;
}

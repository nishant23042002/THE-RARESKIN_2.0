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
import { Counter } from "./counter";
import { Coupon } from "./coupon";
import { MediaAsset } from "./media-asset";
import { Order } from "./order";
import { OtpChallenge } from "./otp-challenge";
import { Product } from "./product";
import { Session } from "./session";
import { SiteSettings } from "./site-settings";
import { StockLedger } from "./stock-ledger";
import { StoreCredit } from "./store-credit";
import { User } from "./user";

export { AuditLog, recordAudit } from "./audit-log";
export { Cart } from "./cart";
export { Counter, nextSequence } from "./counter";
export { Coupon } from "./coupon";
export { MediaAsset } from "./media-asset";
export { Order } from "./order";
export { OtpChallenge } from "./otp-challenge";
export { Product } from "./product";
export { Session } from "./session";
export { SiteSettings } from "./site-settings";
export { StockLedger } from "./stock-ledger";
export { StoreCredit } from "./store-credit";
export { User } from "./user";

export type { AuditLogDoc } from "./audit-log";
export type { CartDoc, CartItemSub } from "./cart";
export type { CounterDoc } from "./counter";
export type { CouponDoc } from "./coupon";
export type { MediaAssetDoc } from "./media-asset";
export type {
  OrderDoc,
  OrderPricing,
  OrderTimelineSub,
} from "./order";
export type { OtpChallengeDoc } from "./otp-challenge";
export type { ProductDoc } from "./product";
export type { SessionDoc } from "./session";
export type { SiteSettingsDoc } from "./site-settings";
export type { StockLedgerDoc } from "./stock-ledger";
export type { StoreCreditDoc } from "./store-credit";
export type { UserDoc } from "./user";

let registered = false;

export function registerModels(): void {
  if (registered) return;
  // Touch each model so its `model()` call runs.
  void AuditLog;
  void Cart;
  void Counter;
  void Coupon;
  void MediaAsset;
  void Order;
  void OtpChallenge;
  void Product;
  void Session;
  void SiteSettings;
  void StockLedger;
  void StoreCredit;
  void User;
  registered = true;
}

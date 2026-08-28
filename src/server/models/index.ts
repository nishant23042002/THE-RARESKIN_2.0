/**
 * Model registry.
 *
 * Importing this module registers every Mongoose model exactly once (the
 * `models.X ?? model(...)` guard in each file makes re-import safe under Next's
 * hot reload). `dbConnect()` calls `registerModels()` before connecting so that
 * `ref` population and discriminators resolve.
 */
import { AuditLog } from "./audit-log";
import { Counter } from "./counter";
import { MediaAsset } from "./media-asset";
import { Product } from "./product";
import { SiteSettings } from "./site-settings";
import { User } from "./user";

export { AuditLog, recordAudit } from "./audit-log";
export { Counter, nextSequence } from "./counter";
export { MediaAsset } from "./media-asset";
export { Product } from "./product";
export { SiteSettings } from "./site-settings";
export { User } from "./user";

export type { AuditLogDoc } from "./audit-log";
export type { CounterDoc } from "./counter";
export type { MediaAssetDoc } from "./media-asset";
export type { ProductDoc } from "./product";
export type { SiteSettingsDoc } from "./site-settings";
export type { UserDoc } from "./user";

let registered = false;

export function registerModels(): void {
  if (registered) return;
  // Touch each model so its `model()` call runs.
  void AuditLog;
  void Counter;
  void MediaAsset;
  void Product;
  void SiteSettings;
  void User;
  registered = true;
}

import "server-only";

/**
 * Admin data + actions. Everything here is called from a page / route that has
 * already passed `requireStaff` / `requireAdminRole`; the modules themselves do
 * not re-check auth (the two dangerous order actions do call `assertSudo`).
 */

export {
  listOrders,
  getOrderForAdmin,
  getAdminDashboard,
} from "./orders";
export type {
  AdminOrderRow,
  AdminOrderList,
  AdminOrderDetail,
  AdminDashboard,
  ListOrdersParams,
} from "./orders";

export {
  advanceOrderStatus,
  addInternalNote,
  refundOrder,
  cancelOrderByAdmin,
} from "./order-actions";
export type { ActionResult } from "./order-actions";

export {
  listProducts,
  getProductForEdit,
  getCatalogueOverview,
  fragranceSlugOptions,
} from "./catalog";
export type {
  AdminProductRow,
  ProductEditDTO,
  MediaRefDTO,
} from "./catalog";

export {
  createProduct,
  updateProduct,
  setProductStatus,
  adjustProductStock,
  reorderProducts,
  duplicateProduct,
  deleteProduct,
  bumpCatalogCache,
} from "./catalog-actions";
export type { CatalogActionResult } from "./catalog-actions";

export { listCoupons, getCouponForEdit } from "./coupons";
export type {
  AdminCouponRow,
  CouponEditDTO,
  CouponEffectiveStatus,
} from "./coupons";

export {
  createCoupon,
  updateCoupon,
  setCouponStatus,
} from "./coupon-actions";
export type { CouponActionResult } from "./coupon-actions";

export {
  getSettingsForEdit,
  updateSiteSettings,
  settingsPatchFlipsLaunchFlag,
} from "./settings";

export { listUsers, getUserForAdmin } from "./users";
export type {
  AdminUserRow,
  AdminUserList,
  AdminUserDetail,
  AdminAuditRow,
  ListUsersParams,
} from "./users";

export { updateUserAccount, signOutUserEverywhere } from "./user-actions";
export type { UserActionResult } from "./user-actions";

export { listStaff } from "./staff";
export type { AdminStaffRow } from "./staff";

export { createOrPromoteStaff } from "./staff-actions";
export type { StaffActionResult } from "./staff-actions";

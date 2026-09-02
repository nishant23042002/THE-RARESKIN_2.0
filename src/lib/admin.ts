/**
 * Isomorphic admin helpers — labels and small maps shared by admin server pages
 * and client components. No secrets, no DB, no server-only imports.
 */
import type { OrderStatus } from "@/lib/validation/commerce";

/** The admin ("Studio") colour theme. Persisted in the `ADMIN_THEME_COOKIE`. */
export type AdminTheme = "light" | "dark";
export const ADMIN_THEME_COOKIE = "rrs.admin-theme";

export function parseAdminTheme(value: string | undefined | null): AdminTheme {
  return value === "dark" ? "dark" : "light";
}

export const ROLE_LABEL: Record<string, string> = {
  customer: "Customer",
  support: "Support",
  catalog_manager: "Catalogue",
  operations: "Operations",
  admin: "Admin",
  superadmin: "Superadmin",
};

/** Admin-facing order status label (blunter than the customer-facing copy in
 *  `ORDER_STATUS_LABEL`). */
export const ADMIN_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

/** Tailwind classes for a status pill, keyed by status. */
export const ADMIN_STATUS_TONE: Record<OrderStatus, string> = {
  pending: "border-line-2 text-ink-3",
  confirmed: "border-gilt/50 text-warn",
  processing: "border-gilt/50 text-warn",
  shipped: "border-ink/60 text-ink",
  delivered: "border-ok/50 text-ok",
  cancelled: "border-error/40 text-error",
  returned: "border-error/40 text-error",
  refunded: "border-line-2 text-ink-3",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Unpaid",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Part-refunded",
};

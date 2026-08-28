import type { CartLine } from "@/lib/cart";

/**
 * Provider-agnostic checkout boundary. v1 ships the placeholder (no
 * transactional backend yet). Swapping in Shopify Storefront / Razorpay later
 * is one new implementation of `CommerceProvider` plus env — nothing in the UI
 * changes.
 */
export type CheckoutResult =
  | { kind: "redirect"; url: string }
  | { kind: "placeholder" };

export interface CommerceProvider {
  startCheckout(lines: CartLine[]): Promise<CheckoutResult>;
}

const placeholderProvider: CommerceProvider = {
  async startCheckout() {
    return { kind: "placeholder" };
  },
};

export const commerce: CommerceProvider = placeholderProvider;

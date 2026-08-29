import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * A server cart. The `_id` is an opaque token also held in the `__Host-rrs.cart`
 * cookie so a guest's bag survives a refresh and a device; on sign-in the guest
 * cart is merged into the account cart (`userId` set) and the guest row is
 * dropped.
 *
 * Prices are **never** stored here — a cart is a list of intents (SKU + qty),
 * always priced live at checkout. `expiresAt` gives a 45-day TTL so abandoned
 * guest carts self-clean.
 */
export interface CartItemSub {
  productId: Types.ObjectId;
  sku: string;
  qty: number;
  addedAt: Date;
}

export interface CartDoc {
  _id: string;
  userId: Types.ObjectId | null;
  items: CartItemSub[];
  /** coupon the shopper applied in the UI — re-validated at place-order */
  appliedCoupon: string | null;
  appliedCredit: boolean;
  updatedAt: Date;
  createdAt: Date;
  expiresAt: Date;
}

const cartItemSchema = new Schema<CartItemSub>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const cartSchema = new Schema<CartDoc>(
  {
    _id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    items: { type: [cartItemSchema], default: [] },
    appliedCoupon: { type: String, default: null, uppercase: true, trim: true },
    appliedCredit: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, _id: false, versionKey: false, minimize: false },
);

// One live cart per account. Partial so the many guest carts (userId: null)
// don't collide on null.
cartSchema.index(
  { userId: 1 },
  {
    name: "user_unique",
    unique: true,
    partialFilterExpression: { userId: { $type: "objectId" } },
  },
);
cartSchema.index({ expiresAt: 1 }, { name: "ttl", expireAfterSeconds: 0 });

export const Cart: Model<CartDoc> =
  (models.Cart as Model<CartDoc>) ?? model<CartDoc>("Cart", cartSchema);

import "server-only";

import mongoose from "mongoose";

import { dbConnect } from "@/server/db";
import {
  Cart,
  CheckoutIntent,
  Coupon,
  Order,
  Product,
  User,
  nextSequence,
  recordAudit,
  type OrderDoc,
  type ProductDoc,
} from "@/server/models";
import { getSiteSettings } from "@/server/data/settings";
import { hydrateItems, type HydratedCartLine } from "@/server/data/cart";
import { toPaise } from "@/lib/money";
import { resolvePincode, stateCodeFromName } from "@/lib/pincode";
import { isRazorpayConfigured, getRazorpayEnv } from "@/server/env";
import { createRazorpayOrder } from "@/server/payments/razorpay";
import type { CheckoutPaymentDirective } from "@/lib/checkout";
import type {
  CheckoutQuoteInput,
  PlaceOrderInput,
} from "@/lib/validation/commerce";
import { address as addressSchema } from "@/lib/validation/user";

import { computePricing, type PricingResult } from "./pricing";
import {
  checkServiceability,
  availableMethods,
  type ServiceabilityResult,
} from "./serviceability";
import { notifyOrderPlacedCod } from "@/server/email";
import {
  checkLowStockForOrder,
  notifyOrderPlaced,
} from "@/server/notifications";

import { validateCoupon, couponRejectionMessage } from "./coupons";
import { commitStockForOrder, type StockLine } from "./inventory";
import { getStoreCreditBalance, spendStoreCredit } from "./store-credit";

// ── quote ───────────────────────────────────────────────────────────────

export interface QuoteWarning {
  sku: string;
  kind: "removed" | "qty-reduced";
  message: string;
}

export interface CheckoutQuote {
  ok: true;
  lines: HydratedCartLine[];
  warnings: QuoteWarning[];
  pricing: PricingResult;
  serviceability: ServiceabilityResult | null;
  methods: ReturnType<typeof availableMethods>;
  storeCreditBalancePaise: number;
  coupon:
    | { applied: true; code: string; type: string }
    | { applied: false; code: string; reason: string }
    | null;
  shipStateCode: string | null;
}

export interface QuoteError {
  ok: false;
  code: "empty-cart";
  message: string;
}

export async function quoteOrder(
  input: CheckoutQuoteInput,
  userId: string | null,
): Promise<CheckoutQuote | QuoteError> {
  await dbConnect();
  const settings = await getSiteSettings();

  const hydrated = await hydrateItems(input.items);
  if (hydrated.lines.length === 0) {
    return { ok: false, code: "empty-cart", message: "Your bag is empty." };
  }

  const warnings: QuoteWarning[] = [];
  for (const sku of hydrated.removed) {
    warnings.push({
      sku,
      kind: "removed",
      message: "This item is no longer available and was removed.",
    });
  }
  for (const line of hydrated.lines) {
    const requested = input.items.find(
      (i) => i.sku.toUpperCase() === line.sku,
    )?.qty;
    if (requested != null && line.qty < requested) {
      warnings.push({
        sku: line.sku,
        kind: "qty-reduced",
        message: `Only ${line.qty} left — quantity adjusted.`,
      });
    }
  }

  // Delivery region.
  let serviceability: ServiceabilityResult | null = null;
  let shipStateCode: string | null = null;
  const itemsSubtotalPaise = hydrated.lines.reduce(
    (s, l) => s + toPaise(l.unitPrice) * l.qty,
    0,
  );
  if (input.pincode) {
    serviceability = checkServiceability(
      input.pincode,
      settings,
      itemsSubtotalPaise,
    );
    shipStateCode = serviceability.region?.stateCode ?? null;
  }

  // Coupon.
  let couponResult: CheckoutQuote["coupon"] = null;
  let couponEffect: Parameters<typeof computePricing>[0]["coupon"] = null;
  if (input.couponCode) {
    const v = await validateCoupon(input.couponCode, {
      userId: userId ?? "000000000000000000000000",
      itemsSubtotalPaise,
    });
    if (v.ok) {
      couponEffect = v.effect;
      couponResult = { applied: true, code: v.effect.code, type: v.effect.type };
    } else {
      couponResult = {
        applied: false,
        code: input.couponCode,
        reason: couponRejectionMessage(v.reason),
      };
    }
  }

  // Store credit.
  const storeCreditBalancePaise = userId
    ? await getStoreCreditBalance(userId)
    : 0;

  const pricing = computePricing({
    lines: hydrated.lines.map((l) => ({
      unitPricePaise: toPaise(l.unitPrice),
      mrpPaise: toPaise(l.mrp),
      qty: l.qty,
    })),
    settings,
    method: input.method,
    shipStateCode,
    coupon: couponEffect,
    requestedCreditPaise: input.useStoreCredit ? storeCreditBalancePaise : 0,
  });

  const methods = serviceability
    ? availableMethods(serviceability, settings)
    : (["razorpay"] as const).slice();

  return {
    ok: true,
    lines: hydrated.lines,
    warnings,
    pricing,
    serviceability,
    methods,
    storeCreditBalancePaise,
    coupon: couponResult,
    shipStateCode,
  };
}

// ── place ───────────────────────────────────────────────────────────────

export interface PlaceOrderContext {
  userId: string;
  ip: string | null;
  userAgent: string | null;
}

export type PlaceOrderFailure = {
  ok: false;
  code:
    | "empty-cart"
    | "cart-changed"
    | "address-required"
    | "not-serviceable"
    | "method-unavailable"
    | "coupon-invalid"
    | "credit-changed"
    | "sold-out"
    | "payment-init-failed"
    | "transaction-unsupported";
  message: string;
  details?: unknown;
};

export type PlaceOrderResult =
  | {
      ok: true;
      /** COD — a real order exists immediately */
      kind: "cod";
      orderNumber: string;
      orderId: string;
      pricing: PricingResult;
      payment: { kind: "cod" };
    }
  | {
      ok: true;
      /** online — no order yet; the order is created when payment is verified */
      kind: "online";
      intentId: string;
      pricing: PricingResult;
      payment: CheckoutPaymentDirective;
    }
  | PlaceOrderFailure;

function resolveStateCode(pincode: string, stateName: string): string | null {
  return (
    resolvePincode(pincode)?.stateCode ?? stateCodeFromName(stateName) ?? null
  );
}

// ── shared validation (runs before any order / payment is created) ──────

/** address snapshot, shaped like `Order.shippingAddress` */
interface AddressSnapshot {
  label?: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
}

interface ValidatedCheckout {
  ok: true;
  hydrated: Awaited<ReturnType<typeof hydrateItems>>;
  pricing: PricingResult;
  couponEffect: NonNullable<Parameters<typeof computePricing>[0]["coupon"]> | null;
  shipSnapshot: AddressSnapshot;
  billingSnapshot: AddressSnapshot;
  /** order line items, shaped like `Order.items` */
  items: {
    productId: string;
    slug: string;
    name: string;
    sku: string;
    image: string | null;
    qty: number;
    unitPricePaise: number;
    mrpPaise: number;
    lineTotalPaise: number;
    hsnCode: string;
  }[];
  stockLines: StockLine[];
  contact: { name: string; phone: string; email: string };
}

async function validateCheckout(
  input: PlaceOrderInput,
  ctx: PlaceOrderContext,
): Promise<ValidatedCheckout | PlaceOrderFailure> {
  const settings = await getSiteSettings();
  const user = await User.findById(ctx.userId);
  if (!user) {
    return { ok: false, code: "address-required", message: "Account not found." };
  }

  // ── lines: must match exactly what the shopper reviewed ───────────────
  const hydrated = await hydrateItems(input.items);
  if (hydrated.lines.length === 0) {
    return { ok: false, code: "empty-cart", message: "Your bag is empty." };
  }
  const changed: QuoteWarning[] = [];
  for (const sku of hydrated.removed) {
    changed.push({ sku, kind: "removed", message: "No longer available." });
  }
  for (const line of hydrated.lines) {
    const requested = input.items.find(
      (i) => i.sku.toUpperCase() === line.sku,
    )?.qty;
    if (requested != null && line.qty !== requested) {
      changed.push({
        sku: line.sku,
        kind: "qty-reduced",
        message: `Only ${line.qty} available.`,
      });
    }
  }
  if (changed.length > 0) {
    return {
      ok: false,
      code: "cart-changed",
      message: "Your bag changed since you reviewed it. Please check it again.",
      details: changed,
    };
  }

  // ── address ──────────────────────────────────────────────────────────
  let shipAddr: (typeof user.addresses)[number] | null = null;
  if (input.savedAddressId) {
    shipAddr =
      user.addresses.find((a) => String(a._id) === input.savedAddressId) ?? null;
    if (!shipAddr) {
      return {
        ok: false,
        code: "address-required",
        message: "That saved address no longer exists.",
      };
    }
  } else if (input.newAddress) {
    const parsed = addressSchema.parse(input.newAddress);
    const isFirst = user.addresses.length === 0;
    user.addresses.push({
      ...parsed,
      isDefault: isFirst || parsed.isDefault,
    } as (typeof user.addresses)[number]);
    if ((isFirst || parsed.isDefault) && user.addresses.length > 1) {
      user.addresses.forEach((a, i) => {
        a.isDefault = i === user.addresses.length - 1;
      });
    }
    await user.save();
    shipAddr = user.addresses[user.addresses.length - 1]!;
  } else {
    return {
      ok: false,
      code: "address-required",
      message: "A delivery address is required.",
    };
  }

  const shipStateCode = resolveStateCode(shipAddr.pincode, shipAddr.state);

  // ── serviceability ───────────────────────────────────────────────────
  const itemsSubtotalPaise = hydrated.lines.reduce(
    (s, l) => s + toPaise(l.unitPrice) * l.qty,
    0,
  );
  const service = checkServiceability(
    shipAddr.pincode,
    settings,
    itemsSubtotalPaise,
  );
  if (!service.serviceable) {
    return {
      ok: false,
      code: "not-serviceable",
      message:
        service.reason === "blocked" || service.reason === "out-of-area"
          ? "We don’t deliver to that PIN code yet."
          : "That PIN code doesn’t look right.",
    };
  }

  const methods = availableMethods(service, settings);
  if (!methods.includes(input.method)) {
    return {
      ok: false,
      code: "method-unavailable",
      message:
        input.method === "cod"
          ? "Cash on delivery isn’t available for this order."
          : "That payment method isn’t available.",
    };
  }

  // ── coupon ───────────────────────────────────────────────────────────
  let couponEffect: ValidatedCheckout["couponEffect"] = null;
  if (input.couponCode) {
    const v = await validateCoupon(input.couponCode, {
      userId: ctx.userId,
      itemsSubtotalPaise,
    });
    if (!v.ok) {
      return {
        ok: false,
        code: "coupon-invalid",
        message: couponRejectionMessage(v.reason),
      };
    }
    couponEffect = v.effect;
  }

  // ── store credit ─────────────────────────────────────────────────────
  const creditBalance = input.useStoreCredit
    ? await getStoreCreditBalance(ctx.userId)
    : 0;

  const pricing = computePricing({
    lines: hydrated.lines.map((l) => ({
      unitPricePaise: toPaise(l.unitPrice),
      mrpPaise: toPaise(l.mrp),
      qty: l.qty,
    })),
    settings,
    method: input.method,
    shipStateCode,
    coupon: couponEffect,
    requestedCreditPaise: creditBalance,
  });

  // ── snapshots ────────────────────────────────────────────────────────
  const productBySku = new Map<string, ProductDoc>();
  const productDocs = await Product.find({
    "inventory.sku": { $in: hydrated.lines.map((l) => l.sku) },
  }).lean<ProductDoc[]>();
  for (const p of productDocs) productBySku.set(p.inventory.sku, p);

  const items = hydrated.lines.map((l) => ({
    productId: l.productId,
    slug: l.slug,
    name: l.name,
    sku: l.sku,
    image: l.image,
    qty: l.qty,
    unitPricePaise: toPaise(l.unitPrice),
    mrpPaise: toPaise(l.mrp),
    lineTotalPaise: toPaise(l.unitPrice) * l.qty,
    hsnCode: productBySku.get(l.sku)?.hsnCode ?? settings.gst.hsnCode,
  }));

  const stockLines: StockLine[] = hydrated.lines.map((l) => {
    const p = productBySku.get(l.sku);
    return {
      productId: l.productId,
      sku: l.sku,
      qty: l.qty,
      trackInventory: p?.inventory.trackInventory ?? true,
      allowBackorder: p?.inventory.allowBackorder ?? false,
    };
  });

  const shipSnapshot = {
    label: shipAddr.label,
    name: shipAddr.name,
    phone: shipAddr.phone,
    line1: shipAddr.line1,
    line2: shipAddr.line2,
    landmark: shipAddr.landmark,
    city: shipAddr.city,
    state: shipAddr.state,
    stateCode: shipStateCode ?? "",
    pincode: shipAddr.pincode,
  };
  const billingSnapshot =
    input.billingSameAsShipping || !input.billingAddress
      ? shipSnapshot
      : (() => {
          const b = addressSchema.parse(input.billingAddress);
          return {
            ...b,
            stateCode: resolveStateCode(b.pincode, b.state) ?? "",
          };
        })();

  return {
    ok: true,
    hydrated,
    pricing,
    couponEffect,
    shipSnapshot,
    billingSnapshot,
    items,
    stockLines,
    contact: input.contact,
  };
}

// ── entry point ────────────────────────────────────────────────────────

/**
 * Validate the bag, then branch:
 *  - **COD** → create the order now (`placeCodOrder`), stock committed at creation.
 *  - **online** → create a `CheckoutIntent` + a Razorpay order and stop
 *    (`startOnlineCheckout`). No order, no stock movement until the payment is
 *    verified (see `finalizeOnlineCheckout`).
 */
export async function placeOrder(
  input: PlaceOrderInput,
  ctx: PlaceOrderContext,
): Promise<PlaceOrderResult> {
  await dbConnect();

  const v = await validateCheckout(input, ctx);
  if (v.ok === false) return v;

  return input.method === "cod"
    ? placeCodOrder(v, input, ctx)
    : startOnlineCheckout(v, input, ctx);
}

// ── COD: a real order, created now ─────────────────────────────────────

async function placeCodOrder(
  v: ValidatedCheckout,
  input: PlaceOrderInput,
  ctx: PlaceOrderContext,
): Promise<PlaceOrderResult> {
  const year = new Date().getFullYear();
  const dbSession = await mongoose.startSession();
  let created: OrderDoc | null = null;

  try {
    await dbSession.withTransaction(async () => {
      // Re-check idempotency inside the txn (withTransaction may retry).
      const dup = await Order.findOne({
        userId: ctx.userId,
        idempotencyKey: input.idempotencyKey,
      }).session(dbSession);
      if (dup) {
        created = dup.toObject() as OrderDoc;
        return;
      }

      const seq = await nextSequence(`order-${year}`);
      const orderNumber = `RRS-${year}-${String(seq).padStart(6, "0")}`;
      const settings = await getSiteSettings();

      const [orderDoc] = await Order.create(
        [
          {
            orderNumber,
            userId: ctx.userId,
            contact: v.contact,
            items: v.items,
            pricing: v.pricing,
            coupon: v.couponEffect
              ? {
                  code: v.couponEffect.code,
                  type: v.couponEffect.type,
                  valuePaise:
                    v.couponEffect.type === "fixed" ? v.couponEffect.value : 0,
                }
              : null,
            shippingAddress: v.shipSnapshot,
            billingAddress: v.billingSnapshot,
            status: "pending",
            payment: {
              method: "cod",
              status: "pending",
              provider: "cod",
              providerOrderId: null,
              providerPaymentId: null,
              capturedAt: null,
              last4: null,
              upiVpa: null,
            },
            invoice: {
              number: null,
              hsn: settings.gst.hsnCode,
              url: null,
              generatedAt: null,
            },
            paymentDueBy: null,
            timeline: [
              {
                at: new Date(),
                status: "pending",
                actor: "customer",
                actorId: ctx.userId,
                note: "Order placed — cash on delivery.",
              },
            ],
            customerNote: input.customerNote,
            idempotencyKey: input.idempotencyKey,
            source: "web",
          },
        ],
        { session: dbSession },
      );

      const stock = await commitStockForOrder(
        v.stockLines,
        orderDoc._id,
        dbSession,
      );
      if (!stock.ok) {
        const err = new Error(`SOLD_OUT:${stock.failedSku}`);
        err.name = "SoldOutError";
        throw err;
      }

      if (v.pricing.creditAppliedPaise > 0) {
        const spent = await spendStoreCredit(
          ctx.userId,
          v.pricing.creditAppliedPaise,
          orderDoc._id,
          dbSession,
        );
        if (spent !== v.pricing.creditAppliedPaise) {
          const err = new Error("CREDIT_CHANGED");
          err.name = "CreditChangedError";
          throw err;
        }
      }

      if (v.couponEffect) {
        const res = await Coupon.updateOne(
          {
            code: v.couponEffect.code,
            $or: [
              { maxUses: 0 },
              { $expr: { $lt: ["$usedCount", "$maxUses"] } },
            ],
          },
          { $inc: { usedCount: 1 } },
          { session: dbSession },
        );
        if (res.modifiedCount === 0) {
          const err = new Error("COUPON_EXHAUSTED");
          err.name = "CouponExhaustedError";
          throw err;
        }
      }

      await Cart.updateOne(
        { userId: ctx.userId },
        { $set: { items: [], appliedCoupon: null, appliedCredit: false } },
        { session: dbSession },
      );

      created = orderDoc.toObject() as OrderDoc;
    });
  } catch (err) {
    const e = err as Error;
    if (e.name === "SoldOutError") {
      return {
        ok: false,
        code: "sold-out",
        message: "One of your items sold out. Your bag was not charged.",
        details: { sku: e.message.split(":")[1] },
      };
    }
    if (e.name === "CreditChangedError") {
      return {
        ok: false,
        code: "credit-changed",
        message: "Your store credit balance changed. Please review and retry.",
      };
    }
    if (e.name === "CouponExhaustedError") {
      return {
        ok: false,
        code: "coupon-invalid",
        message: "That code was just fully redeemed.",
      };
    }
    if (
      /Transaction numbers are only allowed on a replica set|replica set member or mongos/i.test(
        e.message,
      )
    ) {
      return {
        ok: false,
        code: "transaction-unsupported",
        message:
          "Checkout needs a MongoDB replica set (Atlas provides one). Local standalone mongod won’t work.",
      };
    }
    throw err;
  } finally {
    await dbSession.endSession();
  }

  const order = created as OrderDoc | null;
  if (!order) {
    return { ok: false, code: "sold-out", message: "Order could not be placed." };
  }

  await recordAudit({
    actorId: order.userId,
    actorRole: "customer",
    action: "order.placed",
    targetType: "Order",
    targetId: String(order._id),
    after: {
      orderNumber: order.orderNumber,
      grandTotalPaise: order.pricing.grandTotalPaise,
      method: "cod",
      items: order.items.map((i) => ({ sku: i.sku, qty: i.qty })),
    },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  await notifyOrderPlacedCod(order.orderNumber);
  await notifyOrderPlaced({
    orderNumber: order.orderNumber,
    customerName: order.contact.name,
    totalPaise: order.pricing.grandTotalPaise,
    method: "cod",
    paid: false,
  });
  await checkLowStockForOrder(
    order.items.map((i) => ({
      productId: i.productId,
      slug: i.slug,
      sku: i.sku,
      qty: i.qty,
    })),
  );

  return {
    ok: true,
    kind: "cod",
    orderNumber: order.orderNumber,
    orderId: String(order._id),
    pricing: order.pricing as unknown as PricingResult,
    payment: { kind: "cod" },
  };
}

// ── online: a Razorpay order + a pre-payment snapshot, nothing more ────

async function startOnlineCheckout(
  v: ValidatedCheckout,
  input: PlaceOrderInput,
  ctx: PlaceOrderContext,
): Promise<PlaceOrderResult> {
  const intentId = new mongoose.Types.ObjectId();
  const amountPaise = v.pricing.grandTotalPaise;

  let razorpayOrderId: string;
  let dev = false;
  if (isRazorpayConfigured()) {
    try {
      const rzp = await createRazorpayOrder({
        amountPaise,
        receipt: intentId.toHexString(),
        notes: { userId: ctx.userId, intentId: intentId.toHexString() },
      });
      razorpayOrderId = rzp.id;
    } catch (err) {
      console.error("[checkout] createRazorpayOrder failed", err);
      return {
        ok: false,
        code: "payment-init-failed",
        message:
          "We couldn’t reach the payment provider. Please try again in a moment.",
      };
    }
  } else {
    dev = true;
    razorpayOrderId = `dev_order_${Date.now().toString(36)}`;
  }

  const couponSnapshot = v.couponEffect
    ? {
        code: v.couponEffect.code,
        type: v.couponEffect.type,
        valuePaise: v.couponEffect.type === "fixed" ? v.couponEffect.value : 0,
      }
    : null;

  await CheckoutIntent.create({
    _id: intentId,
    userId: ctx.userId,
    status: "pending",
    razorpayOrderId,
    amountPaise,
    items: v.items,
    pricing: v.pricing,
    coupon: couponSnapshot,
    creditAppliedPaise: v.pricing.creditAppliedPaise,
    contact: v.contact,
    shippingAddress: v.shipSnapshot as unknown as Record<string, unknown>,
    billingAddress: v.billingSnapshot as unknown as Record<string, unknown>,
    customerNote: input.customerNote,
    orderNumber: null,
  });

  if (dev) {
    return {
      ok: true,
      kind: "online",
      intentId: intentId.toHexString(),
      pricing: v.pricing,
      payment: { kind: "razorpay-dev", amountPaise },
    };
  }

  const { keyId } = getRazorpayEnv();
  return {
    ok: true,
    kind: "online",
    intentId: intentId.toHexString(),
    pricing: v.pricing,
    payment: {
      kind: "razorpay",
      razorpayOrderId,
      keyId,
      amountPaise,
      prefill: {
        name: v.contact.name,
        email: v.contact.email,
        contact: v.contact.phone,
      },
    },
  };
}

/** Reference: the current customer's store-credit balance for the account UI. */
export async function creditBalanceFor(userId: string): Promise<number> {
  return getStoreCreditBalance(userId);
}

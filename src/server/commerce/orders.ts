import "server-only";

import mongoose from "mongoose";

import { dbConnect } from "@/server/db";
import {
  Cart,
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

export type PlaceOrderResult =
  | {
      ok: true;
      orderNumber: string;
      orderId: string;
      pricing: PricingResult;
      reused: boolean;
    }
  | {
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
        | "transaction-unsupported";
      message: string;
      details?: unknown;
    };

function resolveStateCode(pincode: string, stateName: string): string | null {
  return (
    resolvePincode(pincode)?.stateCode ?? stateCodeFromName(stateName) ?? null
  );
}

export async function placeOrder(
  input: PlaceOrderInput,
  ctx: PlaceOrderContext,
): Promise<PlaceOrderResult> {
  await dbConnect();

  // Fast idempotency path — a retried submit returns the first order.
  const prior = await Order.findOne({
    userId: ctx.userId,
    idempotencyKey: input.idempotencyKey,
  }).lean<OrderDoc | null>();
  if (prior) {
    return {
      ok: true,
      reused: true,
      orderNumber: prior.orderNumber,
      orderId: String(prior._id),
      pricing: prior.pricing as unknown as PricingResult,
    };
  }

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
  let couponEffect: Parameters<typeof computePricing>[0]["coupon"] = null;
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

  // ── the transaction ──────────────────────────────────────────────────
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

      const productBySku = new Map<string, ProductDoc>();
      const productDocs = await Product.find({
        "inventory.sku": { $in: hydrated.lines.map((l) => l.sku) },
      })
        .session(dbSession)
        .lean<ProductDoc[]>();
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

      const snapshot = {
        label: shipAddr!.label,
        name: shipAddr!.name,
        phone: shipAddr!.phone,
        line1: shipAddr!.line1,
        line2: shipAddr!.line2,
        landmark: shipAddr!.landmark,
        city: shipAddr!.city,
        state: shipAddr!.state,
        stateCode: shipStateCode ?? "",
        pincode: shipAddr!.pincode,
      };
      const billing =
        input.billingSameAsShipping || !input.billingAddress
          ? snapshot
          : (() => {
              const b = addressSchema.parse(input.billingAddress);
              return {
                ...b,
                stateCode:
                  resolveStateCode(b.pincode, b.state) ?? "",
              };
            })();

      const [orderDoc] = await Order.create(
        [
          {
            orderNumber,
            userId: ctx.userId,
            contact: {
              name: input.contact.name,
              phone: input.contact.phone,
              email: input.contact.email,
            },
            items,
            pricing: {
              itemsSubtotalPaise: pricing.itemsSubtotalPaise,
              discountPaise: pricing.discountPaise,
              creditAppliedPaise: pricing.creditAppliedPaise,
              shippingPaise: pricing.shippingPaise,
              codFeePaise: pricing.codFeePaise,
              taxableValuePaise: pricing.taxableValuePaise,
              gst: pricing.gst,
              grandTotalPaise: pricing.grandTotalPaise,
              currency: "INR",
            },
            coupon: couponEffect
              ? {
                  code: couponEffect.code,
                  type: couponEffect.type,
                  valuePaise:
                    couponEffect.type === "fixed" ? couponEffect.value : 0,
                }
              : null,
            shippingAddress: snapshot,
            billingAddress: billing,
            status: "pending",
            payment: {
              method: input.method,
              status: "pending",
              provider: input.method === "razorpay" ? "razorpay" : "cod",
              providerOrderId: null,
              providerPaymentId: null,
              capturedAt: null,
              last4: null,
              upiVpa: null,
            },
            invoice: { number: null, hsn: settings.gst.hsnCode, url: null, generatedAt: null },
            paymentDueBy:
              input.method === "razorpay"
                ? new Date(Date.now() + 30 * 60_000)
                : null,
            timeline: [
              {
                at: new Date(),
                status: "pending",
                actor: "customer",
                actorId: ctx.userId,
                note:
                  input.method === "cod"
                    ? "Order placed — cash on delivery."
                    : "Order placed — awaiting payment.",
              },
            ],
            customerNote: input.customerNote,
            idempotencyKey: input.idempotencyKey,
            source: "web",
          },
        ],
        { session: dbSession },
      );

      // Atomic stock decrement + ledger.
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
      const stock = await commitStockForOrder(
        stockLines,
        orderDoc._id,
        dbSession,
      );
      if (!stock.ok) {
        const err = new Error(`SOLD_OUT:${stock.failedSku}`);
        err.name = "SoldOutError";
        throw err;
      }

      // Spend store credit.
      if (pricing.creditAppliedPaise > 0) {
        const spent = await spendStoreCredit(
          ctx.userId,
          pricing.creditAppliedPaise,
          orderDoc._id,
          dbSession,
        );
        if (spent !== pricing.creditAppliedPaise) {
          const err = new Error("CREDIT_CHANGED");
          err.name = "CreditChangedError";
          throw err;
        }
      }

      // Bump coupon usage, guarded against a concurrent last redemption.
      if (couponEffect) {
        const res = await Coupon.updateOne(
          {
            code: couponEffect.code,
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

      // The Discovery-Set credit is issued on *verified payment*
      // (`confirmPaidOrder`), never at order creation.

      // Empty the shopper's cart.
      await Cart.updateOne(
        { userId: ctx.userId },
        {
          $set: {
            items: [],
            appliedCoupon: null,
            appliedCredit: false,
          },
        },
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
      method: order.payment.method,
      items: order.items.map((i) => ({ sku: i.sku, qty: i.qty })),
    },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  // Phase F — a COD order has no payment step, so its confirmation email is
  // sent here. Online orders are emailed on verified payment (`confirmPaidOrder`).
  if (order.payment.method === "cod") {
    await notifyOrderPlacedCod(order.orderNumber);
  }

  return {
    ok: true,
    reused: false,
    orderNumber: order.orderNumber,
    orderId: String(order._id),
    pricing: order.pricing as unknown as PricingResult,
  };
}

/** Reference: the current customer's store-credit balance for the account UI. */
export async function creditBalanceFor(userId: string): Promise<number> {
  return getStoreCreditBalance(userId);
}

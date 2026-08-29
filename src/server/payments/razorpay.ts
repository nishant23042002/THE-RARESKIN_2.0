import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getRazorpayEnv, getRazorpayWebhookSecret } from "@/server/env";

/**
 * Razorpay REST client — order creation, payment lookup, refunds, and the two
 * signature checks. Raw `fetch` against `api.razorpay.com` with HTTP Basic auth
 * (`key_id:key_secret`); no SDK. Card data never touches our servers (hosted
 * checkout → PCI SAQ-A).
 */

const BASE = "https://api.razorpay.com/v1";

function authHeader(): string {
  const { keyId, keySecret } = getRazorpayEnv();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function rzp<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      authorization: authHeader(),
      "content-type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = (json.error as { description?: string } | undefined)?.description;
    throw new Error(
      `razorpay ${path} → ${res.status}: ${err ?? JSON.stringify(json).slice(0, 200)}`,
    );
  }
  return json as T;
}

// ── orders ─────────────────────────────────────────────────────────────

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  return rzp<RazorpayOrder>("/orders", {
    method: "POST",
    body: {
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
      payment_capture: 1, // auto-capture authorised payments
    },
  });
}

// ── payments ───────────────────────────────────────────────────────────

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  status: string; // created | authorized | captured | refunded | failed
  method: string | null; // upi | card | netbanking | wallet | ...
  captured: boolean;
  vpa: string | null;
  card: { last4?: string; network?: string } | null;
  error_description: string | null;
}

export function fetchRazorpayPayment(id: string): Promise<RazorpayPayment> {
  return rzp<RazorpayPayment>(`/payments/${encodeURIComponent(id)}`);
}

/** All payment attempts made against one Razorpay order — used by reconciliation. */
export function fetchRazorpayOrderPayments(
  razorpayOrderId: string,
): Promise<{ items: RazorpayPayment[] }> {
  return rzp<{ items: RazorpayPayment[] }>(
    `/orders/${encodeURIComponent(razorpayOrderId)}/payments`,
  );
}

// ── refunds ────────────────────────────────────────────────────────────

export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: string; // pending | processed | failed
}

export function createRazorpayRefund(
  paymentId: string,
  amountPaise: number,
  notes: Record<string, string>,
): Promise<RazorpayRefund> {
  return rzp<RazorpayRefund>(
    `/payments/${encodeURIComponent(paymentId)}/refund`,
    { method: "POST", body: { amount: amountPaise, notes, speed: "normal" } },
  );
}

// ── signatures ─────────────────────────────────────────────────────────

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checkout callback: HMAC-SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCallbackSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  const { keySecret } = getRazorpayEnv();
  const expected = createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook: HMAC-SHA256(rawBody, webhook_secret) === X-Razorpay-Signature.
 *  The webhook secret is configured independently of the API keys. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const webhookSecret = getRazorpayWebhookSecret();
  if (!webhookSecret || !signature) return false;
  const expected = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

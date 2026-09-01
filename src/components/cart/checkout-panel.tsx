"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Flacon } from "@/components/ui/flacon";
import { Mark } from "@/components/ui/mark";
import { Icon, type IconName } from "@/components/ui/icon";
import { PaymentBadges } from "@/components/ui/payment-marks";
import { useAuth } from "@/components/providers/auth-provider";
import { useCart } from "@/components/providers/cart-provider";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/money";
import { GST_STATES, resolvePincode } from "@/lib/pincode";
import { maskPhone, normalizeIndianMobile } from "@/lib/auth";
import { isFragranceSlug } from "@/lib/catalog";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import type {
  CheckoutQuoteResponse,
  PaymentConfirmResponse,
  PlaceOrderFailure,
  PlaceOrderSuccess,
  QuoteLine,
  QuoteWarning,
} from "@/lib/checkout";
import type { PaymentMethod } from "@/lib/validation/commerce";

interface SavedAddress {
  id: string;
  label: string | null;
  name: string;
  phone: string;
  email: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const emptyAddress = {
  label: "",
  name: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
};

const labelCls =
  "block text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase";
const fieldCls =
  "mt-1.5 w-full border-0 border-b border-line-2 bg-transparent pb-2 text-[15px] text-ink transition-colors focus:border-ink focus:outline-none";

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
  error?: string | null;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(fieldCls, error && "border-error focus:border-error")}
      />
      {error && <p className="mt-1 text-[11.5px] text-error">{error}</p>}
    </div>
  );
}

function isNewAddrComplete(a: typeof emptyAddress): boolean {
  return (
    a.name.trim().length >= 2 &&
    /^\+?[0-9\s-]{10,14}$/.test(a.phone) &&
    a.line1.trim().length >= 4 &&
    a.city.trim().length >= 2 &&
    Boolean(a.state) &&
    /^[1-9]\d{5}$/.test(a.pincode)
  );
}

/**
 * Express checkout, living inside the bag drawer. **One screen, not a wizard:**
 * an always-visible order review, the default delivery address shown as a card
 * (tap "Change" to pick another or add one), the receipt email pre-filled, and
 * a single Pay button. A first-time shopper types their address once; every
 * return trip is review → pay. The server settles every number.
 */
export function CheckoutPanel() {
  const { status, user, openSignIn } = useAuth();
  const {
    lines: cartLines,
    hydrated,
    view,
    completeOrder,
    suspendModal,
    resumeModal,
  } = useCart();

  const items = useMemo(
    () => cartLines.map((l) => ({ sku: l.sku, qty: l.qty })),
    [cartLines],
  );

  // contact — the name always comes from the chosen delivery address; only the
  // receipt email is ever entered here, and only when we don't already know it.
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailEditing, setEmailEditing] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [addressMode, setAddressMode] = useState<"saved" | "new">("new");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [addr, setAddr] = useState({ ...emptyAddress });
  const [addrErr, setAddrErr] = useState<Record<string, string>>({});
  /** the address block is expanded into its picker / form */
  const [editingAddress, setEditingAddress] = useState(false);

  const [method, setMethod] = useState<PaymentMethod>("razorpay");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [useCredit, setUseCredit] = useState(false);
  const [note, setNote] = useState("");

  const [quote, setQuote] = useState<CheckoutQuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [cartChanged, setCartChanged] = useState<QuoteWarning[] | null>(null);

  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [payState, setPayState] = useState<
    { kind: "dev"; intentId: string } | { kind: "retry" } | null
  >(null);

  // Dedupes a COD double-submit. Online checkout is payment-first — each attempt
  // mints a fresh Razorpay order, so no client key is needed there.
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  // Prefill from the account once signed in — the default address becomes the
  // delivery card, its email (or the account email) becomes the receipt.
  useEffect(() => {
    if (status !== "authed" || !user) return;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const res = await fetch("/api/account/addresses", { cache: "no-store" });
        const data = (await res.json()) as {
          ok: boolean;
          addresses?: SavedAddress[];
        };
        const list = data.ok && data.addresses ? data.addresses : [];
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (cancelled) return;
        setEmail((e) => e || def?.email || user.email || "");
        if (list.length) {
          setSaved(list);
          setAddressMode("saved");
          setSavedId(def!.id);
          setEditingAddress(false);
        } else {
          setAddressMode("new");
          setEditingAddress(true);
        }
      } catch {
        setEmail((e) => e || user.email || "");
        setAddressMode("new");
        setEditingAddress(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, user]);

  const chosen =
    addressMode === "saved" ? saved.find((a) => a.id === savedId) : null;
  const activePincode = chosen ? chosen.pincode : addr.pincode;
  /** the contact name for the order — never typed twice, it's the delivery name */
  const contactName = (chosen?.name ?? addr.name).trim();

  /** Pick a saved address; adopt its email for the receipt unless one was typed,
   *  and collapse the picker. */
  function pickSavedAddress(a: SavedAddress) {
    setAddressMode("saved");
    setSavedId(a.id);
    if (!emailTouched) setEmail((e) => a.email || e);
    setEditingAddress(false);
  }

  const fetchQuote = useCallback(async () => {
    if (!hydrated || items.length === 0 || view !== "checkout") return;
    setQuoting(true);
    try {
      const res = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          method,
          pincode: /^[1-9]\d{5}$/.test(activePincode) ? activePincode : undefined,
          couponCode: appliedCoupon ?? undefined,
          useStoreCredit: useCredit,
        }),
      });
      const data = (await res.json()) as
        | CheckoutQuoteResponse
        | { ok: false; code?: string; message?: string };
      if (data.ok) {
        setQuote(data);
        setQuoteError(null);
      } else {
        setQuote(null);
        setQuoteError(
          data.code === "empty-cart"
            ? "Everything in your bag has sold out. Head back to the shop."
            : data.message ?? "We couldn’t price your bag. Try again in a moment.",
        );
      }
    } catch {
      /* keep the last good quote */
    } finally {
      setQuoting(false);
    }
  }, [hydrated, items, method, activePincode, appliedCoupon, useCredit, view]);

  useEffect(() => {
    const t = setTimeout(fetchQuote, 280);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  useEffect(() => {
    if (!quote) return;
    const t = setTimeout(() => {
      if (quote.coupon && quote.coupon.applied === false) {
        setAppliedCoupon((c) => (c ? null : c));
      }
      if (!quote.methods.includes("cod")) {
        setMethod((m) => (m === "cod" ? "razorpay" : m));
      }
    }, 0);
    return () => clearTimeout(t);
  }, [quote]);

  // ── gates / early returns ────────────────────────────────────────────
  if (!hydrated || status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-8">
        <Mark className="w-5 animate-pulse text-ink-3" />
      </div>
    );
  }

  if (cartLines.length === 0 && view === "checkout") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <Mark className="mb-5 w-6 text-ink-3" />
        <p className="serif-italic text-[1.35rem] leading-snug text-ink-2">
          Your bag emptied out.
        </p>
      </div>
    );
  }

  if (status === "guest") {
    return (
      <>
        <div className="flex flex-1 flex-col justify-center px-6 py-10 text-center">
          <span className="mx-auto mb-4 inline-flex size-11 items-center justify-center rounded-full border border-line-2">
            <Icon name="lock" className="size-4 text-ink-2" />
          </span>
          <h3 className="serif text-[1.55rem] leading-tight text-ink">
            One step — verify your number
          </h3>
          <p className="mx-auto mt-2.5 max-w-[32ch] text-[13px] leading-relaxed text-ink-2">
            A one-time code by SMS. First-time customers are registered
            automatically, and your bag stays exactly as it is.
          </p>
        </div>
        <PanelFooter>
          <Button size="lg" className="w-full" onClick={() => openSignIn()}>
            Continue
          </Button>
        </PanelFooter>
      </>
    );
  }

  // ── derived ─────────────────────────────────────────────────────────
  const service = quote?.serviceability ?? null;
  const pinBlocked =
    Boolean(service) && !service!.serviceable && service!.reason !== "malformed";
  const total = quote?.pricing.grandTotalPaise ?? null;

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const addressResolved =
    addressMode === "saved" ? Boolean(savedId) : isNewAddrComplete(addr);
  const canPay =
    Boolean(quote) && !quoting && !pinBlocked && addressResolved && emailValid;

  const reviewLines: QuoteLine[] =
    quote?.lines ??
    cartLines.map((l) => ({
      productId: l.sku,
      slug: l.fragrance ?? "",
      name: l.name,
      sku: l.sku,
      image: null,
      qty: l.qty,
      unitPrice: l.price,
      mrp: l.mrp ?? l.price,
      lineTotal: l.price * l.qty,
      available: true,
      stock: null,
      maxQty: 12,
    }));
  const mrpTotalPaise = reviewLines.reduce(
    (s, l) => s + Math.round(l.mrp * 100) * l.qty,
    0,
  );
  const itemsPaise =
    quote?.pricing.itemsSubtotalPaise ??
    reviewLines.reduce((s, l) => s + Math.round(l.unitPrice * 100) * l.qty, 0);
  const youSavePaise =
    Math.max(0, mrpTotalPaise - itemsPaise) +
    (quote?.pricing.discountPaise ?? 0);

  function validateAddress() {
    if (addressMode === "saved") return Boolean(savedId);
    const e: Record<string, string> = {};
    if (addr.name.trim().length < 2) e.name = "Required";
    if (!/^\+?[0-9\s-]{10,14}$/.test(addr.phone)) e.phone = "10-digit mobile";
    if (addr.line1.trim().length < 4) e.line1 = "Required";
    if (addr.city.trim().length < 2) e.city = "Required";
    if (!addr.state) e.state = "Select a state";
    if (!/^[1-9]\d{5}$/.test(addr.pincode)) e.pincode = "6-digit PIN";
    setAddrErr(e);
    return Object.keys(e).length === 0;
  }

  function onPincodeChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    setAddr((a) => {
      const next = { ...a, pincode: digits };
      if (/^[1-9]\d{5}$/.test(digits) && !a.state) {
        const region = resolvePincode(digits);
        if (region) next.state = region.state;
      }
      return next;
    });
  }

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (code.length >= 3) setAppliedCoupon(code);
  }

  /** The one action: validate what's on screen, then place + pay. */
  function onPay() {
    setPlaceError(null);
    setEmailErr(null);
    if (!emailValid) {
      setEmailErr("Enter a valid email for the receipt.");
      setEmailEditing(true);
      return;
    }
    if (addressMode === "new" && !validateAddress()) {
      setEditingAddress(true);
      return;
    }
    if (addressMode === "saved" && !savedId) {
      setEditingAddress(true);
      return;
    }
    if (pinBlocked) {
      setEditingAddress(true);
      return;
    }
    void placeOrder();
  }

  async function placeOrder() {
    if (placing || !user) return;
    setPlaceError(null);
    setCartChanged(null);

    const body: Record<string, unknown> = {
      items,
      contact: {
        name: contactName,
        phone: user.phone,
        email: email.trim().toLowerCase(),
      },
      method,
      billingSameAsShipping: true,
      useStoreCredit: useCredit,
      idempotencyKey,
    };
    if (appliedCoupon) body.couponCode = appliedCoupon;
    if (note.trim()) body.customerNote = note.trim();
    if (addressMode === "saved" && savedId) {
      body.savedAddressId = savedId;
    } else {
      const phoneE164 = normalizeIndianMobile(addr.phone);
      if (!phoneE164) {
        setAddrErr((e) => ({ ...e, phone: "Enter a valid Indian mobile number" }));
        setEditingAddress(true);
        return;
      }
      body.newAddress = {
        label: addr.label || undefined,
        name: addr.name.trim(),
        phone: phoneE164,
        email: email.trim().toLowerCase() || undefined,
        line1: addr.line1.trim(),
        line2: addr.line2 || undefined,
        landmark: addr.landmark || undefined,
        city: addr.city.trim(),
        state: addr.state,
        pincode: addr.pincode,
        isDefault: saved.length === 0,
      };
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/checkout/place", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as PlaceOrderSuccess | PlaceOrderFailure;
      if (data.ok) {
        await handlePayment(data);
        return;
      }
      if (data.code === "cart-changed") {
        setCartChanged((data.details as QuoteWarning[]) ?? []);
        void fetchQuote();
      } else if (data.code === "auth-required") {
        openSignIn();
      } else {
        setPlaceError(data.message ?? "Something went wrong. Please try again.");
        if (
          data.code === "address-required" ||
          data.code === "not-serviceable"
        ) {
          setEditingAddress(true);
        }
      }
    } catch {
      setPlaceError("We couldn’t reach the server. Check your connection.");
    } finally {
      setPlacing(false);
    }
  }

  // ── payment ──────────────────────────────────────────────────────────

  async function handlePayment(placed: PlaceOrderSuccess) {
    if (placed.kind === "cod") {
      completeOrder({ orderNumber: placed.orderNumber, method: "cod", paid: false });
      return;
    }
    const { payment } = placed;
    if (payment.kind === "razorpay-dev") {
      setPayState({ kind: "dev", intentId: placed.intentId });
      return;
    }
    // real Razorpay
    setPaymentError(null);
    setPaying(true);
    // The drawer is a top-layer <dialog>; drop it to non-modal so Razorpay's
    // hosted checkout opens in front of it, not behind.
    suspendModal();
    try {
      const outcome = await openRazorpayCheckout({
        keyId: payment.keyId,
        razorpayOrderId: payment.razorpayOrderId,
        amountPaise: payment.amountPaise,
        prefill: payment.prefill,
        reference: "THE RARESKIN order",
      });
      if (outcome.status === "success") {
        const vr = await fetch("/api/payments/razorpay/callback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(outcome.payload),
        });
        const vd = (await vr.json()) as PaymentConfirmResponse;
        if (vd.ok && vd.orderNumber) {
          completeOrder({
            orderNumber: vd.orderNumber,
            method: "razorpay",
            paid: true,
          });
        } else if (vd.error === "sold-out") {
          setPayState({ kind: "retry" });
          setPaymentError(
            "That item just sold out — your payment was refunded in full.",
          );
        } else {
          // Payment went through but confirmation didn't land — the webhook
          // reconciles it. Send the shopper to their orders.
          setPayState({ kind: "retry" });
          setPaymentError(
            "Payment received — we're confirming your order. Check your account in a moment.",
          );
        }
      } else if (outcome.status === "failed") {
        setPayState({ kind: "retry" });
        setPaymentError(outcome.message);
      } else {
        setPayState({ kind: "retry" });
        setPaymentError("Payment not completed. Your bag is still here — try again.");
      }
    } catch (err) {
      setPayState({ kind: "retry" });
      setPaymentError(
        err instanceof Error ? err.message : "The payment window failed to open.",
      );
    } finally {
      resumeModal();
      setPaying(false);
    }
  }

  async function retryPayment() {
    // Fresh attempt — a new checkout intent + a new Razorpay order.
    setPayState(null);
    setPaymentError(null);
    await placeOrder();
  }

  async function simulatePayment(outcome: "paid" | "failed") {
    if (payState?.kind !== "dev") return;
    setPaying(true);
    setPaymentError(null);
    try {
      const r = await fetch("/api/payments/dev-simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intentId: payState.intentId, outcome }),
      });
      const d = (await r.json()) as PaymentConfirmResponse;
      if (d.ok && d.orderNumber) {
        completeOrder({
          orderNumber: d.orderNumber,
          method: "razorpay",
          paid: true,
        });
      } else {
        setPaymentError(
          d.error === "sold-out"
            ? "That item just sold out — the payment was refunded."
            : outcome === "failed"
              ? "Simulated a failed payment. Your bag is still here — retry."
              : "Could not simulate the payment.",
        );
      }
    } catch {
      setPaymentError("Network error.");
    } finally {
      setPaying(false);
    }
  }

  const footerLabel =
    placing || paying
      ? method === "cod"
        ? "Placing your order…"
        : "Opening secure payment…"
      : method === "cod"
        ? "Place order"
        : "Pay securely";

  return (
    <>
      <div
        data-lenis-prevent
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        {/* ── order review — always visible ───────────────────────── */}
        <section className="border-b border-line bg-bg/50 px-6 pt-4 pb-5">
          <p className="text-[10.5px] font-medium tracking-[0.16em] text-ink-3 uppercase">
            Your order
          </p>

          <ul className="mt-3 space-y-3">
            {reviewLines.map((l) => (
              <li key={l.sku} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-11 shrink-0 place-items-center overflow-hidden rounded-[3px] border border-line bg-surface">
                  {l.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : isFragranceSlug(l.slug) ? (
                    <Flacon fragrance={l.slug} className="w-5" />
                  ) : (
                    <Mark className="w-4 text-ink-3" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] tracking-[0.02em] text-ink">
                    {l.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-3">
                    {isFragranceSlug(l.slug)
                      ? "Extrait de Parfum"
                      : "Discovery Set · 3 × 10 ml"}{" "}
                    · Qty {l.qty}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[13px] tabular-nums text-ink">
                    {formatPaise(Math.round(l.unitPrice * 100) * l.qty)}
                  </span>
                  {l.mrp > l.unitPrice && (
                    <span className="block text-[10.5px] tabular-nums text-ink-3 line-through">
                      {formatPaise(Math.round(l.mrp * 100) * l.qty)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {/* price ladder */}
          <dl className="mt-4 space-y-2 border-t border-line pt-3.5 text-[13px]">
            <Row label="Item total" value={formatPaise(itemsPaise)} />
            {quote && quote.pricing.discountPaise > 0 && (
              <Row
                label={appliedCoupon ? `Coupon · ${appliedCoupon}` : "Discount"}
                value={`− ${formatPaise(quote.pricing.discountPaise)}`}
                tone="ok"
              />
            )}
            {quote && quote.pricing.creditAppliedPaise > 0 && (
              <Row
                label="Store credit"
                value={`− ${formatPaise(quote.pricing.creditAppliedPaise)}`}
                tone="ok"
              />
            )}
            <Row
              label="Delivery"
              value={
                !quote
                  ? "Calculated next"
                  : quote.pricing.shippingPaise === 0
                    ? "Free"
                    : formatPaise(quote.pricing.shippingPaise)
              }
              tone={quote?.pricing.shippingPaise === 0 ? "ok" : undefined}
            />
            {quote && quote.pricing.codFeePaise > 0 && (
              <Row
                label="Cash-on-delivery fee"
                value={formatPaise(quote.pricing.codFeePaise)}
              />
            )}

            <div className="!mt-3 flex items-baseline justify-between border-t border-line pt-3">
              <dt className="text-[10.5px] font-medium tracking-[0.16em] text-ink-3 uppercase">
                {quote ? "Amount to pay" : "Total"}
              </dt>
              <dd className="serif text-[1.5rem] tabular-nums text-ink">
                {quote
                  ? formatPaise(quote.pricing.grandTotalPaise)
                  : formatPaise(itemsPaise)}
              </dd>
            </div>

            {(youSavePaise > 0 ||
              (quote && quote.pricing.gst.totalPaise > 0)) && (
              <div className="!mt-1.5 flex items-center justify-between text-[11px] text-ink-3">
                <span>
                  {quote && quote.pricing.gst.totalPaise > 0
                    ? `Incl. ${quote.pricing.gst.ratePercent}% GST ${formatPaise(
                        quote.pricing.gst.totalPaise,
                      )}`
                    : ""}
                </span>
                {youSavePaise > 0 && (
                  <span className="text-ok">
                    You save {formatPaise(youSavePaise)}
                  </span>
                )}
              </div>
            )}
          </dl>

          {/* trust row */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3.5 text-center">
            <Trust icon="truck" label="Free delivery" />
            <Trust icon="receipt" label="No hidden fees" />
            <Trust icon="shield" label="Secure checkout" />
          </div>
        </section>

        {/* ── deliver to ─────────────────────────────────────────── */}
        <section className="border-b border-line bg-surface px-6 py-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-medium tracking-[0.16em] text-ink uppercase">
              Deliver to
            </h3>
            {!editingAddress && chosen && (
              <button
                type="button"
                onClick={() => setEditingAddress(true)}
                className="text-[10px] font-medium tracking-[0.12em] text-ink-3 uppercase transition-colors hover:text-ink"
              >
                Change
              </button>
            )}
          </div>

          {!editingAddress && chosen ? (
            <div className="mt-3">
              <p className="text-[13px] leading-relaxed text-ink-2">
                <span className="text-ink">{chosen.name}</span>
                {chosen.label ? (
                  <span className="ml-1.5 text-[9px] font-medium tracking-[0.12em] text-ink-3 uppercase">
                    {chosen.label}
                  </span>
                ) : null}
                <br />
                {chosen.line1}
                {chosen.line2 ? `, ${chosen.line2}` : ""}
                <br />
                {chosen.city}, {chosen.state} — {chosen.pincode}
                <br />
                {chosen.phone}
              </p>
              {service && activePincode === service.pincode && (
                <p
                  className={cn(
                    "mt-2 text-[11.5px]",
                    service.serviceable ? "text-ok" : "text-error",
                  )}
                >
                  {service.serviceable
                    ? `Delivers to ${service.region?.state ?? "this area"} · ${
                        quote?.pricing.shippingPaise === 0
                          ? "free shipping"
                          : "shipping calculated"
                      }`
                    : "We don’t deliver to this PIN yet — tap Change to use another address."}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3.5 space-y-3">
              {addressMode === "saved" && saved.length > 0 && (
                <>
                  {saved.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => pickSavedAddress(a)}
                      className={cn(
                        "block w-full border px-3.5 py-3 text-left text-[13px] transition-colors",
                        savedId === a.id
                          ? "border-ink bg-bg"
                          : "border-line hover:border-line-2",
                      )}
                    >
                      <span className="block text-ink">
                        {a.name}
                        {a.label ? (
                          <span className="ml-1.5 text-[9px] font-medium tracking-[0.12em] text-ink-3 uppercase">
                            {a.label}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-ink-3">
                        {a.line1}, {a.city}, {a.state} — {a.pincode}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setAddressMode("new");
                      setSavedId(null);
                      setAddr({ ...emptyAddress });
                    }}
                    className="text-[10.5px] font-medium tracking-[0.12em] text-ink uppercase underline-offset-4 hover:underline"
                  >
                    + Add a new address
                  </button>
                </>
              )}

              {addressMode === "new" && (
                <div className="space-y-4">
                  {saved.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddressMode("saved");
                        setSavedId(
                          saved.find((a) => a.isDefault)?.id ?? saved[0]!.id,
                        );
                      }}
                      className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase underline-offset-4 hover:text-ink hover:underline"
                    >
                      ‹ Use a saved address
                    </button>
                  )}
                  <div>
                    <Field
                      label="PIN code"
                      required
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="postal-code"
                      value={addr.pincode}
                      error={addrErr.pincode}
                      onChange={onPincodeChange}
                    />
                    {service && activePincode === service.pincode && (
                      <p
                        className={cn(
                          "mt-1 text-[11.5px]",
                          service.serviceable ? "text-ok" : "text-error",
                        )}
                      >
                        {service.serviceable
                          ? `Delivers to ${service.region?.state ?? "this area"}`
                          : service.reason === "malformed"
                            ? "That PIN doesn’t look right."
                            : "We don’t deliver there yet."}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Full name"
                      required
                      autoComplete="name"
                      value={addr.name}
                      error={addrErr.name}
                      onChange={(v) => setAddr((a) => ({ ...a, name: v }))}
                    />
                    <Field
                      label="Mobile"
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      value={addr.phone}
                      error={addrErr.phone}
                      onChange={(v) => setAddr((a) => ({ ...a, phone: v }))}
                    />
                  </div>
                  <Field
                    label="Flat, building"
                    required
                    autoComplete="address-line1"
                    value={addr.line1}
                    error={addrErr.line1}
                    onChange={(v) => setAddr((a) => ({ ...a, line1: v }))}
                  />
                  <Field
                    label="Area, street (optional)"
                    autoComplete="address-line2"
                    value={addr.line2}
                    onChange={(v) => setAddr((a) => ({ ...a, line2: v }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="City"
                      required
                      autoComplete="address-level2"
                      value={addr.city}
                      error={addrErr.city}
                      onChange={(v) => setAddr((a) => ({ ...a, city: v }))}
                    />
                    <div>
                      <label className={labelCls}>State *</label>
                      <select
                        value={addr.state}
                        onChange={(e) =>
                          setAddr((a) => ({ ...a, state: e.target.value }))
                        }
                        className={cn(fieldCls, addrErr.state && "border-error")}
                      >
                        <option value="">Select…</option>
                        {GST_STATES.map((s) => (
                          <option key={s.code} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Field
                    label="Label — Home, Work (optional)"
                    value={addr.label}
                    onChange={(v) => setAddr((a) => ({ ...a, label: v }))}
                  />
                  <p className="text-[11px] leading-relaxed text-ink-3">
                    We’ll save this to your account for next time.
                  </p>
                </div>
              )}

              {chosen && (
                <button
                  type="button"
                  onClick={() => {
                    if (addressMode === "new" && !validateAddress()) return;
                    setEditingAddress(false);
                  }}
                  className="w-full border border-ink bg-bg py-2.5 text-[10.5px] font-medium tracking-[0.14em] text-ink uppercase transition-colors hover:bg-ink hover:text-w0"
                >
                  Deliver here
                </button>
              )}
            </div>
          )}

          {/* receipt — shown as text once we know it, editable on tap */}
          <div className="mt-4 border-t border-line pt-3.5">
            {emailEditing || !email ? (
              <Field
                label="Email for the receipt"
                type="email"
                inputMode="email"
                required
                autoComplete="email"
                value={email}
                error={emailErr}
                onChange={(v) => {
                  setEmailTouched(true);
                  setEmailErr(null);
                  setEmail(v);
                }}
              />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] leading-relaxed text-ink-3">
                  Receipt &amp; updates to{" "}
                  <span className="text-ink-2">{email}</span>
                  {user ? (
                    <>
                      {" "}
                      · SMS to{" "}
                      <span className="text-ink-2">{maskPhone(user.phone)}</span>
                    </>
                  ) : null}
                </p>
                <button
                  type="button"
                  onClick={() => setEmailEditing(true)}
                  className="shrink-0 text-[10px] font-medium tracking-[0.12em] text-ink-3 uppercase transition-colors hover:text-ink"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── payment ────────────────────────────────────────────── */}
        <section className="space-y-4 px-6 py-5">
          <h3 className="text-[11px] font-medium tracking-[0.16em] text-ink uppercase">
            Payment
          </h3>

          {cartChanged && (
            <div className="border border-error/40 bg-error/5 px-3.5 py-2.5 text-[12px] text-ink">
              <p className="font-medium text-error">Your bag changed</p>
              <ul className="mt-1 space-y-0.5 text-ink-2">
                {cartChanged.map((w) => (
                  <li key={w.sku}>
                    {w.sku}: {w.message}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-ink-3">Review the summary and try again.</p>
            </div>
          )}

          {/* coupon */}
          <div>
            <p className={labelCls}>Discount code</p>
            {appliedCoupon ? (
              <div className="mt-1.5 flex items-center justify-between border border-ok/40 bg-ok/5 px-3 py-2.5 text-[12.5px]">
                <span className="text-ink">
                  <span className="tracking-[0.08em]">{appliedCoupon}</span>{" "}
                  applied
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponInput("");
                  }}
                  className="text-[10px] font-medium tracking-[0.12em] text-ink-3 uppercase hover:text-ink"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="mt-1.5 flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCoupon();
                    }
                  }}
                  placeholder="Enter a code"
                  className="w-full border border-line-2 bg-transparent px-3 py-2.5 text-[13px] tracking-[0.06em] uppercase focus:border-ink focus:outline-none"
                />
                <Button
                  variant="onDark"
                  size="sm"
                  onClick={applyCoupon}
                  className="shrink-0"
                  disabled={couponInput.trim().length < 3}
                >
                  Apply
                </Button>
              </div>
            )}
            {quote?.coupon && quote.coupon.applied === false && (
              <p className="mt-1.5 text-[11.5px] text-error">
                {quote.coupon.reason}
              </p>
            )}
          </div>

          {/* store credit */}
          {quote && quote.storeCreditBalancePaise > 0 && (
            <label className="flex cursor-pointer items-start gap-2.5 border border-line px-3 py-3">
              <input
                type="checkbox"
                checked={useCredit}
                onChange={(e) => setUseCredit(e.target.checked)}
                className="mt-0.5 accent-[var(--color-ink)]"
              />
              <span className="text-[12.5px] text-ink-2">
                Use store credit —{" "}
                <span className="text-ink">
                  {formatPaise(quote.storeCreditBalancePaise)}
                </span>{" "}
                available
              </span>
            </label>
          )}

          {/* method */}
          <div className="space-y-2">
            {(["razorpay", "cod"] as PaymentMethod[]).map((m) => {
              const allowed = !quote || quote.methods.includes(m);
              return (
                <label
                  key={m}
                  className={cn(
                    "flex items-start gap-2.5 border px-3 py-3 text-[12.5px]",
                    !allowed && "opacity-40",
                    method === m ? "border-ink bg-bg" : "border-line",
                    allowed ? "cursor-pointer" : "cursor-not-allowed",
                  )}
                >
                  <input
                    type="radio"
                    name="method"
                    value={m}
                    checked={method === m}
                    disabled={!allowed}
                    onChange={() => setMethod(m)}
                    className="mt-0.5 accent-[var(--color-ink)]"
                  />
                  <span className="min-w-0 flex-1 text-ink">
                    {m === "razorpay"
                      ? "Card · UPI · Netbanking · Wallet"
                      : "Cash on delivery"}
                    <span className="mt-0.5 block text-[11px] text-ink-3">
                      {m === "razorpay"
                        ? "Google Pay, PhonePe, Paytm and every UPI app. Secured by Razorpay — card details never reach us."
                        : allowed
                          ? "Pay the courier on arrival."
                          : "Not available for this order."}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          {/* note */}
          <div>
            <p className={labelCls}>Order note (optional)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="Anything we should know for delivery?"
              className="mt-1.5 w-full resize-none border border-line-2 bg-transparent px-3 py-2.5 text-[13px] focus:border-ink focus:outline-none"
            />
          </div>

          {(placeError || paymentError || quoteError) && (
            <p className="border border-error/40 bg-error/5 px-3 py-2.5 text-[12px] text-error">
              {paymentError ?? placeError ?? quoteError}
            </p>
          )}
          {pinBlocked && (
            <p className="text-[12px] text-error">
              Update the delivery address — we don’t ship to that PIN yet.
            </p>
          )}

          {payState?.kind === "dev" && (
            <div className="border border-dashed border-line-2 bg-bg/60 px-3.5 py-3 text-[12px] text-ink-2">
              <p className="font-medium text-ink">
                Development — Razorpay not configured
              </p>
              <p className="mt-1 text-[11px]">
                Simulate the hosted-checkout outcome — the order is created only
                on success:
              </p>
              <div className="mt-2.5 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => void simulatePayment("paid")}
                  disabled={paying}
                >
                  {paying ? "…" : "Payment success"}
                </Button>
                <Button
                  variant="onDark"
                  size="sm"
                  onClick={() => void simulatePayment("failed")}
                  disabled={paying}
                >
                  Failure
                </Button>
              </div>
            </div>
          )}
        </section>

        <p className="px-6 pb-4 text-center text-[11px] leading-relaxed text-ink-3">
          {method === "cod"
            ? "Cash on delivery — pay when it arrives."
            : "Secured by Razorpay. Your order is placed the moment payment succeeds — nothing before."}
        </p>
      </div>

      <PanelFooter>
        {payState?.kind === "retry" ? (
          <Button
            size="lg"
            className="w-full"
            disabled={paying}
            onClick={retryPayment}
          >
            {paying ? "Opening secure payment…" : "Retry payment"}
          </Button>
        ) : (
          <>
            <Button
              size="lg"
              className="w-full"
              disabled={placing || paying || !canPay}
              onClick={onPay}
            >
              <span className="tracking-[0.1em] whitespace-nowrap">
                {footerLabel}
                {total != null ? ` · ${formatPaise(total)}` : ""}
              </span>
            </Button>
            <div className="mt-2.5 flex justify-center">
              <PaymentBadges />
            </div>
          </>
        )}
        <p className="mt-2 text-center text-[10.5px] leading-relaxed text-ink-3">
          By continuing you agree to THE RARESKIN’s Terms &amp; Privacy Policy.
        </p>
      </PanelFooter>
    </>
  );
}

// ── small parts ────────────────────────────────────────────────────────

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-2">{label}</dt>
      <dd
        className={cn("tabular-nums", tone === "ok" ? "text-ok" : "text-ink")}
      >
        {value}
      </dd>
    </div>
  );
}

function Trust({ icon, label }: { icon: IconName; label: string }) {
  return (
    <span className="flex flex-col items-center gap-1.5 text-ink-3">
      <Icon name={icon} className="size-[17px] text-ink-2" />
      <span className="text-[9.5px] font-medium tracking-[0.06em] uppercase">
        {label}
      </span>
    </span>
  );
}

function PanelFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer className="shrink-0 border-t border-line bg-surface px-6 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
      {children}
    </footer>
  );
}


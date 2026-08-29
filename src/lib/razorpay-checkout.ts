/**
 * Razorpay Standard Checkout — the hosted modal. Card data never touches our
 * origin. The script is loaded on demand (not in the document head) so it costs
 * nothing until someone actually pays.
 */

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: "INR";
  name: string;
  description?: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string; backdrop_color?: string };
  handler: (r: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void; escape?: boolean; backdropclose?: boolean };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (e: unknown) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loader: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Razorpay) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error("Could not load the payment window."));
    };
    document.head.appendChild(s);
  });
  return loader;
}

export interface OpenCheckoutInput {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  prefill: { name: string; email: string; contact: string };
  orderNumber: string;
}

export type CheckoutOutcome =
  | { status: "success"; payload: RazorpaySuccess }
  | { status: "dismissed" }
  | { status: "failed"; message: string };

/** Open the Razorpay modal and resolve with what happened. */
export async function openRazorpayCheckout(
  input: OpenCheckoutInput,
): Promise<CheckoutOutcome> {
  await loadScript();
  const Ctor = window.Razorpay;
  if (!Ctor) return { status: "failed", message: "Payment window unavailable." };

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    // A failed attempt does NOT close Razorpay's window — it swaps to a "try
    // another method" screen. We hold this and only settle the promise when the
    // window is actually dismissed, so the caller doesn't restore the drawer
    // on top of a still-open payment window.
    let lastError: string | null = null;
    const done = (o: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(o);
    };

    const rzp = new Ctor({
      key: input.keyId,
      order_id: input.razorpayOrderId,
      amount: input.amountPaise,
      currency: "INR",
      name: "THE RARESKIN",
      description: `Order ${input.orderNumber}`,
      prefill: input.prefill,
      notes: { orderNumber: input.orderNumber },
      theme: { color: "#17140f" },
      handler: (payload) => done({ status: "success", payload }),
      modal: {
        ondismiss: () =>
          done(
            lastError
              ? { status: "failed", message: lastError }
              : { status: "dismissed" },
          ),
        escape: true,
      },
    });
    rzp.on("payment.failed", (e) => {
      const err = e as { error?: { description?: string } };
      lastError =
        err.error?.description ?? "The payment could not be completed.";
    });
    rzp.open();
  });
}

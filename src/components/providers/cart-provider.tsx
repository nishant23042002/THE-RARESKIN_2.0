"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  cartReducer,
  cartCount,
  cartSubtotal,
  cartSavings,
  cartListTotal,
  readCart,
  writeCart,
  initialCartState,
  type CartLine,
} from "@/lib/cart";
import { useAuth } from "@/components/providers/auth-provider";
import { isFragranceSlug, type BagSuggestion } from "@/lib/catalog";

/** The drawer is one panel that slides between three views. */
export type CartView = "bag" | "checkout" | "done";

export interface PlacedOrder {
  orderNumber: string;
  method: "razorpay" | "cod";
  /** true once payment is confirmed (Razorpay) — COD stays false */
  paid: boolean;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** rupees off MRP across the bag (0 when nothing is discounted) */
  savings: number;
  /** bag total at MRP — the struck-through "before" figure */
  listTotal: number;
  /** the rest of the range, for the drawer's "complete the collection" strip */
  suggestions: BagSuggestion[];
  /** false until localStorage has been read (avoids an empty-bag flash) */
  hydrated: boolean;
  isOpen: boolean;
  view: CartView;
  /** the order just placed, shown on the `done` view */
  placedOrder: PlacedOrder | null;
  toast: string | null;
  openCart: () => void;
  closeCart: () => void;
  /** slide to the checkout view (opening the drawer if needed) */
  goToCheckout: () => void;
  /** slide back to the bag */
  backToBag: () => void;
  /** order placed — slide to confirmation and empty the bag */
  completeOrder: (order: PlacedOrder) => void;
  /**
   * The drawer is a top-layer `<dialog showModal()>`, which sits above every
   * z-indexed element on the page — including a third-party payment overlay
   * (Razorpay Checkout). While `modalSuspended` is true the drawer drops to a
   * non-modal `show()` so that overlay can render in front of it; call
   * `resumeModal()` once the overlay closes.
   */
  modalSuspended: boolean;
  suspendModal: () => void;
  resumeModal: () => void;
  addItem: (line: Omit<CartLine, "qty"> & { qty?: number }) => void;
  setQty: (sku: string, qty: number) => void;
  removeItem: (sku: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  suggestions = [],
}: {
  children: ReactNode;
  suggestions?: BagSuggestion[];
}) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<CartView>("bag");
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [modalSuspended, setModalSuspended] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const resetTimer = useRef<number | undefined>(undefined);
  const { hydrated } = state;

  useEffect(() => {
    dispatch({ type: "hydrate", lines: readCart() });
  }, []);

  useEffect(() => {
    if (hydrated) writeCart(state.lines);
  }, [state.lines, hydrated]);

  // On sign-in, fold the guest bag into the account's server cart (which may
  // hold items added on another device) and adopt the union locally.
  const { status } = useAuth();
  const prevStatus = useRef(status);
  const stateRef = useRef(state);
  const mergingRef = useRef(false);
  useEffect(() => {
    stateRef.current = state;
  });
  useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = status;
    if (status !== "authed" || was === "authed" || !hydrated) return;

    mergingRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const local = stateRef.current.lines;
        await fetch("/api/cart?merge=1", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: local.map((l) => ({ sku: l.sku, qty: l.qty })),
          }),
        });
        const res = await fetch("/api/cart", { cache: "no-store" });
        const data = (await res.json()) as {
          ok: boolean;
          lines?: {
            slug: string;
            name: string;
            sku: string;
            qty: number;
            unitPrice: number;
            mrp: number;
          }[];
        };
        if (cancelled || !data.ok || !data.lines) return;
        const byLocalSku = new Map(local.map((l) => [l.sku, l]));
        const serverSkus = new Set(data.lines.map((l) => l.sku));
        const merged: CartLine[] = data.lines.map((sl) => {
          const prev = byLocalSku.get(sl.sku);
          return {
            sku: sl.sku,
            name: sl.name,
            price: sl.unitPrice,
            mrp: sl.mrp || undefined,
            qty: sl.qty,
            fragrance:
              prev?.fragrance ??
              (isFragranceSlug(sl.slug) ? sl.slug : undefined),
            href: prev?.href,
            meta: prev?.meta,
          };
        });
        // The merge is a union — never let a stale server response drop an item
        // the shopper just added locally.
        for (const l of local) {
          if (!serverSkus.has(l.sku)) merged.push(l);
        }
        if (!cancelled && merged.length > 0) {
          dispatch({ type: "hydrate", lines: merged });
        }
      } catch {
        /* keep the local bag as-is */
      } finally {
        mergingRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, hydrated]);

  // Keep a signed-in shopper's server cart in step with the working bag
  // (persistence + a base for abandoned-cart later). Debounced; paused during
  // the login merge so the two never race.
  useEffect(() => {
    if (status !== "authed" || !hydrated || mergingRef.current) return;
    const t = setTimeout(() => {
      fetch("/api/cart", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: state.lines.map((l) => ({ sku: l.sku, qty: l.qty })),
        }),
      }).catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [state.lines, status, hydrated]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const closeCart = useCallback(() => {
    setIsOpen(false);
    setModalSuspended(false);
    // reset the view after the close animation so it doesn't flicker on the way out
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      setView("bag");
      setPlacedOrder(null);
    }, 520);
  }, []);

  const suspendModal = useCallback(() => setModalSuspended(true), []);
  const resumeModal = useCallback(() => setModalSuspended(false), []);

  const openCart = useCallback(() => {
    window.clearTimeout(resetTimer.current);
    setView((v) => (v === "done" ? "bag" : v));
    setIsOpen(true);
  }, []);

  const goToCheckout = useCallback(() => {
    window.clearTimeout(resetTimer.current);
    setPlacedOrder(null);
    setView("checkout");
    setIsOpen(true);
  }, []);

  const backToBag = useCallback(() => setView("bag"), []);

  const completeOrder = useCallback((order: PlacedOrder) => {
    setPlacedOrder(order);
    setModalSuspended(false);
    setView("done");
    dispatch({ type: "clear" });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      count: cartCount(state),
      subtotal: cartSubtotal(state),
      savings: cartSavings(state),
      listTotal: cartListTotal(state),
      suggestions,
      hydrated,
      isOpen,
      view,
      placedOrder,
      toast,
      openCart,
      closeCart,
      goToCheckout,
      backToBag,
      completeOrder,
      modalSuspended,
      suspendModal,
      resumeModal,
      addItem: (line) => {
        dispatch({ type: "add", line });
        notify(`${line.name} added to bag`);
      },
      setQty: (sku, qty) => dispatch({ type: "setQty", sku, qty }),
      removeItem: (sku) => dispatch({ type: "remove", sku }),
      clear: () => dispatch({ type: "clear" }),
    }),
    [
      state,
      suggestions,
      hydrated,
      isOpen,
      view,
      placedOrder,
      modalSuspended,
      suspendModal,
      resumeModal,
      toast,
      notify,
      openCart,
      closeCart,
      goToCheckout,
      backToBag,
      completeOrder,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}

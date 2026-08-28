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
  readCart,
  writeCart,
  initialCartState,
  type CartLine,
} from "@/lib/cart";

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** false until localStorage has been read (avoids an empty-bag flash) */
  hydrated: boolean;
  isOpen: boolean;
  toast: string | null;
  openCart: () => void;
  closeCart: () => void;
  addItem: (line: Omit<CartLine, "qty"> & { qty?: number }) => void;
  setQty: (sku: string, qty: number) => void;
  removeItem: (sku: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const { hydrated } = state;

  useEffect(() => {
    dispatch({ type: "hydrate", lines: readCart() });
  }, []);

  useEffect(() => {
    if (hydrated) writeCart(state.lines);
  }, [state.lines, hydrated]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      count: cartCount(state),
      subtotal: cartSubtotal(state),
      hydrated,
      isOpen,
      toast,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: (line) => {
        dispatch({ type: "add", line });
        notify(`${line.name} added to bag`);
      },
      setQty: (sku, qty) => dispatch({ type: "setQty", sku, qty }),
      removeItem: (sku) => dispatch({ type: "remove", sku }),
      clear: () => dispatch({ type: "clear" }),
    }),
    [state, hydrated, isOpen, toast, notify],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}

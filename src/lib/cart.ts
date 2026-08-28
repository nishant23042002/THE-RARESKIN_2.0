import type { FragranceSlug } from "@/lib/catalog";

/**
 * A bag line. Callers pass display data at add-time (name/price snapshot), so
 * the cart never has to reach back into the catalogue — that keeps the eventual
 * commerce-provider swap contained. `fragrance` drives the drawer thumbnail.
 */
export interface CartLine {
  sku: string;
  name: string;
  price: number;
  mrp?: number;
  qty: number;
  fragrance?: FragranceSlug;
  href?: string;
  meta?: string;
}

export interface CartState {
  lines: CartLine[];
  /** false until localStorage has been read (drives the drawer's empty state) */
  hydrated: boolean;
}

export const initialCartState: CartState = { lines: [], hydrated: false };

export type CartAction =
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "add"; line: Omit<CartLine, "qty"> & { qty?: number } }
  | { type: "setQty"; sku: string; qty: number }
  | { type: "remove"; sku: string }
  | { type: "clear" };

const MAX_QTY = 12;
const MAX_LINES = 20;
const STORAGE_KEY = "rareskin:cart:v1";

const clampQty = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.round(n)));

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { lines: sanitize(action.lines), hydrated: true };

    case "add": {
      const { qty = 1, ...rest } = action.line;
      const i = state.lines.findIndex((l) => l.sku === rest.sku);
      if (i === -1) {
        if (state.lines.length >= MAX_LINES) return state;
        return {
          ...state,
          lines: [...state.lines, { ...rest, qty: clampQty(qty) }],
        };
      }
      const lines = state.lines.slice();
      lines[i] = { ...lines[i], qty: clampQty(lines[i].qty + qty) };
      return { ...state, lines };
    }

    case "setQty": {
      if (action.qty <= 0) {
        return {
          ...state,
          lines: state.lines.filter((l) => l.sku !== action.sku),
        };
      }
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.sku === action.sku ? { ...l, qty: clampQty(action.qty) } : l,
        ),
      };
    }

    case "remove":
      return {
        ...state,
        lines: state.lines.filter((l) => l.sku !== action.sku),
      };

    case "clear":
      return { ...state, lines: [] };

    default:
      return state;
  }
}

export const cartCount = (s: CartState) =>
  s.lines.reduce((n, l) => n + l.qty, 0);

export const cartSubtotal = (s: CartState) =>
  s.lines.reduce((n, l) => n + l.price * l.qty, 0);

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* private mode / quota — non-fatal */
  }
}

function sanitize(input: unknown): CartLine[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (l): l is CartLine =>
        !!l &&
        typeof l.sku === "string" &&
        typeof l.name === "string" &&
        typeof l.price === "number" &&
        typeof l.qty === "number",
    )
    .map((l) => ({ ...l, qty: clampQty(l.qty) }))
    .slice(0, MAX_LINES);
}

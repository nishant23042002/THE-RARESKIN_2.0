/**
 * Email chrome — plain constants, **no imports**. Kept apart from the app's
 * design tokens because email clients ignore CSS variables and web fonts; every
 * value here is an inline-safe literal with a system fallback.
 */

export const palette = {
  paper: "#f6f4ef",
  card: "#ffffff",
  ink: "#1a1613",
  soft: "#4a4038",
  muted: "#6f6656",
  line: "#e5e0d6",
  ok: "#4a7355",
  error: "#b23a2b",
  inverse: "#f6f4ef",
} as const;

export const fonts = {
  display: "Georgia, 'Times New Roman', serif",
  body: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
} as const;

export const accent = {
  /** aurévan · orvélis · vayrén juice, left→right */
  gradient: "linear-gradient(90deg,#e0d7bf 0%,#c5872f 50%,#3d2712 100%)",
  solid: "#c5872f",
} as const;

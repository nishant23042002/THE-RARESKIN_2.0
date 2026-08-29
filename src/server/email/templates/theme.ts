/**
 * Email chrome — plain constants, **no imports**. Email clients ignore CSS
 * variables and web fonts, so every value here is an inline-safe literal with a
 * system fallback.
 */

export const palette = {
  paper: "#f1efe8", // the ground behind the card
  card: "#ffffff",
  ink: "#1b1712",
  soft: "#514740",
  muted: "#8c8175",
  line: "#e9e3d7",
  faint: "#f6f3ec", // a whisper fill for panels
  ok: "#4a7355",
  gold: "#9a6b1f",
  inverse: "#f6f4ef",
} as const;

export const fonts = {
  // Newsreader in spirit; Georgia is the reliable serif everywhere
  display: "'Newsreader', Georgia, 'Times New Roman', serif",
  body: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
} as const;

export const accent = {
  /** aurévan · orvélis · vayrén juice, left→right */
  gradient: "linear-gradient(90deg,#e0d7bf 0%,#c5872f 50%,#3d2712 100%)",
  solid: "#c5872f",
} as const;

/** one place for the vertical rhythm */
export const space = {
  gutter: "40px",
  band: "34px",
} as const;

/**
 * Shared motion vocabulary. Durations are in seconds (GSAP); the easings mirror
 * the CSS custom properties in globals.css so JS- and CSS-driven motion match.
 *
 * Principles (Emil Kowalski): UI transitions stay under ~0.3s, entrances use a
 * strong ease-out, exits are faster than entrances, keyboard-driven actions do
 * not animate at all.
 */

export const EASE = {
  brand: "cubic-bezier(0.16, 1, 0.3, 1)",
  drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
  outStrong: "cubic-bezier(0.23, 1, 0.32, 1)",
} as const;

export const DUR = {
  press: 0.14,
  micro: 0.18,
  ui: 0.24,
  panel: 0.42,
  drawer: 0.5,
  reveal: 0.8,
} as const;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

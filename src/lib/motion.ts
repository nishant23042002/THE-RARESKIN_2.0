/**
 * Shared motion vocabulary. Durations are in seconds (GSAP).
 *
 * Principles (Emil Kowalski): UI transitions stay under ~0.3s, entrances use a
 * strong ease-out, exits are faster than entrances, keyboard-driven actions do
 * not animate at all.
 */
export const DUR = {
  press: 0.14,
  micro: 0.18,
  ui: 0.24,
  panel: 0.42,
  drawer: 0.5,
  reveal: 0.8,
} as const;

# Route transition — "The Aperture"

Every in-app navigation plays a full-viewport branded transition:
`src/components/providers/route-transition.tsx`, mounted once in the root layout.

## The design

A warm-black curtain (`--color-w4`) in two halves that **close toward the point
you tapped** — the seam meets at your click's Y position, not dead centre — with
a hairline of light flashing as they meet. It holds for a beat on the RARESKIN
wordmark and a 2px rule, a single raking light passing across (echoing the hero),
then **parts from that same seam** — a growing horizontal aperture that reveals
the next page.

It is **context-aware**: navigating to a fragrance, the rule becomes that
scent's own colour and its name appears; anywhere else it's the full
aurévan → orvélis → vayrén spectrum (the same signature used in the sign-in
modal).

Reduced motion: a plain crossfade, no movement.

## How it works

1. A `document`-level capture listener intercepts internal `<a>` clicks
   (bypassing: external hosts, `target`, `download`, `data-no-transition`,
   modified clicks, `#hash`-only, and same-route links).
2. It calls `router.push` **immediately** — the next page renders behind the
   curtain while it closes, so navigation time isn't wasted.
3. `cover → hold → reveal` is a `setTimeout`-driven state machine; GSAP only
   paints. If the GSAP ticker stalls (backgrounded tab, low-power mode) the
   transition degrades to "navigation with no visible curtain" — it can never
   get stuck on screen. A hard ceiling tears it down regardless.
4. The reveal waits for `usePathname()` to actually equal the destination, so a
   slow route is masked rather than flashing a half-loaded page.
5. Scroll locks during the transition and resets to the top before the reveal.
   Any open `<dialog>` (menu, cart, sign-in) is closed on cover.

Everything animates on `transform` / `opacity` only. Timings: cover 420ms,
hold ~190ms, reveal 440ms — about 1.2s end to end.

Only `usePathname` / `useRouter` are used (never `useSearchParams`), so the
storefront stays fully statically prerendered.

## Programmatic navigation

```ts
const { navigate } = useRouteTransition();
navigate("/fragrances/aurevan"); // same curtain as a link click
```

Auth flows (`router.replace` after sign-in / sign-out) deliberately skip the
curtain — they have their own completion feedback.

## Opting a link out

```tsx
<a href="/somewhere" data-no-transition>…</a>
```

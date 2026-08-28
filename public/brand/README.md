# Brand assets

## `rareskin-wordmark.png` — the header/menu/footer wordmark

Current file: **1487 × 331**, black artwork on transparent, RGBA. Derived from
the client-supplied logo (a grayscale raster that arrived wrapped in an SVG);
extracted, inverted to black-on-transparent, and tight-cropped so the site can
tint it with `currentColor` (see `src/components/ui/logo.tsx`).

### Replacing it

Ideal: a real **vector** wordmark. Provide an SVG with actual `<path>` outlines
(text converted to curves), single colour, transparent background, tight
`viewBox`. Then:

1. save it as `rareskin-wordmark.svg`
2. in `src/components/ui/logo.tsx` set `SRC` back to the `.svg` and update
   `ASPECT` to the viewBox ratio

A higher-res transparent PNG (black artwork) also works — just replace this file
and update `ASPECT` if the proportions change.

### Later

- favicon / app-icon source (the ∧ mark), square, transparent — `mark.svg`
- OG-image art — handled in the SEO phase

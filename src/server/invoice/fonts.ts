import "server-only";

import fs from "node:fs";
import path from "node:path";

import { Font } from "@react-pdf/renderer";

/**
 * Register the brand faces for the invoice — Newsreader (display) + Jost (body),
 * the same pairing as the storefront. The `.woff` files live in `public/fonts/`
 * (copied from `@fontsource/*` at install time) and are read straight off disk;
 * `next.config.ts` `outputFileTracingIncludes` bundles them into the route's
 * serverless function. Registration failure degrades to Helvetica, never a
 * broken render.
 */

let done = false;

function file(name: string): string {
  return path.join(process.cwd(), "public", "fonts", name);
}

export function registerInvoiceFonts(): void {
  if (done) return;
  done = true;
  try {
    Font.register({
      family: "Newsreader",
      fonts: [
        { src: file("newsreader-400.woff"), fontWeight: 400 },
        { src: file("newsreader-600.woff"), fontWeight: 600 },
        { src: file("newsreader-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
      ],
    });
    Font.register({
      family: "Jost",
      fonts: [
        { src: file("jost-400.woff"), fontWeight: 400 },
        { src: file("jost-500.woff"), fontWeight: 500 },
      ],
    });
    // Invoices are set ragged-right; never hyphenate a product name or address.
    Font.registerHyphenationCallback((word) => [word]);

    // Fail loudly at register time if a file is missing (before the render).
    for (const f of [
      "newsreader-400.woff",
      "newsreader-600.woff",
      "jost-400.woff",
      "jost-500.woff",
    ]) {
      if (!fs.existsSync(file(f))) {
        throw new Error(`missing font file: public/fonts/${f}`);
      }
    }
  } catch (err) {
    console.error(
      "[invoice] font registration failed — the PDF will fall back to Helvetica",
      err,
    );
  }
}

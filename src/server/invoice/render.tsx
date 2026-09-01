import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { registerInvoiceFonts } from "./fonts";
import { InvoiceDocument } from "./document";
import type { InvoiceData } from "./data";

/** Render one invoice to a standalone PDF `ArrayBuffer`. */
export async function renderInvoicePdf(data: InvoiceData): Promise<ArrayBuffer> {
  registerInvoiceFonts();
  const buf = await renderToBuffer(<InvoiceDocument data={data} />);
  const out = new ArrayBuffer(buf.byteLength);
  new Uint8Array(out).set(buf);
  return out;
}

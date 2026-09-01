import { NextResponse } from "next/server";

import { dbConnect } from "@/server/db";
import { Order } from "@/server/models";
import { isProduction } from "@/server/env";
import { loadInvoiceData, renderInvoicePdf } from "@/server/invoice";

/**
 * Local invoice preview — renders inline (no auth, no download) so the template
 * can be eyeballed in a browser. 404 in production.
 *
 *   /api/dev/invoice                 → newest non-cancelled order
 *   /api/dev/invoice?order=RRS-…     → a specific order
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (isProduction()) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }
  await dbConnect();

  const want = new URL(request.url).searchParams.get("order");
  const o = want
    ? await Order.findOne({ orderNumber: want }).select("orderNumber userId").lean()
    : await Order.findOne({ status: { $ne: "cancelled" } })
        .sort({ createdAt: -1 })
        .select("orderNumber userId")
        .lean();
  if (!o) {
    return NextResponse.json({ ok: false, error: "no order" }, { status: 404 });
  }

  const data = await loadInvoiceData(o.orderNumber, String(o.userId));
  if (!data) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  const pdf = await renderInvoicePdf(data);
  return new Response(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="preview-${o.orderNumber}.pdf"`,
    },
  });
}

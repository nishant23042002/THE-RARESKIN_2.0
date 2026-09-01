import { getAuth } from "@/server/auth";
import { dbConnect } from "@/server/db";
import { Order } from "@/server/models";
import { loadInvoiceData, renderInvoicePdf } from "@/server/invoice";

/**
 * `GET /api/account/orders/<orderNumber>/invoice` → the order's invoice as a
 * downloadable PDF. Scoped to the signed-in customer; cancelled orders have no
 * invoice. The invoice number is the order number; `invoice.generatedAt` is
 * stamped on first download so the document can show when it was issued.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ orderNumber: string }> },
) {
  const auth = await getAuth();
  if (!auth) {
    return Response.json({ ok: false, error: "auth-required" }, { status: 401 });
  }

  const { orderNumber } = await ctx.params;
  const decoded = decodeURIComponent(orderNumber);

  await dbConnect();
  // Stamp the issue date once (idempotent — only when not already set).
  await Order.updateOne(
    { orderNumber: decoded, userId: auth.user.id, "invoice.generatedAt": null },
    { $set: { "invoice.number": decoded, "invoice.generatedAt": new Date() } },
  );

  const data = await loadInvoiceData(decoded, auth.user.id);
  if (!data) {
    return Response.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  let pdf: ArrayBuffer;
  try {
    pdf = await renderInvoicePdf(data);
  } catch (err) {
    console.error("[invoice] render failed", { orderNumber: decoded, err });
    return Response.json({ ok: false, error: "render-failed" }, { status: 500 });
  }

  return new Response(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="THE-RARESKIN-Invoice-${decoded}.pdf"`,
      "content-length": String(pdf.byteLength),
      "cache-control": "private, no-store",
    },
  });
}

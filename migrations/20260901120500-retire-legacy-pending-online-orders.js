/**
 * Switchover to payment-first checkout.
 *
 * The old flow created an `Order` (status `pending`, stock decremented as a
 * 30-minute hold) *before* opening Razorpay. Payment-first never does this, so
 * any leftover unpaid online order is a dead reservation. Cancel each one,
 * restore its stock, free its coupon and store credit, and drop the now-unused
 * `unpaid_due` index.
 *
 * Done with raw driver calls (no app imports) so the migration is self-contained.
 */

module.exports = {
  async up(db) {
    const orders = db.collection("orders");
    const products = db.collection("products");
    const stockledgers = db.collection("stockledgers");
    const coupons = db.collection("coupons");
    const storecredits = db.collection("storecredits");

    const stale = await orders
      .find({
        status: "pending",
        "payment.method": "razorpay",
        "payment.status": { $ne: "paid" },
      })
      .toArray();

    for (const o of stale) {
      for (const item of o.items ?? []) {
        const updated = await products.findOneAndUpdate(
          { _id: item.productId },
          { $inc: { "inventory.stock": item.qty } },
          { returnDocument: "after" },
        );
        const balanceAfter =
          updated && updated.value
            ? updated.value.inventory?.stock
            : (updated && updated.inventory?.stock) ?? item.qty;
        await stockledgers.insertOne({
          productId: item.productId,
          sku: item.sku,
          delta: item.qty,
          reason: "cancellation",
          orderId: o._id,
          balanceAfter,
          actorId: null,
          note: "Migrated to payment-first checkout",
          at: new Date(),
        });
      }

      if (o.coupon && o.coupon.code) {
        await coupons.updateOne(
          { code: o.coupon.code, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } },
        );
      }

      if (o.pricing && o.pricing.creditAppliedPaise > 0) {
        const grants = await storecredits
          .find({ userId: o.userId, "ledger.orderId": o._id })
          .toArray();
        for (const g of grants) {
          const spent = (g.ledger ?? [])
            .filter(
              (l) =>
                String(l.orderId) === String(o._id) && l.deltaPaise < 0,
            )
            .reduce((s, l) => s + -l.deltaPaise, 0);
          if (spent <= 0) continue;
          await storecredits.updateOne(
            { _id: g._id },
            {
              $set: {
                remainingPaise: Math.min(
                  g.amountPaise,
                  (g.remainingPaise ?? 0) + spent,
                ),
                status:
                  g.status === "spent" ? "active" : g.status ?? "active",
              },
              $push: {
                ledger: {
                  at: new Date(),
                  deltaPaise: spent,
                  orderId: o._id,
                  note: "Restored — migrated to payment-first checkout",
                  actorId: null,
                },
              },
            },
          );
        }
      }

      await orders.updateOne(
        { _id: o._id },
        {
          $set: { status: "cancelled", paymentDueBy: null },
          $push: {
            timeline: {
              at: new Date(),
              status: "cancelled",
              actor: "system",
              actorId: null,
              note: "Cancelled — migrated to payment-first checkout.",
            },
          },
        },
      );
    }

    try {
      await orders.dropIndex("unpaid_due");
    } catch {
      // already gone
    }
  },

  async down() {
    // Irreversible — cancelled orders are not un-cancelled.
  },
};

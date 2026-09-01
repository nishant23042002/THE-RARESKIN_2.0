/**
 * Payment-first checkout — the `checkoutintents` collection.
 *
 * A pre-payment snapshot of a validated bag + the Razorpay order it is bound to.
 * No `Order` / no stock movement happens until Razorpay confirms the payment and
 * `finalizeOnlineCheckout` turns the intent into a real order.
 *
 * Index names match the Mongoose schema (src/server/models/checkout-intent.ts).
 */

const COLLECTIONS = ["checkoutintents"];

const INDEXES = {
  checkoutintents: [
    [{ razorpayOrderId: 1 }, { name: "intent_rzp_order_unique", unique: true }],
    [{ userId: 1, createdAt: -1 }, { name: "intent_user_created" }],
    [{ createdAt: 1 }, { name: "intent_ttl", expireAfterSeconds: 86400 }],
  ],
};

module.exports = {
  async up(db) {
    const existing = new Set(
      (await db.listCollections().toArray()).map((c) => c.name),
    );
    for (const name of COLLECTIONS) {
      if (!existing.has(name)) await db.createCollection(name);
    }
    for (const [collection, specs] of Object.entries(INDEXES)) {
      for (const [keys, options] of specs) {
        await db.collection(collection).createIndex(keys, options);
      }
    }
  },

  async down(db) {
    for (const [collection, specs] of Object.entries(INDEXES)) {
      for (const [, options] of specs) {
        try {
          await db.collection(collection).dropIndex(options.name);
        } catch {
          // already gone
        }
      }
    }
  },
};

/**
 * Phase E — payment collections: `payments` (immutable audit log) and
 * `webhookevents` (idempotency ledger, 30-day TTL). Plus the `orders` index the
 * auto-cancel job needs (`payment.status` + `paymentDueBy`).
 *
 * Index names match the Mongoose schema declarations.
 */

const COLLECTIONS = ["payments", "webhookevents"];

const INDEXES = {
  payments: [
    [{ orderId: 1, at: -1 }, { name: "order_at" }],
    [
      { providerPaymentId: 1 },
      {
        name: "provider_payment",
        partialFilterExpression: { providerPaymentId: { $type: "string" } },
      },
    ],
    [{ at: -1 }, { name: "at_desc" }],
  ],
  webhookevents: [
    [
      { provider: 1, eventId: 1 },
      { name: "provider_event_unique", unique: true },
    ],
    [{ expiresAt: 1 }, { name: "ttl", expireAfterSeconds: 0 }],
  ],
  orders: [
    [
      { "payment.status": 1, paymentDueBy: 1 },
      {
        name: "unpaid_due",
        partialFilterExpression: { paymentDueBy: { $type: "date" } },
      },
    ],
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

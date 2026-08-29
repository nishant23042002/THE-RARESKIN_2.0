/**
 * Phase D — commerce collections: `carts`, `coupons`, `orders`, `storecredits`,
 * `stockledgers`.
 *
 * Index names match the Mongoose schema declarations so dev (autoIndex on) and
 * production (autoIndex off, migrations own indexes) converge on the same set.
 * `carts` gets a TTL on `expiresAt`; abandoned guest carts self-clean.
 */

const COLLECTIONS = [
  "carts",
  "coupons",
  "orders",
  "storecredits",
  "stockledgers",
];

const INDEXES = {
  carts: [
    [
      { userId: 1 },
      {
        name: "user_unique",
        unique: true,
        partialFilterExpression: { userId: { $type: "objectId" } },
      },
    ],
    [{ expiresAt: 1 }, { name: "ttl", expireAfterSeconds: 0 }],
  ],
  coupons: [
    [{ code: 1 }, { name: "code_unique", unique: true }],
    [{ status: 1, endsAt: 1 }, { name: "status_ends" }],
  ],
  orders: [
    [{ orderNumber: 1 }, { name: "orderNumber_unique", unique: true }],
    [{ userId: 1, createdAt: -1 }, { name: "user_created" }],
    [{ status: 1, createdAt: -1 }, { name: "status_created" }],
    [
      { "payment.providerOrderId": 1 },
      {
        name: "provider_order",
        partialFilterExpression: {
          "payment.providerOrderId": { $type: "string" },
        },
      },
    ],
    [
      { userId: 1, idempotencyKey: 1 },
      { name: "user_idem_unique", unique: true },
    ],
  ],
  storecredits: [
    [
      { userId: 1, status: 1, createdAt: 1 },
      { name: "user_status_created" },
    ],
    [
      { sourceOrderId: 1, reason: 1 },
      {
        name: "source_reason_unique",
        unique: true,
        partialFilterExpression: { sourceOrderId: { $type: "objectId" } },
      },
    ],
  ],
  stockledgers: [
    [{ productId: 1, at: -1 }, { name: "product_at" }],
    [{ orderId: 1 }, { name: "order" }],
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

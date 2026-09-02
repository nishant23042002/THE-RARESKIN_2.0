/**
 * Phase H — verified-buyer reviews: the `reviews` collection.
 *
 * Index names match the Mongoose schema declarations
 * (src/server/models/review.ts).
 */

const COLLECTIONS = ["reviews"];

const INDEXES = {
  reviews: [
    [
      { productSlug: 1, status: 1, publishedAt: -1 },
      { name: "product_status_published" },
    ],
    [{ status: 1, createdAt: -1 }, { name: "status_created" }],
    [{ userId: 1, createdAt: -1 }, { name: "user_created" }],
    [
      { userId: 1, productId: 1 },
      { name: "user_product_unique", unique: true },
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

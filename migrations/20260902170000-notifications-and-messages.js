/**
 * Phase I — admin notifications (`notifications`, a staff activity feed with a
 * 60-day TTL) and the customer-messages inbox (`contactmessages`).
 *
 * Index names match the Mongoose schema declarations
 * (src/server/models/notification.ts, contact-message.ts).
 */

const COLLECTIONS = ["notifications", "contactmessages"];

const INDEXES = {
  notifications: [
    [
      { createdAt: -1 },
      { name: "createdAt_desc", expireAfterSeconds: 60 * 24 * 60 * 60 },
    ],
    [{ dedupeKey: 1 }, { name: "dedupeKey_unique", unique: true }],
    [{ category: 1, createdAt: -1 }, { name: "category_created" }],
    [{ minRole: 1, createdAt: -1 }, { name: "role_created" }],
  ],
  contactmessages: [
    [{ status: 1, createdAt: -1 }, { name: "status_created" }],
    [{ email: 1, createdAt: -1 }, { name: "email_created" }],
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

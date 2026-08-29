/**
 * Phase F — transactional email: `emailmessages` (the outbox + delivery log) and
 * `emailsuppressions` (hard bounces / spam complaints).
 *
 * Index names match the Mongoose schema declarations
 * (src/server/models/email-message.ts, email-suppression.ts).
 */

const COLLECTIONS = ["emailmessages", "emailsuppressions"];

const INDEXES = {
  emailmessages: [
    [{ dedupeKey: 1 }, { name: "dedupeKey_unique", unique: true }],
    [{ status: 1, nextAttemptAt: 1 }, { name: "status_next" }],
    [
      { orderNumber: 1 },
      {
        name: "orderNumber",
        partialFilterExpression: { orderNumber: { $type: "string" } },
      },
    ],
    [
      { providerId: 1 },
      {
        name: "provider_id",
        partialFilterExpression: { providerId: { $type: "string" } },
      },
    ],
    [{ createdAt: -1 }, { name: "createdAt_desc" }],
  ],
  emailsuppressions: [
    [{ email: 1 }, { name: "email_unique", unique: true }],
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

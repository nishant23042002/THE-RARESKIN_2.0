/**
 * Phase C — auth collections: `sessions` and `otpchallenges`.
 *
 * Both use a TTL index on `expiresAt` so Mongo purges dead rows on its own.
 * The application guard still checks `expiresAt`/`revokedAt` because the TTL
 * monitor only runs about once a minute.
 */

const COLLECTIONS = ["sessions", "otpchallenges"];

const INDEXES = {
  sessions: [
    [{ userId: 1, createdAt: -1 }, { name: "user_created" }],
    [{ expiresAt: 1 }, { name: "ttl", expireAfterSeconds: 0 }],
  ],
  otpchallenges: [
    [{ phone: 1, purpose: 1 }, { name: "phone_purpose" }],
    [{ expiresAt: 1 }, { name: "ttl", expireAfterSeconds: 0 }],
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

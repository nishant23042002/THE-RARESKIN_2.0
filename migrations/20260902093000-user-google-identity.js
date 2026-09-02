/**
 * Google account linking — the `users.google` sub-document.
 *
 * Adds the partial-unique index that enforces "one Google account → one user".
 * The field itself is schema-optional (defaults to `null`); no backfill needed.
 *
 * Index name matches the Mongoose schema (src/server/models/user.ts).
 */

const INDEXES = {
  users: [
    [
      { "google.sub": 1 },
      {
        name: "google_sub_unique",
        unique: true,
        partialFilterExpression: { "google.sub": { $type: "string" } },
      },
    ],
  ],
};

module.exports = {
  async up(db) {
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

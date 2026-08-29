/**
 * Replace the sparse unique index on `users.email` with a partial one.
 *
 * A sparse index still treats an explicit `email: null` as a value, so a second
 * account created without an email (the common case — sign-up is phone-only)
 * hits a duplicate-key error. A partial index scoped to string values indexes
 * only real emails and lets any number of rows sit at `email: null`.
 */
module.exports = {
  async up(db) {
    const users = db.collection("users");
    for (const name of ["email_unique_sparse", "email_1"]) {
      try {
        await users.dropIndex(name);
      } catch {
        // not present — fine
      }
    }
    await users.createIndex(
      { email: 1 },
      {
        unique: true,
        partialFilterExpression: { email: { $type: "string" } },
        name: "email_unique",
      },
    );
  },

  async down(db) {
    const users = db.collection("users");
    try {
      await users.dropIndex("email_unique");
    } catch {
      /* noop */
    }
    await users.createIndex(
      { email: 1 },
      { unique: true, sparse: true, name: "email_unique_sparse" },
    );
  },
};

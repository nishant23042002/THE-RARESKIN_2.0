/**
 * Phase A — create the foundational collections and their indexes.
 *
 * In production the app connects with `autoIndex: false`, so index creation is
 * owned here rather than by Mongoose at boot. Index builds are idempotent
 * (`createIndex` is a no-op if an identical index exists), so re-running is safe.
 */

const COLLECTIONS = [
  "products",
  "mediaassets",
  "users",
  "sitesettings",
  "counters",
  "auditlogs",
];

/** @type {Record<string, Array<[Record<string, 1 | -1 | 'text'>, object]>>} */
const INDEXES = {
  products: [
    [{ slug: 1 }, { unique: true, name: "slug_unique" }],
    [{ "inventory.sku": 1 }, { unique: true, name: "sku_unique" }],
    [{ status: 1, order: 1 }, { name: "status_order" }],
    [{ order: 1 }, { name: "order" }],
    [
      { name: "text", notes: "text", mood: "text" },
      { name: "catalogue_text" },
    ],
  ],
  mediaassets: [
    [
      { cloudinaryPublicId: 1 },
      { unique: true, name: "cloudinaryPublicId_unique" },
    ],
    [{ folder: 1 }, { name: "folder" }],
    [{ usedIn: 1 }, { name: "usedIn" }],
    [{ tags: 1 }, { name: "tags" }],
    [{ createdAt: -1 }, { name: "createdAt_desc" }],
  ],
  users: [
    [{ phone: 1 }, { unique: true, name: "phone_unique" }],
    [{ email: 1 }, { unique: true, sparse: true, name: "email_unique_sparse" }],
    [{ role: 1, status: 1 }, { name: "role_status" }],
    [{ createdAt: -1 }, { name: "createdAt_desc" }],
  ],
  sitesettings: [[{ key: 1 }, { unique: true, name: "key_unique" }]],
  auditlogs: [
    [{ action: 1 }, { name: "action" }],
    [{ at: -1 }, { name: "at_desc" }],
    [
      { targetType: 1, targetId: 1, at: -1 },
      { name: "target_at" },
    ],
    [{ actorId: 1, at: -1 }, { name: "actor_at" }],
  ],
};

module.exports = {
  async up(db) {
    const existing = new Set(
      (await db.listCollections().toArray()).map((c) => c.name),
    );
    for (const name of COLLECTIONS) {
      if (!existing.has(name)) {
        await db.createCollection(name);
      }
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
          // index already gone — ignore
        }
      }
    }
    // Collections and their data are left in place on purpose.
  },
};

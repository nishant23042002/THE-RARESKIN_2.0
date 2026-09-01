import "./_bootstrap";

import mongoose from "mongoose";

import { dbConnect, dbDisconnect } from "@/server/db";
import { Counter, Product } from "@/server/models";
import { isProduction } from "@/server/env";

/**
 * Wipe every trace of the orders placed while building — orders, the payment
 * log, stock ledger, checkout intents, order emails, webhook receipts,
 * store-credit grants, and the order-related audit rows — then reset the order
 * counter and top every product's stock back up for continued dev testing.
 *
 * Catalogue, settings, users, sessions, coupons and carts are left untouched.
 *
 *   pnpm reset:commerce            # stock → 100
 *   pnpm reset:commerce --stock 0  # stock → 0 (pre-launch)
 *
 * Refuses to run against a production build.
 */

const RAW_COLLECTIONS = [
  "orders",
  "payments",
  "stockledgers",
  "checkoutintents",
  "emailmessages",
  "webhookevents",
  "storecredits",
];

function flagNumber(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  if (isProduction()) {
    throw new Error("reset:commerce refuses to run in production");
  }

  const stock = flagNumber("stock", 100);
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) throw new Error("no database connection");

  // Raw-driver deletes so the append-only pre-hooks on payments / stockledgers
  // don't block the wipe.
  for (const name of RAW_COLLECTIONS) {
    const exists = await db
      .listCollections({ name })
      .toArray()
      .then((c) => c.length > 0);
    if (!exists) continue;
    const { deletedCount } = await db.collection(name).deleteMany({});
    console.log(`  ${name.padEnd(16)} − ${deletedCount}`);
  }

  // Audit rows tied to orders / payments / checkout only.
  const audit = await db.collection("auditlogs").deleteMany({
    $or: [
      { targetType: { $in: ["Order", "CheckoutIntent"] } },
      { action: { $regex: /^(order|payment)\./ } },
    ],
  });
  console.log(`  auditlogs        − ${audit.deletedCount} (order/payment rows)`);

  // Reset every yearly order sequence.
  const counters = await Counter.deleteMany({ _id: { $regex: /^order-\d{4}$/ } });
  console.log(`  counters         − ${counters.deletedCount} (order-<year>)`);

  // Top stock back up.
  const res = await Product.updateMany(
    {},
    { $set: { "inventory.stock": stock } },
  );
  console.log(`  products         stock → ${stock} (${res.modifiedCount} updated)`);

  console.log("\n✓ commerce data reset — next order will be RRS-<year>-000001");
  await dbDisconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import "./_bootstrap";

import mongoose from "mongoose";

import { dbConnect, dbDisconnect } from "@/server/db";
import { Product } from "@/server/models";
import { isProduction } from "@/server/env";

/**
 * Reset inventory for dev: clear the append-only stock ledger (the "recent
 * movements" history shown on a product's edit page) and set every product's
 * on-hand stock to a flat starting figure.
 *
 * Unlike `reset:commerce` this leaves orders, payments and everything else
 * alone — it only touches `stockledgers` and `product.inventory.stock`.
 *
 *   pnpm reset:stock             # stock → 100
 *   pnpm reset:stock --stock 0   # stock → 0 (pre-launch)
 *
 * Refuses to run against a production build.
 */

function flagNumber(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

async function main() {
  if (isProduction()) {
    throw new Error("reset:stock refuses to run in production");
  }

  const stock = flagNumber("stock", 100);
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) throw new Error("no database connection");

  // Raw-driver delete — `StockLedger` has an append-only guard hook.
  const ledgerExists = await db
    .listCollections({ name: "stockledgers" })
    .toArray()
    .then((c) => c.length > 0);
  if (ledgerExists) {
    const { deletedCount } = await db.collection("stockledgers").deleteMany({});
    console.log(`  stockledgers  − ${deletedCount}`);
  }

  const res = await Product.updateMany({}, { $set: { "inventory.stock": stock } });
  console.log(`  products      stock → ${stock} (${res.modifiedCount} updated)`);

  console.log("\n✓ inventory reset — ledger cleared, stock levelled");
  await dbDisconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

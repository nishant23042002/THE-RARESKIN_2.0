import "./_bootstrap";

import { dbConnect, dbDisconnect } from "@/server/db";

/** Quick connectivity + topology probe. `pnpm db:check`. */
async function main() {
  const started = Date.now();
  const mongoose = await dbConnect();
  const { host, port, name } = mongoose.connection;
  const admin = mongoose.connection.db?.admin();
  const ping = await admin?.ping();

  console.log("✓ connected");
  console.log(`  database   ${name}`);
  console.log(`  host       ${host}:${port}`);
  console.log(`  ping       ${JSON.stringify(ping)}`);
  console.log(`  elapsed    ${Date.now() - started}ms`);

  const collections = await mongoose.connection.db
    ?.listCollections()
    .toArray();
  console.log(
    `  collections ${(collections ?? [])
      .map((c) => c.name)
      .sort()
      .join(", ") || "(none yet)"}`,
  );

  await dbDisconnect();
}

main().catch((err) => {
  console.error("✗ db check failed\n", err);
  process.exitCode = 1;
});

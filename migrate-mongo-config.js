// migrate-mongo configuration (CommonJS — run outside the Next bundler).
// Loads .env* the same way Next.js does so `MONGODB_URI` resolves locally and
// in CI without a separate dotenv step.
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

if (!process.env.MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.",
  );
}

/** @type {import('migrate-mongo').config.Config} */
const config = {
  mongodb: {
    url: process.env.MONGODB_URI,
    databaseName: process.env.MONGODB_DB || "rareskin",
    options: {},
  },
  migrationsDir: "migrations",
  changelogCollectionName: "_migrations",
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: "commonjs",
};

module.exports = config;

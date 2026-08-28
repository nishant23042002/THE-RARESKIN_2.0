import mongoose from "mongoose";

import { getEnv } from "@/server/env";
import { registerModels } from "@/server/models";

/**
 * Cached Mongoose connection for a serverless runtime.
 *
 * Every function invocation on Vercel may be a fresh module instance, but warm
 * instances are reused (Fluid Compute) — so we memoise the connection promise
 * on `globalThis` and hand every caller the same pool. Opening a new connection
 * per request would exhaust the Atlas connection limit under load.
 */
if (typeof window !== "undefined") {
  throw new Error("@/server/db must never be imported into client code");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as typeof globalThis & {
  __rareskinMongoose?: MongooseCache;
};

const cache: MongooseCache =
  globalForMongoose.__rareskinMongoose ??
  (globalForMongoose.__rareskinMongoose = { conn: null, promise: null });

/** Connect once; subsequent calls resolve immediately with the live connection. */
export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const env = getEnv();

    // Fail fast on a wrong query, keep the pool small enough for many
    // concurrent lambdas, and let migrations own index creation in production.
    mongoose.set("strictQuery", true);
    mongoose.set("autoIndex", env.NODE_ENV !== "production");
    mongoose.set("sanitizeFilter", true);

    registerModels();

    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB,
        maxPoolSize: 10,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        retryWrites: true,
        appName: "rareskin",
      })
      .then((m) => {
        m.connection.on("error", (err) => {
          console.error("[mongoose] connection error", err);
        });
        return m;
      })
      .catch((err) => {
        // Clear the rejected promise so the next request can retry.
        cache.promise = null;
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

/** Close the connection — used by scripts and tests, never by the app. */
export async function dbDisconnect(): Promise<void> {
  if (cache.conn) {
    await cache.conn.disconnect();
    cache.conn = null;
    cache.promise = null;
  }
}

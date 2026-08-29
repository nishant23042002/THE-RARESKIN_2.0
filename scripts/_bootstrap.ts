/**
 * Side-effect module: load `.env*` the way Next.js does, before any module that
 * reads `process.env` is imported. Every script imports this **first**.
 *
 * Scripts talk to the database through `@/server/db` (models + connection) and
 * plain Mongoose — never the `server-only` DAL / commerce modules, which are
 * for the request runtime.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

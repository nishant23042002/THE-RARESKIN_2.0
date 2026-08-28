/**
 * Side-effect module: load `.env*` the way Next.js does, before any module that
 * reads `process.env` is imported. Every script imports this **first**.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

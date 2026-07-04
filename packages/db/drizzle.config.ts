/**
 * Stillwater — Drizzle Kit Configuration
 *
 * Used by:
 *  - drizzle-kit generate  → create migration SQL from schema changes
 *  - drizzle-kit migrate   → apply pending migrations
 *  - drizzle-kit studio    → open Drizzle Studio GUI
 *  - drizzle-kit push      → push schema directly (dev only)
 *
 * IMPORTANT: Always use DATABASE_URL_UNPOOLED for migrations.
 * The pooled URL (PgBouncer) breaks prepared statements in migration scripts.
 * See PAD § 7.4 for migration strategy.
 */

import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load from .env.local (monorepo root) or .env
config({ path: "../../.env.local" });
config({ path: "../../.env" });

const connectionString = process.env["DATABASE_URL_UNPOOLED"];

if (!connectionString) {
  throw new Error(
    "DATABASE_URL_UNPOOLED is not defined.\n" +
    "For migrations, use the direct (non-pooled) connection string.\n" +
    "See .env.example for reference.",
  );
}

export default defineConfig({
  // ── Schema location ────────────────────────────────────────────
  schema: "./src/schema/index.ts",

  // ── Migration output directory ─────────────────────────────────
  out: "./drizzle/migrations",

  // ── Dialect ───────────────────────────────────────────────────
  dialect: "postgresql",

  // ── Database connection ────────────────────────────────────────
  // Direct connection required — NOT pooled (PgBouncer not compatible)
  dbCredentials: {
    url: connectionString,
  },

  // ── Verbose output ─────────────────────────────────────────────
  verbose: true,

  // ── Strict mode — prevents destructive operations silently ─────
  strict: true,

  // ── Table/schema filter ────────────────────────────────────────
  // Only manage the 'public' schema; don't touch auth/internal schemas
  schemaFilter: ["public"],
});

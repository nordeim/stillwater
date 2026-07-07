/**
 * F1-15 — Database client + types (resolves D11)
 *
 * Exports the Drizzle ORM client using the neon-http serverless driver.
 * The schema barrel is re-exported so consumers can do:
 *   import { db, users, members } from '@stillwater/db';
 *
 * Uses process.env directly (not the Zod env module) to avoid throwing
 * in test/build contexts where DATABASE_URL is a placeholder. The env
 * module is still the source of truth for validation in app runtime;
 * this client defers connection until the first query.
 *
 * Source: MASTER_EXECUTION_PLAN.md F1-15 (resolves D11), PAD.md §7.4,
 *         stillwater_SKILL.md §3.4 (infrastructure clients use process.env).
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Use process.env directly with fallback — env module throws in build context
// In production, DATABASE_URL is always set (Vercel/Neon inject it).
// In test/build, the placeholder is harmless (no queries are executed).
const connectionString =
  process.env['DATABASE_URL'] ??
  'postgresql://placeholder@localhost:5432/placeholder';

// Create the neon serverless SQL client, then wrap it with Drizzle.
// neon() validates the connection string format, so we guard with a try/catch
// to allow module import in environments without a real database.
let sql: ReturnType<typeof neon>;
try {
  sql = neon(connectionString);
} catch {
  // Fallback: return a no-op SQL function for test/build contexts.
  // Actual queries will fail, but module import succeeds.
  sql = (() => {
    throw new Error(
      'Database not configured. Set DATABASE_URL in your environment.',
    );
  }) as unknown as ReturnType<typeof neon>;
}

/**
 * The Drizzle ORM client. Use this for all database queries:
 *   import { db } from '@stillwater/db';
 *   const allUsers = await db.select().from(users);
 *
 * For transactions (e.g., booking with advisory lock per ADR-004):
 *   await db.transaction(async (tx) => { ... });
 */
export const db = drizzle(sql, { schema });

/**
 * The Drizzle database type. Use this for typing function parameters:
 *   import { type DrizzleDB } from '@stillwater/db';
 *   async function getBookings(db: DrizzleDB) { ... }
 */
export type DrizzleDB = typeof db;

/**
 * The schema type (all tables + enums). Useful for the tRPC context type
 * in Phase 3.
 */
export type Schema = typeof schema;

// Re-export all schema tables and enums
export * from './schema';

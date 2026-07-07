/**
 * F1-15 — Database client + types (resolves D11)
 *
 * Exports the Drizzle ORM client, dynamically selecting the driver based on
 * the DATABASE_URL. Local development uses node-postgres (pg Pool); Neon
 * production uses the neon-http serverless driver.
 *
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

import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import * as schema from './schema';

// Use process.env directly with fallback — env module throws in build context
// In production, DATABASE_URL is always set (Vercel/Neon inject it).
// In test/build, the placeholder is harmless (no queries are executed).
const connectionString =
  process.env['DATABASE_URL'] ??
  'postgresql://placeholder@localhost:5432/placeholder';

// Detect whether the target is Neon (production) or local Postgres (dev)
const isNeonUrl = connectionString.includes('neon.tech');

// Create the appropriate SQL client, then wrap it with Drizzle.
// Both constructors are lazy — no network connection is made until the first query.
let sql: ReturnType<typeof neon> | Pool;

try {
  if (isNeonUrl) {
    sql = neon(connectionString);
  } else {
    sql = new Pool({ connectionString });
  }
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
export const db = isNeonUrl
  ? drizzleNeon(sql as ReturnType<typeof neon>, { schema })
  : drizzlePg(sql as Pool, { schema });

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

/**
 * Better Auth schema tables — session, account, verification
 *
 * These 3 tables are required by Better Auth v1.6.23 for session management,
 * OAuth account linking, and email verification tokens. The field names match
 * Better Auth's expected schema (per guide_auth-v5_vs_better-auth.md
 * "Database Schema Differences" + Better Auth dist types).
 *
 * The `users` table is defined separately in `users.ts` (Phase 1) and is
 * referenced by these tables via foreign keys. Better Auth is configured to
 * use `users` (plural) via `user.modelName: 'users'` in the auth config.
 *
 * Source: MEP Phase 2 Cycle 0, guide_auth-v5_vs_better-auth.md,
 *         Better Auth v1.6.23 dist/db/schema.d.mts field definitions.
 */

import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

// ── Session (Better Auth) ──────────────────────────────────────────
// Stores encrypted session tokens. One user can have multiple sessions
// (different devices). Token is unique for fast lookup on every request.
export const session = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ── Account (Better Auth) ──────────────────────────────────────────
// OAuth account links (Google) + magic link credentials. A user can have
// multiple accounts (e.g., Google + magic link). providerId is the OAuth
// provider name ('google', 'magic-link'); accountId is the provider-specific ID.
export const account = pgTable('account', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { mode: 'date' }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { mode: 'date' }),
  scope: text('scope'),
  password: text('password'), // For password-based auth (disabled in Stillwater, but Better Auth expects the column)
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ── Verification (Better Auth) ─────────────────────────────────────
// Email verification tokens + magic link tokens. Single-use, expire after
// a short window (10 min for magic link per SKILL §5.6.1).
export const verification = pgTable('verification', {
  id: uuid('id').primaryKey().defaultRandom(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// Re-export users for convenience (auth-tables consumers may need it)
export { users };

/**
 * F1-02 — users table (Better Auth compatible)
 *
 * Better Auth v1.6.23 requires `emailVerified` as a boolean (not timestamp).
 * Phase 1 originally used timestamp per PAD §7.2, but Cycle 0 of Phase 2
 * changed it to boolean for Better Auth compatibility (per guide_auth-v5_vs_
 * better-auth.md "Database Schema Differences").
 *
 * Better Auth is configured to use this `users` table (plural) via
 * `user.modelName: 'users'` in the auth config (packages/auth/src/config.ts).
 *
 * Source: PAD.md §7.2 USER entity, MASTER_EXECUTION_PLAN.md F1-02 + Phase 2 Cycle 0.
 */

import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  emailVerified: boolean('email_verified').default(false).notNull(), // Better Auth: boolean, not timestamp
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

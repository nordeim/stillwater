/**
 * F1-02 — users table (Better Auth compatible)
 *
 * Better Auth uses a slightly different schema than Auth.js v5:
 * - emailVerified is a boolean (not timestamp) in Better Auth's default schema
 *   BUT PAD §7.2 specifies timestamp — we follow PAD (ADR-008).
 * - Better Auth's Drizzle adapter is flexible; this schema is compatible.
 *
 * Source: PAD.md §7.2 USER entity, MASTER_EXECUTION_PLAN.md F1-02.
 */

import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

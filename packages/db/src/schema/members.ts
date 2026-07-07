/**
 * F1-03 — members table
 *
 * Adds `stripeCustomerId` column missing from PAD §7.2 (D6 fix).
 * This column is required for Stripe webhook customer lookups.
 *
 * Source: PAD.md §7.2 MEMBER entity + MEP D6 (stripeCustomerId addition).
 */

import { pgTable, uuid, text, date, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const members = pgTable(
  'members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    phone: text('phone'),
    dateOfBirth: date('date_of_birth', { mode: 'date' }),
    emergencyContact: text('emergency_contact'),
    emergencyPhone: text('emergency_phone'),
    notes: text('notes'),
    joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    // D6 fix: stripeCustomerId for webhook lookups (nullable — not all members have Stripe accounts)
    stripeCustomerId: text('stripe_customer_id').unique(),
  },
  (table) => [
    // Fast lookup for Stripe webhook customer → member resolution
    index('idx_members_stripe_customer_id').on(table.stripeCustomerId),
  ],
);

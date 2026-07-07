/**
 * F1-12 — payment_events + class_packages tables
 *
 * payment_events: idempotent Stripe webhook event log
 *   Critical unique index (PAD §7.3): idx_payment_events_stripe_id
 *     ON payment_events (stripe_event_id) — idempotency for webhook retries
 *
 * class_packages: pre-purchased credit bundles (e.g., "10-class pack")
 *
 * Source: PAD.md §7.2 PAYMENT_EVENT + CLASS_PACKAGE entities + §7.3,
 *         MASTER_EXECUTION_PLAN.md F1-12.
 */

import { pgTable, uuid, text, integer, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { paymentStatusEnum } from './enums';
import { members } from './members';

export const paymentEvents = pgTable(
  'payment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id').references(() => members.id, { onDelete: 'set null' }),
    stripeEventId: text('stripe_event_id').notNull().unique(),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    status: paymentStatusEnum('status').default('pending').notNull(),
    processedAt: timestamp('processed_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    // PAD §7.3 critical unique index: idempotency for Stripe webhook retries
    // (already enforced by .unique() on the column, but explicit index for documentation)
    uniqueIndex('idx_payment_events_stripe_id').on(table.stripeEventId),
  ],
);

export const classPackages = pgTable('class_packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  totalCredits: integer('total_credits').notNull(),
  usedCredits: integer('used_credits').default(0).notNull(),
  purchasedAt: timestamp('purchased_at', { mode: 'date' }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
});

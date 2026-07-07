/**
 * F1-11 — membership_plans + member_subscriptions tables
 *
 * membership_plans: subscription products (Drop-in, Unlimited, 10-class Pack)
 * member_subscriptions: a member's active instance of a plan, tracked via Stripe
 *
 * Critical index (PAD §7.3): idx_subscriptions_member_status
 *   ON member_subscriptions (member_id, status) WHERE status = 'active'
 *   Powers fast "active subscription" lookups for booking eligibility.
 *
 * Source: PAD.md §7.2 MEMBERSHIP_PLAN + MEMBER_SUBSCRIPTION entities + §7.3,
 *         MASTER_EXECUTION_PLAN.md F1-11.
 */

import { pgTable, uuid, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { billingIntervalEnum, subscriptionStatusEnum } from './enums';
import { members } from './members';

export const membershipPlans = pgTable('membership_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  stripePriceId: text('stripe_price_id').notNull().unique(),
  interval: billingIntervalEnum('interval').notNull(),
  classCreditsPerCycle: integer('class_credits_per_cycle'), // null = unlimited
  guestPassesPerCycle: integer('guest_passes_per_cycle').default(0),
  allowsVirtual: boolean('allows_virtual').default(true).notNull(),
  allowsInPerson: boolean('allows_in_person').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const memberSubscriptions = pgTable(
  'member_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => membershipPlans.id, { onDelete: 'restrict' }),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    status: subscriptionStatusEnum('status').notNull(),
    currentPeriodStart: timestamp('current_period_start', { mode: 'date' }),
    currentPeriodEnd: timestamp('current_period_end', { mode: 'date' }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    pausedAt: timestamp('paused_at', { mode: 'date' }),
    pauseResumesAt: timestamp('pause_resumes_at', { mode: 'date' }),
    creditsRemaining: integer('credits_remaining'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    // PAD §7.3 critical index: fast "active subscription" lookups
    index('idx_subscriptions_member_status')
      .on(table.memberId, table.status)
      .where(sql`${table.status} = 'active'`),
  ],
);

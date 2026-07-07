/**
 * F1-01 — PostgreSQL Enums (Drizzle pgEnum)
 *
 * All 8 enums defined as Drizzle pgEnum (NOT TypeScript enum — erasableSyntaxOnly
 * forbids enum/namespace; use pgEnum per SKILL §13.4 + §9.9 Gotcha 8).
 *
 * Enum names use PostgreSQL snake_case convention (PAD §7.2).
 * Enum values match PAD §7.2 verbatim.
 *
 * Source: PAD.md §7.2, MASTER_EXECUTION_PLAN.md F1-01 (resolves D5).
 */

import { pgEnum } from 'drizzle-orm/pg-core';

// ── Identity / RBAC ────────────────────────────────────────────────
export const studioRoleEnum = pgEnum('studio_role', [
  'member',
  'instructor',
  'staff',
  'manager',
  'owner',
]);

// ── Class catalog ──────────────────────────────────────────────────
export const classLevelEnum = pgEnum('class_level', [
  'all',
  'beginner',
  'intermediate',
  'advanced',
]);

// ── Booking ────────────────────────────────────────────────────────
export const sessionStatusEnum = pgEnum('session_status', [
  'scheduled',
  'cancelled',
  'completed',
  'in_progress',
]);

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
  'confirmed',
  'cancelled',
  'attended',
  'no_show',
]);

export const waitlistStatusEnum = pgEnum('waitlist_status', [
  'waiting',
  'offered',
  'accepted',
  'expired',
  'removed',
]);

// ── Billing ────────────────────────────────────────────────────────
export const billingIntervalEnum = pgEnum('billing_interval', [
  'month',
  'year',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'paused',
  'cancelled',
  'past_due',
  'trialing',
  'incomplete',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processed',
  'failed',
  'ignored',
]);

/**
 * F1-11 — membership_plans + member_subscriptions test suite (RED phase)
 *
 * Per MEP Phase 1 F1-11 + PAD §7.2 MEMBERSHIP_PLAN + MEMBER_SUBSCRIPTION entities
 * + PAD §7.3 critical index idx_subscriptions_member_status.
 */

import { describe, it, expect } from 'vitest';
import { membershipPlans, memberSubscriptions } from './memberships';

describe('F1-11: membership_plans table', () => {
  it('has the correct table name', () => {
    expect(membershipPlans[Symbol.for('drizzle:Name')]).toBe('membership_plans');
  });

  it('has stripePriceId column that is unique and notNull', () => {
    expect(membershipPlans.stripePriceId).toBeDefined();
    expect(membershipPlans.stripePriceId.getSQLType()).toBe('text');
    expect(membershipPlans.stripePriceId.notNull).toBe(true);
    expect(membershipPlans.stripePriceId.isUnique).toBe(true);
  });

  it('has interval column using billingIntervalEnum', () => {
    expect(membershipPlans.interval).toBeDefined();
    expect(membershipPlans.interval.enumValues).toEqual(['month', 'year']);
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(membershipPlans.id).toBeDefined();
    expect(membershipPlans.id.getSQLType()).toBe('uuid');
    expect(membershipPlans.id.primary).toBe(true);
    expect(membershipPlans.id.hasDefault).toBe(true);
  });
});

describe('F1-11: member_subscriptions table', () => {
  it('has the correct table name', () => {
    expect(memberSubscriptions[Symbol.for('drizzle:Name')]).toBe('member_subscriptions');
  });

  it('has stripeSubscriptionId column that is unique', () => {
    expect(memberSubscriptions.stripeSubscriptionId).toBeDefined();
    expect(memberSubscriptions.stripeSubscriptionId.getSQLType()).toBe('text');
    expect(memberSubscriptions.stripeSubscriptionId.isUnique).toBe(true);
  });

  it('has status column using subscriptionStatusEnum', () => {
    expect(memberSubscriptions.status).toBeDefined();
    expect(memberSubscriptions.status.enumValues).toEqual([
      'active',
      'paused',
      'cancelled',
      'past_due',
      'trialing',
      'incomplete',
    ]);
  });

  it('has memberId and planId columns as uuid notNull (FKs verified in migration)', () => {
    expect(memberSubscriptions.memberId).toBeDefined();
    expect(memberSubscriptions.memberId.getSQLType()).toBe('uuid');
    expect(memberSubscriptions.memberId.notNull).toBe(true);

    expect(memberSubscriptions.planId).toBeDefined();
    expect(memberSubscriptions.planId.getSQLType()).toBe('uuid');
    expect(memberSubscriptions.planId.notNull).toBe(true);
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(memberSubscriptions.id).toBeDefined();
    expect(memberSubscriptions.id.getSQLType()).toBe('uuid');
    expect(memberSubscriptions.id.primary).toBe(true);
    expect(memberSubscriptions.id.hasDefault).toBe(true);
  });
});

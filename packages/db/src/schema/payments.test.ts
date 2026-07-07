/**
 * F1-12 — payment_events + class_packages test suite (RED phase)
 *
 * Per MEP Phase 1 F1-12 + PAD §7.2 PAYMENT_EVENT + CLASS_PACKAGE entities
 * + PAD §7.3 critical unique index idx_payment_events_stripe_id (idempotency).
 */

import { describe, it, expect } from 'vitest';
import { paymentEvents, classPackages } from './payments';

describe('F1-12: payment_events table', () => {
  it('has the correct table name', () => {
    expect(paymentEvents[Symbol.for('drizzle:Name')]).toBe('payment_events');
  });

  it('has stripeEventId column that is unique (idempotency — PAD §7.3)', () => {
    expect(paymentEvents.stripeEventId).toBeDefined();
    expect(paymentEvents.stripeEventId.getSQLType()).toBe('text');
    expect(paymentEvents.stripeEventId.notNull).toBe(true);
    expect(paymentEvents.stripeEventId.isUnique).toBe(true);
  });

  it('has status column using paymentStatusEnum', () => {
    expect(paymentEvents.status).toBeDefined();
    expect(paymentEvents.status.enumValues).toEqual([
      'pending',
      'processed',
      'failed',
      'ignored',
    ]);
  });

  it('has payload column as jsonb', () => {
    expect(paymentEvents.payload).toBeDefined();
    expect(paymentEvents.payload.getSQLType()).toBe('jsonb');
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(paymentEvents.id).toBeDefined();
    expect(paymentEvents.id.getSQLType()).toBe('uuid');
    expect(paymentEvents.id.primary).toBe(true);
    expect(paymentEvents.id.hasDefault).toBe(true);
  });
});

describe('F1-12: class_packages table', () => {
  it('has the correct table name', () => {
    expect(classPackages[Symbol.for('drizzle:Name')]).toBe('class_packages');
  });

  it('has usedCredits column defaulting to 0', () => {
    expect(classPackages.usedCredits).toBeDefined();
    expect(classPackages.usedCredits.getSQLType()).toBe('integer');
    expect(classPackages.usedCredits.hasDefault).toBe(true);
  });

  it('has totalCredits column as integer notNull', () => {
    expect(classPackages.totalCredits).toBeDefined();
    expect(classPackages.totalCredits.getSQLType()).toBe('integer');
    expect(classPackages.totalCredits.notNull).toBe(true);
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(classPackages.id).toBeDefined();
    expect(classPackages.id.getSQLType()).toBe('uuid');
    expect(classPackages.id.primary).toBe(true);
    expect(classPackages.id.hasDefault).toBe(true);
  });
});

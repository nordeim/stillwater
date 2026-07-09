/**
 * F7-14 — Stripe utility function tests
 */

import { describe, it, expect } from 'vitest';

import { formatStripeAmount, stripeEventToWebhookLog } from './utils';

describe('formatStripeAmount', () => {
  it('formats cents as USD currency', () => {
    expect(formatStripeAmount(9900)).toBe('$99.00');
  });

  it('formats zero', () => {
    expect(formatStripeAmount(0)).toBe('$0.00');
  });

  it('formats small amounts', () => {
    expect(formatStripeAmount(500)).toBe('$5.00');
    expect(formatStripeAmount(99)).toBe('$0.99');
  });

  it('formats large amounts', () => {
    expect(formatStripeAmount(100000)).toBe('$1,000.00');
  });

  it('handles null/undefined safely (returns $0.00)', () => {
    expect(formatStripeAmount(null as unknown as number)).toBe('$0.00');
    expect(formatStripeAmount(undefined as unknown as number)).toBe('$0.00');
  });
});

describe('stripeEventToWebhookLog', () => {
  it('formats event as compact log string', () => {
    const event = {
      id: 'evt_123',
      type: 'invoice.paid',
      data: { object: { id: 'in_001' } },
    };
    expect(stripeEventToWebhookLog(event)).toBe('evt_123 | invoice.paid | in_001');
  });

  it('handles missing object ID', () => {
    const event = {
      id: 'evt_456',
      type: 'customer.subscription.created',
      data: { object: {} },
    };
    expect(stripeEventToWebhookLog(event)).toBe(
      'evt_456 | customer.subscription.created | unknown',
    );
  });
});

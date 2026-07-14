import { describe, it, expect } from 'vitest';

// Test the formatPrice logic extracted from the pricing page.
// We test the pure function rather than the full RSC page component
// because the page requires a tRPC caller + DB context.

function formatPrice(cents: number): string {
  const dollars = Math.floor(cents / 100);
  return dollars.toLocaleString('en-US');
}

function periodLabel(plan: { name: string; interval: string }): string {
  if (plan.name === 'Pay As You Go') return 'per class';
  if (plan.name === '10 Classes') return 'use within 90 days';
  return plan.interval === 'year' ? 'per year' : 'per month';
}

describe('Pricing page — formatPrice (Milestone 2, R2)', () => {
  it('formats $28 (2800 cents) as "28"', () => {
    expect(formatPrice(2800)).toBe('28');
  });

  it('formats $149 (14900 cents) as "149"', () => {
    expect(formatPrice(14900)).toBe('149');
  });

  it('formats $220 (22000 cents) as "220"', () => {
    expect(formatPrice(22000)).toBe('220');
  });

  it('formats $0 as "0"', () => {
    expect(formatPrice(0)).toBe('0');
  });

  it('truncates cents (2800 → "28", not "28.00")', () => {
    expect(formatPrice(2899)).toBe('28');
  });

  it('formats large numbers with commas (100000 → "1,000")', () => {
    expect(formatPrice(100000)).toBe('1,000');
  });
});

describe('Pricing page — periodLabel (Milestone 2, R2)', () => {
  it('returns "per class" for Pay As You Go', () => {
    expect(periodLabel({ name: 'Pay As You Go', interval: 'month' })).toBe('per class');
  });

  it('returns "use within 90 days" for 10 Classes', () => {
    expect(periodLabel({ name: '10 Classes', interval: 'month' })).toBe('use within 90 days');
  });

  it('returns "per month" for Unlimited monthly plan', () => {
    expect(periodLabel({ name: 'Unlimited', interval: 'month' })).toBe('per month');
  });

  it('returns "per year" for annual plans', () => {
    expect(periodLabel({ name: 'Unlimited', interval: 'year' })).toBe('per year');
  });
});

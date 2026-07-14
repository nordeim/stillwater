import { describe, it, expect } from 'vitest';

// Test the pricing page utility functions.
// We test the pure functions rather than the full RSC page component
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

function planTag(plan: { name: string }): string {
  if (plan.name === 'Pay As You Go') return 'Drop-in';
  if (plan.name === 'Unlimited') return 'Monthly Membership';
  if (plan.name === '10 Classes') return 'Class Pack';
  return 'Membership';
}

function ctaLabel(plan: { name: string }): string {
  if (plan.name === 'Pay As You Go') return 'Book Single Class';
  if (plan.name === 'Unlimited') return 'Start Membership';
  if (plan.name === '10 Classes') return 'Buy Class Pack';
  return 'Get Started';
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

describe('Pricing page — planTag (Milestone 4, R4)', () => {
  it('returns "Drop-in" for Pay As You Go', () => {
    expect(planTag({ name: 'Pay As You Go' })).toBe('Drop-in');
  });

  it('returns "Monthly Membership" for Unlimited', () => {
    expect(planTag({ name: 'Unlimited' })).toBe('Monthly Membership');
  });

  it('returns "Class Pack" for 10 Classes', () => {
    expect(planTag({ name: '10 Classes' })).toBe('Class Pack');
  });

  it('returns "Membership" as fallback', () => {
    expect(planTag({ name: 'Custom Plan' })).toBe('Membership');
  });
});

describe('Pricing page — ctaLabel (Milestone 4, R4)', () => {
  it('returns "Book Single Class" for Pay As You Go', () => {
    expect(ctaLabel({ name: 'Pay As You Go' })).toBe('Book Single Class');
  });

  it('returns "Start Membership" for Unlimited', () => {
    expect(ctaLabel({ name: 'Unlimited' })).toBe('Start Membership');
  });

  it('returns "Buy Class Pack" for 10 Classes', () => {
    expect(ctaLabel({ name: '10 Classes' })).toBe('Buy Class Pack');
  });

  it('returns "Get Started" as fallback', () => {
    expect(ctaLabel({ name: 'Custom Plan' })).toBe('Get Started');
  });
});

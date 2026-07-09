/**
 * F8-07 — membership-credit-grant worker tests (JOB-007)
 *
 * Tests the membership-credit-grant Trigger.dev task.
 *
 * Mock strategy:
 * - @trigger.dev/sdk: task() returns its config (so we can access .run)
 * - @stillwater/db: not used (no-op job) — but still mocked for consistency
 *
 * Per MEP F8-07: 3 tests
 * (1) Returns success with correct shape (no-op for v1)
 * (2) Has correct task config (30s, 5 retries — money-critical)
 * (3) Has correct task id
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: unknown) => config),
}));

vi.mock('@stillwater/db', () => ({
  db: {
    query: {},
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('membership-credit-grant (JOB-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with correct shape (no-op for v1)', async () => {
    const { membershipCreditGrant } = await import('./membership-credit-grant');

    const result = await membershipCreditGrant.run({
      memberId: 'mem-1',
      subscriptionId: 'sub-1',
    });

    expect(result.granted).toBe(true);
    expect(result.memberId).toBe('mem-1');
    expect(result.note).toContain('synchronously');
  });

  it('has correct task config (30s, 5 retries — money-critical)', async () => {
    const { membershipCreditGrant } = await import('./membership-credit-grant');
    expect(membershipCreditGrant.maxDuration).toBe(30);
    expect(membershipCreditGrant.retry).toEqual({
      maxAttempts: 5,
      minTimeoutInMs: 1000,
      factor: 2,
      randomize: true,
    });
  });

  it('has correct task id', async () => {
    const { membershipCreditGrant } = await import('./membership-credit-grant');
    expect(membershipCreditGrant.id).toBe('membership-credit-grant');
  });
});

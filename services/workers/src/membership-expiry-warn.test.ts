/**
 * F8-08 — membership-expiry-warn worker tests (JOB-008)
 *
 * Tests the membership-expiry-warn Trigger.dev task.
 *
 * Mock strategy:
 * - @trigger.dev/sdk: task() returns its config (so we can access .run)
 * - @stillwater/email: sendMembershipRenewal is a vi.fn()
 * - @stillwater/db: db.query.members.findFirst returns fixtures
 *
 * Per MEP F8-08: 3 tests
 * (1) Sends renewal email with portal URL
 * (2) Returns sent:false when member is not found
 * (3) Uses correct task config (30s, 3 retries)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSendMembershipRenewal = vi.fn();
const mockMembersFindFirst = vi.fn();

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: unknown) => config),
}));

vi.mock('@stillwater/email', () => ({
  sendMembershipRenewal: (...args: unknown[]) =>
    mockSendMembershipRenewal(...args),
}));

vi.mock('@stillwater/db', () => ({
  db: {
    query: {
      members: {
        findFirst: (...args: unknown[]) => mockMembersFindFirst(...args),
      },
    },
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('membership-expiry-warn (JOB-008)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends renewal email with portal URL', async () => {
    const { membershipExpiryWarn } = await import('./membership-expiry-warn');

    const memberFixture = {
      id: 'mem-1',
      displayName: 'Jane Doe',
      user: { id: 'usr-1', email: 'jane@example.com' },
    };
    mockMembersFindFirst.mockResolvedValue(memberFixture);
    mockSendMembershipRenewal.mockResolvedValue(undefined);

    await membershipExpiryWarn.run({
      memberId: 'mem-1',
      subscriptionId: 'sub-1',
      renewalDate: 'August 10, 2026',
      planName: 'Unlimited Monthly',
    });

    expect(mockMembersFindFirst).toHaveBeenCalledTimes(1);
    expect(mockSendMembershipRenewal).toHaveBeenCalledWith({
      to: 'jane@example.com',
      memberName: 'Jane Doe',
      renewalDate: 'August 10, 2026',
      planName: 'Unlimited Monthly',
      portalUrl: expect.stringContaining('/membership'),
    });
  });

  it('returns sent:false when member is not found', async () => {
    const { membershipExpiryWarn } = await import('./membership-expiry-warn');
    mockMembersFindFirst.mockResolvedValue(undefined);

    const result = await membershipExpiryWarn.run({
      memberId: 'missing',
      subscriptionId: 'sub-1',
      renewalDate: 'August 10, 2026',
      planName: 'Unlimited Monthly',
    });

    expect(result.sent).toBe(false);
    expect(mockSendMembershipRenewal).not.toHaveBeenCalled();
  });

  it('has correct task config (30s, 3 retries)', async () => {
    const { membershipExpiryWarn } = await import('./membership-expiry-warn');
    expect(membershipExpiryWarn.id).toBe('membership-expiry-warn');
    expect(membershipExpiryWarn.maxDuration).toBe(30);
    expect(membershipExpiryWarn.retry).toEqual({
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      factor: 2,
      randomize: true,
    });
  });
});

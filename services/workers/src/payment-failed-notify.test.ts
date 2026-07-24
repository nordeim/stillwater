/**
 * F8-09 — payment-failed-notify worker tests (JOB-009)
 *
 * Tests the payment-failed-notify Trigger.dev task.
 *
 * Mock strategy:
 * - @trigger.dev/sdk: task() returns its config (so we can access .run)
 * - @stillwater/email: sendPaymentFailed is a vi.fn()
 * - @stillwater/db: db.query.members.findFirst returns fixtures
 *
 * Per MEP F8-09: 3 tests
 * (1) Sends payment failed email with portal URL
 * (2) Returns sent:false when member is not found
 * (3) Uses correct task config (30s, 3 retries)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSendPaymentFailed = vi.fn();
const mockMembersFindFirst = vi.fn();

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: unknown) => config),
}));

vi.mock('@stillwater/email', () => ({
  sendPaymentFailed: (...args: unknown[]) => mockSendPaymentFailed(...args),
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

describe('payment-failed-notify (JOB-009)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends payment failed email with portal URL', async () => {
    const { paymentFailedNotify } = await import('./payment-failed-notify');

    const memberFixture = {
      id: 'mem-1',
      displayName: 'Jane Doe',
      stripeCustomerId: 'cus_ABC123',
      user: { id: 'usr-1', email: 'jane@example.com' },
    };
    mockMembersFindFirst.mockResolvedValue(memberFixture);
    mockSendPaymentFailed.mockResolvedValue(undefined);

    // V19-17 fix: payload now uses customerId (not memberId) — matches what
    // the webhook handler (packages/payments/src/webhooks.ts) actually sends.
    await paymentFailedNotify.run({
      customerId: 'cus_ABC123',
      portalUrl: 'https://billing.stripe.com/session/abc123',
    });

    expect(mockMembersFindFirst).toHaveBeenCalledTimes(1);
    expect(mockSendPaymentFailed).toHaveBeenCalledWith({
      to: 'jane@example.com',
      memberName: 'Jane Doe',
      portalUrl: 'https://billing.stripe.com/session/abc123',
    });
  });

  it('returns sent:false when member is not found', async () => {
    const { paymentFailedNotify } = await import('./payment-failed-notify');
    mockMembersFindFirst.mockResolvedValue(undefined);

    const result = await paymentFailedNotify.run({
      customerId: 'cus_MISSING',
      portalUrl: 'https://billing.stripe.com/session/abc123',
    });

    expect(result.sent).toBe(false);
    expect(mockSendPaymentFailed).not.toHaveBeenCalled();
  });

  it('has correct task config (30s, 3 retries)', async () => {
    const { paymentFailedNotify } = await import('./payment-failed-notify');
    expect(paymentFailedNotify.id).toBe('payment-failed-notify');
    expect(paymentFailedNotify.maxDuration).toBe(30);
    expect(paymentFailedNotify.retry).toEqual({
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      factor: 2,
      randomize: true,
    });
  });
});

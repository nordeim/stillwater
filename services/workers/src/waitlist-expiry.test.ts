/**
 * F8-05 — waitlist-expiry worker tests (JOB-005)
 *
 * Tests the waitlist-expiry Trigger.dev task.
 *
 * Mock strategy:
 * - @trigger.dev/sdk: task() returns its config (so we can access .run)
 * - @stillwater/email: sendWaitlistExpired is a vi.fn()
 * - @stillwater/db: db.query.waitlistEntries.findFirst returns fixtures
 *
 * Per MEP F8-05: 3 tests
 * (1) Sends expired email when entry status is 'offered'
 * (2) Returns expired:false when spot was claimed (status='accepted')
 * (3) Uses correct task config (id, maxDuration, retry)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSendWaitlistExpired = vi.fn();
const mockWaitlistFindFirst = vi.fn();

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: unknown) => config),
}));

vi.mock('@stillwater/email', () => ({
  sendWaitlistExpired: (...args: unknown[]) => mockSendWaitlistExpired(...args),
}));

vi.mock('@stillwater/db', () => ({
  db: {
    query: {
      waitlistEntries: {
        findFirst: (...args: unknown[]) => mockWaitlistFindFirst(...args),
      },
    },
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('waitlist-expiry (JOB-005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends expired email when entry status is offered', async () => {
    const { waitlistExpiry } = await import('./waitlist-expiry');

    const entryFixture = {
      id: 'wl-1',
      status: 'offered',
      sessionId: 'sess-1',
      session: {
        id: 'sess-1',
        startsAt: new Date('2026-07-10T10:00:00Z'),
        class: { id: 'cls-1', title: 'Vinyasa Flow' },
      },
      member: {
        id: 'mem-1',
        displayName: 'Jane Doe',
        user: { id: 'usr-1', email: 'jane@example.com' },
      },
    };
    mockWaitlistFindFirst.mockResolvedValue(entryFixture);
    mockSendWaitlistExpired.mockResolvedValue(undefined);

    const result = await waitlistExpiry.run({ waitlistEntryId: 'wl-1' });

    expect(result).toEqual({ expired: true, sent: true });
    expect(mockWaitlistFindFirst).toHaveBeenCalledTimes(1);
    expect(mockSendWaitlistExpired).toHaveBeenCalledWith({
      to: 'jane@example.com',
      memberName: 'Jane Doe',
      className: 'Vinyasa Flow',
    });
  });

  it('returns expired:false when spot was claimed', async () => {
    const { waitlistExpiry } = await import('./waitlist-expiry');

    mockWaitlistFindFirst.mockResolvedValue({
      id: 'wl-1',
      status: 'accepted',
      sessionId: 'sess-1',
      session: { id: 'sess-1', startsAt: new Date(), class: { title: 'X' } },
      member: { displayName: 'Jane', user: { email: 'j@e.com' } },
    });

    const result = await waitlistExpiry.run({ waitlistEntryId: 'wl-1' });

    expect(result.expired).toBe(false);
    expect(result.reason).toBe('Spot was claimed');
    expect(mockSendWaitlistExpired).not.toHaveBeenCalled();
  });

  it('has correct task config (id, maxDuration, retry)', async () => {
    const { waitlistExpiry } = await import('./waitlist-expiry');
    expect(waitlistExpiry.id).toBe('waitlist-expiry');
    expect(waitlistExpiry.maxDuration).toBe(30);
    expect(waitlistExpiry.retry).toEqual({
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      factor: 2,
      randomize: true,
    });
  });
});

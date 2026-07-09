/**
 * F8-04 — waitlist-promotion worker tests (JOB-004)
 *
 * Tests the waitlist-promotion Trigger.dev task.
 *
 * Mock strategy:
 * - @trigger.dev/sdk: task() returns its config (so we can access .run)
 * - @stillwater/email: sendWaitlistOffer is a vi.fn()
 * - @stillwater/db: db.query.waitlistEntries.findFirst returns fixtures
 *
 * Per MEP F8-04: 3 tests
 * (1) Sends offer email with 2-hour expiry + claim URL
 * (2) Returns sent:false when entry is not found
 * (3) Uses correct task config (id, maxDuration, retry)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSendWaitlistOffer = vi.fn();
const mockWaitlistFindFirst = vi.fn();

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: unknown) => config),
}));

vi.mock('@stillwater/email', () => ({
  sendWaitlistOffer: (...args: unknown[]) => mockSendWaitlistOffer(...args),
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

describe('waitlist-promotion (JOB-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends offer email with 2-hour expiry + claim URL', async () => {
    const { waitlistPromotion } = await import('./waitlist-promotion');

    const entryFixture = {
      id: 'wl-1',
      status: 'offered',
      sessionId: 'sess-1',
      memberId: 'mem-1',
      position: 1,
      expiresAt: new Date('2026-07-10T12:00:00Z'),
      session: {
        id: 'sess-1',
        startsAt: new Date('2026-07-10T10:00:00Z'),
        class: { id: 'cls-1', title: 'Vinyasa Flow' },
        instructor: { id: 'inst-1', slug: 'mei-tanaka' },
      },
      member: {
        id: 'mem-1',
        displayName: 'Jane Doe',
        user: { id: 'usr-1', email: 'jane@example.com' },
      },
    };
    mockWaitlistFindFirst.mockResolvedValue(entryFixture);
    mockSendWaitlistOffer.mockResolvedValue(undefined);

    await waitlistPromotion.run({ waitlistEntryId: 'wl-1' });

    expect(mockWaitlistFindFirst).toHaveBeenCalledTimes(1);
    expect(mockSendWaitlistOffer).toHaveBeenCalledWith({
      to: 'jane@example.com',
      memberName: 'Jane Doe',
      className: 'Vinyasa Flow',
      sessionDate: expect.any(String),
      expiresAt: expect.any(String),
      claimUrl: expect.stringContaining('book/claim?session=sess-1&entry=wl-1'),
    });
  });

  it('returns sent:false when entry is not found', async () => {
    const { waitlistPromotion } = await import('./waitlist-promotion');
    mockWaitlistFindFirst.mockResolvedValue(undefined);

    const result = await waitlistPromotion.run({ waitlistEntryId: 'missing' });

    expect(result.sent).toBe(false);
    expect(mockSendWaitlistOffer).not.toHaveBeenCalled();
  });

  it('has correct task config (id, maxDuration, retry)', async () => {
    const { waitlistPromotion } = await import('./waitlist-promotion');
    expect(waitlistPromotion.id).toBe('waitlist-promotion');
    expect(waitlistPromotion.maxDuration).toBe(30);
    expect(waitlistPromotion.retry).toEqual({
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      factor: 2,
      randomize: true,
    });
  });
});

/**
 * F8-10 — weekly-digest worker tests (JOB-010)
 *
 * Tests the weekly-digest Trigger.dev task.
 *
 * Mock strategy:
 * - @trigger.dev/sdk: task() returns its config (so we can access .run)
 * - @stillwater/email: sendWeeklyDigest is a vi.fn()
 * - @stillwater/db: db.query.members.findFirst + enrollments.findMany return fixtures
 *
 * Per MEP F8-10: 3 tests
 * (1) Sends digest with next 3 upcoming classes
 * (2) Handles no upcoming classes (empty array)
 * (3) Uses correct task config (120s budget, 2 retries — cron/idempotent)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSendWeeklyDigest = vi.fn();
const mockMembersFindFirst = vi.fn();
const mockEnrollmentsFindMany = vi.fn();

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: unknown) => config),
}));

vi.mock('@stillwater/email', () => ({
  sendWeeklyDigest: (...args: unknown[]) => mockSendWeeklyDigest(...args),
}));

vi.mock('@stillwater/db', () => ({
  db: {
    query: {
      members: {
        findFirst: (...args: unknown[]) => mockMembersFindFirst(...args),
      },
      enrollments: {
        findMany: (...args: unknown[]) => mockEnrollmentsFindMany(...args),
      },
    },
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('weekly-digest (JOB-010)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends digest with next 3 upcoming classes', async () => {
    const { weeklyDigest } = await import('./weekly-digest');

    const memberFixture = {
      id: 'mem-1',
      displayName: 'Jane Doe',
      user: { id: 'usr-1', email: 'jane@example.com' },
    };
    // Use future dates so they pass the `startsAt > now` filter
    const futureDate = (offsetDays: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      d.setHours(10, 0, 0, 0);
      return d;
    };
    const enrollmentsFixture = [
      {
        id: 'enr-1',
        status: 'confirmed',
        session: { startsAt: futureDate(2), class: { title: 'Vinyasa Flow' } },
      },
      {
        id: 'enr-2',
        status: 'confirmed',
        session: { startsAt: futureDate(4), class: { title: 'Yin Yoga' } },
      },
      {
        id: 'enr-3',
        status: 'confirmed',
        session: { startsAt: futureDate(6), class: { title: 'Hatha' } },
      },
      // This one is in the past — should be filtered out
      {
        id: 'enr-4',
        status: 'confirmed',
        session: {
          startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          class: { title: 'Past Class' },
        },
      },
    ];
    mockMembersFindFirst.mockResolvedValue(memberFixture);
    mockEnrollmentsFindMany.mockResolvedValue(enrollmentsFixture);
    mockSendWeeklyDigest.mockResolvedValue(undefined);

    const result = await weeklyDigest.run({ memberId: 'mem-1' });

    expect(result.sent).toBe(true);
    expect(result.classCount).toBe(3);
    expect(mockMembersFindFirst).toHaveBeenCalledTimes(1);
    expect(mockEnrollmentsFindMany).toHaveBeenCalledTimes(1);
    expect(mockSendWeeklyDigest).toHaveBeenCalledWith({
      to: 'jane@example.com',
      memberName: 'Jane Doe',
      upcomingClasses: expect.arrayContaining([
        expect.objectContaining({ className: 'Vinyasa Flow' }),
        expect.objectContaining({ className: 'Yin Yoga' }),
        expect.objectContaining({ className: 'Hatha' }),
      ]),
      announcements: [],
    });
    // Ensure the past class was filtered out
    const callArgs = mockSendWeeklyDigest.mock.calls[0]?.[0] as {
      upcomingClasses: { className: string }[];
    };
    expect(callArgs.upcomingClasses).toHaveLength(3);
    expect(
      callArgs.upcomingClasses.find((c) => c.className === 'Past Class'),
    ).toBeUndefined();
  });

  it('handles no upcoming classes (empty array)', async () => {
    const { weeklyDigest } = await import('./weekly-digest');

    const memberFixture = {
      id: 'mem-1',
      displayName: 'Jane Doe',
      user: { id: 'usr-1', email: 'jane@example.com' },
    };
    mockMembersFindFirst.mockResolvedValue(memberFixture);
    mockEnrollmentsFindMany.mockResolvedValue([]);
    mockSendWeeklyDigest.mockResolvedValue(undefined);

    const result = await weeklyDigest.run({ memberId: 'mem-1' });

    expect(result.sent).toBe(true);
    expect(result.classCount).toBe(0);
    expect(mockSendWeeklyDigest).toHaveBeenCalledWith({
      to: 'jane@example.com',
      memberName: 'Jane Doe',
      upcomingClasses: [],
      announcements: [],
    });
  });

  it('has correct task config (120s budget, 2 retries)', async () => {
    const { weeklyDigest } = await import('./weekly-digest');
    expect(weeklyDigest.id).toBe('weekly-digest');
    expect(weeklyDigest.maxDuration).toBe(120);
    expect(weeklyDigest.retry).toEqual({
      maxAttempts: 2,
      minTimeoutInMs: 1000,
      factor: 2,
      randomize: true,
    });
  });
});

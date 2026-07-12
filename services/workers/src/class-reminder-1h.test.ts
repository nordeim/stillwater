/**
 * F8-03 — class-reminder-1h tests (JOB-003)
 *
 * Tests both the legacy sendSingleReminder path (sessionId+memberId payload)
 * and the new cron fan-out path (empty payload, queries sessions in window).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockSendClassReminder1h = vi.fn();
const mockEnrollmentFindFirst = vi.fn();
const mockSessionsFindMany = vi.fn();
const mockEnrollmentUpdateWhere = vi.fn();

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: unknown) => config),
}));

vi.mock('@stillwater/email', () => ({
  sendClassReminder1h: (...args: unknown[]) => mockSendClassReminder1h(...args),
}));

vi.mock('@stillwater/db', () => ({
  db: {
    query: {
      enrollments: { findFirst: (...a: unknown[]) => mockEnrollmentFindFirst(...a) },
      classSessions: { findMany: (...a: unknown[]) => mockSessionsFindMany(...a) },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: (...a: unknown[]) => mockEnrollmentUpdateWhere(...a),
      })),
    })),
  },
  enrollments: {
    id: 'enrollments.id',
    reminder1hSentAt: 'enrollments.reminder_1h_sent_at',
    status: 'enrollments.status',
    sessionId: 'enrollments.session_id',
    memberId: 'enrollments.member_id',
  },
}));

describe('class-reminder-1h (JOB-003) — legacy sendSingleReminder path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends 1-hour reminder for confirmed enrollment', async () => {
    const { classReminder1h } = await import('./class-reminder-1h');
    mockEnrollmentFindFirst.mockResolvedValue({
      id: 'enr-1',
      status: 'confirmed',
      session: {
        id: 'sess-1',
        startsAt: new Date(Date.now() + 55 * 60 * 1000), // 55 min from now
        class: { title: 'Vinyasa Flow' },
        instructor: { slug: 'mei-tanaka' },
      },
      member: {
        displayName: 'Jane Doe',
        user: { email: 'jane@example.com' },
      },
    });
    mockSendClassReminder1h.mockResolvedValue(undefined);
    mockEnrollmentUpdateWhere.mockResolvedValue(undefined);

    await classReminder1h.run({ sessionId: 'sess-1', memberId: 'mem-1' });

    expect(mockSendClassReminder1h).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        memberName: 'Jane Doe',
        className: 'Vinyasa Flow',
      }),
    );
  });

  it('skips if enrollment was cancelled', async () => {
    const { classReminder1h } = await import('./class-reminder-1h');
    mockEnrollmentFindFirst.mockResolvedValue({
      id: 'enr-1',
      status: 'cancelled',
      session: { id: 'sess-1', startsAt: new Date(), class: { title: 'X' }, instructor: { slug: 'x' } },
      member: { displayName: 'Jane', user: { email: 'j@e.com' } },
    });

    const result = await classReminder1h.run({ sessionId: 'sess-1', memberId: 'mem-1' });

    expect(result.sent).toBe(false);
    expect(mockSendClassReminder1h).not.toHaveBeenCalled();
  });

  it('has correct task config (30s, 3 retries)', async () => {
    const { classReminder1h } = await import('./class-reminder-1h');
    expect(classReminder1h.id).toBe('class-reminder-1h');
    expect(classReminder1h.maxDuration).toBe(30);
    expect(classReminder1h.retry?.maxAttempts).toBe(3);
  });
});

describe('class-reminder-1h (JOB-003) — cron fan-out path (C1 dedup fix)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends reminders to all confirmed enrollments in the 50-65min window', async () => {
    const { classReminder1h } = await import('./class-reminder-1h');

    const futureDate = new Date(Date.now() + 57 * 60 * 1000); // +57min (in window)
    mockSessionsFindMany.mockResolvedValue([
      {
        id: 'sess-1',
        startsAt: futureDate,
        class: { title: 'Vinyasa Flow' },
        instructor: { slug: 'mei-tanaka' },
        enrollments: [
          {
            id: 'enr-1',
            status: 'confirmed',
            reminder1hSentAt: null,
            member: { displayName: 'Jane Doe', user: { email: 'jane@example.com' } },
          },
        ],
      },
    ]);
    mockSendClassReminder1h.mockResolvedValue(undefined);
    mockEnrollmentUpdateWhere.mockResolvedValue(undefined);

    const result = await classReminder1h.run({});

    expect(result.sent).toBe(true);
    expect(result.sessionCount).toBe(1);
    expect(result.sentCount).toBe(1);
    expect(mockSendClassReminder1h).toHaveBeenCalledTimes(1);
  });

  it('skips enrollments where reminder1hSentAt is already set (dedup)', async () => {
    const { classReminder1h } = await import('./class-reminder-1h');

    mockSessionsFindMany.mockResolvedValue([
      {
        id: 'sess-1',
        startsAt: new Date(Date.now() + 57 * 60 * 1000),
        class: { title: 'Vinyasa' },
        instructor: { slug: 'mei' },
        enrollments: [], // all already sent
      },
    ]);

    const result = await classReminder1h.run({});

    expect(result.sentCount).toBe(0);
    expect(mockSendClassReminder1h).not.toHaveBeenCalled();
  });

  it('continues sending if one email fails (error isolation)', async () => {
    const { classReminder1h } = await import('./class-reminder-1h');

    mockSessionsFindMany.mockResolvedValue([
      {
        id: 'sess-1',
        startsAt: new Date(Date.now() + 57 * 60 * 1000),
        class: { title: 'Vinyasa' },
        instructor: { slug: 'mei' },
        enrollments: [
          {
            id: 'enr-1',
            status: 'confirmed',
            reminder1hSentAt: null,
            member: { displayName: 'Jane', user: { email: 'jane@example.com' } },
          },
          {
            id: 'enr-2',
            status: 'confirmed',
            reminder1hSentAt: null,
            member: { displayName: 'John', user: { email: 'john@example.com' } },
          },
        ],
      },
    ]);
    mockSendClassReminder1h
      .mockRejectedValueOnce(new Error('Resend timeout'))
      .mockResolvedValueOnce(undefined);
    mockEnrollmentUpdateWhere.mockResolvedValue(undefined);

    const result = await classReminder1h.run({});

    expect(result.sentCount).toBe(1);
    expect(result.skippedCount).toBe(1);
  });

  it('returns zero sessionCount when no sessions are in window', async () => {
    const { classReminder1h } = await import('./class-reminder-1h');

    mockSessionsFindMany.mockResolvedValue([]);

    const result = await classReminder1h.run({});

    expect(result.sessionCount).toBe(0);
    expect(result.sentCount).toBe(0);
  });
});

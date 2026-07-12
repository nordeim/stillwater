/**
 * F8-02 — class-reminder-24h tests (JOB-002)
 *
 * Tests both the legacy sendSingleReminder path (sessionId+memberId payload)
 * and the new cron fan-out path (empty payload, queries sessions in window).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockSendClassReminder24h = vi.fn();
const mockEnrollmentFindFirst = vi.fn();
const mockSessionsFindMany = vi.fn();
const mockEnrollmentUpdate = vi.fn();
const mockEnrollmentUpdateWhere = vi.fn();

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: unknown) => config),
}));

vi.mock('@stillwater/email', () => ({
  sendClassReminder24h: (...args: unknown[]) => mockSendClassReminder24h(...args),
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
    reminder24hSentAt: 'enrollments.reminder_24h_sent_at',
    status: 'enrollments.status',
    sessionId: 'enrollments.session_id',
    memberId: 'enrollments.member_id',
  },
}));

describe('class-reminder-24h (JOB-002) — legacy sendSingleReminder path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends reminder email for confirmed enrollment', async () => {
    const { classReminder24h } = await import('./class-reminder-24h');
    mockEnrollmentFindFirst.mockResolvedValue({
      id: 'enr-1',
      status: 'confirmed',
      session: {
        id: 'sess-1',
        startsAt: new Date('2026-07-10T10:00:00Z'),
        class: { title: 'Vinyasa Flow' },
        instructor: { slug: 'mei-tanaka' },
        room: { name: 'Main Hall' },
      },
      member: {
        displayName: 'Jane Doe',
        user: { email: 'jane@example.com' },
      },
    });
    mockSendClassReminder24h.mockResolvedValue(undefined);
    mockEnrollmentUpdateWhere.mockResolvedValue(undefined);

    await classReminder24h.run({ sessionId: 'sess-1', memberId: 'mem-1' });

    expect(mockSendClassReminder24h).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        memberName: 'Jane Doe',
        className: 'Vinyasa Flow',
      }),
    );
  });

  it('skips if enrollment was cancelled', async () => {
    const { classReminder24h } = await import('./class-reminder-24h');
    mockEnrollmentFindFirst.mockResolvedValue({
      id: 'enr-1',
      status: 'cancelled',
      session: { id: 'sess-1', startsAt: new Date(), class: { title: 'X' }, instructor: { slug: 'x' }, room: { name: 'X' } },
      member: { displayName: 'Jane', user: { email: 'j@e.com' } },
    });

    const result = await classReminder24h.run({ sessionId: 'sess-1', memberId: 'mem-1' });

    expect(result.sent).toBe(false);
    expect(mockSendClassReminder24h).not.toHaveBeenCalled();
  });

  it('has correct task config (30s, 3 retries)', async () => {
    const { classReminder24h } = await import('./class-reminder-24h');
    expect(classReminder24h.id).toBe('class-reminder-24h');
    expect(classReminder24h.maxDuration).toBe(30);
    expect(classReminder24h.retry?.maxAttempts).toBe(3);
  });
});

describe('class-reminder-24h (JOB-002) — cron fan-out path (C1 dedup fix)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends reminders to all confirmed enrollments in the 22-24h window', async () => {
    const { classReminder24h } = await import('./class-reminder-24h');

    const futureDate = new Date(Date.now() + 23 * 60 * 60 * 1000); // +23h (in window)
    mockSessionsFindMany.mockResolvedValue([
      {
        id: 'sess-1',
        startsAt: futureDate,
        class: { title: 'Vinyasa Flow' },
        instructor: { slug: 'mei-tanaka' },
        room: { name: 'Main Hall' },
        enrollments: [
          {
            id: 'enr-1',
            status: 'confirmed',
            reminder24hSentAt: null, // not yet sent
            member: { displayName: 'Jane Doe', user: { email: 'jane@example.com' } },
          },
          {
            id: 'enr-2',
            status: 'confirmed',
            reminder24hSentAt: null,
            member: { displayName: 'John Smith', user: { email: 'john@example.com' } },
          },
        ],
      },
    ]);
    mockSendClassReminder24h.mockResolvedValue(undefined);
    mockEnrollmentUpdateWhere.mockResolvedValue(undefined);

    const result = await classReminder24h.run({});

    expect(result.sent).toBe(true);
    expect(result.sessionCount).toBe(1);
    expect(result.sentCount).toBe(2);
    expect(mockSendClassReminder24h).toHaveBeenCalledTimes(2);
    expect(mockSendClassReminder24h).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'jane@example.com', memberName: 'Jane Doe' }),
    );
    expect(mockSendClassReminder24h).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'john@example.com', memberName: 'John Smith' }),
    );
  });

  it('skips enrollments where reminder24hSentAt is already set (dedup)', async () => {
    const { classReminder24h } = await import('./class-reminder-24h');

    // The query filter (isNull(reminder24hSentAt)) means the DB only returns
    // enrollments that haven't been sent yet. Simulate that.
    mockSessionsFindMany.mockResolvedValue([
      {
        id: 'sess-1',
        startsAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
        class: { title: 'Vinyasa' },
        instructor: { slug: 'mei' },
        room: null,
        enrollments: [], // empty — all already sent
      },
    ]);

    const result = await classReminder24h.run({});

    expect(result.sent).toBe(true);
    expect(result.sentCount).toBe(0);
    expect(mockSendClassReminder24h).not.toHaveBeenCalled();
  });

  it('continues sending if one email fails (error isolation)', async () => {
    const { classReminder24h } = await import('./class-reminder-24h');

    mockSessionsFindMany.mockResolvedValue([
      {
        id: 'sess-1',
        startsAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
        class: { title: 'Vinyasa' },
        instructor: { slug: 'mei' },
        room: null,
        enrollments: [
          {
            id: 'enr-1',
            status: 'confirmed',
            reminder24hSentAt: null,
            member: { displayName: 'Jane', user: { email: 'jane@example.com' } },
          },
          {
            id: 'enr-2',
            status: 'confirmed',
            reminder24hSentAt: null,
            member: { displayName: 'John', user: { email: 'john@example.com' } },
          },
        ],
      },
    ]);
    // First email fails, second succeeds
    mockSendClassReminder24h
      .mockRejectedValueOnce(new Error('Resend timeout'))
      .mockResolvedValueOnce(undefined);
    mockEnrollmentUpdateWhere.mockResolvedValue(undefined);

    const result = await classReminder24h.run({});

    expect(result.sentCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(mockSendClassReminder24h).toHaveBeenCalledTimes(2);
  });

  it('returns zero sessionCount when no sessions are in window', async () => {
    const { classReminder24h } = await import('./class-reminder-24h');

    mockSessionsFindMany.mockResolvedValue([]);

    const result = await classReminder24h.run({});

    expect(result.sent).toBe(true);
    expect(result.sessionCount).toBe(0);
    expect(result.sentCount).toBe(0);
    expect(mockSendClassReminder24h).not.toHaveBeenCalled();
  });
});

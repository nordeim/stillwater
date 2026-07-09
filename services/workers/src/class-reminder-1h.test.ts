/**
 * F8-03 — class-reminder-1h tests (JOB-003)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockSendClassReminder1h = vi.fn();
const mockEnrollmentFindFirst = vi.fn();

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
    },
  },
}));

describe('class-reminder-1h (JOB-003)', () => {
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

/**
 * F8-02 — class-reminder-24h tests (JOB-002)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockSendClassReminder24h = vi.fn();
const mockEnrollmentFindFirst = vi.fn();

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
    },
  },
}));

describe('class-reminder-24h (JOB-002)', () => {
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

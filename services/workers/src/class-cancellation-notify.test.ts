/**
 * F8-06 — class-cancellation-notify worker tests (JOB-006)
 *
 * Tests the class-cancellation-notify Trigger.dev task.
 *
 * Mock strategy:
 * - @trigger.dev/sdk: task() returns its config (so we can access .run)
 * - @stillwater/email: sendClassCancellation is a vi.fn()
 * - @stillwater/db: db.query.enrollments.findMany returns fixtures
 *
 * Per MEP F8-06: 3 tests
 * (1) Sends email to all confirmed enrollees (fan-out)
 * (2) Returns notified:0 when session has no enrollees
 * (3) Uses correct task config (60s budget, 3 retries)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSendClassCancellation = vi.fn();
const mockEnrollmentFindMany = vi.fn();

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: unknown) => config),
}));

vi.mock('@stillwater/email', () => ({
  sendClassCancellation: (...args: unknown[]) =>
    mockSendClassCancellation(...args),
}));

vi.mock('@stillwater/db', () => ({
  db: {
    query: {
      enrollments: {
        findMany: (...args: unknown[]) => mockEnrollmentFindMany(...args),
      },
    },
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('class-cancellation-notify (JOB-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends email to all confirmed enrollees', async () => {
    const { classCancellationNotify } = await import('./class-cancellation-notify');

    const enrollmentsFixture = [
      {
        id: 'enr-1',
        status: 'confirmed',
        member: {
          displayName: 'Jane Doe',
          user: { email: 'jane@example.com' },
        },
        session: {
          startsAt: new Date('2026-07-10T10:00:00Z'),
          class: { title: 'Vinyasa Flow' },
        },
      },
      {
        id: 'enr-2',
        status: 'confirmed',
        member: {
          displayName: 'Bob Smith',
          user: { email: 'bob@example.com' },
        },
        session: {
          startsAt: new Date('2026-07-10T10:00:00Z'),
          class: { title: 'Vinyasa Flow' },
        },
      },
    ];
    mockEnrollmentFindMany.mockResolvedValue(enrollmentsFixture);
    mockSendClassCancellation.mockResolvedValue(undefined);

    const result = await classCancellationNotify.run({
      sessionId: 'sess-1',
      cancelReason: 'Instructor illness',
    });

    expect(result.notified).toBe(2);
    expect(result.emails).toEqual(['jane@example.com', 'bob@example.com']);
    expect(mockEnrollmentFindMany).toHaveBeenCalledTimes(1);
    expect(mockSendClassCancellation).toHaveBeenCalledTimes(2);
    expect(mockSendClassCancellation).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        memberName: 'Jane Doe',
        className: 'Vinyasa Flow',
        cancelReason: 'Instructor illness',
      }),
    );
    expect(mockSendClassCancellation).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'bob@example.com',
        memberName: 'Bob Smith',
        className: 'Vinyasa Flow',
        cancelReason: 'Instructor illness',
      }),
    );
  });

  it('returns notified:0 when session has no enrollees', async () => {
    const { classCancellationNotify } = await import('./class-cancellation-notify');
    mockEnrollmentFindMany.mockResolvedValue([]);

    const result = await classCancellationNotify.run({
      sessionId: 'sess-empty',
      cancelReason: 'Low enrollment',
    });

    expect(result).toEqual({ notified: 0, emails: [] });
    expect(mockSendClassCancellation).not.toHaveBeenCalled();
  });

  it('has correct task config (60s budget, 3 retries)', async () => {
    const { classCancellationNotify } = await import('./class-cancellation-notify');
    expect(classCancellationNotify.id).toBe('class-cancellation-notify');
    expect(classCancellationNotify.maxDuration).toBe(60);
    expect(classCancellationNotify.retry).toEqual({
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      factor: 2,
      randomize: true,
    });
  });
});

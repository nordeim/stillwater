/**
 * F8-01 — booking-confirmation worker tests (JOB-001)
 *
 * Tests the booking-confirmation Trigger.dev task.
 *
 * Mock strategy:
 * - @trigger.dev/sdk: task() returns its config (so we can access .run)
 * - @stillwater/email: sendBookingConfirmation is a vi.fn()
 * - @stillwater/db: db.query.enrollments.findFirst returns fixtures
 *
 * Per MEP F8-01: 3 tests
 * (1) Fetches enrollment + sends email with correct args
 * (2) Throws on non-existent enrollment
 * (3) Uses correct task config (id, maxDuration, retry)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSendBookingConfirmation = vi.fn();
const mockEnrollmentFindFirst = vi.fn();

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: unknown) => config),
}));

vi.mock('@stillwater/email', () => ({
  sendBookingConfirmation: (...args: unknown[]) =>
    mockSendBookingConfirmation(...args),
}));

vi.mock('@stillwater/db', () => ({
  db: {
    query: {
      enrollments: { findFirst: (...args: unknown[]) => mockEnrollmentFindFirst(...args) },
    },
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('booking-confirmation (JOB-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches enrollment + sends email with correct args', async () => {
    const { bookingConfirmation } = await import('./booking-confirmation');

    const enrollmentFixture = {
      id: 'enr-1',
      sessionId: 'sess-1',
      memberId: 'mem-1',
      status: 'confirmed',
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
    mockEnrollmentFindFirst.mockResolvedValue(enrollmentFixture);
    mockSendBookingConfirmation.mockResolvedValue(undefined);

    await bookingConfirmation.run({
      enrollmentId: 'enr-1',
      memberId: 'mem-1',
    });

    expect(mockEnrollmentFindFirst).toHaveBeenCalledTimes(1);
    expect(mockSendBookingConfirmation).toHaveBeenCalledWith({
      to: 'jane@example.com',
      memberName: 'Jane Doe',
      className: 'Vinyasa Flow',
      sessionDate: expect.any(String),
      instructor: 'mei-tanaka',
      sessionId: 'sess-1',
    });
  });

  it('throws on non-existent enrollment', async () => {
    const { bookingConfirmation } = await import('./booking-confirmation');
    mockEnrollmentFindFirst.mockResolvedValue(undefined);

    await expect(
      bookingConfirmation.run({ enrollmentId: 'missing', memberId: 'mem-1' }),
    ).rejects.toThrow('Enrollment not found');
  });

  it('has correct task config (id, maxDuration, retry)', async () => {
    const { bookingConfirmation } = await import('./booking-confirmation');
    expect(bookingConfirmation.id).toBe('booking-confirmation');
    expect(bookingConfirmation.maxDuration).toBe(30);
    expect(bookingConfirmation.retry).toEqual({
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      factor: 2,
      randomize: true,
    });
  });
});

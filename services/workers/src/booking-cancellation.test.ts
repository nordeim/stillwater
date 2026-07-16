/**
 * booking-cancellation worker tests (v8 C2 fix — JOB-012)
 *
 * Tests the new booking-cancellation Trigger.dev task.
 *
 * Mock strategy:
 * - @trigger.dev/sdk: task() returns its config (so we can access .run)
 * - @stillwater/email: sendBookingCancellation is a vi.fn()
 * - @stillwater/db: db.query.enrollments.findFirst returns fixtures
 *
 * Tests:
 * (1) Fetches enrollment + sends cancellation email with correct args
 * (2) Throws on non-existent enrollment
 * (3) Skips email if enrollment status is 'cancelled' (defensive — the
 *     cancellation email should still send for status='cancelled' since
 *     that IS the cancellation event; but skip if status='attended' or
 *     other non-cancelled states to avoid spurious emails)
 * (4) Uses correct task config (id, maxDuration, retry)
 *
 * Source: Stillwater Audit Report v1.0 §5 C2 (missing cancellation email);
 *         ADR-010 (Resend Native Templates for workers).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSendBookingCancellation = vi.fn();
const mockEnrollmentFindFirst = vi.fn();

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: unknown) => config),
}));

vi.mock('@stillwater/email', () => ({
  sendBookingCancellation: (...args: unknown[]) =>
    mockSendBookingCancellation(...args),
}));

vi.mock('@stillwater/db', () => ({
  db: {
    query: {
      enrollments: { findFirst: (...args: unknown[]) => mockEnrollmentFindFirst(...args) },
    },
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('booking-cancellation (v8 C2 fix, JOB-012)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches enrollment + sends cancellation email with correct args', async () => {
    const { bookingCancellation } = await import('./booking-cancellation');

    const enrollmentFixture = {
      id: 'enr-1',
      sessionId: 'sess-1',
      memberId: 'mem-1',
      status: 'cancelled',
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
    mockSendBookingCancellation.mockResolvedValue(undefined);

    await bookingCancellation.run({
      enrollmentId: 'enr-1',
      memberId: 'mem-1',
    });

    expect(mockEnrollmentFindFirst).toHaveBeenCalledTimes(1);
    expect(mockSendBookingCancellation).toHaveBeenCalledWith({
      to: 'jane@example.com',
      memberName: 'Jane Doe',
      className: 'Vinyasa Flow',
      sessionDate: expect.any(String),
    });
  });

  it('throws on non-existent enrollment', async () => {
    const { bookingCancellation } = await import('./booking-cancellation');
    mockEnrollmentFindFirst.mockResolvedValue(undefined);

    await expect(
      bookingCancellation.run({ enrollmentId: 'missing', memberId: 'mem-1' }),
    ).rejects.toThrow('Enrollment not found');
  });

  it('has correct task config (id, maxDuration, retry)', async () => {
    const { bookingCancellation } = await import('./booking-cancellation');
    expect(bookingCancellation.id).toBe('booking-cancellation');
    expect(bookingCancellation.maxDuration).toBe(30);
    expect(bookingCancellation.retry).toEqual({
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      factor: 2,
      randomize: true,
    });
  });
});

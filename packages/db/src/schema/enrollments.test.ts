/**
 * F1-09 — enrollments table test suite (RED phase)
 *
 * Tests for the `enrollments` table — confirmed bookings.
 * Per MEP Phase 1 F1-09 + PAD §7.2 ENROLLMENT entity + PAD §7.3 critical index.
 *
 * The unique constraint on (sessionId, memberId) prevents double-booking.
 * The partial index idx_enrollments_session_status (WHERE status = 'confirmed')
 * powers fast seat-count queries in the booking flow.
 */

import { describe, it, expect } from 'vitest';
import { enrollments } from './enrollments';

describe('F1-09: enrollments table', () => {
  it('has the correct table name', () => {
    expect(enrollments[Symbol.for('drizzle:Name')]).toBe('enrollments');
  });

  it('has status column using enrollmentStatusEnum defaulting to confirmed', () => {
    expect(enrollments.status).toBeDefined();
    expect(enrollments.status.enumValues).toEqual([
      'confirmed',
      'cancelled',
      'attended',
      'no_show',
    ]);
    expect(enrollments.status.hasDefault).toBe(true);
  });

  it('has sessionId and memberId columns as uuid notNull', () => {
    expect(enrollments.sessionId).toBeDefined();
    expect(enrollments.sessionId.getSQLType()).toBe('uuid');
    expect(enrollments.sessionId.notNull).toBe(true);

    expect(enrollments.memberId).toBeDefined();
    expect(enrollments.memberId.getSQLType()).toBe('uuid');
    expect(enrollments.memberId.notNull).toBe(true);
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(enrollments.id).toBeDefined();
    expect(enrollments.id.getSQLType()).toBe('uuid');
    expect(enrollments.id.primary).toBe(true);
    expect(enrollments.id.hasDefault).toBe(true);
  });

  it('has all PAD §7.2 ENROLLMENT columns', () => {
    const expectedColumns = [
      'id',
      'sessionId',
      'memberId',
      'status',
      'enrolledAt',
      'cancelledAt',
      'checkedInAt',
      'cancellationReason',
      'packageCreditId',
    ];

    for (const col of expectedColumns) {
      expect(enrollments[col]).toBeDefined(`Column ${col} should exist on enrollments table`);
    }
  });
});

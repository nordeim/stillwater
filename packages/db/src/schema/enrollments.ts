/**
 * F1-09 — enrollments table
 *
 * Confirmed bookings (a member enrolled in a specific class session).
 *
 * Unique constraint on (sessionId, memberId) prevents double-booking
 * the same session. The partial index idx_enrollments_session_status
 * (WHERE status = 'confirmed') powers fast seat-count queries.
 *
 * Source: PAD.md §7.2 ENROLLMENT entity + §7.3, MASTER_EXECUTION_PLAN.md F1-09.
 */

import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { enrollmentStatusEnum } from './enums';
import { classSessions } from './sessions';
import { members } from './members';

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => classSessions.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    status: enrollmentStatusEnum('status').default('confirmed').notNull(),
    enrolledAt: timestamp('enrolled_at', { mode: 'date' }).defaultNow().notNull(),
    cancelledAt: timestamp('cancelled_at', { mode: 'date' }),
    checkedInAt: timestamp('checked_in_at', { mode: 'date' }),
    cancellationReason: text('cancellation_reason'),
    packageCreditId: uuid('package_credit_id'), // FK to class_packages (nullable — set in Phase 7)
  },
  (table) => [
    // Prevent double-booking: one enrollment per (session, member)
    uniqueIndex('idx_enrollments_session_member')
      .on(table.sessionId, table.memberId),
    // PAD §7.3 critical index: fast seat counts (only count confirmed enrollments)
    index('idx_enrollments_session_status')
      .on(table.sessionId, table.status)
      .where(sql`${table.status} = 'confirmed'`),
  ],
);

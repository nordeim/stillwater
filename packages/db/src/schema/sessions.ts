/**
 * F1-08 — class_sessions table
 *
 * Specific scheduled occurrences of a class (e.g., "Morning Vinyasa Flow
 * on 2026-07-07 at 7:00 AM"). This is the table users book against.
 *
 * Critical index (PAD §7.3): idx_sessions_starts_at_status
 *   ON class_sessions (starts_at, status) WHERE status = 'scheduled'
 *   Powers fast schedule queries (date range lookups for upcoming classes).
 *
 * Source: PAD.md §7.2 CLASS_SESSION entity + §7.3, MASTER_EXECUTION_PLAN.md F1-08.
 */

import { pgTable, uuid, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { sessionStatusEnum } from './enums';
import { classes } from './classes';
import { instructors } from './instructors';
import { rooms } from './rooms';

export const classSessions = pgTable(
  'class_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    instructorId: uuid('instructor_id')
      .notNull()
      .references(() => instructors.id, { onDelete: 'restrict' }),
    roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
    startsAt: timestamp('starts_at', { mode: 'date' }).notNull(),
    endsAt: timestamp('ends_at', { mode: 'date' }).notNull(),
    status: sessionStatusEnum('status').default('scheduled').notNull(),
    cancelReason: text('cancel_reason'),
    overrideCapacity: integer('override_capacity'),
    isVirtual: boolean('is_virtual').default(false).notNull(),
    streamUrl: text('stream_url'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    // PAD §7.3 critical index: fast schedule queries (date range for scheduled sessions)
    index('idx_sessions_starts_at_status')
      .on(table.startsAt, table.status)
      .where(sql`${table.status} = 'scheduled'`),
  ],
);

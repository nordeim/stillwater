/**
 * F1-10 — waitlist_entries table
 *
 * Ordered queue of members waiting for a spot in a full session.
 * When an enrollment is cancelled, the next waitlist entry is promoted.
 *
 * Critical index (PAD §7.3): idx_waitlist_session_position
 *   ON waitlist_entries (session_id, position) WHERE status = 'waiting'
 *   Powers fast "next in line" queries during waitlist promotion.
 *
 * Source: PAD.md §7.2 WAITLIST_ENTRY entity + §7.3, MASTER_EXECUTION_PLAN.md F1-10.
 */

import { pgTable, uuid, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { waitlistStatusEnum } from './enums';
import { classSessions } from './sessions';
import { members } from './members';

export const waitlistEntries = pgTable(
  'waitlist_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => classSessions.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow().notNull(),
    notifiedAt: timestamp('notified_at', { mode: 'date' }),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    status: waitlistStatusEnum('status').default('waiting').notNull(),
  },
  (table) => [
    // PAD §7.3 critical index: fast "next in line" queries (ordered by position, only waiting)
    index('idx_waitlist_session_position')
      .on(table.sessionId, table.position)
      .where(sql`${table.status} = 'waiting'`),
  ],
);

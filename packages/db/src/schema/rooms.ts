/**
 * F1-07 — rooms table
 *
 * Physical studio rooms where classes are held.
 * A session (F1-08) can optionally be assigned to a room.
 *
 * Source: PAD.md §7.2 ROOM entity, MASTER_EXECUTION_PLAN.md F1-07.
 */

import { pgTable, uuid, text, integer, boolean } from 'drizzle-orm/pg-core';

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  capacity: integer('capacity').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

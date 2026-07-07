/**
 * F1-13 — role_assignments table
 *
 * RBAC role grants. A member can have multiple roles (e.g., instructor + staff).
 * Composite unique on (memberId, role) prevents duplicate grants.
 *
 * Source: PAD.md §7.2 ROLE_ASSIGNMENT entity, MASTER_EXECUTION_PLAN.md F1-13.
 */

import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { studioRoleEnum } from './enums';
import { members } from './members';

export const roleAssignments = pgTable(
  'role_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    role: studioRoleEnum('role').notNull(),
    assignedAt: timestamp('assigned_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    // Prevent duplicate role grants for the same member
    uniqueIndex('idx_role_assignments_member_role').on(table.memberId, table.role),
  ],
);

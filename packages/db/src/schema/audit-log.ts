/**
 * F9-19 — audit_log table (Phase 9)
 *
 * Records every admin mutation (class.create, session.cancel, role.assign, etc.)
 * for compliance and traceability. Queried by the audit log viewer (F9-20).
 *
 * Schema:
 *   id             uuid PK
 *   staffMemberId  uuid FK → members.id (CASCADE — if staff member deleted, logs remain accessible via metadata)
 *   action         text (e.g., 'class.create', 'session.cancel', 'role.assign')
 *   entityType     text (e.g., 'class', 'session', 'member', 'role')
 *   entityId       text (uuid of affected entity — text for flexibility)
 *   metadata       jsonb (optional: before/after diff, reason, etc.)
 *   createdAt      timestamp default now()
 *
 * Source: MEP Phase 9 F9-19, PAD §9 (RBAC audit requirement).
 */

import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { members } from './members';

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    staffMemberId: uuid('staff_member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    // Filter by date range + staff member (audit log viewer)
    index('idx_audit_log_staff_created').on(table.staffMemberId, table.createdAt),
    // Filter by action type
    index('idx_audit_log_action').on(table.action),
    // Filter by entity (e.g., "show me all actions on this class")
    index('idx_audit_log_entity').on(table.entityType, table.entityId),
  ],
);

/**
 * F9-19 — Audit log helper
 *
 * Called by every admin mutation to record the action in the audit_log table
 * for compliance and traceability.
 *
 * Source: MEP Phase 9 F9-19, PAD §9 (RBAC audit requirement).
 */

import 'server-only';
import { db, auditLog } from '@stillwater/db';

export interface AuditLogParams {
  staffMemberId: string;
  action: string; // e.g., 'class.create', 'session.cancel', 'role.assign'
  entityType: string; // e.g., 'class', 'session', 'member', 'role'
  entityId: string; // uuid of affected entity
  metadata?: Record<string, unknown>; // optional: before/after diff, reason, etc.
}

/**
 * Log an admin action to the audit_log table.
 *
 * This function is fire-and-forget — it does not throw if the insert fails
 * (audit logging should never block the actual mutation). Errors are logged
 * to console for Sentry capture.
 *
 * @example
 * await logAdminAction({
 *   staffMemberId: session.user.memberId!,
 *   action: 'class.create',
 *   entityType: 'class',
 *   entityId: newClass.id,
 *   metadata: { title: newClass.title },
 * });
 */
export async function logAdminAction(params: AuditLogParams): Promise<void> {
  try {
    await db.insert(auditLog).values({
      staffMemberId: params.staffMemberId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? null,
    });
  } catch (error) {
    // Audit logging should never block the mutation — log and continue
    console.error('Failed to log admin action:', {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

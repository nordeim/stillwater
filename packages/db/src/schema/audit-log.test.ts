/**
 * F9-19 — audit_log test suite (Phase 9)
 *
 * Per MEP Phase 9 F9-19 + PAD §9 (RBAC audit requirement).
 * Records every admin mutation for compliance and traceability.
 */

import { describe, it, expect } from 'vitest';
import { auditLog } from './audit-log';

describe('F9-19: audit_log table', () => {
  it('has the correct table name', () => {
    expect(auditLog[Symbol.for('drizzle:Name')]).toBe('audit_log');
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(auditLog.id).toBeDefined();
    expect(auditLog.id.getSQLType()).toBe('uuid');
    expect(auditLog.id.primary).toBe(true);
    expect(auditLog.id.hasDefault).toBe(true);
  });

  it('has staffMemberId column as uuid notNull (FK to members verified in migration)', () => {
    expect(auditLog.staffMemberId).toBeDefined();
    expect(auditLog.staffMemberId.getSQLType()).toBe('uuid');
    expect(auditLog.staffMemberId.notNull).toBe(true);
  });

  it('has action column as text notNull', () => {
    expect(auditLog.action).toBeDefined();
    expect(auditLog.action.getSQLType()).toBe('text');
    expect(auditLog.action.notNull).toBe(true);
  });

  it('has entityType column as text notNull', () => {
    expect(auditLog.entityType).toBeDefined();
    expect(auditLog.entityType.getSQLType()).toBe('text');
    expect(auditLog.entityType.notNull).toBe(true);
  });

  it('has entityId column as text notNull', () => {
    expect(auditLog.entityId).toBeDefined();
    expect(auditLog.entityId.getSQLType()).toBe('text');
    expect(auditLog.entityId.notNull).toBe(true);
  });

  it('has metadata column as jsonb (nullable)', () => {
    expect(auditLog.metadata).toBeDefined();
    expect(auditLog.metadata.getSQLType()).toBe('jsonb');
    expect(auditLog.metadata.notNull).toBe(false);
  });

  it('has createdAt timestamp defaulting to now()', () => {
    expect(auditLog.createdAt).toBeDefined();
    expect(auditLog.createdAt.getSQLType()).toBe('timestamp');
    expect(auditLog.createdAt.hasDefault).toBe(true);
    expect(auditLog.createdAt.notNull).toBe(true);
  });
});

/**
 * F1-13 — role_assignments test suite (RED phase)
 *
 * Per MEP Phase 1 F1-13 + PAD §7.2 ROLE_ASSIGNMENT entity.
 * Composite unique on (memberId, role) prevents duplicate grants.
 */

import { describe, it, expect } from 'vitest';
import { roleAssignments } from './role-assignments';

describe('F1-13: role_assignments table', () => {
  it('has the correct table name', () => {
    expect(roleAssignments[Symbol.for('drizzle:Name')]).toBe('role_assignments');
  });

  it('has role column using studioRoleEnum', () => {
    expect(roleAssignments.role).toBeDefined();
    expect(roleAssignments.role.enumValues).toEqual([
      'member',
      'instructor',
      'staff',
      'manager',
      'owner',
    ]);
  });

  it('has memberId column as uuid notNull (FK to members verified in migration)', () => {
    expect(roleAssignments.memberId).toBeDefined();
    expect(roleAssignments.memberId.getSQLType()).toBe('uuid');
    expect(roleAssignments.memberId.notNull).toBe(true);
  });

  it('has id column as uuid primaryKey with defaultRandom', () => {
    expect(roleAssignments.id).toBeDefined();
    expect(roleAssignments.id.getSQLType()).toBe('uuid');
    expect(roleAssignments.id.primary).toBe(true);
    expect(roleAssignments.id.hasDefault).toBe(true);
  });

  it('has assignedAt timestamp defaulting to now()', () => {
    expect(roleAssignments.assignedAt).toBeDefined();
    expect(roleAssignments.assignedAt.getSQLType()).toBe('timestamp');
    expect(roleAssignments.assignedAt.hasDefault).toBe(true);
  });
});

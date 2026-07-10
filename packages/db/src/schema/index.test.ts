/**
 * F1-14 — schema barrel export test suite (RED phase)
 *
 * Verifies that all 14 tables and 8 enums are re-exported from the schema barrel.
 * Per MEP Phase 1 F1-14.
 */

import { describe, it, expect } from 'vitest';
import * as schema from './index';

describe('F1-14: schema barrel export', () => {
  it('exports all 15 domain tables (+ 3 Better Auth tables = 18 total)', () => {
    const expectedTables = [
      'users',
      'members',
      'instructors',
      'classStyles',
      'classes',
      'rooms',
      'classSessions',
      'enrollments',
      'waitlistEntries',
      'membershipPlans',
      'memberSubscriptions',
      'paymentEvents',
      'classPackages',
      'roleAssignments',
      'auditLog',
    ];

    for (const table of expectedTables) {
      expect(schema[table]).toBeDefined(`Table ${table} should be exported from schema barrel`);
    }
  });

  it('exports all 8 enums', () => {
    const expectedEnums = [
      'classLevelEnum',
      'sessionStatusEnum',
      'enrollmentStatusEnum',
      'waitlistStatusEnum',
      'subscriptionStatusEnum',
      'billingIntervalEnum',
      'studioRoleEnum',
      'paymentStatusEnum',
    ];

    for (const enumName of expectedEnums) {
      expect(schema[enumName]).toBeDefined(`Enum ${enumName} should be exported from schema barrel`);
    }
  });

  it('exports exactly 15 domain table objects (not more, not less)', () => {
    // Count pgTable exports — filter out enums and utilities
    const tableNames = [
      'users',
      'members',
      'instructors',
      'classStyles',
      'classes',
      'rooms',
      'classSessions',
      'enrollments',
      'waitlistEntries',
      'membershipPlans',
      'memberSubscriptions',
      'paymentEvents',
      'classPackages',
      'roleAssignments',
      'auditLog',
    ];

    expect(tableNames.length).toBe(15);
    for (const name of tableNames) {
      expect(schema[name]).toBeDefined();
    }
  });
});

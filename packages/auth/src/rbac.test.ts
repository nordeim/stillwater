/**
 * F2-14 — RBAC permission matrix test suite (RED phase)
 *
 * Tests the 13-permission × 6-role matrix from PAD §9.2.
 * Per MEP Phase 2 F2-14.
 *
 * Permission matrix (PAD §9.2):
 * | Permission              | Guest | Member | Instructor | Staff | Manager | Owner |
 * | schedule:view           |   ✅  |   ✅   |     ✅     |  ✅   |   ✅    |  ✅   |
 * | class:book              |   ❌  |   ✅   |     ✅     |  ✅   |   ✅    |  ✅   |
 * | class:cancel:own        |   ❌  |   ✅   |     ✅     |  ✅   |   ✅    |  ✅   |
 * | history:view:own        |   ❌  |   ✅   |     ✅     |  ✅   |   ✅    |  ✅   |
 * | schedule:view:own       |   ❌  |   ❌   |     ✅     |  ✅   |   ✅    |  ✅   |
 * | checkin:member          |   ❌  |   ❌   |     ❌     |  ✅   |   ✅    |  ✅   |
 * | members:view:all        |   ❌  |   ❌   |     ❌     |  ✅   |   ✅    |  ✅   |
 * | schedule:manage         |   ❌  |   ❌   |     ❌     |  ✅   |   ✅    |  ✅   |
 * | class:cancel:any        |   ❌  |   ❌   |     ❌     |  ✅   |   ✅    |  ✅   |
 * | revenue:view            |   ❌  |   ❌   |     ❌     |  ❌   |   ✅    |  ✅   |
 * | memberships:manage      |   ❌  |   ❌   |     ❌     |  ❌   |   ✅    |  ✅   |
 * | roles:assign            |   ❌  |   ❌   |     ❌     |  ❌   |   ❌    |  ✅   |
 * | settings:studio         |   ❌  |   ❌   |     ❌     |  ❌   |   ❌    |  ✅   |
 */

import { describe, it, expect } from 'vitest';
import { can, type Permission, type Role } from './rbac';

describe('F2-14: RBAC permission matrix', () => {
  it('can() returns true for member viewing schedule', () => {
    expect(can(['member'], 'schedule:view')).toBe(true);
  });

  it('can() returns false for member viewing revenue', () => {
    expect(can(['member'], 'revenue:view')).toBe(false);
  });

  it('can() returns true for owner changing studio settings', () => {
    expect(can(['owner'], 'settings:studio')).toBe(true);
  });

  it('can() returns false for guest booking a class', () => {
    expect(can(['guest'], 'class:book')).toBe(false);
  });

  it('can() returns true for manager viewing revenue', () => {
    expect(can(['manager'], 'revenue:view')).toBe(true);
  });

  it('can() returns false for staff assigning roles', () => {
    expect(can(['staff'], 'roles:assign')).toBe(false);
  });

  it('can() handles multiple roles (member + instructor)', () => {
    expect(can(['member', 'instructor'], 'schedule:view:own')).toBe(true);
    expect(can(['member', 'instructor'], 'revenue:view')).toBe(false);
  });
});

describe('F2-14: Full matrix coverage (13 permissions × 6 roles = 78 cases)', () => {
  // Expected matrix from PAD §9.2 (true = ✅, false = ❌)
  const expectedMatrix: Array<{
    permission: Permission;
    results: Record<Role, boolean>;
  }> = [
    { permission: 'schedule:view',      results: { guest: true,  member: true,  instructor: true,  staff: true,  manager: true,  owner: true  } },
    { permission: 'class:book',         results: { guest: false, member: true,  instructor: true,  staff: true,  manager: true,  owner: true  } },
    { permission: 'class:cancel:own',   results: { guest: false, member: true,  instructor: true,  staff: true,  manager: true,  owner: true  } },
    { permission: 'history:view:own',   results: { guest: false, member: true,  instructor: true,  staff: true,  manager: true,  owner: true  } },
    { permission: 'schedule:view:own',  results: { guest: false, member: false, instructor: true,  staff: true,  manager: true,  owner: true  } },
    { permission: 'checkin:member',     results: { guest: false, member: false, instructor: false, staff: true,  manager: true,  owner: true  } },
    { permission: 'members:view:all',   results: { guest: false, member: false, instructor: false, staff: true,  manager: true,  owner: true  } },
    { permission: 'schedule:manage',    results: { guest: false, member: false, instructor: false, staff: true,  manager: true,  owner: true  } },
    { permission: 'class:cancel:any',   results: { guest: false, member: false, instructor: false, staff: true,  manager: true,  owner: true  } },
    { permission: 'revenue:view',       results: { guest: false, member: false, instructor: false, staff: false, manager: true,  owner: true  } },
    { permission: 'memberships:manage', results: { guest: false, member: false, instructor: false, staff: false, manager: true,  owner: true  } },
    { permission: 'roles:assign',       results: { guest: false, member: false, instructor: false, staff: false, manager: false, owner: true  } },
    { permission: 'settings:studio',    results: { guest: false, member: false, instructor: false, staff: false, manager: false, owner: true  } },
  ];

  const roles: Role[] = ['guest', 'member', 'instructor', 'staff', 'manager', 'owner'];

  // Test all 78 combinations
  for (const { permission, results } of expectedMatrix) {
    for (const role of roles) {
      it(`${role} can ${permission}: ${results[role]}`, () => {
        expect(can([role], permission)).toBe(results[role]);
      });
    }
  }
});

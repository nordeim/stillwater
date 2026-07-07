/**
 * F2-14 — RBAC permission matrix
 *
 * 13 permissions × 6 roles matrix mirroring PAD §9.2.
 * The `can()` function checks if any of the user's roles grant the permission.
 *
 * Note: 'guest' is not a stored role in the studio_role enum (guests are
 * unauthenticated users). It's included in the RBAC type for the permission
 * matrix only — `can(['guest'], ...)` is used to check public permissions.
 *
 * Source: MEP Phase 2 F2-14, PAD.md §9.2 Role Permission Matrix.
 */

import type { StudioRole } from './types';

// Extended role type includes 'guest' (unauthenticated) for permission checks
export type Role = StudioRole | 'guest';

export type { StudioRole };

export type Permission =
  | 'schedule:view'
  | 'class:book'
  | 'class:cancel:own'
  | 'history:view:own'
  | 'schedule:view:own'
  | 'checkin:member'
  | 'members:view:all'
  | 'schedule:manage'
  | 'class:cancel:any'
  | 'revenue:view'
  | 'memberships:manage'
  | 'roles:assign'
  | 'settings:studio';

// Permission matrix from PAD §9.2
// Each permission maps to the roles that can perform it (including 'guest')
const MATRIX: Record<Permission, Role[]> = {
  'schedule:view':       ['guest', 'member', 'instructor', 'staff', 'manager', 'owner'],
  'class:book':          [         'member', 'instructor', 'staff', 'manager', 'owner'],
  'class:cancel:own':    [         'member', 'instructor', 'staff', 'manager', 'owner'],
  'history:view:own':    [         'member', 'instructor', 'staff', 'manager', 'owner'],
  'schedule:view:own':   [                  'instructor', 'staff', 'manager', 'owner'],
  'checkin:member':      [                                'staff', 'manager', 'owner'],
  'members:view:all':    [                                'staff', 'manager', 'owner'],
  'schedule:manage':     [                                'staff', 'manager', 'owner'],
  'class:cancel:any':    [                                'staff', 'manager', 'owner'],
  'revenue:view':        [                                        'manager', 'owner'],
  'memberships:manage':  [                                        'manager', 'owner'],
  'roles:assign':        [                                                   'owner'],
  'settings:studio':     [                                                   'owner'],
};

/**
 * Check if any of the user's roles grant the specified permission.
 *
 * @param roles - The user's roles (from session.user.roles, or ['guest'] for unauthenticated)
 * @param permission - The permission to check
 * @returns true if any role grants the permission
 */
export function can(roles: Role[], permission: Permission): boolean {
  const allowedRoles = MATRIX[permission];
  return roles.some((role) => allowedRoles.includes(role));
}

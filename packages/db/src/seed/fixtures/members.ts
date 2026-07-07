/**
 * F1-17 — Member fixtures (factory pattern)
 *
 * 5 demo members covering all 5 studio roles.
 * Source: MASTER_EXECUTION_PLAN.md F1-17, mockup for naming convention.
 */

import type { InferInsertModel } from 'drizzle-orm';
import { members, users, roleAssignments } from '../../schema';

type NewUser = InferInsertModel<typeof users>;
type NewMember = InferInsertModel<typeof members>;
type NewRoleAssignment = InferInsertModel<typeof roleAssignments>;

export interface DemoMember {
  user: NewUser;
  member: Omit<NewMember, 'userId'>;
  roles: NewRoleAssignment['role'][];
}

/**
 * Factory: create a mock member with overrides.
 * Useful for tests that need a member entity without hitting the database.
 */
export function getMockMember(
  overrides: Partial<DemoMember> = {},
): DemoMember {
  const id = overrides.user?.id ?? crypto.randomUUID();
  return {
    user: {
      id,
      email: `member-${id.slice(0, 8)}@stillwater.test`,
      name: 'Demo Member',
      ...overrides.user,
    },
    member: {
      id: overrides.member?.id ?? crypto.randomUUID(),
      displayName: 'Demo Member',
      phone: '+1-503-555-0100',
      ...overrides.member,
    },
    roles: overrides.roles ?? ['member'],
  };
}

/**
 * 5 demo members — one per studio role.
 * Used by the seed script to populate development data.
 */
export const demoMembers: DemoMember[] = [
  {
    user: {
      id: '00000000-0000-4000-a000-000000000001',
      email: 'maya.chen@stillwater.test',
      name: 'Maya Chen',
      emailVerified: new Date('2026-06-01'),
    },
    member: {
      id: '00000000-0000-4000-a000-000000000011',
      displayName: 'Maya Chen',
      phone: '+1-503-555-0101',
      dateOfBirth: new Date('1990-03-15'),
      emergencyContact: 'Jordan Chen',
      emergencyPhone: '+1-503-555-0102',
      notes: 'Prefers morning classes. Has knee sensitivity — avoid deep lunges.',
      joinedAt: new Date('2026-01-15'),
    },
    roles: ['member'],
  },
  {
    user: {
      id: '00000000-0000-4000-a000-000000000002',
      email: 'mei.tanaka@stillwater.test',
      name: 'Mei Tanaka',
      emailVerified: new Date('2026-06-01'),
    },
    member: {
      id: '00000000-0000-4000-a000-000000000012',
      displayName: 'Mei Tanaka',
      phone: '+1-503-555-0201',
      dateOfBirth: new Date('1985-07-22'),
      emergencyContact: 'Ken Tanaka',
      emergencyPhone: '+1-503-555-0202',
      notes: 'Lead instructor. E-RYT 500. Specializes in Vinyasa and Ashtanga.',
      joinedAt: new Date('2025-09-01'),
    },
    roles: ['member', 'instructor'],
  },
  {
    user: {
      id: '00000000-0000-4000-a000-000000000003',
      email: 'james.harlow@stillwater.test',
      name: 'James Harlow',
      emailVerified: new Date('2026-06-01'),
    },
    member: {
      id: '00000000-0000-4000-a000-000000000013',
      displayName: 'James Harlow',
      phone: '+1-503-555-0301',
      dateOfBirth: new Date('1988-11-30'),
      emergencyContact: 'Sarah Harlow',
      emergencyPhone: '+1-503-555-0302',
      notes: 'Instructor. RYT 500. Specializes in Ashtanga and Yin.',
      joinedAt: new Date('2025-10-15'),
    },
    roles: ['member', 'instructor'],
  },
  {
    user: {
      id: '00000000-0000-4000-a000-000000000004',
      email: 'aiko.mori@stillwater.test',
      name: 'Aiko Mori',
      emailVerified: new Date('2026-06-01'),
    },
    member: {
      id: '00000000-0000-4000-a000-000000000014',
      displayName: 'Aiko Mori',
      phone: '+1-503-555-0401',
      dateOfBirth: new Date('1992-04-18'),
      emergencyContact: 'Yuki Mori',
      emergencyPhone: '+1-503-555-0402',
      notes: 'Instructor. RYT 200. Specializes in Yin & Meditation and Restorative.',
      joinedAt: new Date('2025-11-01'),
    },
    roles: ['member', 'instructor'],
  },
  {
    user: {
      id: '00000000-0000-4000-a000-000000000005',
      email: 'alex.rivera@stillwater.test',
      name: 'Alex Rivera',
      emailVerified: new Date('2026-06-01'),
    },
    member: {
      id: '00000000-0000-4000-a000-000000000015',
      displayName: 'Alex Rivera',
      phone: '+1-503-555-0501',
      dateOfBirth: new Date('1987-09-05'),
      emergencyContact: 'Sam Rivera',
      emergencyPhone: '+1-503-555-0502',
      notes: 'Studio owner + manager. Handles all operational decisions.',
      joinedAt: new Date('2025-08-01'),
    },
    roles: ['member', 'staff', 'manager', 'owner'],
  },
];

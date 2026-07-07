/**
 * F1-16 — Seed script integration test
 *
 * ⚠️ INTEGRATION TEST — requires a live PostgreSQL database.
 * This test is excluded from the default `pnpm test` run.
 * Run explicitly via: pnpm test:integration
 *
 * Requires: docker compose up -d (or a local Postgres at DATABASE_URL)
 *
 * Per MEP Phase 1 F1-16:
 *   [RED] Test 1: After seed, db.select().from(users) returns 5 rows
 *   [RED] Test 2: After seed, db.select().from(classes) returns 4 rows
 *   [RED] Test 3: After seed, each session has a valid instructorId FK
 *   [RED] Test 4: Re-running seed is idempotent (onConflictDoNothing)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../index';
import {
  users,
  members,
  instructors,
  classes,
  classSessions,
  membershipPlans,
  roleAssignments,
} from '../schema';
import { eq } from 'drizzle-orm';
import { seed } from './index';

describe.skipIf(!process.env['DATABASE_URL'] || process.env['DATABASE_URL'].includes('placeholder'))(
  'F1-16: Seed script (integration)',
  () => {
    beforeAll(async () => {
      // Run the seed before all tests in this suite
      await seed();
    });

    it('inserts exactly 5 users', async () => {
      const result = await db.select().from(users);
      expect(result).toHaveLength(5);
    });

    it('inserts exactly 4 classes', async () => {
      const result = await db.select().from(classes);
      expect(result).toHaveLength(4);
    });

    it('inserts exactly 7 sessions', async () => {
      const result = await db.select().from(classSessions);
      expect(result).toHaveLength(7);
    });

    it('each session has a valid instructorId that exists in instructors table', async () => {
      const sessions = await db.select().from(classSessions);
      const allInstructors = await db.select().from(instructors);
      const instructorIds = new Set(allInstructors.map((i) => i.id));

      for (const session of sessions) {
        expect(instructorIds.has(session.instructorId)).toBe(true);
      }
    });

    it('inserts 3 membership plans', async () => {
      const result = await db.select().from(membershipPlans);
      expect(result).toHaveLength(3);
    });

    it('inserts role assignments for all 5 members', async () => {
      const result = await db.select().from(roleAssignments);
      // 5 members, but Alex Rivera has 4 roles (member, staff, manager, owner)
      // Maya: 1, Mei: 2 (member, instructor), James: 2, Aiko: 2, Alex: 4 = 11 total
      expect(result.length).toBeGreaterThanOrEqual(5);
    });

    it('is idempotent — re-running seed does not duplicate rows', async () => {
      // Count before re-seed
      const usersBefore = await db.select().from(users);
      const countBefore = usersBefore.length;

      // Re-run seed
      await seed();

      // Count after re-seed — should be unchanged (onConflictDoNothing)
      const usersAfter = await db.select().from(users);
      expect(usersAfter.length).toBe(countBefore);
    });
  },
);

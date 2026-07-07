/**
 * F1-16 — Seed script
 *
 * Idempotent development data seeder. Run via `pnpm db:seed`.
 *
 * Inserts:
 *   - 5 demo members (one per studio role)
 *   - 3 demo instructors (Mei Tanaka, James Harlow, Aiko Mori)
 *   - 4 class styles + 4 classes
 *   - 2 rooms
 *   - 7 days of sessions (one per day, starting tomorrow)
 *   - 3 membership plans
 *
 * Idempotency: uses onConflictDoNothing on all inserts (keyed by UUID/unique),
 * so re-running the seed is safe.
 *
 * Source: MASTER_EXECUTION_PLAN.md F1-16.
 */

import { db } from '../index';
import {
  users,
  members,
  instructors,
  classStyles,
  classes,
  rooms,
  classSessions,
  membershipPlans,
  roleAssignments,
} from '../schema';
import { demoMembers } from './fixtures/members';
import { demoInstructors } from './fixtures/instructors';
import { demoClassStyles, demoClasses } from './fixtures/classes';
import { demoRooms, demoSessions } from './fixtures/sessions';
import { demoMembershipPlans } from './fixtures/membership-plans';

async function seed(): Promise<void> {
  console.log('🌱 Seeding Stillwater development data...\n');

  // ── Users (5) ──────────────────────────────────────────────────
  console.log('  Inserting 5 users...');
  await db.insert(users).values(demoMembers.map((m) => m.user)).onConflictDoNothing();

  // ── Members (5) ────────────────────────────────────────────────
  console.log('  Inserting 5 members...');
  // Reattach userId to each member (fixtures omit it for type safety)
  const memberRows = demoMembers.map((m) => ({
    ...m.member,
    userId: m.user.id!,
  }));
  await db
    .insert(members)
    .values(memberRows)
    .onConflictDoNothing();

  // ── Role assignments ──────────────────────────────────────────
  console.log('  Inserting role assignments...');
  const roleRows = demoMembers.flatMap((m) =>
    m.roles.map((role) => ({
      memberId: m.member.id!,
      role,
    })),
  );
  await db.insert(roleAssignments).values(roleRows).onConflictDoNothing();

  // ── Instructors (3) ────────────────────────────────────────────
  console.log('  Inserting 3 instructors...');
  const instructorRows = demoInstructors.map(({ memberId: _memberId, ...instructor }) => instructor);
  await db.insert(instructors).values(instructorRows).onConflictDoNothing();

  // ── Class styles (4) ──────────────────────────────────────────
  console.log('  Inserting 4 class styles...');
  await db.insert(classStyles).values(demoClassStyles).onConflictDoNothing();

  // ── Classes (4) ────────────────────────────────────────────────
  console.log('  Inserting 4 classes...');
  await db.insert(classes).values(demoClasses).onConflictDoNothing();

  // ── Rooms (2) ──────────────────────────────────────────────────
  console.log('  Inserting 2 rooms...');
  await db.insert(rooms).values(demoRooms).onConflictDoNothing();

  // ── Sessions (7) ───────────────────────────────────────────────
  console.log('  Inserting 7 sessions (one per day for the next week)...');
  await db.insert(classSessions).values(demoSessions).onConflictDoNothing();

  // ── Membership plans (3) ──────────────────────────────────────
  console.log('  Inserting 3 membership plans...');
  await db.insert(membershipPlans).values(demoMembershipPlans).onConflictDoNothing();

  console.log('\n✅ Seed complete. Summary:');
  console.log('     5 members, 3 instructors, 4 class styles, 4 classes,');
  console.log('     2 rooms, 7 sessions, 3 membership plans');
  console.log('\n  Demo login emails:');
  demoMembers.forEach((m) => {
    console.log(`     ${m.user.email} — roles: ${m.roles.join(', ')}`);
  });
}

seed()
  .then(() => {
    console.log('\n🌱 Seed script finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  });

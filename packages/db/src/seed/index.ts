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

import './env'; // Load .env.local before db client is instantiated
import { sql } from 'drizzle-orm';
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
  // M1 fix (v5, 2026-07-14): Use onConflictDoUpdate instead of onConflictDoNothing.
  // Existing rows (created before migration 0005 added price_cents) have
  // price_cents=0 (DEFAULT). onConflictDoNothing silently skips them, leaving
  // prices at $0. onConflictDoUpdate updates price_cents (and other fields)
  // to the values from the fixture, ensuring the seed is truly idempotent.
  console.log('  Inserting 3 membership plans...');
  await db.insert(membershipPlans)
    .values(demoMembershipPlans)
    .onConflictDoUpdate({
      target: membershipPlans.id,
      set: {
        name: sql`excluded.name`,
        stripePriceId: sql`excluded.stripe_price_id`,
        interval: sql`excluded.interval`,
        priceCents: sql`excluded.price_cents`,
        classCreditsPerCycle: sql`excluded.class_credits_per_cycle`,
        guestPassesPerCycle: sql`excluded.guest_passes_per_cycle`,
        allowsVirtual: sql`excluded.allows_virtual`,
        allowsInPerson: sql`excluded.allows_in_person`,
        isActive: sql`excluded.is_active`,
        sortOrder: sql`excluded.sort_order`,
      },
    });

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

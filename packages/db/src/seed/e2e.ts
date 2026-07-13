/**
 * E2E Test Seed Script
 *
 * Layers E2E test data ON TOP of the base demo seed.
 * Run via: pnpm db:seed:e2e
 *
 * Inserts:
 *   - 5 additional E2E test members (with known emails for magic-link login)
 *   - 14 days of sessions (2-3 per day, morning + evening + weekend afternoon)
 *   - Pre-existing enrollments (for dashboard/history testing)
 *   - Pre-existing waitlist entry (for waitlist page testing)
 *
 * Prerequisites:
 *   - Base seed must be run first: pnpm db:seed
 *   - Database must be migrated: pnpm db:migrate
 *
 * Idempotency: all inserts use onConflictDoNothing — safe to re-run.
 *
 * Test accounts (magic-link email — no password):
 *   e2e.member@stillwater.test    — Primary booking-flow test
 *   e2e.booker@stillwater.test    — Has 1 upcoming enrollment
 *   e2e.waitlist@stillwater.test  — On waitlist for full session
 *   e2e.cancel@stillwater.test    — Has 1 cancellable enrollment
 *   e2e.history@stillwater.test   — Has 3 past attended sessions
 *   alex.rivera@stillwater.test   — Owner (from base seed, full admin access)
 */

import './env';
import { db } from '../index';
import {
  users,
  members,
  classSessions,
  enrollments,
  waitlistEntries,
  roleAssignments,
} from '../schema';
import {
  e2eMembers,
  e2eSessions,
  e2eEnrollments,
  e2eWaitlistEntries,
  E2E_TEST_ACCOUNTS,
} from './fixtures/e2e-data';

async function seedE2E(): Promise<void> {
  console.log('🌱 Seeding E2E test data (layers on top of base seed)...\n');

  // ── E2E Users (5) ──────────────────────────────────────────────
  console.log('  Inserting 5 E2E test users...');
  await db.insert(users).values(e2eMembers.map((m) => m.user)).onConflictDoNothing();

  // ── E2E Members (5) ────────────────────────────────────────────
  console.log('  Inserting 5 E2E test members...');
  const memberRows = e2eMembers.map((m) => ({
    ...m.member,
    userId: m.user.id!,
  }));
  await db.insert(members).values(memberRows).onConflictDoNothing();

  // ── Role assignments (all 'member') ──────────────────────────
  console.log('  Inserting role assignments...');
  const roleRows = e2eMembers.flatMap((m) =>
    m.roles.map((role) => ({
      memberId: m.member.id!,
      role,
    })),
  );
  await db.insert(roleAssignments).values(roleRows).onConflictDoNothing();

  // ── E2E Sessions (14 days, ~30 sessions) ─────────────────────
  console.log(`  Inserting ${e2eSessions.length} E2E sessions (14 days)...`);
  await db.insert(classSessions).values(e2eSessions).onConflictDoNothing();

  // ── Pre-existing Enrollments ─────────────────────────────────
  console.log(`  Inserting ${e2eEnrollments.length} pre-existing enrollments...`);
  await db.insert(enrollments).values(e2eEnrollments).onConflictDoNothing();

  // ── Pre-existing Waitlist Entry ──────────────────────────────
  console.log(`  Inserting ${e2eWaitlistEntries.length} pre-existing waitlist entry...`);
  await db.insert(waitlistEntries).values(e2eWaitlistEntries).onConflictDoNothing();

  console.log('\n✅ E2E seed complete. Summary:');
  console.log(`     5 E2E members, ${e2eSessions.length} sessions,`);
  console.log(`     ${e2eEnrollments.length} enrollments, ${e2eWaitlistEntries.length} waitlist entries`);
  console.log('\n  E2E test accounts (magic-link email login):');
  for (const [, account] of Object.entries(E2E_TEST_ACCOUNTS)) {
    console.log(`     ${account.email.padEnd(30)} — ${account.useCase}`);
  }
  console.log('\n  💡 Run `pnpm db:seed` first if base data is missing.');
}

seedE2E()
  .then(() => {
    console.log('\n🌱 E2E seed script finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ E2E seed script failed:', error);
    process.exit(1);
  });

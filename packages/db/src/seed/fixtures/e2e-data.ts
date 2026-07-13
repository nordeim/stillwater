/**
 * E2E Test Seed Fixtures
 *
 * Additional members, sessions, enrollments, and waitlist entries
 * for realistic browser-based E2E testing.
 *
 * Designed to be layered ON TOP of the base demo seed (demoMembers,
 * demoInstructors, demoSessions). Provides:
 *
 *   - 5 additional regular members (bookable, no staff roles)
 *   - 14 days of sessions (2-3 per day, morning + evening)
 *   - Pre-existing enrollments (partially-filled sessions)
 *   - Pre-existing waitlist entries (for the full Ashtanga session)
 *   - Test credential reference table
 *
 * Idempotency: all inserts use onConflictDoNothing.
 * Safety: uses deterministic UUIDs in the E2E namespace (00000000-0000-4eee-*)
 *         so re-running never creates duplicates.
 */

import type { InferInsertModel } from 'drizzle-orm';
import { users, members, roleAssignments, classSessions, enrollments, waitlistEntries } from '../../schema';

type NewUser = InferInsertModel<typeof users>;
type NewMember = InferInsertModel<typeof members>;
type NewRoleAssignment = InferInsertModel<typeof roleAssignments>;
type NewSession = InferInsertModel<typeof classSessions>;
type NewEnrollment = InferInsertModel<typeof enrollments>;
type NewWaitlistEntry = InferInsertModel<typeof waitlistEntries>;

// ─── E2E Test Members (5 additional regular members) ────────────────
// These members have NO staff/instructor roles — pure booking flow test users.
// UUID namespace: 00000000-0000-4eee-a000-{NNNNNNNNNN}

export interface E2EMember {
  user: NewUser;
  member: Omit<NewMember, 'userId'>;
  roles: NewRoleAssignment['role'][];
  /** Documented test credential (email is the login; no password for magic-link flow) */
  testNote: string;
}

export const e2eMembers: E2EMember[] = [
  {
    user: {
      id: '00000000-0000-4eee-a000-000000000001',
      email: 'e2e.member@stillwater.test',
      name: 'E2E Test Member',
      emailVerified: true,
    },
    member: {
      id: '00000000-0000-4eee-a000-000000000011',
      displayName: 'E2E Test Member',
      phone: '+1-503-555-1001',
      dateOfBirth: new Date('1991-06-12'),
      emergencyContact: 'Test Contact',
      emergencyPhone: '+1-503-555-1002',
      notes: 'Primary E2E test account. Use for booking flow tests.',
      joinedAt: new Date('2026-06-01'),
    },
    roles: ['member'],
    testNote: 'Primary booking-flow test member',
  },
  {
    user: {
      id: '00000000-0000-4eee-a000-000000000002',
      email: 'e2e.booker@stillwater.test',
      name: 'E2E Booker',
      emailVerified: true,
    },
    member: {
      id: '00000000-0000-4eee-a000-000000000012',
      displayName: 'E2E Booker',
      phone: '+1-503-555-1101',
      dateOfBirth: new Date('1989-02-28'),
      emergencyContact: 'Booker Contact',
      emergencyPhone: '+1-503-555-1102',
      notes: 'Secondary booking test account. Has pre-existing enrollments.',
      joinedAt: new Date('2026-05-15'),
    },
    roles: ['member'],
    testNote: 'Has pre-existing enrollments',
  },
  {
    user: {
      id: '00000000-0000-4eee-a000-000000000003',
      email: 'e2e.waitlist@stillwater.test',
      name: 'E2E Waitlist',
      emailVerified: true,
    },
    member: {
      id: '00000000-0000-4eee-a000-000000000013',
      displayName: 'E2E Waitlist',
      phone: '+1-503-555-1201',
      dateOfBirth: new Date('1993-11-07'),
      emergencyContact: 'Waitlist Contact',
      emergencyPhone: '+1-503-555-1202',
      notes: 'Waitlist test account. Pre-joined the full Ashtanga session.',
      joinedAt: new Date('2026-06-20'),
    },
    roles: ['member'],
    testNote: 'Pre-joined waitlist for full session',
  },
  {
    user: {
      id: '00000000-0000-4eee-a000-000000000004',
      email: 'e2e.cancel@stillwater.test',
      name: 'E2E Cancel',
      emailVerified: true,
    },
    member: {
      id: '00000000-0000-4eee-a000-000000000014',
      displayName: 'E2E Cancel',
      phone: '+1-503-555-1301',
      dateOfBirth: new Date('1985-09-14'),
      emergencyContact: 'Cancel Contact',
      emergencyPhone: '+1-503-555-1302',
      notes: 'Cancellation-flow test account. Has a pre-existing enrollment to cancel.',
      joinedAt: new Date('2026-04-10'),
    },
    roles: ['member'],
    testNote: 'Has enrollment to cancel',
  },
  {
    user: {
      id: '00000000-0000-4eee-a000-000000000005',
      email: 'e2e.history@stillwater.test',
      name: 'E2E History',
      emailVerified: true,
    },
    member: {
      id: '00000000-0000-4eee-a000-000000000015',
      displayName: 'E2E History',
      phone: '+1-503-555-1401',
      dateOfBirth: new Date('1987-12-03'),
      emergencyContact: 'History Contact',
      emergencyPhone: '+1-503-555-1402',
      notes: 'History/attendance test account. Has past attended sessions.',
      joinedAt: new Date('2026-01-05'),
    },
    roles: ['member'],
    testNote: 'Has past attended sessions',
  },
];

// ─── E2E Test Sessions (14 days, 2-3 per day) ───────────────────────
// UUID namespace: 00000000-0000-4eee-f000-{NNNNNNNNNN}
// Sessions are scheduled relative to "now" so they're always current.

export function generateE2ESessions(): NewSession[] {
  const sessions: NewSession[] = [];
  const instructorIds = [
    '00000000-0000-4000-b000-000000000001', // Mei Tanaka
    '00000000-0000-4000-b000-000000000002', // James Harlow
    '00000000-0000-4000-b000-000000000003', // Aiko Mori
  ];
  const roomMain = '00000000-0000-4000-e000-000000000001'; // Main Studio (14)
  const roomQuiet = '00000000-0000-4000-e000-000000000002'; // Quiet Room (8)

  // Session templates: (classId, durationMin, instructorIdx, roomId, hour, overrideCapacity?)
  type Template = {
    classId: string;
    durationMin: number;
    instructorIdx: number;
    roomId: string;
    hour: number;
    overrideCapacity?: number;
  };

  const morningTemplates: Template[] = [
    { classId: '00000000-0000-4000-d000-000000000001', durationMin: 60, instructorIdx: 0, roomId: roomMain, hour: 7 }, // Vinyasa 7am
    { classId: '00000000-0000-4000-d000-000000000003', durationMin: 75, instructorIdx: 2, roomId: roomQuiet, hour: 9 }, // Yin 9am
  ];

  const eveningTemplates: Template[] = [
    { classId: '00000000-0000-4000-d000-000000000002', durationMin: 90, instructorIdx: 1, roomId: roomMain, hour: 18, overrideCapacity: 0 }, // Ashtanga 6pm (FULL)
    { classId: '00000000-0000-4000-d000-000000000004', durationMin: 60, instructorIdx: 2, roomId: roomQuiet, hour: 20 }, // Restorative 8pm
  ];

  // Also add a few afternoon sessions on weekends
  const afternoonTemplate: Template = {
    classId: '00000000-0000-4000-d000-000000000001',
    durationMin: 60,
    instructorIdx: 0,
    roomId: roomMain,
    hour: 12,
  };

  // Counter-based UUID suffix — guarantees 12-char last segment (valid PostgreSQL uuid).
  // Format: 00000000-0000-4eee-f000-{counter:012d}
  let sessionCounter = 0;
  const nextSessionId = (): string => {
    sessionCounter++;
    return `00000000-0000-4eee-f000-${String(sessionCounter).padStart(12, '0')}`;
  };

  const now = new Date();

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(now);
    date.setDate(now.getDate() + dayOffset);
    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Morning sessions (every day)
    for (const tmpl of morningTemplates) {
      const startsAt = new Date(date);
      startsAt.setHours(tmpl.hour, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + tmpl.durationMin * 60_000);
      sessions.push({
        id: nextSessionId(),
        classId: tmpl.classId,
        instructorId: instructorIds[tmpl.instructorIdx]!,
        roomId: tmpl.roomId,
        startsAt,
        endsAt,
        status: 'scheduled',
        overrideCapacity: tmpl.overrideCapacity ?? null,
        isVirtual: false,
      });
    }

    // Evening sessions (every day)
    for (const tmpl of eveningTemplates) {
      const startsAt = new Date(date);
      startsAt.setHours(tmpl.hour, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + tmpl.durationMin * 60_000);
      sessions.push({
        id: nextSessionId(),
        classId: tmpl.classId,
        instructorId: instructorIds[tmpl.instructorIdx]!,
        roomId: tmpl.roomId,
        startsAt,
        endsAt,
        status: 'scheduled',
        overrideCapacity: tmpl.overrideCapacity ?? null,
        isVirtual: false,
      });
    }

    // Afternoon session on weekends
    if (isWeekend) {
      const startsAt = new Date(date);
      startsAt.setHours(afternoonTemplate.hour, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + afternoonTemplate.durationMin * 60_000);
      sessions.push({
        id: nextSessionId(),
        classId: afternoonTemplate.classId,
        instructorId: instructorIds[afternoonTemplate.instructorIdx]!,
        roomId: afternoonTemplate.roomId,
        startsAt,
        endsAt,
        status: 'scheduled',
        overrideCapacity: null,
        isVirtual: false,
      });
    }
  }

  return sessions;
}

// ─── Exported session lookups (for enrollment + waitlist references) ──
// These find specific sessions by dayOffset + class + hour so enrollments
// and waitlist entries can reference them without hardcoding UUIDs.
export function findE2ESession(
  dayOffset: number,
  classId: string,
  hour: number,
): NewSession | undefined {
  return e2eSessions.find((s) => {
    if (s.classId !== classId) return false;
    if (s.startsAt.getHours() !== hour) return false;
    const now = new Date();
    const sessionDay = new Date(now);
    sessionDay.setDate(now.getDate() + dayOffset);
    sessionDay.setHours(0, 0, 0, 0);
    const sessionDate = new Date(s.startsAt);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === sessionDay.getTime();
  });
}

export const e2eSessions: NewSession[] = generateE2ESessions();

// ─── E2E Pre-existing Enrollments ───────────────────────────────────
// UUID namespace: 00000000-0000-4eee-e000-{NNNNNNNNNN}
// Pre-populate so the dashboard/history pages have data on first load.

export function generateE2EEnrollments(): NewEnrollment[] {
  const result: NewEnrollment[] = [];
  const e2eBookerMemberId = '00000000-0000-4eee-a000-000000000012';
  const e2eCancelMemberId = '00000000-0000-4eee-a000-000000000014';
  const e2eHistoryMemberId = '00000000-0000-4eee-a000-000000000015';

  // Find tomorrow's morning Vinyasa session (dayOffset=0, hour=7, Vinyasa class)
  const tomorrowVinyasa = findE2ESession(
    0,
    '00000000-0000-4000-d000-000000000001', // Morning Vinyasa Flow
    7,
  );

  // E2E Booker is enrolled in tomorrow's Vinyasa
  if (tomorrowVinyasa) {
    result.push({
      id: '00000000-0000-4eee-e000-000000000001',
      sessionId: tomorrowVinyasa.id!,
      memberId: e2eBookerMemberId,
      status: 'confirmed',
      enrolledAt: new Date(Date.now() - 2 * 24 * 60 * 60_000), // 2 days ago
    });
  }

  // E2E Cancel is enrolled in tomorrow's Yin (so they can cancel it)
  const tomorrowYin = findE2ESession(
    0,
    '00000000-0000-4000-d000-000000000003', // Yin & Meditation
    9,
  );
  if (tomorrowYin) {
    result.push({
      id: '00000000-0000-4eee-e000-000000000002',
      sessionId: tomorrowYin.id!,
      memberId: e2eCancelMemberId,
      status: 'confirmed',
      enrolledAt: new Date(Date.now() - 1 * 24 * 60 * 60_000), // 1 day ago
    });
  }

  // E2E History has 3 past attended sessions (for history page testing)
  // Use the base demo sessions (00000000-0000-4000-f000-*) from yesterday/last week
  // We'll create attended enrollments by inserting with status='attended' + checkedInAt
  const pastSessions = [
    '00000000-0000-4000-f000-000000000001', // yesterday Vinyasa
    '00000000-0000-4000-f000-000000000002', // yesterday Ashtanga
    '00000000-0000-4000-f000-000000000003', // yesterday Yin
  ];
  pastSessions.forEach((sessionId, i) => {
    result.push({
      id: `00000000-0000-4eee-e000-${String(i + 3).padStart(12, '0')}`,
      sessionId,
      memberId: e2eHistoryMemberId,
      status: 'attended',
      enrolledAt: new Date(Date.now() - 7 * 24 * 60 * 60_000), // 7 days ago
      checkedInAt: new Date(Date.now() - 6 * 24 * 60 * 60_000), // 6 days ago
    });
  });

  return result;
}

export const e2eEnrollments: NewEnrollment[] = generateE2EEnrollments();

// ─── E2E Pre-existing Waitlist Entry ────────────────────────────────
// E2E Waitlist member is on the waitlist for tomorrow's full Ashtanga session.

export function generateE2EWaitlistEntries(): NewWaitlistEntry[] {
  const result: NewWaitlistEntry[] = [];
  const e2eWaitlistMemberId = '00000000-0000-4eee-a000-000000000013';

  // Find tomorrow's evening Ashtanga (overrideCapacity=0, so it's "full")
  const tomorrowAshtanga = findE2ESession(
    0,
    '00000000-0000-4000-d000-000000000002', // Ashtanga Primary Series
    18,
  );

  if (tomorrowAshtanga) {
    result.push({
      id: '00000000-0000-4eee-e001-000000000001',
      sessionId: tomorrowAshtanga.id!,
      memberId: e2eWaitlistMemberId,
      position: 1,
      joinedAt: new Date(Date.now() - 3 * 60 * 60_000), // 3 hours ago
      status: 'waiting',
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000), // 24h from now
    });
  }

  return result;
}

export const e2eWaitlistEntries: NewWaitlistEntry[] = generateE2EWaitlistEntries();

// ─── Test Credential Reference ──────────────────────────────────────

export const E2E_TEST_ACCOUNTS = {
  primary: {
    email: 'e2e.member@stillwater.test',
    name: 'E2E Test Member',
    memberId: '00000000-0000-4eee-a000-000000000011',
    useCase: 'Booking flow (no pre-existing data)',
  },
  booker: {
    email: 'e2e.booker@stillwater.test',
    name: 'E2E Booker',
    memberId: '00000000-0000-4eee-a000-000000000012',
    useCase: 'Dashboard with 1 upcoming enrollment',
  },
  waitlist: {
    email: 'e2e.waitlist@stillwater.test',
    name: 'E2E Waitlist',
    memberId: '00000000-0000-4eee-a000-000000000013',
    useCase: 'Waitlist page with 1 waiting entry',
  },
  cancel: {
    email: 'e2e.cancel@stillwater.test',
    name: 'E2E Cancel',
    memberId: '00000000-0000-4eee-a000-000000000014',
    useCase: 'Cancel-flow (has 1 cancellable enrollment)',
  },
  history: {
    email: 'e2e.history@stillwater.test',
    name: 'E2E History',
    memberId: '00000000-0000-4eee-a000-000000000015',
    useCase: 'History page with 3 past attended sessions',
  },
  owner: {
    email: 'alex.rivera@stillwater.test',
    name: 'Alex Rivera',
    memberId: '00000000-0000-4000-a000-000000000015',
    useCase: 'Admin pages (owner role — full access)',
  },
} as const;

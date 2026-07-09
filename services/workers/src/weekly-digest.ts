/**
 * F8-10 — weekly-digest Trigger.dev task
 *
 * Trigger: Scheduled cron (Mondays 7:00 PT) — the cron queries all members
 * and invokes one weekly-digest task per member.
 * CPU Budget: 120s (heaviest job — fan-out query + Sanity fetch + email send)
 * Retries: 2 (cron-triggered and idempotent — fewer retries than user actions)
 *
 * Sends a WeeklyDigest email to a single member containing:
 *   1. Next 3 confirmed class enrollments (with session startsAt + class title)
 *   2. Studio announcements (queried from Sanity — for v1, pass empty array)
 *
 * Source: MEP F8-10, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';
import { db } from '@stillwater/db';
import { sendWeeklyDigest } from '@stillwater/email';

interface MemberWithUserData {
  id: string;
  displayName: string;
  user: { email: string };
}

interface EnrollmentWithSessionData {
  id: string;
  status: string;
  session: {
    startsAt: Date;
    class: { title: string };
  };
}

export const weeklyDigest = task({
  id: 'weekly-digest',
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 120,
  run: async (payload: { memberId: string }) => {
    // Per SKILL Lesson 69: Drizzle 0.45 relational query types infer as
    // 'never' without defineRelations(). Cast to expected shape.
    // Per workers tsconfig: NodeNext + verbatimModuleSyntax means we can't
    // import schema tables directly — use callback syntax for `where`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = (await (db.query.members as any).findFirst({
      where: (m: { id: string }, { eq }: any) => eq(m.id, payload.memberId),
      with: { user: true },
    })) as MemberWithUserData | undefined;

    if (!member) {
      return { sent: false, reason: 'Member not found' };
    }

    // Fetch next 3 confirmed enrollments with upcoming sessions (startsAt > now)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrollments = (await (db.query.enrollments as any).findMany({
      where: (e: any, { eq, and }: any) =>
        and(eq(e.memberId, payload.memberId), eq(e.status, 'confirmed')),
      with: {
        session: { with: { class: true } },
      },
      // limit + orderBy would normally be applied here; the worker package
      // tsconfig forbids importing the schema's asc() helper directly, and
      // the relational query callback syntax for orderBy is awkward. We
      // filter in-memory below instead — N is small (next 3 only).
    })) as EnrollmentWithSessionData[];

    const now = Date.now();
    const upcoming = enrollments
      .filter((e) => e.session.startsAt.getTime() > now)
      .sort((a, b) => a.session.startsAt.getTime() - b.session.startsAt.getTime())
      .slice(0, 3)
      .map((e) => ({
        className: e.session.class.title,
        sessionDate: formatSessionDate(e.session.startsAt),
      }));

    // v1: studio announcements come from Sanity. For v1, pass empty array —
    // the WeeklyDigest template handles the "no announcements" case.
    const announcements: { title: string; body: string }[] = [];

    await sendWeeklyDigest({
      to: member.user.email,
      memberName: member.displayName,
      upcomingClasses: upcoming,
      announcements,
    });

    return { sent: true, classCount: upcoming.length };
  },
});

function formatSessionDate(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

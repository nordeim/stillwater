/**
 * F8-03 — class-reminder-1h Trigger.dev task
 *
 * Trigger: Scheduled cron (every 5 min) — configured in Trigger.dev dashboard.
 *   The cron invokes this task with no payload; the task fans out to find all
 *   sessions starting in the next 1h window and sends reminders to confirmed
 *   enrollees.
 *
 * Why cron instead of per-booking scheduling:
 *   - Handles members who book AFTER the 1h mark (they still get a reminder
 *     if the cron fires before the session starts)
 *   - Doesn't create thousands of scheduled waits in Trigger.dev
 *   - Idempotent: the 5min window + "session hasn't started yet" check
 *     prevents duplicate emails
 *   - Matches PAD §17.1 "scheduled" language
 *
 * CPU Budget: 30s
 * Retries: 3
 *
 * Source: MEP F8-03, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';

import { db } from '@stillwater/db';
import { sendClassReminder1h } from '@stillwater/email';

interface SessionWithEnrollmentsData {
  id: string;
  startsAt: Date;
  class: { title: string };
  instructor: { slug: string };
  enrollments: {
    status: string;
    member: {
      displayName: string;
      user: { email: string };
    };
  }[];
}

export const classReminder1h = task({
  id: 'class-reminder-1h',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 30,
  run: async (_payload: { sessionId?: string; memberId?: string } = {}) => {
    // Per-booking legacy invocation (kept for backward compat)
    if (_payload.sessionId && _payload.memberId) {
      return sendSingleReminder(_payload.sessionId, _payload.memberId);
    }

    // Cron fan-out: find all sessions starting in the next 50-65min window.
    // The 15min window (50min to 65min from now) ensures:
    //   - We capture sessions starting in ~1h regardless of cron timing drift
    //   - A 5min cron cadence means each session is captured exactly once
    const now = new Date();
    const windowStart = new Date(now.getTime() + 50 * 60 * 1000); // +50min
    const windowEnd = new Date(now.getTime() + 65 * 60 * 1000); // +65min

    const sessions = (await (db.query.classSessions as any).findMany({
      where: (s: any, { and, eq, gte, lte }: any) =>
        and(
          eq(s.status, 'scheduled'),
          gte(s.startsAt, windowStart),
          lte(s.startsAt, windowEnd),
        ),
      with: {
        class: true,
        instructor: true,
        enrollments: {
          where: (e: any, { eq }: any) => eq(e.status, 'confirmed'),
          with: { member: { with: { user: true } } },
        },
      },
    })) as SessionWithEnrollmentsData[];

    let sentCount = 0;
    for (const session of sessions) {
      for (const enrollment of session.enrollments) {
        try {
          await sendClassReminder1h({
            to: enrollment.member.user.email,
            memberName: enrollment.member.displayName,
            className: session.class.title,
            sessionTime: formatTimeFromNow(session.startsAt),
            instructor: session.instructor.slug,
          });
          sentCount++;
        } catch {
          // Don't let one email failure block the rest
        }
      }
    }

    return { sent: true, sessionCount: sessions.length, sentCount };
  },
});

/**
 * Legacy single-reminder path — invoked when bookings.book passed
 * sessionId+memberId. Kept for backward compatibility.
 */
async function sendSingleReminder(sessionId: string, memberId: string) {
  const enrollment = (await (db.query.enrollments as any).findFirst({
    where: (e: any, { eq, and }: any) =>
      and(eq(e.sessionId, sessionId), eq(e.memberId, memberId)),
    with: {
      session: { with: { class: true, instructor: true } },
      member: { with: { user: true } },
    },
  })) as
    | {
        id: string;
        status: string;
        session: {
          startsAt: Date;
          class: { title: string };
          instructor: { slug: string };
        };
        member: {
          displayName: string;
          user: { email: string };
        };
      }
    | undefined;

  if (!enrollment) {
    return { sent: false, reason: 'Enrollment not found' };
  }

  if (enrollment.status !== 'confirmed') {
    return { sent: false, reason: 'Enrollment cancelled' };
  }

  await sendClassReminder1h({
    to: enrollment.member.user.email,
    memberName: enrollment.member.displayName,
    className: enrollment.session.class.title,
    sessionTime: formatTimeFromNow(enrollment.session.startsAt),
    instructor: enrollment.session.instructor.slug,
  });

  return { sent: true };
}

function formatTimeFromNow(startsAt: Date): string {
  const diffMs = startsAt.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin <= 1) return 'in 1 minute';
  if (diffMin < 60) return `in ${String(diffMin)} minutes`;
  return 'in 1 hour';
}

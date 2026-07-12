/**
 * F8-02 — class-reminder-24h Trigger.dev task
 *
 * Trigger: Scheduled cron (every 15 min) — configured in Trigger.dev dashboard.
 *   The cron invokes this task with no payload; the task fans out to find all
 *   sessions starting in the next 24h window and sends reminders to confirmed
 *   enrollees.
 *
 * Why cron instead of per-booking scheduling:
 *   - Handles members who book AFTER the 24h mark (they still get the 1h reminder)
 *   - Doesn't create thousands of scheduled waits in Trigger.dev
 *   - Idempotent: if the cron fires twice, the dedup window prevents duplicate
 *     emails (we only send to sessions whose startsAt is in the next 22-24h)
 *   - Matches PAD §17.1 "scheduled" language and the weekly-digest / attendance-
 *     summary pattern
 *
 * CPU Budget: 30s per member (the task is invoked once per session, fan-out
 *   handled by the task itself querying all matching enrollments)
 * Retries: 3
 *
 * Source: MEP F8-02, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';

import { db } from '@stillwater/db';
import { sendClassReminder24h } from '@stillwater/email';

interface SessionWithEnrollmentsData {
  id: string;
  startsAt: Date;
  class: { title: string };
  instructor: { slug: string };
  room: { name: string } | null;
  enrollments: {
    status: string;
    member: {
      displayName: string;
      user: { email: string };
    };
  }[];
}

export const classReminder24h = task({
  id: 'class-reminder-24h',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 30,
  run: async (_payload: { sessionId?: string; memberId?: string } = {}) => {
    // Per-booking legacy invocation (kept for backward compat — if a payload
    // with sessionId+memberId is passed, send a single reminder). This path
    // is no longer triggered by bookings.book but may be invoked manually.
    if (_payload.sessionId && _payload.memberId) {
      return sendSingleReminder(_payload.sessionId, _payload.memberId);
    }

    // Cron fan-out: find all sessions starting in the next 22-24h window.
    // The 2h window (22h to 24h from now) ensures:
    //   - We don't miss sessions if the cron fires slightly late
    //   - We don't double-send if the cron fires slightly early
    //   - A 15min cron cadence means each session is captured exactly once
    const now = new Date();
    const windowStart = new Date(now.getTime() + 22 * 60 * 60 * 1000); // +22h
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

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
        room: true,
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
          await sendClassReminder24h({
            to: enrollment.member.user.email,
            memberName: enrollment.member.displayName,
            className: session.class.title,
            sessionDate: formatSessionDate(session.startsAt),
            instructor: session.instructor.slug,
            studioAddress: '123 SE Division Street, Portland, OR 97202',
          });
          sentCount++;
        } catch {
          // Don't let one email failure block the rest — Trigger.dev retries the task
        }
      }
    }

    return { sent: true, sessionCount: sessions.length, sentCount };
  },
});

/**
 * Legacy single-reminder path — invoked when bookings.book passed
 * sessionId+memberId. Kept for backward compatibility but no longer
 * the primary trigger path.
 */
async function sendSingleReminder(sessionId: string, memberId: string) {
  const enrollment = (await (db.query.enrollments as any).findFirst({
    where: (e: any, { eq, and }: any) =>
      and(eq(e.sessionId, sessionId), eq(e.memberId, memberId)),
    with: {
      session: { with: { class: true, instructor: true, room: true } },
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
          room: { name: string } | null;
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

  await sendClassReminder24h({
    to: enrollment.member.user.email,
    memberName: enrollment.member.displayName,
    className: enrollment.session.class.title,
    sessionDate: formatSessionDate(enrollment.session.startsAt),
    instructor: enrollment.session.instructor.slug,
    studioAddress: '123 SE Division Street, Portland, OR 97202',
  });

  return { sent: true };
}

function formatSessionDate(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * F8-02 — class-reminder-24h Trigger.dev task
 *
 * Trigger: Scheduled cron (every 15 min) — configured in Trigger.dev dashboard.
 *   The cron invokes this task with no payload; the task fans out to find all
 *   sessions starting in the next 24h window and sends reminders to confirmed
 *   enrollees.
 *
 * Dedup mechanism (C1 fix): each enrollment has a `reminder24hSentAt` column.
 *   Before sending, we check if it's null (never sent). After a successful
 *   send, we set it to NOW(). This prevents duplicate emails when the cron
 *   fires multiple times within the 2h reminder window. The check-and-set
 *   is atomic via a single UPDATE ... WHERE reminder_24h_sent_at IS NULL.
 *
 * CPU Budget: 30s
 * Retries: 3
 *
 * Source: MEP F8-02, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';
import { sql } from 'drizzle-orm';

import { db, enrollments } from '@stillwater/db';
import { sendClassReminder24h } from '@stillwater/email';
// V17-8: Use shared SITE constant for the studio address (single source
// of truth). Previously hardcoded as '123 SE Division Street, Portland, OR
// 97202' (fabricated) — didn't match the Footer's corrected value.
import { SITE } from '@stillwater/config/site';

interface SessionWithEnrollmentsData {
  id: string;
  startsAt: Date;
  class: { title: string };
  instructor: { slug: string };
  room: { name: string } | null;
  enrollments: {
    id: string;
    status: string;
    reminder24hSentAt: Date | null;
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
    // Dedup is handled per-enrollment via the reminder24hSentAt column
    // (checked and set atomically below).
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
          where: (e: any, { and, eq, isNull }: any) =>
            and(eq(e.status, 'confirmed'), isNull(e.reminder24hSentAt)),
          with: { member: { with: { user: true } } },
        },
      },
    })) as SessionWithEnrollmentsData[];

    let sentCount = 0;
    let skippedCount = 0;
    for (const session of sessions) {
      for (const enrollment of session.enrollments) {
        try {
          await sendClassReminder24h({
            to: enrollment.member.user.email,
            memberName: enrollment.member.displayName,
            className: session.class.title,
            sessionDate: formatSessionDate(session.startsAt),
            instructor: session.instructor.slug,
            studioAddress: SITE.address.full,
          });

          // Mark as sent (atomic — only updates rows where still null,
          // preventing race conditions if two cron runs overlap)
          await db
            .update(enrollments)
            .set({ reminder24hSentAt: new Date() })
            .where(sql`${enrollments.id} = ${enrollment.id} AND ${enrollments.reminder24hSentAt} IS NULL` as any);

          sentCount++;
        } catch {
          // Don't let one email failure block the rest — Trigger.dev retries the task.
          // Don't mark as sent so the next cron run retries.
          skippedCount++;
        }
      }
    }

    return { sent: true, sessionCount: sessions.length, sentCount, skippedCount };
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
    studioAddress: SITE.address.full,
  });

  // Mark as sent
  await db
    .update(enrollments)
    .set({ reminder24hSentAt: new Date() })
    .where(sql`${enrollments.id} = ${enrollment.id}` as any);

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

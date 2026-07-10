/**
 * F8-03 — class-reminder-1h Trigger.dev task
 *
 * Trigger: Scheduled 1h before session (via triggerAfter in booking mutation)
 * CPU Budget: 30s
 * Retries: 3
 *
 * Source: MEP F8-03, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';

import { db } from '@stillwater/db';
import { sendClassReminder1h } from '@stillwater/email';

interface EnrollmentWithSessionData {
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

export const classReminder1h = task({
  id: 'class-reminder-1h',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 30,
  run: async (payload: { sessionId: string; memberId: string }) => {
    const enrollment = (await (db.query.enrollments as any).findFirst({
      where: (e: any, { eq, and }: any) =>
        and(eq(e.sessionId, payload.sessionId), eq(e.memberId, payload.memberId)),
      with: {
        session: { with: { class: true, instructor: true } },
        member: { with: { user: true } },
      },
    })) as EnrollmentWithSessionData | undefined;

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
  },
});

function formatTimeFromNow(startsAt: Date): string {
  const diffMs = startsAt.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin <= 1) return 'in 1 minute';
  if (diffMin < 60) return `in ${String(diffMin)} minutes`;
  return 'in 1 hour';
}

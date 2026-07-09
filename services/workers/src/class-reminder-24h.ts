/**
 * F8-02 — class-reminder-24h Trigger.dev task
 *
 * Trigger: Scheduled 24h before session (via triggerAfter in booking mutation)
 * CPU Budget: 30s
 * Retries: 3
 *
 * Source: MEP F8-02, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';
import { db } from '@stillwater/db';
import { sendClassReminder24h } from '@stillwater/email';

interface EnrollmentWithSessionData {
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

export const classReminder24h = task({
  id: 'class-reminder-24h',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 30,
  run: async (payload: { sessionId: string; memberId: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrollment = (await (db.query.enrollments as any).findFirst({
      where: (e: any, { eq, and }: any) =>
        and(eq(e.sessionId, payload.sessionId), eq(e.memberId, payload.memberId)),
      with: {
        session: { with: { class: true, instructor: true, room: true } },
        member: { with: { user: true } },
      },
    })) as EnrollmentWithSessionData | undefined;

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
  },
});

function formatSessionDate(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * booking-cancellation Trigger.dev task (v8 C2 fix — JOB-012)
 *
 * Trigger: Cancellation mutation (bookings.cancel)
 * CPU Budget: 30s
 * Retries: 3 (exponential backoff 1s → 2s → 4s w/ jitter)
 *
 * Sends booking cancellation email via Resend Native Templates
 * (sendBookingCancellation wrapper — ADR-010).
 *
 * This task was added in the v8 audit remediation to fix audit finding C2:
 * the BookingCancellation email template existed but was never sent.
 * bookings.cancel now triggers this task post-commit (fire-and-forget).
 *
 * Source: Stillwater Audit Report v1.0 §5 C2; ADR-010; MEP F8-01 (sibling).
 */

import { task } from '@trigger.dev/sdk';

import { db } from '@stillwater/db';
import { sendBookingCancellation } from '@stillwater/email';

interface EnrollmentWithEmailData {
  id: string;
  status: string;
  sessionId: string;
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

export const bookingCancellation = task({
  id: 'booking-cancellation',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 30,
  run: async (payload: { enrollmentId: string; memberId: string }) => {
    // Per SKILL Lesson 69: Drizzle 0.45 relational query types infer as
    // 'never' without defineRelations(). Cast to expected shape.
    // Per workers tsconfig: NodeNext + verbatimModuleSyntax means we can't
    // import schema tables directly — use callback syntax for `where`.
    const enrollment = (await (db.query.enrollments as any).findFirst({
      where: (e: any, { eq }: any) => eq(e.id, payload.enrollmentId),
      with: {
        session: { with: { class: true, instructor: true } },
        member: { with: { user: true } },
      },
    })) as EnrollmentWithEmailData | undefined;

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Skip if enrollment is NOT in a cancelled state (defensive — shouldn't
    // happen since this task is only triggered by bookings.cancel, but
    // guard against race conditions where the enrollment was re-confirmed
    // between trigger and execution).
    if (enrollment.status !== 'cancelled') {
      return { sent: false, reason: 'Enrollment no longer cancelled' };
    }

    await sendBookingCancellation({
      to: enrollment.member.user.email,
      memberName: enrollment.member.displayName,
      className: enrollment.session.class.title,
      sessionDate: formatSessionDate(enrollment.session.startsAt),
    });

    return { sent: true };
  },
});

function formatSessionDate(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

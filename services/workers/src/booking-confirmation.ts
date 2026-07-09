/**
 * F8-01 — booking-confirmation Trigger.dev task
 *
 * Trigger: Booking mutation (bookings.book)
 * CPU Budget: 30s
 * Retries: 3 (exponential backoff 1s → 2s → 4s w/ jitter)
 *
 * Sends booking confirmation email via Resend Native Templates
 * (sendBookingConfirmation wrapper — ADR-010).
 *
 * Source: MEP F8-01, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';
import { db } from '@stillwater/db';
import { sendBookingConfirmation } from '@stillwater/email';

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

export const bookingConfirmation = task({
  id: 'booking-confirmation',
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Skip if enrollment was cancelled between trigger and execution
    if (enrollment.status !== 'confirmed') {
      return { sent: false, reason: 'Enrollment no longer confirmed' };
    }

    await sendBookingConfirmation({
      to: enrollment.member.user.email,
      memberName: enrollment.member.displayName,
      className: enrollment.session.class.title,
      sessionDate: formatSessionDate(enrollment.session.startsAt),
      instructor: enrollment.session.instructor.slug,
      sessionId: enrollment.sessionId,
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

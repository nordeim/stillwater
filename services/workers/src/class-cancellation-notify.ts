/**
 * F8-06 — class-cancellation-notify Trigger.dev task
 *
 * Trigger: Session cancellation (sessions.cancel tRPC procedure)
 * CPU Budget: 60s (higher than other jobs — fan-out to N enrollees)
 * Retries: 3 (exponential backoff 1s → 2s → 4s w/ jitter)
 *
 * Iterates over all confirmed enrollments for the cancelled session and sends
 * a ClassCancellation email to each member via Resend Native Templates
 * (sendClassCancellation wrapper — ADR-010).
 *
 * Source: MEP F8-06, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';

import { db } from '@stillwater/db';
import { sendClassCancellation } from '@stillwater/email';

interface EnrollmentWithClassData {
  id: string;
  status: string;
  member: {
    displayName: string;
    user: { email: string };
  };
  session: {
    startsAt: Date;
    class: { title: string };
  };
}

export const classCancellationNotify = task({
  id: 'class-cancellation-notify',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 60,
  run: async (payload: { sessionId: string; cancelReason: string }) => {
    // Per SKILL Lesson 69: Drizzle 0.45 relational query types infer as
    // 'never' without defineRelations(). Cast to expected shape.
    // Per workers tsconfig: NodeNext + verbatimModuleSyntax means we can't
    // import schema tables directly — use callback syntax for `where`.
    const enrollments = (await (db.query.enrollments as any).findMany({
      where: (e: any, { eq, and }: any) =>
        and(eq(e.sessionId, payload.sessionId), eq(e.status, 'confirmed')),
      with: {
        session: { with: { class: true } },
        member: { with: { user: true } },
      },
    })) as EnrollmentWithClassData[];

    if (enrollments.length === 0) {
      return { notified: 0, emails: [] };
    }

    const emails: string[] = [];

    for (const enrollment of enrollments) {
      const email = enrollment.member.user.email;
      emails.push(email);

      await sendClassCancellation({
        to: email,
        memberName: enrollment.member.displayName,
        className: enrollment.session.class.title,
        sessionDate: formatSessionDate(enrollment.session.startsAt),
        cancelReason: payload.cancelReason,
      });
    }

    return { notified: enrollments.length, emails };
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

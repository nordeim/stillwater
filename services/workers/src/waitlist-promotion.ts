/**
 * F8-04 — waitlist-promotion Trigger.dev task
 *
 * Trigger: Enrollment cancellation (bookings.cancel tRPC procedure)
 * CPU Budget: 30s
 * Retries: 3 (exponential backoff 1s → 2s → 4s w/ jitter)
 *
 * The tRPC `bookings.cancel` procedure handles DB promotion: it finds the
 * next-in-line waitlist entry, sets status='offered' and expiresAt = now + 2h,
 * then invokes this worker with the promoted entry's ID. This worker is
 * stateless — it only queries the entry and sends the WaitlistOffer email via
 * Resend Native Templates (sendWaitlistOffer wrapper — ADR-010).
 *
 * Source: MEP F8-04, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';

import { db } from '@stillwater/db';
import { sendWaitlistOffer } from '@stillwater/email';

interface WaitlistEntryData {
  id: string;
  status: string;
  sessionId: string;
  memberId: string;
  position: number;
  expiresAt: Date | null;
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

export const waitlistPromotion = task({
  id: 'waitlist-promotion',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 30,
  run: async (payload: { waitlistEntryId: string }) => {
    // Per SKILL Lesson 69: Drizzle 0.45 relational query types infer as
    // 'never' without defineRelations(). Cast to expected shape.
    // Per workers tsconfig: NodeNext + verbatimModuleSyntax means we can't
    // import schema tables directly — use callback syntax for `where`.
    const entry = (await (db.query.waitlistEntries as any).findFirst({
      where: (e: any, { eq }: any) => eq(e.id, payload.waitlistEntryId),
      with: {
        session: { with: { class: true, instructor: true } },
        member: { with: { user: true } },
      },
    })) as WaitlistEntryData | undefined;

    if (!entry) {
      return { sent: false, reason: 'Waitlist entry not found' };
    }

    // Skip if entry is no longer in the 'offered' state (e.g., already claimed
    // or expired between the tRPC trigger and this worker execution).
    if (entry.status !== 'offered') {
      return { sent: false, reason: `Entry status is '${entry.status}'` };
    }

    // Derive expiry string (fallback to now + 2h if tRPC layer forgot to set it)
    const expiresAt = entry.expiresAt ?? new Date(Date.now() + 2 * 60 * 60 * 1000);
    const claimUrl = buildClaimUrl(entry.sessionId, entry.id);

    await sendWaitlistOffer({
      to: entry.member.user.email,
      memberName: entry.member.displayName,
      className: entry.session.class.title,
      sessionDate: formatSessionDate(entry.session.startsAt),
      expiresAt: formatExpiryDate(expiresAt),
      claimUrl,
    });

    return { sent: true };
  },
});

function buildClaimUrl(sessionId: string, waitlistEntryId: string): string {
  // V13-3 fix (2026-07-19): Use the actual production domain
  // (stillwater.jesspete.shop) instead of the placeholder stillwater.yoga.
  // The old URL would 404 in production, breaking the waitlist claim flow.
  // Allow env override for preview/staging environments.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stillwater.jesspete.shop';
  return `${appUrl}/book/claim?session=${sessionId}&entry=${waitlistEntryId}`;
}

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

function formatExpiryDate(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

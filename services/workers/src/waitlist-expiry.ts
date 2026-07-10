/**
 * F8-05 — waitlist-expiry Trigger.dev task
 *
 * Trigger: Scheduled 2 hours after waitlist promotion (triggerAfter in
 * bookings.cancel tRPC procedure — fired when the offer window elapses)
 * CPU Budget: 30s
 * Retries: 3 (exponential backoff 1s → 2s → 4s w/ jitter)
 *
 * The DB status update to 'expired' is owned by the tRPC layer (it polls the
 * waitlist entry on claim/expiry checks). This worker is stateless — it queries
 * the entry, and if still 'offered' (not claimed), sends the WaitlistExpired
 * email via Resend Native Templates (sendWaitlistExpired wrapper — ADR-010).
 *
 * Source: MEP F8-05, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';

import { db } from '@stillwater/db';
import { sendWaitlistExpired } from '@stillwater/email';

interface WaitlistEntryData {
  id: string;
  status: string;
  sessionId: string;
  session: {
    startsAt: Date;
    class: { title: string };
  };
  member: {
    displayName: string;
    user: { email: string };
  };
}

export const waitlistExpiry = task({
  id: 'waitlist-expiry',
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
    const entry = (await (db.query.waitlistEntries as any).findFirst({
      where: (e: any, { eq }: any) => eq(e.id, payload.waitlistEntryId),
      with: {
        session: { with: { class: true } },
        member: { with: { user: true } },
      },
    })) as WaitlistEntryData | undefined;

    if (!entry) {
      return { expired: false, reason: 'Entry not found' };
    }

    // Spot was claimed before the offer window elapsed — nothing to do.
    if (entry.status === 'accepted') {
      return { expired: false, reason: 'Spot was claimed' };
    }

    // Already removed/expired by another path — no email to send.
    if (entry.status !== 'offered') {
      return { expired: false, reason: `Entry status is '${entry.status}'` };
    }

    await sendWaitlistExpired({
      to: entry.member.user.email,
      memberName: entry.member.displayName,
      className: entry.session.class.title,
    });

    return { expired: true, sent: true };
  },
});

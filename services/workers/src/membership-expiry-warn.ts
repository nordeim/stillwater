/**
 * F8-08 — membership-expiry-warn Trigger.dev task
 *
 * Trigger: Scheduled 7 days before subscription renewal (via Stripe webhook
 * customer.subscription.updated event with `current_period_end` in ~7 days)
 * CPU Budget: 30s
 * Retries: 3 (exponential backoff 1s → 2s → 4s w/ jitter)
 *
 * Sends a MembershipRenewal email to the member reminding them that their
 * membership renews on the upcoming renewalDate, and links them to the
 * membership management dashboard (where the "Manage Membership" button
 * opens a Stripe Customer Portal session).
 *
 * Source: MEP F8-08, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';
import { db } from '@stillwater/db';
import { sendMembershipRenewal } from '@stillwater/email';

interface MemberWithUserData {
  id: string;
  displayName: string;
  user: { email: string };
}

export const membershipExpiryWarn = task({
  id: 'membership-expiry-warn',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 30,
  run: async (payload: {
    memberId: string;
    subscriptionId: string;
    renewalDate: string;
    planName: string;
  }) => {
    // Per SKILL Lesson 69: Drizzle 0.45 relational query types infer as
    // 'never' without defineRelations(). Cast to expected shape.
    // Per workers tsconfig: NodeNext + verbatimModuleSyntax means we can't
    // import schema tables directly — use callback syntax for `where`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = (await (db.query.members as any).findFirst({
      where: (m: { id: string }, { eq }: any) => eq(m.id, payload.memberId),
      with: { user: true },
    })) as MemberWithUserData | undefined;

    if (!member) {
      return { sent: false, reason: 'Member not found' };
    }

    // v1: link to the dashboard where the member can click "Manage Membership"
    // (which opens a Stripe Customer Portal session). v2 could construct a
    // direct Stripe portal session URL.
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stillwater.studio'}/membership`;

    await sendMembershipRenewal({
      to: member.user.email,
      memberName: member.displayName,
      renewalDate: payload.renewalDate,
      planName: payload.planName,
      portalUrl,
    });

    return { sent: true };
  },
});

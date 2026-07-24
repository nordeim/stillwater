/**
 * F8-09 — payment-failed-notify Trigger.dev task
 *
 * Trigger: Stripe `invoice.payment_failed` webhook (Phase 7 webhook handler)
 * CPU Budget: 30s
 * Retries: 3 (exponential backoff 1s → 2s → 4s w/ jitter)
 *
 * Sends a PaymentFailed email to the member prompting them to update their
 * payment method via the Stripe Customer Portal (portalUrl provided by the
 * webhook handler — it creates a billing portal session before invoking
 * this task).
 *
 * Source: MEP F8-09, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';

import { db } from '@stillwater/db';
import { sendPaymentFailed } from '@stillwater/email';

interface MemberWithUserData {
  id: string;
  displayName: string;
  user: { email: string };
}

export const paymentFailedNotify = task({
  id: 'payment-failed-notify',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 30,
  // V19-17 fix: webhook handler (packages/payments/src/webhooks.ts) passes
  // { customerId, portalUrl } — but this worker previously expected
  // { memberId, portalUrl }. The member lookup always returned undefined,
  // so the PaymentFailed email was NEVER sent. Now we accept customerId
  // and resolve the member via members.stripeCustomerId inside the worker.
  run: async (payload: { customerId: string; portalUrl: string }) => {
    // Per SKILL Lesson 69: Drizzle 0.45 relational query types infer as
    // 'never' without defineRelations(). Cast to expected shape.
    // Per workers tsconfig: NodeNext + verbatimModuleSyntax means we can't
    // import schema tables directly — use callback syntax for `where`.
    const member = (await (db.query.members as any).findFirst({
      where: (m: { stripeCustomerId: string | null }, { eq }: any) =>
        eq(m.stripeCustomerId, payload.customerId),
      with: { user: true },
    })) as MemberWithUserData | undefined;

    if (!member) {
      return { sent: false, reason: 'Member not found for customerId' };
    }

    await sendPaymentFailed({
      to: member.user.email,
      memberName: member.displayName,
      portalUrl: payload.portalUrl,
    });

    return { sent: true };
  },
});

/**
 * F8-07 — membership-credit-grant Trigger.dev task
 *
 * Trigger: Stripe `invoice.paid` webhook (Phase 7 webhook handler)
 * CPU Budget: 30s
 * Retries: 5 (money-critical — more retries than other jobs)
 *
 * Phase 7's webhook handler already resets `creditsRemaining` synchronously
 * on the member_subscriptions row (STRIPE-001 tested). This job is a NO-OP
 * for v1 — it just logs that it was triggered and returns success. Future
 * v2 may send a "credits granted" notification email to the member.
 *
 * Source: MEP F8-07, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';

export const membershipCreditGrant = task({
  id: 'membership-credit-grant',
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 1000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 30,
  run: (payload: { memberId: string; subscriptionId: string }) => {
    // Phase 7 webhook handler already resets credits synchronously.
    // This job exists for future email notification capability (v2).
    // For v1: no-op — just return success.
    // Trigger.dev requires run() to return Promise<unknown>; return a Promise
    // without `async` (no await) to satisfy @typescript-eslint/require-await.
    return Promise.resolve({
      granted: true,
      memberId: payload.memberId,
      note: 'Credits already granted synchronously by webhook handler',
    });
  },
});

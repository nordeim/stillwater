/**
 * F7-07 — Refund helper (D12 reduced scope)
 *
 * ⚠️ D12 REDUCED SCOPE: v1 uses Stripe Dashboard for refunds.
 * In-app refund UI is deferred to v2. This file is retained as a
 * thin wrapper around stripe.refunds.create() so the API surface
 * is stable when v2 adds the admin refund UI.
 *
 * Per MEP D12 + §9 Q5+Q8: The refund procedure in the tRPC payments
 * router (payments.refund) is staff-only and currently throws
 * PRECONDITION_FAILED. When v2 adds the admin UI, it will call
 * this helper.
 *
 * Per SKILL §15.20: uses getStripeClient() with null fallback.
 *
 * Source: MEP F7-07 + D12, PAD §15.1.
 */

import { getStripeClient } from './client';

/**
 * DTO for a Stripe refund, exposed to the tRPC layer.
 */
export interface RefundDTO {
  id: string;
  paymentIntentId: string;
  amount: number;
  status: string;
}

/**
 * Create a refund for a PaymentIntent.
 *
 * @param params.paymentIntentId - The Stripe PaymentIntent ID to refund
 * @param params.amount          - Optional partial refund amount (in cents).
 *                                  Omit for full refund.
 * @param params.reason          - Optional reason: 'duplicate' | 'fraudulent'
 *                                  | 'requested_by_customer'
 * @returns The refund DTO, or null if the Stripe client is unavailable.
 */
export async function createRefund(params: {
  paymentIntentId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}): Promise<RefundDTO | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const refund = await stripe.refunds.create({
    payment_intent: params.paymentIntentId,
    ...(params.amount !== undefined ? { amount: params.amount } : {}),
    ...(params.reason ? { reason: params.reason } : {}),
  });

  return {
    id: refund.id,
    paymentIntentId:
      typeof refund.payment_intent === 'string'
        ? refund.payment_intent
        : '',
    amount: refund.amount ?? 0,
    status: refund.status ?? 'unknown',
  };
}

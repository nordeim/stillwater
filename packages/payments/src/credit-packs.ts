/**
 * F7-06 — Credit pack checkout (one-off PaymentIntent)
 *
 * Creates a Stripe Checkout Session for purchasing a credit pack
 * (e.g., "10-class pack"). Unlike subscriptions (F7-03), this uses
 * mode: 'payment' for a one-off charge, not mode: 'subscription'.
 *
 * Per MEP F7-06: The class_packages row is created with status='pending'
 * at checkout time. When the checkout.session.completed webhook fires,
 * the webhook handler updates class_packages.status = 'paid'.
 *
 * Per SKILL §15.20: uses getStripeClient() with null fallback.
 *
 * Source: MEP F7-06, PAD §15.1 + §15.4.
 */

import { getStripeClient } from './client';

/**
 * Create a Stripe Checkout Session for a credit pack purchase.
 *
 * @returns The Checkout Session URL (redirect the browser here), or null
 *          if the Stripe client is unavailable.
 */
export async function createCreditPackCheckout(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string } | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    // One-off payment, NOT subscription
    mode: 'payment',
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return { id: session.id, url: session.url ?? '' };
}

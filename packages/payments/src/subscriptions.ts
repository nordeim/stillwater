/**
 * F7-03 — Subscription lifecycle helpers
 *
 * Five thin wrappers around Stripe SDK calls for managing subscription
 * state. Each function takes a minimal input, calls a single Stripe API,
 * and returns a minimal output.
 *
 * Per SKILL §15.20: uses getStripeClient() which returns null when
 * STRIPE_SECRET_KEY is not set. Helpers MUST handle the null case
 * (return null or throw — caller decides via null-check).
 *
 * Per MEP F7-01 + PAD §15.1: snake_case throughout (Stripe SDK v22
 * exposes snake_case to match the API wire format).
 *
 * Per PAD §15.2 subscription lifecycle state machine:
 *   [*] -> Trialing (subscribe with trial)
 *   [*] -> Active (subscribe without trial)
 *   Trialing -> Active (trial_will_end webhook -> payment collected)
 *   Active -> Paused (pauseSubscription)
 *   Paused -> Active (resumeSubscription)
 *   Active -> Cancelled (cancelAtPeriodEnd -> period ends -> subscription.deleted webhook)
 *   Active -> PastDue (invoice.payment_failed webhook)
 *
 * Source: MEP F7-03, PAD §15.1 + §15.2, SKILL §15.20.
 */

import type Stripe from 'stripe';
import { getStripeClient } from './client';

/**
 * Create a Stripe Checkout Session for a member to subscribe to a plan.
 *
 * @returns The Checkout Session URL (redirect the browser here), or null
 *          if the Stripe client is unavailable.
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  /** Optional trial period in days. Omit for no trial. */
  trialDays?: number;
}): Promise<{ id: string; url: string } | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: 'subscription',
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    ...(params.trialDays
      ? { subscription_data: { trial_period_days: params.trialDays } }
      : {}),
  });

  return { id: session.id, url: session.url ?? '' };
}

/**
 * Create a Stripe Billing Portal session for a member to manage their
 * subscription (update payment method, view invoices, cancel, etc.).
 *
 * @returns The portal URL (redirect the browser here), or null if the
 *          Stripe client is unavailable.
 */
export async function createCustomerPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<string | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return session.url;
}

/**
 * Pause a Stripe subscription. Sets `pause_collection` with behavior
 * 'void' — the subscription stops invoicing but remains active until
 * resumed or cancelled.
 *
 * Per PAD §15.2: Active -> Paused transition.
 */
export async function pauseSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  return stripe.subscriptions.update(subscriptionId, {
    pause_collection: { behavior: 'void' },
  });
}

/**
 * Resume a paused Stripe subscription. Clears `pause_collection` by
 * passing an empty string (per Stripe docs: '' unpauses immediately).
 *
 * Per PAD §15.2: Paused -> Active transition.
 */
export async function resumeSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  return stripe.subscriptions.update(subscriptionId, {
    pause_collection: '',
  });
}

/**
 * Cancel a Stripe subscription at period end. Sets `cancel_at_period_end`
 * to true — the subscription remains active until the current period ends,
 * then a `customer.subscription.deleted` webhook fires.
 *
 * Per PAD §15.2: Active -> Cancelled transition (via period end).
 *
 * Note: This does NOT immediately cancel. For immediate cancellation,
 * call `stripe.subscriptions.del()` directly (not wrapped here — rare
 * use case reserved for staff admin actions).
 */
export async function cancelAtPeriodEnd(
  subscriptionId: string,
): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

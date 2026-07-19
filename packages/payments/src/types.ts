/**
 * F7-02 — Stripe webhook event types
 *
 * Discriminated union for the 9 Stripe event types handled by the
 * Stillwater webhook handler (per PAD §15.3 + MEP F7-04 + V13-6 fix).
 *
 * These types are intentionally minimal — they describe only the fields
 * the webhook handler reads. Stripe's actual event payloads are much
 * richer; we use Stripe's SDK types where possible and fall back to
 * these minimal shapes for the parts we consume.
 *
 * Per MEP F7-01 + PAD §15.1: SDK v22 exposes snake_case to match the
 * API wire format (e.g., `current_period_end`, NOT `currentPeriodEnd`).
 * The top-level `subscription.current_period_end` was deprecated in
 * Basil 2025-03-31; use `items.data[0].current_period_end` instead.
 *
 * Events handled (9):
 *   1. customer.subscription.created       -> Create MemberSubscription record
 *   2. customer.subscription.updated       -> Sync status, period dates
 *   3. customer.subscription.deleted       -> Mark subscription cancelled
 *   4. invoice.paid                        -> Credit member's monthly credits
 *   5. invoice.payment_failed              -> Mark past_due, trigger retry email
 *   6. invoice.payment_action_required     -> Send 3DS authentication email
 *   7. customer.subscription.trial_will_end -> Send trial ending notification
 *   8. checkout.session.completed          -> Record credit pack purchase (V13-6)
 *   9. charge.refunded                     -> Record refund event (V13-6)
 *
 * Source: MEP F7-02, PAD §15.3, SKILL §20.7, V13-6 fix (2026-07-19).
 */

/**
 * Minimal shape of a Stripe Subscription object as consumed by the webhook handler.
 * Only the fields we read are typed; the rest are passed through as `unknown`.
 */
export interface StripeSubscriptionObject {
  id: string;
  customer: string;
  status: string;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  pause_collection?: { behavior: string } | null;
  items?: {
    data: Array<{
      current_period_start?: number;
      current_period_end?: number;
      price?: { id: string };
    }>;
  };
}

/**
 * Minimal shape of a Stripe Invoice object as consumed by the webhook handler.
 *
 * `total` and `currency` are optional because draft invoices (e.g., on
 * `invoice.payment_failed` before finalization) may not have final totals.
 */
export interface StripeInvoiceObject {
  id: string;
  customer: string;
  subscription?: string | null;
  total?: number;
  currency?: string;
  attempt_count?: number;
  status?: string;
}

/**
 * Minimal shape of a Stripe Checkout Session object as consumed by the webhook
 * handler (V13-6 fix, 2026-07-19).
 *
 * Used for `checkout.session.completed` events — fires when a member completes
 * a one-off credit pack purchase (not a subscription). The handler records the
 * purchase in the `class_packages` table.
 *
 * Fields:
 *   - `id`: Stripe checkout session ID (cs_test_... or cs_live_...)
 *   - `customer`: Stripe customer ID (cus_...) — used to find the member
 *   - `payment_intent`: Stripe PaymentIntent ID (pi_...) — used to link
 *   - `amount_total`: Total in cents (e.g., 22000 = $220.00)
 *   - `metadata`: Stripe metadata dict. Stillwater sets `packageType` and
 *     `credits` on checkout sessions created for credit pack purchases.
 */
export interface StripeCheckoutSessionObject {
  id: string;
  customer: string;
  payment_intent: string | null;
  amount_total: number | null;
  currency: string | null;
  metadata?: {
    packageType?: string;
    credits?: string;
    [key: string]: string | undefined;
  } | null;
}

/**
 * Minimal shape of a Stripe Charge object as consumed by the webhook handler
 * (V13-6 fix, 2026-07-19).
 *
 * Used for `charge.refunded` events — fires when a refund is issued (via
 * Stripe Dashboard or API). The handler records the refund in the
 * `payment_events` table for audit purposes.
 *
 * Fields:
 *   - `id`: Stripe charge ID (ch_...)
 *   - `payment_intent`: Stripe PaymentIntent ID (pi_...) — links to original
 *   - `amount_refunded`: Total refunded in cents (0 if not refunded)
 *   - `refunded`: Boolean — true if fully refunded
 */
export interface StripeChargeObject {
  id: string;
  payment_intent: string | null;
  amount_refunded: number;
  refunded: boolean;
  currency: string;
}

/**
 * Discriminated union of the 9 Stripe event types handled by Stillwater
 * (7 original + 2 added in V13-6 fix, 2026-07-19).
 *
 * The `type` field is the discriminant. Use `event.type` in a switch
 * statement to narrow to the specific variant.
 */
export type StripeWebhookEvent =
  | {
      id: string;
      type: 'customer.subscription.created';
      data: { object: StripeSubscriptionObject };
    }
  | {
      id: string;
      type: 'customer.subscription.updated';
      data: { object: StripeSubscriptionObject };
    }
  | {
      id: string;
      type: 'customer.subscription.deleted';
      data: { object: StripeSubscriptionObject };
    }
  | {
      id: string;
      type: 'customer.subscription.trial_will_end';
      data: { object: StripeSubscriptionObject };
    }
  | {
      id: string;
      type: 'invoice.paid';
      data: { object: StripeInvoiceObject };
    }
  | {
      id: string;
      type: 'invoice.payment_failed';
      data: { object: StripeInvoiceObject };
    }
  | {
      id: string;
      type: 'invoice.payment_action_required';
      data: { object: StripeInvoiceObject };
    }
  | {
      id: string;
      type: 'checkout.session.completed';
      data: { object: StripeCheckoutSessionObject };
    }
  | {
      id: string;
      type: 'charge.refunded';
      data: { object: StripeChargeObject };
    };

/**
 * Convenience alias for the 4 subscription-related event variants.
 * Use for type narrowing in handlers that process subscription events.
 */
export type StripeSubscriptionEvent = Extract<
  StripeWebhookEvent,
  { type: `customer.subscription.${string}` }
>;

/**
 * Convenience alias for the 3 invoice-related event variants.
 * Use for type narrowing in handlers that process invoice events.
 */
export type StripeInvoiceEvent = Extract<
  StripeWebhookEvent,
  { type: `invoice.${string}` }
>;

/**
 * Result of processing a Stripe webhook event.
 *
 * - `{ received: true }` — event processed successfully (or was already
 *   processed — idempotent). HTTP 200.
 * - `{ received: false; reason: string }` — event rejected (bad signature,
 *   malformed payload, etc.). HTTP 400 or 500 depending on reason.
 */
export type StripeWebhookResult =
  | { received: true }
  | { received: false; reason: string };

/**
 * The 9 Stripe event types handled by Stillwater, as a readonly array.
 * Useful for runtime validation (e.g., asserting an event type is one we handle).
 *
 * V13-6 fix (2026-07-19): Added 'checkout.session.completed' + 'charge.refunded'.
 */
export const HANDLED_STRIPE_EVENT_TYPES = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'checkout.session.completed',
  'charge.refunded',
] as const;

export type HandledStripeEventType = (typeof HANDLED_STRIPE_EVENT_TYPES)[number];

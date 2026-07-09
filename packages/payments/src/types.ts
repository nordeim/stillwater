/**
 * F7-02 — Stripe webhook event types
 *
 * Discriminated union for the 7 Stripe event types handled by the
 * Stillwater webhook handler (per PAD §15.3 + MEP F7-04).
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
 * Events handled (7):
 *   1. customer.subscription.created       -> Create MemberSubscription record
 *   2. customer.subscription.updated       -> Sync status, period dates
 *   3. customer.subscription.deleted       -> Mark subscription cancelled
 *   4. invoice.paid                        -> Credit member's monthly credits
 *   5. invoice.payment_failed              -> Mark past_due, trigger retry email
 *   6. invoice.payment_action_required     -> Send 3DS authentication email
 *   7. customer.subscription.trial_will_end -> Send trial ending notification
 *
 * Source: MEP F7-02, PAD §15.3, SKILL §20.7.
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
 * Discriminated union of the 7 Stripe event types handled by Stillwater.
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
 * The 7 Stripe event types handled by Stillwater, as a readonly array.
 * Useful for runtime validation (e.g., asserting an event type is one we handle).
 */
export const HANDLED_STRIPE_EVENT_TYPES = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
] as const;

export type HandledStripeEventType = (typeof HANDLED_STRIPE_EVENT_TYPES)[number];

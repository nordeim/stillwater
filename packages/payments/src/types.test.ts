/**
 * F7-02 — Stripe webhook event types tests
 *
 * TDD RED phase: verifies the discriminated union for the 7 Stripe event
 * types handled by the webhook handler (per PAD §15.3).
 *
 * These tests are type-level (compile-time) AND runtime (the inferred
 * `type` string is asserted at runtime to match the expected literal).
 */

import { describe, it, expect } from 'vitest';
import type {
  StripeWebhookEvent,
  StripeWebhookResult,
  StripeSubscriptionEvent,
  StripeInvoiceEvent,
} from './types';

describe('Stripe webhook event types', () => {
  it('customer.subscription.created has correct shape', () => {
    const event: StripeWebhookEvent = {
      id: 'evt_123',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          current_period_start: 1700000000,
          current_period_end: 1702592000,
          items: {
            data: [
              {
                current_period_start: 1700000000,
                current_period_end: 1702592000,
                price: { id: 'price_123' },
              },
            ],
          },
        },
      },
    };
    expect(event.type).toBe('customer.subscription.created');
    expect(event.data.object.id).toBe('sub_123');
  });

  it('customer.subscription.updated has correct shape', () => {
    const event: StripeWebhookEvent = {
      id: 'evt_456',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_123', customer: 'cus_123', status: 'past_due' } },
    };
    expect(event.type).toBe('customer.subscription.updated');
  });

  it('customer.subscription.deleted has correct shape', () => {
    const event: StripeWebhookEvent = {
      id: 'evt_789',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_123', customer: 'cus_123', status: 'canceled' } },
    };
    expect(event.type).toBe('customer.subscription.deleted');
  });

  it('invoice.paid has correct shape', () => {
    const event: StripeWebhookEvent = {
      id: 'evt_inv_paid',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_123',
          customer: 'cus_123',
          subscription: 'sub_123',
          total: 9900,
          currency: 'usd',
        },
      },
    };
    expect(event.type).toBe('invoice.paid');
    expect(event.data.object.subscription).toBe('sub_123');
  });

  it('invoice.payment_failed has correct shape', () => {
    const event: StripeWebhookEvent = {
      id: 'evt_inv_failed',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_456',
          customer: 'cus_123',
          subscription: 'sub_123',
          attempt_count: 1,
        },
      },
    };
    expect(event.type).toBe('invoice.payment_failed');
  });

  it('invoice.payment_action_required has correct shape (3DS/SCA)', () => {
    const event: StripeWebhookEvent = {
      id: 'evt_inv_3ds',
      type: 'invoice.payment_action_required',
      data: {
        object: {
          id: 'in_789',
          customer: 'cus_123',
          subscription: 'sub_123',
        },
      },
    };
    expect(event.type).toBe('invoice.payment_action_required');
  });

  it('customer.subscription.trial_will_end has correct shape', () => {
    const event: StripeWebhookEvent = {
      id: 'evt_trial_end',
      type: 'customer.subscription.trial_will_end',
      data: { object: { id: 'sub_123', customer: 'cus_123', status: 'trialing' } },
    };
    expect(event.type).toBe('customer.subscription.trial_will_end');
  });

  it('StripeWebhookResult success shape', () => {
    const result: StripeWebhookResult = { received: true };
    expect(result.received).toBe(true);
  });

  it('StripeWebhookResult failure shape', () => {
    const result: StripeWebhookResult = {
      received: false,
      reason: 'Invalid signature',
    };
    expect(result.received).toBe(false);
    expect(result.reason).toBe('Invalid signature');
  });

  it('StripeSubscriptionEvent narrows by type (compile-time check)', () => {
    const event: StripeWebhookEvent = {
      id: 'evt_test',
      type: 'customer.subscription.created',
      data: { object: { id: 'sub_1', customer: 'cus_1', status: 'active' } },
    };

    // Verify the event is assignable to StripeSubscriptionEvent when its
    // type matches the subscription prefix. This is a compile-time check:
    // if the union were wrong, `as StripeSubscriptionEvent` would fail.
    if (event.type.startsWith('customer.subscription.')) {
      const subEvent = event as StripeSubscriptionEvent;
      expect(subEvent.data.object.id).toBe('sub_1');
    }
  });

  it('StripeInvoiceEvent narrows by type (compile-time check)', () => {
    const event: StripeWebhookEvent = {
      id: 'evt_test',
      type: 'invoice.paid',
      data: {
        object: { id: 'in_1', customer: 'cus_1', subscription: 'sub_1' },
      },
    };

    // Verify the event is assignable to StripeInvoiceEvent when its type
    // matches the invoice prefix. Compile-time check via `as` assertion.
    if (event.type.startsWith('invoice.')) {
      const invEvent = event as StripeInvoiceEvent;
      expect(invEvent.data.object.subscription).toBe('sub_1');
    }
  });
});

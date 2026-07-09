/**
 * F7-03 — Subscription lifecycle helpers tests
 *
 * TDD RED phase: verifies the 5 lifecycle helper functions:
 *   1. createCheckoutSession
 *   2. createCustomerPortalSession
 *   3. pauseSubscription
 *   4. resumeSubscription
 *   5. cancelAtPeriodEnd
 *
 * Per SKILL §15.21: mock with vi.mock and use vi.hoisted() for the mock
 * factory so the mock objects are available when the hoisted vi.mock
 * factory runs. Mock chains must mirror the full Stripe SDK API shape.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Per SKILL §15.21: use vi.hoisted() so the mock objects are defined
// BEFORE the hoisted vi.mock factory runs. Without this, the mock
// factory would see `undefined` for mockStripeClient.
const {
  mockCheckoutSessionsCreate,
  mockBillingPortalSessionsCreate,
  mockSubscriptionsUpdate,
  mockStripeClient,
} = vi.hoisted(() => {
  const mockCheckoutSessionsCreate = vi.fn();
  const mockBillingPortalSessionsCreate = vi.fn();
  const mockSubscriptionsUpdate = vi.fn();
  const mockStripeClient = {
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
    billingPortal: { sessions: { create: mockBillingPortalSessionsCreate } },
    subscriptions: { update: mockSubscriptionsUpdate },
  };
  return {
    mockCheckoutSessionsCreate,
    mockBillingPortalSessionsCreate,
    mockSubscriptionsUpdate,
    mockStripeClient,
  };
});

// Mock ./client to return our mock Stripe client
vi.mock('./client', () => ({
  getStripeClient: () => mockStripeClient,
}));

describe('subscription lifecycle helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('calls stripe.checkout.sessions.create with correct args', async () => {
      const { createCheckoutSession } = await import('./subscriptions');
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/cs_test_123',
      });

      const result = await createCheckoutSession({
        customerId: 'cus_123',
        priceId: 'price_abc',
        successUrl: 'https://stillwater.studio/membership/success',
        cancelUrl: 'https://stillwater.studio/membership',
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        mode: 'subscription',
        line_items: [{ price: 'price_abc', quantity: 1 }],
        success_url: 'https://stillwater.studio/membership/success',
        cancel_url: 'https://stillwater.studio/membership',
      });
      expect(result).toEqual({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/cs_test_123',
      });
    });

    it('supports trial_period_days for trial subscriptions', async () => {
      const { createCheckoutSession } = await import('./subscriptions');
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_trial',
        url: 'https://checkout.stripe.com/c/cs_trial',
      });

      await createCheckoutSession({
        customerId: 'cus_123',
        priceId: 'price_abc',
        successUrl: 'https://stillwater.studio/membership/success',
        cancelUrl: 'https://stillwater.studio/membership',
        trialDays: 14,
      });

      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            trial_period_days: 14,
          }),
        }),
      );
    });
  });

  describe('createCustomerPortalSession', () => {
    it('calls stripe.billingPortal.sessions.create with correct args', async () => {
      const { createCustomerPortalSession } = await import('./subscriptions');
      mockBillingPortalSessionsCreate.mockResolvedValue({
        url: 'https://billing.stripe.com/p/session_123',
      });

      const result = await createCustomerPortalSession({
        customerId: 'cus_123',
        returnUrl: 'https://stillwater.studio/dashboard',
      });

      expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://stillwater.studio/dashboard',
      });
      expect(result).toBe('https://billing.stripe.com/p/session_123');
    });
  });

  describe('pauseSubscription', () => {
    it('calls stripe.subscriptions.update with pause_collection behavior void', async () => {
      const { pauseSubscription } = await import('./subscriptions');
      mockSubscriptionsUpdate.mockResolvedValue({
        id: 'sub_123',
        pause_collection: { behavior: 'void' },
      });

      await pauseSubscription('sub_123');

      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_123', {
        pause_collection: { behavior: 'void' },
      });
    });
  });

  describe('resumeSubscription', () => {
    it('calls stripe.subscriptions.update with pause_collection empty string (clears pause)', async () => {
      const { resumeSubscription } = await import('./subscriptions');
      mockSubscriptionsUpdate.mockResolvedValue({
        id: 'sub_123',
        pause_collection: null,
      });

      await resumeSubscription('sub_123');

      // Per Stripe docs: pass empty string '' to clear pause_collection
      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_123', {
        pause_collection: '',
      });
    });
  });

  describe('cancelAtPeriodEnd', () => {
    it('calls stripe.subscriptions.update with cancel_at_period_end true', async () => {
      const { cancelAtPeriodEnd } = await import('./subscriptions');
      mockSubscriptionsUpdate.mockResolvedValue({
        id: 'sub_123',
        cancel_at_period_end: true,
      });

      await cancelAtPeriodEnd('sub_123');

      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });
  });
});

describe('subscription helpers with null Stripe client', () => {
  // Use vi.doUnmock + vi.doMock to override the top-level mock for this block.
  // vi.doMock is NOT hoisted, so it runs at the call site (after the top-level
  // vi.mock has already been applied). We need to reset modules first.
  beforeEach(async () => {
    vi.resetModules();
    vi.doUnmock('./client');
    vi.doMock('./client', () => ({ getStripeClient: () => null }));
  });

  it('createCheckoutSession returns null when Stripe client is null', async () => {
    const { createCheckoutSession } = await import('./subscriptions');
    const result = await createCheckoutSession({
      customerId: 'cus_123',
      priceId: 'price_abc',
      successUrl: 'https://stillwater.studio/membership/success',
      cancelUrl: 'https://stillwater.studio/membership',
    });
    expect(result).toBeNull();
  });
});

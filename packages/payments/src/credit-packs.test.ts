/**
 * F7-06 — Credit pack checkout tests
 *
 * TDD RED phase: verifies the credit pack checkout helper.
 *
 * Per MEP F7-06: One-off PaymentIntent (NOT subscription). Creates a
 * Stripe Checkout Session with mode: 'payment'. On payment success,
 * the webhook handler updates class_packages.status = 'paid'.
 *
 * The class_packages row is created with status='pending' at checkout
 * time, then updated to 'paid' when the checkout.session.completed
 * webhook fires.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockCheckoutSessionsCreate, mockStripeClient, getClientReturn } =
  vi.hoisted(() => {
    const mockCheckoutSessionsCreate = vi.fn();
    const mockStripeClient = {
      checkout: { sessions: { create: mockCheckoutSessionsCreate } },
    };
    const getClientReturn: { value: unknown } = { value: mockStripeClient };
    return { mockCheckoutSessionsCreate, mockStripeClient, getClientReturn };
  });

vi.mock('./client', () => ({
  getStripeClient: () => getClientReturn.value,
}));

describe('createCreditPackCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientReturn.value = mockStripeClient;
  });

  it('creates a Checkout Session with mode: payment (not subscription)', async () => {
    const { createCreditPackCheckout } = await import('./credit-packs');
    mockCheckoutSessionsCreate.mockResolvedValue({
      id: 'cs_cp_001',
      url: 'https://checkout.stripe.com/c/cs_cp_001',
    });

    const result = await createCreditPackCheckout({
      customerId: 'cus_123',
      priceId: 'price_pack_10',
      successUrl: 'https://stillwater.studio/membership/success',
      cancelUrl: 'https://stillwater.studio/membership',
    });

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith({
      customer: 'cus_123',
      mode: 'payment',
      line_items: [{ price: 'price_pack_10', quantity: 1 }],
      success_url: 'https://stillwater.studio/membership/success',
      cancel_url: 'https://stillwater.studio/membership',
    });
    expect(result).toEqual({
      id: 'cs_cp_001',
      url: 'https://checkout.stripe.com/c/cs_cp_001',
    });
  });

  it('returns null when Stripe client is unavailable', async () => {
    getClientReturn.value = null;
    const { createCreditPackCheckout } = await import('./credit-packs');
    const result = await createCreditPackCheckout({
      customerId: 'cus_123',
      priceId: 'price_pack_10',
      successUrl: 'https://stillwater.studio/membership/success',
      cancelUrl: 'https://stillwater.studio/membership',
    });
    expect(result).toBeNull();
  });
});

/**
 * F7-07 — Refund helper tests (D12 reduced scope)
 *
 * TDD RED phase: verifies the thin refund wrapper.
 *
 * Per MEP D12: v1 scope is REDUCED — in-app refund UI deferred to v2.
 * This file is a thin wrapper around stripe.refunds.create() so the
 * API surface is stable when v2 adds the admin UI. v1 uses Stripe
 * Dashboard for refunds.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockRefundsCreate, mockStripeClient, getClientReturn } = vi.hoisted(
  () => {
    const mockRefundsCreate = vi.fn();
    const mockStripeClient = {
      refunds: { create: mockRefundsCreate },
    };
    const getClientReturn: { value: unknown } = { value: mockStripeClient };
    return { mockRefundsCreate, mockStripeClient, getClientReturn };
  },
);

vi.mock('./client', () => ({
  getStripeClient: () => getClientReturn.value,
}));

describe('createRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientReturn.value = mockStripeClient;
  });

  it('calls stripe.refunds.create with payment_intent ID', async () => {
    const { createRefund } = await import('./refunds');
    mockRefundsCreate.mockResolvedValue({
      id: 're_001',
      payment_intent: 'pi_123',
      amount: 9900,
      status: 'succeeded',
    });

    const result = await createRefund({
      paymentIntentId: 'pi_123',
    });

    expect(mockRefundsCreate).toHaveBeenCalledWith({
      payment_intent: 'pi_123',
    });
    expect(result).toEqual({
      id: 're_001',
      paymentIntentId: 'pi_123',
      amount: 9900,
      status: 'succeeded',
    });
  });

  it('supports partial refunds with amount + reason', async () => {
    const { createRefund } = await import('./refunds');
    mockRefundsCreate.mockResolvedValue({
      id: 're_002',
      payment_intent: 'pi_456',
      amount: 5000,
      status: 'succeeded',
    });

    await createRefund({
      paymentIntentId: 'pi_456',
      amount: 5000,
      reason: 'requested_by_customer',
    });

    expect(mockRefundsCreate).toHaveBeenCalledWith({
      payment_intent: 'pi_456',
      amount: 5000,
      reason: 'requested_by_customer',
    });
  });

  it('returns null when Stripe client is unavailable', async () => {
    getClientReturn.value = null;
    const { createRefund } = await import('./refunds');
    const result = await createRefund({
      paymentIntentId: 'pi_123',
    });
    expect(result).toBeNull();
  });
});

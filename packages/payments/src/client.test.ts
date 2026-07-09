/**
 * F7-01 — Stripe client singleton tests
 *
 * TDD RED phase: these tests describe the desired behavior of the Stripe
 * client singleton before any implementation exists.
 *
 * Per SKILL §15.20: infrastructure clients use `process.env` directly with
 * null fallback (NOT the Zod env module — throws in browser).
 *
 * Per MEP F7-01: apiVersion must be '2026-06-24.dahlia' (SDK v22 default).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the stripe module so we can assert on the constructor call shape
// without making real HTTP requests. Per SKILL §15.21, mock with vi.mock
// and use a class (not arrow function) so it can be `new`-ed.
const mockStripeConstructor = vi.fn();
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      constructor(...args: unknown[]) {
        mockStripeConstructor(...args);
      }
    },
  };
});

describe('getStripeClient', () => {
  const ORIGINAL_KEY = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    // Reset the singleton between tests by re-importing the module
    vi.resetModules();
    mockStripeConstructor.mockClear();
    delete process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    // Restore the original key
    if (ORIGINAL_KEY !== undefined) {
      process.env.STRIPE_SECRET_KEY = ORIGINAL_KEY;
    } else {
      delete process.env.STRIPE_SECRET_KEY;
    }
  });

  it('returns null when STRIPE_SECRET_KEY is not set (null fallback per SKILL §15.20)', async () => {
    const { getStripeClient } = await import('./client');
    expect(getStripeClient()).toBeNull();
    expect(mockStripeConstructor).not.toHaveBeenCalled();
  });

  it('returns a Stripe instance when STRIPE_SECRET_KEY is set', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_vitest';
    const { getStripeClient } = await import('./client');
    const client = getStripeClient();
    expect(client).not.toBeNull();
    expect(mockStripeConstructor).toHaveBeenCalledTimes(1);
  });

  it('configures the Dahlia API version (2026-06-24.dahlia)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_vitest';
    const { getStripeClient } = await import('./client');
    getStripeClient();
    expect(mockStripeConstructor).toHaveBeenCalledWith(
      'sk_test_fake_key_for_vitest',
      expect.objectContaining({
        apiVersion: '2026-06-24.dahlia',
        typescript: true,
      }),
    );
  });

  it('returns the same instance on subsequent calls (singleton)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_vitest';
    const { getStripeClient } = await import('./client');
    const first = getStripeClient();
    const second = getStripeClient();
    expect(second).toBe(first);
    expect(mockStripeConstructor).toHaveBeenCalledTimes(1);
  });

  it('includes appInfo for Stripe dashboard identification', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_vitest';
    const { getStripeClient } = await import('./client');
    getStripeClient();
    expect(mockStripeConstructor).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        appInfo: expect.objectContaining({
          name: 'stillwater',
        }),
      }),
    );
  });
});

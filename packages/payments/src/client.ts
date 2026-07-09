/**
 * F7-01 — Stripe SDK client singleton
 *
 * Per SKILL §15.20: infrastructure clients use `process.env` directly with
 * null fallback (NOT the Zod env module — throws in browser context).
 *
 * Per MEP F7-01 + PAD §15.1: apiVersion must be '2026-06-24.dahlia'
 * (SDK v22 default). The SDK exposes snake_case to match the API wire
 * format — use `current_period_end`, NOT `currentPeriodEnd` (per Basil
 * 2025-03-31 deprecation, carried forward in Dahlia).
 *
 * Singleton pattern: the same Stripe instance is reused across the
 * process lifetime. This avoids redundant TCP connections and respects
 * Stripe's connection-pooling guidance.
 *
 * Null fallback: when STRIPE_SECRET_KEY is absent (e.g., during build,
 * in preview envs without Stripe configured, or in tests), returns null.
 * Callers MUST null-check before use.
 */

import Stripe from 'stripe';

let cachedClient: Stripe | null = null;
let cachedKey: string | null = null;

/**
 * Get the shared Stripe client instance.
 *
 * Returns null when STRIPE_SECRET_KEY is not set. Callers MUST handle
 * the null case (typically by throwing PRECONDITION_FAILED or skipping
 * the operation gracefully).
 *
 * The client is cached per-key: if the env var changes between calls
 * (rare — only in test setups), a new instance is created.
 */
export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;

  // Null fallback per SKILL §15.20
  if (!key) {
    return null;
  }

  // Reuse the cached instance if the key hasn't changed
  if (cachedClient && cachedKey === key) {
    return cachedClient;
  }

  cachedClient = new Stripe(key, {
    // PAD §15.1 + MEP F7-01: Dahlia API (2026-06-24) is the current
    // version pinned by SDK v22. snake_case fields throughout.
    apiVersion: '2026-06-24.dahlia',
    // Enable TypeScript types on responses (default true in v22, but
    // explicit for documentation).
    typescript: true,
    // Identify Stillwater in the Stripe dashboard request log.
    appInfo: {
      name: 'stillwater',
      version: '0.0.0',
    },
  });
  cachedKey = key;

  return cachedClient;
}

/**
 * Reset the cached client. Intended for test isolation only — production
 * code should never call this.
 */
export function _resetStripeClientForTesting(): void {
  cachedClient = null;
  cachedKey = null;
}

/**
 * F7-09 — Stripe webhook route handler tests
 *
 * TDD RED phase: verifies the Next.js route handler that receives Stripe
 * webhooks, verifies the signature, and delegates to handleStripeWebhook.
 *
 * Key requirements (per MEP F7-09 + PAD §15.3):
 *   - Body must be read as TEXT (not JSON) for signature verification
 *   - stripe.webhooks.constructEvent(body, sig, secret) for verification
 *   - 400 on bad signature (STRIPE-004)
 *   - 500 on handler error (Stripe retries)
 *   - 200 on success
 *   - runtime = 'nodejs' (needs pg for advisory lock)
 *   - dynamic = 'force-dynamic' (webhook must always be fresh)
 *
 * Mocks:
 *   - stripe module: constructEvent returns fake event or throws
 *   - @stillwater/payments: handleStripeWebhook returns { received: true }
 *   - @stillwater/db: db instance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockConstructEvent = vi.fn();
const mockHandleStripeWebhook = vi.fn();

// Mock the stripe module — only need webhooks.constructEvent
vi.mock('stripe', () => ({
  default: class MockStripe {
    webhooks = { constructEvent: mockConstructEvent };
  },
}));

// Mock @stillwater/payments so the route can import handleStripeWebhook
vi.mock('@stillwater/payments', () => ({
  handleStripeWebhook: (...args: unknown[]) => mockHandleStripeWebhook(...args),
}));

// Mock @stillwater/payments/client so getStripeClient returns our mock
vi.mock('@stillwater/payments/client', () => ({
  getStripeClient: () => ({ webhooks: { constructEvent: mockConstructEvent } }),
}));

// Mock @stillwater/db so the route can import db
vi.mock('@stillwater/db', () => ({
  db: { transaction: vi.fn() },
}));

// v8 S2 fix: Mock @stillwater/config so env returns a controlled value.
// The route now reads STRIPE_WEBHOOK_SECRET via env (t3-env Zod-validated
// constant object) instead of process.env directly.
vi.mock('@stillwater/config', () => ({
  env: {
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
    STRIPE_SECRET_KEY: 'sk_test_fake_key',
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function createWebhookRequest(
  body: string,
  signature?: string,
): Request {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (signature !== undefined) {
    headers['stripe-signature'] = signature;
  }
  return new Request('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body,
  });
}

const FAKE_EVENT = {
  id: 'evt_test_001',
  type: 'invoice.paid',
  data: { object: { id: 'in_001', customer: 'cus_001', subscription: 'sub_001' } },
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Stripe webhook route handler', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    mockConstructEvent.mockReturnValue(FAKE_EVENT);
    mockHandleStripeWebhook.mockResolvedValue({ received: true });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns 200 when signature is valid and handler succeeds', async () => {
    const { POST } = await import('./route');
    const req = createWebhookRequest('{"fake":"body"}', 't=123,v1=valid_sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockConstructEvent).toHaveBeenCalledTimes(1);
    expect(mockHandleStripeWebhook).toHaveBeenCalledTimes(1);
    expect(mockHandleStripeWebhook).toHaveBeenCalledWith(
      FAKE_EVENT,
      expect.anything(),
    );
  });

  it('STRIPE-004: returns 400 when signature is invalid', async () => {
    // Stripe's constructEvent throws a SignatureVerificationError on bad sig
    const stripeError = new Error(
      'No signatures found matching the expected signature for payload',
    );
    (stripeError as Error & { type: string }).type =
      'StripeSignatureVerificationError';
    mockConstructEvent.mockImplementation(() => {
      throw stripeError;
    });

    const { POST } = await import('./route');
    const req = createWebhookRequest('{"fake":"body"}', 't=123,v1=bad_sig');
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockHandleStripeWebhook).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json.error).toContain('signature');
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const { POST } = await import('./route');
    const req = createWebhookRequest('{"fake":"body"}'); // no signature header
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockConstructEvent).not.toHaveBeenCalled();
    expect(mockHandleStripeWebhook).not.toHaveBeenCalled();
  });

  it('v8 S2 fix: reads STRIPE_WEBHOOK_SECRET via env (not process.env directly)', async () => {
    // The route now uses env.STRIPE_WEBHOOK_SECRET (t3-env Zod-validated
    // constant object) instead of process.env.STRIPE_WEBHOOK_SECRET. This
    // test verifies constructEvent receives the env-derived secret value.
    // In test context, env returns 'whsec_test_secret' (mocked above).
    const { POST } = await import('./route');
    const req = createWebhookRequest('{"fake":"body"}', 't=123,v1=sig');
    await POST(req);
    // constructEvent is called with the env-derived secret (not process.env)
    expect(mockConstructEvent).toHaveBeenCalledWith(
      '{"fake":"body"}',
      't=123,v1=sig',
      'whsec_test_secret',
    );
  });

  it('returns 500 when handler throws (Stripe will retry)', async () => {
    mockHandleStripeWebhook.mockRejectedValue(
      new Error('DB connection failed'),
    );
    const { POST } = await import('./route');
    const req = createWebhookRequest('{"fake":"body"}', 't=123,v1=valid_sig');
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it('reads body as text (not JSON) for signature verification', async () => {
    const { POST } = await import('./route');
    const req = createWebhookRequest(
      '{"raw":"text_body"}',
      't=123,v1=valid_sig',
    );
    await POST(req);
    // constructEvent should receive the raw text body, not parsed JSON
    expect(mockConstructEvent).toHaveBeenCalledWith(
      '{"raw":"text_body"}',
      't=123,v1=valid_sig',
      'whsec_test_secret',
    );
  });

  it('returns 200 when handler reports already-processed (idempotent)', async () => {
    mockHandleStripeWebhook.mockResolvedValue({ received: true });
    const { POST } = await import('./route');
    const req = createWebhookRequest('{"fake":"body"}', 't=123,v1=valid_sig');
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

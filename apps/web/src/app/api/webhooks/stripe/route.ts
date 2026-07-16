/**
 * F7-09 — Stripe webhook route handler
 *
 * ⭐ CRITICAL: This is the entry point for all Stripe webhook events.
 *
 * Per MEP F7-09 + PAD §15.3:
 *   - Body must be read as TEXT (not JSON) — required for signature verification
 *   - stripe.webhooks.constructEvent(body, sig, secret) verifies the signature
 *   - 400 on bad signature (STRIPE-004) or missing signature header
 *   - 500 on handler error (Stripe retries the webhook)
 *   - 200 on success (or idempotent already-processed)
 *
 * Runtime: 'nodejs' (needs pg for advisory lock — NOT Edge)
 * Dynamic: 'force-dynamic' (webhook must always be fresh, never cached)
 *
 * v8 S2 fix: STRIPE_WEBHOOK_SECRET is now read via the t3-env Zod-validated
 * env() helper (not process.env directly) for consistency with the rest of
 * the codebase. This ensures the secret is validated at startup and typed.
 *
 * The route delegates to handleStripeWebhook (F7-04) which implements
 * the idempotent pg_advisory_xact_lock pattern per ADR-004.
 *
 * Source: MEP F7-09, PAD §15.3, ADR-004, Stillwater Audit Report v1.0 §5 S2.
 */

import { env } from '@stillwater/config';
import { db } from '@stillwater/db';
import { handleStripeWebhook } from '@stillwater/payments';
import { getStripeClient } from '@stillwater/payments/client';

import type { StripeWebhookEvent } from '@stillwater/payments';

// Webhook must always be fresh — never cached
export const dynamic = 'force-dynamic';

// Must run on Node.js (needs pg for advisory lock — NOT Edge)
export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  // 1. v8 S2 fix: Read STRIPE_WEBHOOK_SECRET via t3-env Zod-validated env()
  //    (was: process.env.STRIPE_WEBHOOK_SECRET — bypassed validation)
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  // 2. Get the Stripe client (getStripeClient reads STRIPE_SECRET_KEY via env()
  //    internally — see packages/payments/src/client.ts)
  const stripe = getStripeClient();
  if (!stripe) {
    console.error('STRIPE_SECRET_KEY is not set — Stripe client unavailable');
    return Response.json(
      { error: 'Stripe not configured' },
      { status: 500 },
    );
  }

  // 3. Read the raw body as TEXT (NOT JSON — required for signature verification)
  const body = await request.text();

  // 4. Get the stripe-signature header
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  // 5. Verify the signature and construct the event
  let event: StripeWebhookEvent;
  try {
    // Stripe's constructEvent throws SignatureVerificationError on bad sig
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    ) as unknown as StripeWebhookEvent;
  } catch {
    // STRIPE-004: Invalid signature — return 400 (Stripe won't retry)
    return Response.json(
      { error: 'Invalid signature' },
      { status: 400 },
    );
  }

  // 6. Delegate to the idempotent webhook handler (F7-04)
  try {
    const result = await handleStripeWebhook(event, db);
    if (result.received) {
      return Response.json({ received: true });
    }
    // Handler rejected the event (shouldn't happen for valid events)
    return Response.json(
      { error: result.reason },
      { status: 400 },
    );
  } catch (err) {
    // Handler threw an unexpected error — return 500 so Stripe retries
    console.error('Stripe webhook handler error:', err);
    return Response.json(
      { error: 'Webhook handler failed' },
      { status: 500 },
    );
  }
}

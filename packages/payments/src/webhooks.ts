/**
 * F7-04 — Idempotent Stripe webhook handler
 *
 * ⭐ CRITICAL: Implements ADR-004's pg_advisory_xact_lock pattern for
 * idempotent event processing.
 *
 * Pattern (per PAD §15.3):
 *   1. Check payment_events for stripe_event_id → if exists, return (fast path)
 *   2. BEGIN TRANSACTION
 *   3. SELECT pg_advisory_xact_lock(hash(event.id)) — transaction-scoped
 *      (NOT session-scoped pg_advisory_lock — breaks under Neon PgBouncer)
 *   4. switch (event.type) → 7 handlers
 *   5. INSERT payment_events record with status = 'processed'
 *   6. COMMIT (lock auto-releases)
 *
 * The transaction-scoped advisory lock serializes concurrent processing
 * of the same event. The unique index on payment_events.stripe_event_id
 * is the ultimate idempotency guarantee — if a race slips through the
 * fast-path check, the insert fails and the transaction rolls back.
 *
 * 7 event handlers (per PAD §15.3):
 *   1. customer.subscription.created       → Insert MemberSubscription
 *   2. customer.subscription.updated       → Sync status + period dates
 *   3. customer.subscription.deleted       → Set status = 'cancelled'
 *   4. customer.subscription.trial_will_end → No-op (email in Phase 8)
 *   5. invoice.paid                        → Reset creditsRemaining to plan amount
 *   6. invoice.payment_failed              → Set status = 'past_due'
 *   7. invoice.payment_action_required     → No-op (email in Phase 8)
 *
 * Source: MEP F7-04, PAD §15.3, ADR-004, SKILL §15.2.
 */

import { eq, sql } from 'drizzle-orm';
import type { DrizzleDB } from '@stillwater/db';
import {
  paymentEvents,
  memberSubscriptions,
  members,
  membershipPlans,
} from '@stillwater/db';
import type {
  StripeWebhookEvent,
  StripeWebhookResult,
  StripeSubscriptionEvent,
  StripeInvoiceEvent,
} from './types';

/**
 * Deterministically hash a Stripe event ID to a bigint for advisory locks.
 * Uses a simple djb2 variant — sufficient entropy for event IDs, and
 * deterministic across calls (same event ID = same lock key).
 *
 * Note: we take only the lower 32 bits to stay safely within PostgreSQL's
 * single-argument bigint advisory lock range.
 */
function eventIdToLockKey(eventId: string): bigint {
  // Use BigInt() constructor (not literals like 5381n) for ES2019 compatibility
  let hash = BigInt(5381);
  const five = BigInt(5);
  const mask = BigInt(0xffffffff);
  for (let i = 0; i < eventId.length; i++) {
    hash = ((hash << five) + hash + BigInt(eventId.charCodeAt(i))) & mask;
  }
  return hash;
}

/**
 * Handle a verified Stripe webhook event.
 *
 * @param event  - The Stripe event (already signature-verified by the route handler)
 * @param db     - The Drizzle database instance
 * @returns       - { received: true } on success or already-processed
 *                 - { received: false; reason } on rejection
 */
export async function handleStripeWebhook(
  event: StripeWebhookEvent,
  db: DrizzleDB,
): Promise<StripeWebhookResult> {
  // 1. Fast-path idempotency check: if already processed, return immediately.
  // This avoids opening a transaction for duplicate deliveries.
  const existing = await db.query.paymentEvents.findFirst({
    where: eq(paymentEvents.stripeEventId, event.id),
  });
  if (existing) {
    return { received: true };
  }

  // 2. Open transaction with advisory lock + process + insert idempotency record
  try {
    await db.transaction(async (tx) => {
      // Acquire transaction-scoped advisory lock keyed by event ID hash.
      // This serializes concurrent processing of the same event.
      // Auto-releases at COMMIT/ROLLBACK — cannot leak under Neon PgBouncer.
      const lockKey = eventIdToLockKey(event.id);
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

      // Dispatch to the appropriate handler based on event type
      await dispatchEvent(event, tx);

      // Record the event as processed (idempotency guarantee)
      await tx.insert(paymentEvents).values({
        stripeEventId: event.id,
        type: event.type,
        payload: event.data.object as unknown as Record<string, unknown>,
        status: 'processed',
        processedAt: new Date(),
      });
    });

    return { received: true };
  } catch (err) {
    // If the error is a unique constraint violation on stripe_event_id,
    // a concurrent request already processed this event — return success.
    if (isUniqueViolation(err)) {
      return { received: true };
    }
    // Re-throw unexpected errors so the route handler can return 500
    // (Stripe will retry)
    throw err;
  }
}

/**
 * Dispatch a Stripe event to the appropriate handler.
 */
async function dispatchEvent(
  event: StripeWebhookEvent,
  tx: DrizzleDB | Parameters<Parameters<DrizzleDB['transaction']>[0]>[0],
): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event, tx);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event, tx);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event, tx);
      break;
    case 'customer.subscription.trial_will_end':
      // No-op — email sent in Phase 8 (membership-expiry-warn job)
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event, tx);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event, tx);
      break;
    case 'invoice.payment_action_required':
      // No-op — email sent in Phase 8 (payment-failed-notify job)
      break;
  }
}

/**
 * Handler: customer.subscription.created
 * Find the member by stripeCustomerId, insert a new MemberSubscription.
 */
async function handleSubscriptionCreated(
  event: StripeSubscriptionEvent,
  tx: DrizzleDB | Parameters<Parameters<DrizzleDB['transaction']>[0]>[0],
): Promise<void> {
  const sub = event.data.object;
  const member = await tx.query.members.findFirst({
    where: eq(members.stripeCustomerId, sub.customer),
  });
  if (!member) {
    // Member not found — can't create subscription record.
    // The event is still recorded as processed (idempotency).
    return;
  }

  // Find the plan by stripePriceId (from the subscription's first item)
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (!priceId) return;

  const plan = await tx.query.membershipPlans.findFirst({
    where: eq(membershipPlans.stripePriceId, priceId),
  });
  if (!plan) return;

  // Map Stripe subscription status to our subscription_status enum
  const status = mapStripeSubscriptionStatus(sub.status);

  await tx.insert(memberSubscriptions).values({
    memberId: member.id,
    planId: plan.id,
    stripeSubscriptionId: sub.id,
    status,
    currentPeriodStart: sub.current_period_start
      ? new Date(sub.current_period_start * 1000)
      : null,
    currentPeriodEnd: sub.items?.data?.[0]?.current_period_end
      ? new Date(sub.items.data[0].current_period_end * 1000)
      : sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null,
    creditsRemaining: plan.classCreditsPerCycle ?? 0,
  });
}

/**
 * Handler: customer.subscription.updated
 * Sync the subscription's status + period dates from Stripe.
 */
async function handleSubscriptionUpdated(
  event: StripeSubscriptionEvent,
  tx: DrizzleDB | Parameters<Parameters<DrizzleDB['transaction']>[0]>[0],
): Promise<void> {
  const sub = event.data.object;
  const existing = await tx.query.memberSubscriptions.findFirst({
    where: eq(memberSubscriptions.stripeSubscriptionId, sub.id),
  });
  if (!existing) return;

  const periodEnd = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;

  await tx
    .update(memberSubscriptions)
    .set({
      status: mapStripeSubscriptionStatus(sub.status),
      currentPeriodStart: sub.current_period_start
        ? new Date(sub.current_period_start * 1000)
        : existing.currentPeriodStart,
      currentPeriodEnd: periodEnd
        ? new Date(periodEnd * 1000)
        : existing.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? existing.cancelAtPeriodEnd,
    })
    .where(eq(memberSubscriptions.stripeSubscriptionId, sub.id));
}

/**
 * Handler: customer.subscription.deleted
 * Mark the subscription as cancelled.
 */
async function handleSubscriptionDeleted(
  event: StripeSubscriptionEvent,
  tx: DrizzleDB | Parameters<Parameters<DrizzleDB['transaction']>[0]>[0],
): Promise<void> {
  const sub = event.data.object;
  await tx
    .update(memberSubscriptions)
    .set({
      status: 'cancelled',
    })
    .where(eq(memberSubscriptions.stripeSubscriptionId, sub.id));
}

/**
 * Handler: invoice.paid
 * Reset the member's credits to the plan's cycle amount.
 * Per PAD §15.4: credits do NOT roll over — reset on each invoice.paid.
 */
async function handleInvoicePaid(
  event: StripeInvoiceEvent,
  tx: DrizzleDB | Parameters<Parameters<DrizzleDB['transaction']>[0]>[0],
): Promise<void> {
  const invoice = event.data.object;
  if (!invoice.subscription) return;

  // Find the subscription with its plan to get classCreditsPerCycle
  // Per SKILL Lesson 46: Drizzle relational query types infer as `never`
  // without defineRelations() — cast to the expected shape.
  const sub = (await tx.query.memberSubscriptions.findFirst({
    where: eq(memberSubscriptions.stripeSubscriptionId, invoice.subscription),
    with: { plan: true },
  })) as
    | {
        planId: string;
        stripeSubscriptionId: string;
        plan?: { classCreditsPerCycle: number | null } | null;
      }
    | undefined;
  if (!sub) return;

  // Reset credits to the plan's per-cycle amount
  const credits = sub.plan?.classCreditsPerCycle ?? 0;
  await tx
    .update(memberSubscriptions)
    .set({
      creditsRemaining: credits,
      status: 'active', // payment recovered — ensure not stuck in past_due
    })
    .where(eq(memberSubscriptions.stripeSubscriptionId, invoice.subscription));
}

/**
 * Handler: invoice.payment_failed
 * Mark the subscription as past_due.
 */
async function handleInvoicePaymentFailed(
  event: StripeInvoiceEvent,
  tx: DrizzleDB | Parameters<Parameters<DrizzleDB['transaction']>[0]>[0],
): Promise<void> {
  const invoice = event.data.object;
  if (!invoice.subscription) return;

  await tx
    .update(memberSubscriptions)
    .set({
      status: 'past_due',
    })
    .where(eq(memberSubscriptions.stripeSubscriptionId, invoice.subscription));
}

/**
 * Map Stripe subscription status strings to our subscription_status enum.
 *
 * Stripe statuses: trialing, active, past_due, canceled, unpaid, incomplete, etc.
 * Our enum: active, paused, cancelled, past_due, trialing, incomplete
 */
function mapStripeSubscriptionStatus(
  stripeStatus: string,
): 'active' | 'paused' | 'cancelled' | 'past_due' | 'trialing' | 'incomplete' {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    default:
      return 'active';
  }
}

/**
 * Check if an error is a PostgreSQL unique constraint violation (code 23505).
 * This happens when a concurrent request inserts the same stripe_event_id
 * before us — the event was already processed, so we return success.
 */
function isUniqueViolation(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    return (err as { code: string }).code === '23505';
  }
  return false;
}

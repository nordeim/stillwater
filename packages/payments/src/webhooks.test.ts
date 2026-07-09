/**
 * F7-04 — Idempotent Stripe webhook handler tests
 *
 * TDD RED phase: verifies the webhook handler implements ADR-004's
 * pg_advisory_xact_lock pattern for idempotent event processing.
 *
 * Pattern (per PAD §15.3):
 *   1. Check payment_events for stripe_event_id → if exists, return (idempotent fast path)
 *   2. BEGIN TRANSACTION
 *   3. SELECT pg_advisory_xact_lock(hash(event.id)) — transaction-scoped
 *   4. switch (event.type) → 7 handlers
 *   5. INSERT payment_events record with status = 'processed'
 *   6. COMMIT (lock auto-releases)
 *
 * MEP acceptance criteria (5 STRIPE tests):
 *   STRIPE-001: Grants credits on invoice.paid
 *   STRIPE-002: Marks past_due on invoice.payment_failed
 *   STRIPE-003: Idempotent — same event twice has no side effect
 *   STRIPE-005: Cancels on customer.subscription.deleted
 *   (STRIPE-004 invalid signature is tested in the route handler F7-09)
 *
 * Mocking pattern follows bookings.test.ts:
 *   - makeTx() builds a mock tx with configurable return values
 *   - makeTransactionTx(tx) wraps it so db.transaction(cb) invokes cb(tx)
 *   - Each query method is a separate vi.fn()
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DrizzleDB } from '@stillwater/db';
import type { StripeWebhookEvent } from './types';

// ─── Mock factory helpers ───────────────────────────────────────────────────

/**
 * Build a mock `tx` (transaction client) with all methods the webhook
 * handler touches. Each behavior is configurable via `overrides`.
 */
function makeTx(overrides: {
  existingPaymentEvent?: unknown; // idempotency re-check inside transaction
  existingSubscription?: unknown; // memberSubscriptions.findFirst result
  existingMember?: unknown; // members.findFirst result (for invoice events)
  existingPlan?: unknown; // membershipPlans.findFirst result (for subscription.created)
} = {}) {
  const execute = vi.fn().mockResolvedValue([{ pg_advisory_xact_lock: '' }]);

  const findFirstPaymentEvent = vi
    .fn()
    .mockResolvedValue(overrides.existingPaymentEvent ?? undefined);
  const findFirstSubscription = vi
    .fn()
    .mockResolvedValue(overrides.existingSubscription ?? undefined);
  const findFirstMember = vi
    .fn()
    .mockResolvedValue(overrides.existingMember ?? undefined);
  const findFirstPlan = vi
    .fn()
    .mockResolvedValue(
      overrides.existingPlan ?? {
        id: PLAN_ID,
        stripePriceId: 'price_test_123',
        classCreditsPerCycle: 8,
      },
    );

  // update().set().where().returning() chain
  const returningUpdate = vi.fn().mockResolvedValue([{}]);
  const whereUpdate = vi.fn().mockReturnValue({ returning: returningUpdate });
  const set = vi.fn().mockReturnValue({ where: whereUpdate });
  const update = vi.fn().mockReturnValue({ set });

  // insert().values() chain (for payment_events + member_subscriptions)
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });

  return {
    tx: {
      execute,
      query: {
        paymentEvents: { findFirst: findFirstPaymentEvent },
        memberSubscriptions: { findFirst: findFirstSubscription },
        members: { findFirst: findFirstMember },
        membershipPlans: { findFirst: findFirstPlan },
      },
      update,
      insert,
    },
    spies: {
      execute,
      findFirstPaymentEvent,
      findFirstSubscription,
      findFirstMember,
      findFirstPlan,
      update,
      set,
      whereUpdate,
      returningUpdate,
      insert,
      values,
    },
  };
}

/**
 * Build a mock `db` that has:
 *   - query.paymentEvents.findFirst (idempotency fast check — outside transaction)
 *   - transaction(cb) that invokes cb with the provided tx
 */
function makeDb(tx: unknown, opts: { existingEventFastCheck?: unknown } = {}) {
  const findFirstPaymentEventFast = vi
    .fn()
    .mockResolvedValue(opts.existingEventFastCheck ?? undefined);
  const transaction = vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb(tx),
  );
  return {
    query: {
      paymentEvents: { findFirst: findFirstPaymentEventFast },
    },
    transaction,
    _findFirstPaymentEventFast: findFirstPaymentEventFast,
    _transaction: transaction,
  } as unknown as DrizzleDB & {
    _findFirstPaymentEventFast: ReturnType<typeof vi.fn>;
    _transaction: ReturnType<typeof vi.fn>;
  };
}

// ─── Event fixtures ─────────────────────────────────────────────────────────

const SUBSCRIPTION_EVENT_ID = 'evt_sub_created_001';
const INVOICE_PAID_EVENT_ID = 'evt_inv_paid_001';
const INVOICE_FAILED_EVENT_ID = 'evt_inv_failed_001';
const SUB_DELETED_EVENT_ID = 'evt_sub_deleted_001';

const CUSTOMER_ID = 'cus_test_123';
const SUBSCRIPTION_ID = 'sub_test_123';
const MEMBER_ID = '11111111-1111-4111-8111-111111111111';
const PLAN_ID = '22222222-2222-4222-8222-222222222222';

function makeSubscriptionCreatedEvent(): StripeWebhookEvent {
  return {
    id: SUBSCRIPTION_EVENT_ID,
    type: 'customer.subscription.created',
    data: {
      object: {
        id: SUBSCRIPTION_ID,
        customer: CUSTOMER_ID,
        status: 'active',
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        items: {
          data: [
            {
              current_period_start: 1700000000,
              current_period_end: 1702592000,
              price: { id: 'price_test_123' },
            },
          ],
        },
      },
    },
  };
}

function makeInvoicePaidEvent(): StripeWebhookEvent {
  return {
    id: INVOICE_PAID_EVENT_ID,
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_test_001',
        customer: CUSTOMER_ID,
        subscription: SUBSCRIPTION_ID,
        total: 9900,
        currency: 'usd',
      },
    },
  };
}

function makeInvoiceFailedEvent(): StripeWebhookEvent {
  return {
    id: INVOICE_FAILED_EVENT_ID,
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: 'in_test_002',
        customer: CUSTOMER_ID,
        subscription: SUBSCRIPTION_ID,
        attempt_count: 1,
      },
    },
  };
}

function makeSubscriptionDeletedEvent(): StripeWebhookEvent {
  return {
    id: SUB_DELETED_EVENT_ID,
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: SUBSCRIPTION_ID,
        customer: CUSTOMER_ID,
        status: 'canceled',
      },
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('handleStripeWebhook — idempotency (STRIPE-003)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns { received: true } immediately when event already processed (fast path)', async () => {
    const { handleStripeWebhook } = await import('./webhooks');
    const { tx } = makeTx();
    const db = makeDb(tx, {
      existingEventFastCheck: { id: 'pe_001', stripeEventId: INVOICE_PAID_EVENT_ID, status: 'processed' },
    });

    const result = await handleStripeWebhook(makeInvoicePaidEvent(), db);

    expect(result).toEqual({ received: true });
    // Transaction should NOT be opened (fast path returns before lock)
    expect((db as never as { _transaction: ReturnType<typeof vi.fn> })._transaction).not.toHaveBeenCalled();
  });

  it('processes the event when not yet seen, then records it in payment_events', async () => {
    const { handleStripeWebhook } = await import('./webhooks');
    const { tx, spies } = makeTx({
      existingSubscription: {
        id: 'ms_001',
        memberId: MEMBER_ID,
        planId: PLAN_ID,
        stripeSubscriptionId: SUBSCRIPTION_ID,
        status: 'active',
        creditsRemaining: 5,
      },
    });
    const db = makeDb(tx, { existingEventFastCheck: undefined });

    const result = await handleStripeWebhook(makeInvoicePaidEvent(), db);

    expect(result).toEqual({ received: true });
    // Transaction was opened
    expect((db as never as { _transaction: ReturnType<typeof vi.fn> })._transaction).toHaveBeenCalledTimes(1);
    // Advisory lock acquired
    expect(spies.execute).toHaveBeenCalledTimes(1);
    // payment_events record inserted (idempotency)
    expect(spies.insert).toHaveBeenCalled();
  });

  it('is idempotent across two sequential calls — second call is a no-op', async () => {
    const { handleStripeWebhook } = await import('./webhooks');
    const { tx, spies } = makeTx({
      existingSubscription: {
        id: 'ms_001',
        memberId: MEMBER_ID,
        planId: PLAN_ID,
        stripeSubscriptionId: SUBSCRIPTION_ID,
        status: 'active',
        creditsRemaining: 5,
      },
    });

    // First call: event not yet seen → process + insert
    const db1 = makeDb(tx, { existingEventFastCheck: undefined });
    const result1 = await handleStripeWebhook(makeInvoicePaidEvent(), db1);
    expect(result1).toEqual({ received: true });
    expect(spies.execute).toHaveBeenCalledTimes(1);
    expect(spies.insert).toHaveBeenCalledTimes(1);

    // Second call: event now exists in payment_events → fast path return
    const db2 = makeDb(tx, {
      existingEventFastCheck: { id: 'pe_001', stripeEventId: INVOICE_PAID_EVENT_ID, status: 'processed' },
    });
    vi.clearAllMocks();
    const result2 = await handleStripeWebhook(makeInvoicePaidEvent(), db2);
    expect(result2).toEqual({ received: true });
    // No transaction, no lock, no insert on second call
    expect(spies.execute).not.toHaveBeenCalled();
    expect(spies.insert).not.toHaveBeenCalled();
  });
});

describe('handleStripeWebhook — STRIPE-001: invoice.paid grants credits', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates memberSubscriptions.creditsRemaining when invoice.paid fires', async () => {
    const { handleStripeWebhook } = await import('./webhooks');
    const existingSub = {
      id: 'ms_001',
      memberId: MEMBER_ID,
      planId: PLAN_ID,
      stripeSubscriptionId: SUBSCRIPTION_ID,
      status: 'active',
      creditsRemaining: 5,
      plan: { id: PLAN_ID, classCreditsPerCycle: 8 },
    };
    const { tx, spies } = makeTx({ existingSubscription: existingSub });
    const db = makeDb(tx);

    await handleStripeWebhook(makeInvoicePaidEvent(), db);

    // Should have updated the subscription's credits to the plan's cycle amount
    expect(spies.update).toHaveBeenCalledTimes(1);
    expect(spies.set).toHaveBeenCalledWith(
      expect.objectContaining({
        creditsRemaining: 8,
      }),
    );
  });
});

describe('handleStripeWebhook — STRIPE-002: invoice.payment_failed marks past_due', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets subscription status to past_due when invoice.payment_failed fires', async () => {
    const { handleStripeWebhook } = await import('./webhooks');
    const existingSub = {
      id: 'ms_001',
      memberId: MEMBER_ID,
      planId: PLAN_ID,
      stripeSubscriptionId: SUBSCRIPTION_ID,
      status: 'active',
      creditsRemaining: 5,
    };
    const { tx, spies } = makeTx({ existingSubscription: existingSub });
    const db = makeDb(tx);

    await handleStripeWebhook(makeInvoiceFailedEvent(), db);

    expect(spies.update).toHaveBeenCalledTimes(1);
    expect(spies.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'past_due',
      }),
    );
  });
});

describe('handleStripeWebhook — STRIPE-005: customer.subscription.deleted cancels', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets subscription status to cancelled when subscription.deleted fires', async () => {
    const { handleStripeWebhook } = await import('./webhooks');
    const existingSub = {
      id: 'ms_001',
      memberId: MEMBER_ID,
      planId: PLAN_ID,
      stripeSubscriptionId: SUBSCRIPTION_ID,
      status: 'active',
      creditsRemaining: 5,
    };
    const { tx, spies } = makeTx({ existingSubscription: existingSub });
    const db = makeDb(tx);

    await handleStripeWebhook(makeSubscriptionDeletedEvent(), db);

    expect(spies.update).toHaveBeenCalledTimes(1);
    expect(spies.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
      }),
    );
  });
});

describe('handleStripeWebhook — customer.subscription.created', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a new MemberSubscription record', async () => {
    const { handleStripeWebhook } = await import('./webhooks');
    const existingMember = {
      id: MEMBER_ID,
      userId: 'user-1',
      stripeCustomerId: CUSTOMER_ID,
    };
    const { tx, spies } = makeTx({ existingMember });
    const db = makeDb(tx);

    await handleStripeWebhook(makeSubscriptionCreatedEvent(), db);

    // Should insert a new member_subscriptions row
    expect(spies.insert).toHaveBeenCalled();
  });
});

describe('handleStripeWebhook — advisory lock (ADR-004)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('acquires pg_advisory_xact_lock inside the transaction', async () => {
    const { handleStripeWebhook } = await import('./webhooks');
    const { tx, spies } = makeTx({
      existingSubscription: {
        id: 'ms_001',
        memberId: MEMBER_ID,
        planId: PLAN_ID,
        stripeSubscriptionId: SUBSCRIPTION_ID,
        status: 'active',
        creditsRemaining: 5,
      },
    });
    const db = makeDb(tx);

    await handleStripeWebhook(makeInvoicePaidEvent(), db);

    // Advisory lock must be acquired via tx.execute with SQL template.
    // Per ADR-004: pg_advisory_xact_lock (transaction-scoped), NOT
    // pg_advisory_lock (session-scoped — breaks under Neon PgBouncer).
    // The SQL template object can't be stringified directly, so we verify
    // the lock was acquired by checking execute was called (same pattern
    // as bookings.test.ts). The SQL content is verified by code review
    // + integration tests against a real database.
    expect(spies.execute).toHaveBeenCalledTimes(1);
  });
});

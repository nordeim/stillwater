/**
 * F3-04 — paymentsRouter test suite
 *
 * Phase 7: getPortalUrl + getInvoices are wired to Stripe.
 * refund remains a stub (D12 — v1 uses Stripe Dashboard only).
 *
 * Tests:
 *   - getPortalUrl: creates Billing Portal session, returns URL
 *   - getInvoices: lists invoices via Stripe, returns DTOs
 *   - refund: stays stubbed (D12), throws PRECONDITION_FAILED for staff
 *   - Access tier enforcement (UNAUTHORIZED / FORBIDDEN)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @stillwater/payments so Stripe calls are intercepted
const mockCreateCustomerPortalSession = vi.fn();
const mockListInvoices = vi.fn();

vi.mock('@stillwater/payments', () => ({
  createCustomerPortalSession: (...args: unknown[]) =>
    mockCreateCustomerPortalSession(...args),
  listInvoices: (...args: unknown[]) => mockListInvoices(...args),
}));

import { paymentsRouter } from './payments';
import type { TRPCContext } from '../trpc';

function makeCtx(
  roles: string[] | null = ['member'],
  db: Partial<TRPCContext['db']> = {},
): TRPCContext {
  return {
    db: { ...db } as TRPCContext['db'],
    session:
      roles === null
        ? null
        : ({
            user: {
              id: 'test-user',
              email: 'test@test.test',
              name: 'Test',
              memberId: 'member-1',
              roles,
            },
            session: { expires: '2026-12-01' },
          } as never),
    jobs: { trigger: vi.fn() } as never,
    redis: {} as never,
    req: new Request('http://localhost'),
  };
}

const memberFixture = {
  id: 'member-1',
  userId: 'test-user',
  displayName: 'Test Member',
  stripeCustomerId: 'cus_test_123',
};

describe('paymentsRouter.getPortalUrl (Phase 7 — Stripe wired)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a Billing Portal session and returns the URL', async () => {
    const memberFindFirst = vi.fn().mockResolvedValue(memberFixture);
    mockCreateCustomerPortalSession.mockResolvedValue(
      'https://billing.stripe.com/p/session_123',
    );

    const ctx = makeCtx(['member'], {
      query: { members: { findFirst: memberFindFirst } } as never,
    });
    const caller = paymentsRouter.createCaller(ctx);

    const result = await caller.getPortalUrl({
      returnUrl: 'https://stillwater.studio/dashboard',
    });

    expect(result).toEqual({
      portalUrl: 'https://billing.stripe.com/p/session_123',
    });
    expect(mockCreateCustomerPortalSession).toHaveBeenCalledWith({
      customerId: 'cus_test_123',
      returnUrl: 'https://stillwater.studio/dashboard',
    });
  });

  it('throws NOT_FOUND when member does not exist', async () => {
    const memberFindFirst = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx(['member'], {
      query: { members: { findFirst: memberFindFirst } } as never,
    });
    const caller = paymentsRouter.createCaller(ctx);
    await expect(caller.getPortalUrl()).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws PRECONDITION_FAILED when member has no stripeCustomerId', async () => {
    const memberFindFirst = vi.fn().mockResolvedValue({
      ...memberFixture,
      stripeCustomerId: null,
    });
    const ctx = makeCtx(['member'], {
      query: { members: { findFirst: memberFindFirst } } as never,
    });
    const caller = paymentsRouter.createCaller(ctx);
    await expect(caller.getPortalUrl()).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('throws UNAUTHORIZED without session', async () => {
    const caller = paymentsRouter.createCaller(makeCtx(null));
    await expect(caller.getPortalUrl()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});

describe('paymentsRouter.getInvoices (Phase 7 — Stripe wired)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists invoices and returns DTOs', async () => {
    const memberFindFirst = vi.fn().mockResolvedValue(memberFixture);
    mockListInvoices.mockResolvedValue({
      invoices: [
        {
          id: 'in_001',
          customerId: 'cus_test_123',
          subscriptionId: 'sub_123',
          amountTotal: 9900,
          currency: 'usd',
          status: 'paid',
          createdAt: new Date('2026-07-01'),
          invoicePdfUrl: 'https://example.com/invoice.pdf',
        },
      ],
      hasMore: false,
      nextCursor: null,
    });

    const ctx = makeCtx(['member'], {
      query: { members: { findFirst: memberFindFirst } } as never,
    });
    const caller = paymentsRouter.createCaller(ctx);

    const result = await caller.getInvoices({ limit: 10 });

    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0]!.id).toBe('in_001');
    expect(mockListInvoices).toHaveBeenCalledWith({
      customerId: 'cus_test_123',
      limit: 10,
    });
  });

  it('throws NOT_FOUND when member does not exist', async () => {
    const memberFindFirst = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx(['member'], {
      query: { members: { findFirst: memberFindFirst } } as never,
    });
    const caller = paymentsRouter.createCaller(ctx);
    await expect(caller.getInvoices()).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws PRECONDITION_FAILED when member has no stripeCustomerId', async () => {
    const memberFindFirst = vi.fn().mockResolvedValue({
      ...memberFixture,
      stripeCustomerId: null,
    });
    const ctx = makeCtx(['member'], {
      query: { members: { findFirst: memberFindFirst } } as never,
    });
    const caller = paymentsRouter.createCaller(ctx);
    await expect(caller.getInvoices()).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });
});

describe('paymentsRouter.refund (D12 — stub retained for v1)', () => {
  // V13-4 fix: refund now requires managerProcedure (was staffProcedure).
  // Tests updated to use ['manager'] role. Staff callers now get FORBIDDEN.

  it('throws PRECONDITION_FAILED when caller is manager (D12 stub)', async () => {
    const caller = paymentsRouter.createCaller(makeCtx(['manager']));
    await expect(
      caller.refund({
        paymentIntentId: 'pi_123',
        amount: 1000,
        reason: 'requested_by_customer',
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('V13-4: throws FORBIDDEN when caller is staff (was allowed before fix)', async () => {
    // Staff should NOT be able to initiate refunds per RBAC matrix (PAD §9.2).
    // Before V13-4, this used staffProcedure and returned PRECONDITION_FAILED.
    // Now it returns FORBIDDEN at the tier check (before reaching the stub).
    const caller = paymentsRouter.createCaller(makeCtx(['staff']));
    await expect(
      caller.refund({ paymentIntentId: 'pi_123' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws FORBIDDEN when caller is only a member', async () => {
    const caller = paymentsRouter.createCaller(makeCtx(['member']));
    await expect(
      caller.refund({ paymentIntentId: 'pi_123' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws UNAUTHORIZED without session', async () => {
    const caller = paymentsRouter.createCaller(makeCtx(null));
    await expect(
      caller.refund({ paymentIntentId: 'pi_123' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects invalid input (missing paymentIntentId)', async () => {
    const caller = paymentsRouter.createCaller(makeCtx(['manager']));
    await expect(
      caller.refund({ paymentIntentId: '' } as never),
    ).rejects.toBeDefined();
  });
});

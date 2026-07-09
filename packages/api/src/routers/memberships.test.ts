/**
 * F3-04 — membershipsRouter test suite
 *
 * Tests:
 *   - getPlans returns active plans
 *   - getMySubscription returns the linked subscription (or null)
 *   - getMySubscription returns null when no memberId
 *   - subscribe creates a Stripe Checkout Session and returns the URL
 *   - cancel calls cancelAtPeriodEnd on the Stripe subscription
 *   - pause calls pauseSubscription on the Stripe subscription
 *   - resume calls resumeSubscription on the Stripe subscription
 *   - UNAUTHORIZED when no session on protected procedures
 *
 * Phase 7: Stubs replaced with real Stripe integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @stillwater/payments so Stripe calls are intercepted
const mockCreateCheckoutSession = vi.fn();
const mockCancelAtPeriodEnd = vi.fn();
const mockPauseSubscription = vi.fn();
const mockResumeSubscription = vi.fn();

vi.mock('@stillwater/payments', () => ({
  createCheckoutSession: (...args: unknown[]) =>
    mockCreateCheckoutSession(...args),
  cancelAtPeriodEnd: (...args: unknown[]) => mockCancelAtPeriodEnd(...args),
  pauseSubscription: (...args: unknown[]) =>
    mockPauseSubscription(...args),
  resumeSubscription: (...args: unknown[]) =>
    mockResumeSubscription(...args),
}));

import { membershipsRouter } from './memberships';
import type { TRPCContext } from '../trpc';

function makeCtx(
  db: Partial<TRPCContext['db']> = {},
  opts: { memberId?: string | null; roles?: string[] | null } = {},
): TRPCContext {
  const memberId = opts.memberId === undefined ? 'member-1' : opts.memberId;
  const roles = opts.roles === undefined ? ['member'] : opts.roles;
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
              memberId,
              roles,
            },
            session: { expires: '2026-12-01' },
          } as never),
    jobs: { trigger: vi.fn() } as never,
    redis: {} as never,
    req: new Request('http://localhost'),
  };
}

const PLAN_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const planFixture = {
  id: PLAN_ID,
  name: 'Unlimited',
  stripePriceId: 'price_abc',
  interval: 'month' as const,
  classCreditsPerCycle: null,
  guestPassesPerCycle: 0,
  allowsVirtual: true,
  allowsInPerson: true,
  isActive: true,
  sortOrder: 0,
};

const subscriptionFixture = {
  id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
  memberId: 'member-1',
  planId: PLAN_ID,
  stripeSubscriptionId: 'sub_xyz',
  status: 'active' as const,
  currentPeriodStart: new Date('2026-07-01'),
  currentPeriodEnd: new Date('2026-08-01'),
  cancelAtPeriodEnd: false,
  pausedAt: null,
  pauseResumesAt: null,
  creditsRemaining: null,
  createdAt: new Date('2026-07-01'),
};

const memberFixture = {
  id: 'member-1',
  userId: 'test-user',
  displayName: 'Test Member',
  stripeCustomerId: 'cus_test_123',
};

describe('membershipsRouter.getPlans', () => {
  it('returns active plans sorted by sortOrder then name', async () => {
    const findMany = vi.fn().mockResolvedValue([planFixture]);
    const ctx = makeCtx(
      { query: { membershipPlans: { findMany } } as never },
      { roles: null },
    );
    const caller = membershipsRouter.createCaller(ctx);
    const result = await caller.getPlans();
    expect(result).toEqual([planFixture]);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});

const subscriptionWithPlanFixture = {
  ...subscriptionFixture,
  plan: planFixture,
};

describe('membershipsRouter.getMySubscription', () => {
  it('returns the linked subscription with plan details when present', async () => {
    const findFirst = vi.fn().mockResolvedValue(subscriptionWithPlanFixture);
    const ctx = makeCtx({
      query: { memberSubscriptions: { findFirst } } as never,
    });
    const caller = membershipsRouter.createCaller(ctx);
    const result = await caller.getMySubscription();
    expect(result).toEqual(subscriptionWithPlanFixture);
    expect(result?.plan).toBeDefined();
    expect(result?.plan?.name).toBe('Unlimited');
  });

  it('returns null when no subscription found', async () => {
    const findFirst = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({
      query: { memberSubscriptions: { findFirst } } as never,
    });
    const caller = membershipsRouter.createCaller(ctx);
    const result = await caller.getMySubscription();
    expect(result).toBeNull();
  });

  it('returns null (without querying) when memberId is null', async () => {
    const findFirst = vi.fn();
    const ctx = makeCtx(
      { query: { memberSubscriptions: { findFirst } } as never },
      { memberId: null },
    );
    const caller = membershipsRouter.createCaller(ctx);
    const result = await caller.getMySubscription();
    expect(result).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('throws UNAUTHORIZED without session', async () => {
    const ctx = makeCtx({}, { roles: null });
    const caller = membershipsRouter.createCaller(ctx);
    await expect(caller.getMySubscription()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});

describe('membershipsRouter.subscribe (Phase 7 — Stripe wired)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a Checkout Session and returns the URL', async () => {
    const planFindFirst = vi.fn().mockResolvedValue(planFixture);
    const memberFindFirst = vi.fn().mockResolvedValue(memberFixture);
    mockCreateCheckoutSession.mockResolvedValue({
      id: 'cs_test_001',
      url: 'https://checkout.stripe.com/c/cs_test_001',
    });

    const ctx = makeCtx({
      query: {
        membershipPlans: { findFirst: planFindFirst },
        members: { findFirst: memberFindFirst },
      } as never,
    });
    const caller = membershipsRouter.createCaller(ctx);

    const result = await caller.subscribe({ planId: PLAN_ID });

    expect(result).toEqual({
      checkoutUrl: 'https://checkout.stripe.com/c/cs_test_001',
    });
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
      customerId: 'cus_test_123',
      priceId: 'price_abc',
      successUrl: expect.any(String),
      cancelUrl: expect.any(String),
    });
  });

  it('throws NOT_FOUND when plan does not exist', async () => {
    const planFindFirst = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({
      query: {
        membershipPlans: { findFirst: planFindFirst },
      } as never,
    });
    const caller = membershipsRouter.createCaller(ctx);
    await expect(caller.subscribe({ planId: PLAN_ID })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws PRECONDITION_FAILED when member has no stripeCustomerId', async () => {
    const planFindFirst = vi.fn().mockResolvedValue(planFixture);
    const memberFindFirst = vi.fn().mockResolvedValue({
      ...memberFixture,
      stripeCustomerId: null,
    });
    const ctx = makeCtx({
      query: {
        membershipPlans: { findFirst: planFindFirst },
        members: { findFirst: memberFindFirst },
      } as never,
    });
    const caller = membershipsRouter.createCaller(ctx);
    await expect(caller.subscribe({ planId: PLAN_ID })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('throws UNAUTHORIZED without session', async () => {
    const ctx = makeCtx({}, { roles: null });
    const caller = membershipsRouter.createCaller(ctx);
    await expect(
      caller.subscribe({ planId: PLAN_ID }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('membershipsRouter.cancel (Phase 7 — Stripe wired)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls cancelAtPeriodEnd on the Stripe subscription', async () => {
    const subFindFirst = vi
      .fn()
      .mockResolvedValue(subscriptionWithPlanFixture);
    mockCancelAtPeriodEnd.mockResolvedValue({ id: 'sub_xyz' });

    const ctx = makeCtx({
      query: { memberSubscriptions: { findFirst: subFindFirst } } as never,
    });
    const caller = membershipsRouter.createCaller(ctx);

    await caller.cancel();

    expect(mockCancelAtPeriodEnd).toHaveBeenCalledWith('sub_xyz');
  });

  it('throws NOT_FOUND when no active subscription', async () => {
    const subFindFirst = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({
      query: { memberSubscriptions: { findFirst: subFindFirst } } as never,
    });
    const caller = membershipsRouter.createCaller(ctx);
    await expect(caller.cancel()).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('membershipsRouter.pause (Phase 7 — Stripe wired)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls pauseSubscription on the Stripe subscription', async () => {
    const subFindFirst = vi
      .fn()
      .mockResolvedValue(subscriptionWithPlanFixture);
    mockPauseSubscription.mockResolvedValue({ id: 'sub_xyz' });
    const update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const ctx = makeCtx({
      query: { memberSubscriptions: { findFirst: subFindFirst } } as never,
      update,
    } as never);
    const caller = membershipsRouter.createCaller(ctx);

    await caller.pause();

    expect(mockPauseSubscription).toHaveBeenCalledWith('sub_xyz');
  });

  it('throws NOT_FOUND when no active subscription', async () => {
    const subFindFirst = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({
      query: { memberSubscriptions: { findFirst: subFindFirst } } as never,
    });
    const caller = membershipsRouter.createCaller(ctx);
    await expect(
      caller.pause({ resumeAt: new Date('2026-09-01') }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('membershipsRouter.resume (Phase 7 — Stripe wired)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls resumeSubscription on the Stripe subscription', async () => {
    const subFindFirst = vi
      .fn()
      .mockResolvedValue({ ...subscriptionWithPlanFixture, status: 'paused' });
    mockResumeSubscription.mockResolvedValue({ id: 'sub_xyz' });
    const update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const ctx = makeCtx({
      query: { memberSubscriptions: { findFirst: subFindFirst } } as never,
      update,
    } as never);
    const caller = membershipsRouter.createCaller(ctx);

    await caller.resume();

    expect(mockResumeSubscription).toHaveBeenCalledWith('sub_xyz');
  });

  it('throws NOT_FOUND when no subscription found', async () => {
    const subFindFirst = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({
      query: { memberSubscriptions: { findFirst: subFindFirst } } as never,
    });
    const caller = membershipsRouter.createCaller(ctx);
    await expect(caller.resume()).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

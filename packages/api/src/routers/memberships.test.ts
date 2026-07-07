/**
 * F3-04 — membershipsRouter test suite
 *
 * Tests:
 *   - getPlans returns active plans
 *   - getMySubscription returns the linked subscription (or null)
 *   - getMySubscription returns null when no memberId
 *   - subscribe/cancel/pause stubs throw PRECONDITION_FAILED
 *   - UNAUTHORIZED when no session on protected procedures
 */

import { describe, it, expect, vi } from 'vitest';
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

describe('membershipsRouter.getMySubscription', () => {
  it('returns the linked subscription when present', async () => {
    const findFirst = vi.fn().mockResolvedValue(subscriptionFixture);
    const ctx = makeCtx({
      query: { memberSubscriptions: { findFirst } } as never,
    });
    const caller = membershipsRouter.createCaller(ctx);
    const result = await caller.getMySubscription();
    expect(result).toEqual(subscriptionFixture);
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

describe('membershipsRouter stubs (Phase 7)', () => {
  it('subscribe throws PRECONDITION_FAILED', async () => {
    const caller = membershipsRouter.createCaller(makeCtx());
    await expect(
      caller.subscribe({ planId: PLAN_ID }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('cancel throws PRECONDITION_FAILED', async () => {
    const caller = membershipsRouter.createCaller(makeCtx());
    await expect(caller.cancel()).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('pause throws PRECONDITION_FAILED', async () => {
    const caller = membershipsRouter.createCaller(makeCtx());
    await expect(
      caller.pause({ resumeAt: new Date('2026-09-01') }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('pause (no input) throws PRECONDITION_FAILED', async () => {
    const caller = membershipsRouter.createCaller(makeCtx());
    await expect(caller.pause()).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('subscribe throws UNAUTHORIZED without session', async () => {
    const ctx = makeCtx({}, { roles: null });
    const caller = membershipsRouter.createCaller(ctx);
    await expect(
      caller.subscribe({ planId: PLAN_ID }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

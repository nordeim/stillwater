/**
 * F3-01 — tRPC factory + procedure tiers test suite (RED phase)
 *
 * Tests the 4 procedure access tiers: public, protected, staff, owner.
 * Per MEP Phase 3 F3-01 + PAD §8.3.
 */

import { describe, it, expect } from 'vitest';
import { router, publicProcedure, protectedProcedure, staffProcedure, ownerProcedure } from './trpc';
import { initTRPC, TRPCError } from '@trpc/server';
import type { TRPCContext } from './trpc';

// Helper: create a mock context with given session roles
function createMockContext(roles: string[] | null): TRPCContext {
  return {
    db: {} as never,
    session: roles === null ? null : {
      user: { id: 'test-user', email: 'test@test.test', name: 'Test', roles, memberId: 'test-member' },
      session: { expires: '2026-12-01' },
    } as never,
    jobs: { trigger: () => Promise.resolve() } as never,
    redis: {} as never,
    req: new Request('http://localhost'),
  };
}

// Test router that uses all 4 procedure tiers
const testRouter = router({
  public: publicProcedure.query(({ ctx }) => ({ ok: true, hasSession: !!ctx.session })),
  protected: protectedProcedure.query(({ ctx }) => ({ ok: true, userId: ctx.session!.user.id })),
  staff: staffProcedure.query(({ ctx }) => ({ ok: true, roles: ctx.session!.user.roles })),
  owner: ownerProcedure.query(({ ctx }) => ({ ok: true, userId: ctx.session!.user.id })),
});

describe('F3-01: tRPC factory + procedure tiers', () => {
  it('publicProcedure allows unauthenticated call', async () => {
    const caller = testRouter.createCaller(createMockContext(null));
    const result = await caller.public();
    expect(result.ok).toBe(true);
    expect(result.hasSession).toBe(false);
  });

  it('protectedProcedure throws UNAUTHORIZED without session', async () => {
    const caller = testRouter.createCaller(createMockContext(null));
    await expect(caller.protected()).rejects.toThrow(TRPCError);
    await expect(caller.protected()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('staffProcedure throws FORBIDDEN for member-only session', async () => {
    const caller = testRouter.createCaller(createMockContext(['member']));
    await expect(caller.staff()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('ownerProcedure throws FORBIDDEN for non-owner session', async () => {
    const caller = testRouter.createCaller(createMockContext(['member', 'staff', 'manager']));
    await expect(caller.owner()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('protectedProcedure succeeds with authenticated session', async () => {
    const caller = testRouter.createCaller(createMockContext(['member']));
    const result = await caller.protected();
    expect(result.ok).toBe(true);
    expect(result.userId).toBe('test-user');
  });

  it('staffProcedure succeeds with staff role', async () => {
    const caller = testRouter.createCaller(createMockContext(['member', 'staff']));
    const result = await caller.staff();
    expect(result.ok).toBe(true);
  });

  it('ownerProcedure succeeds with owner role', async () => {
    const caller = testRouter.createCaller(createMockContext(['member', 'owner']));
    const result = await caller.owner();
    expect(result.ok).toBe(true);
  });
});

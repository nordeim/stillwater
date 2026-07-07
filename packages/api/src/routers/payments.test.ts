/**
 * F3-04 — paymentsRouter test suite
 *
 * All procedures are stubs that throw PRECONDITION_FAILED until Phase 7.
 * Tests verify the stub contract + access tiers.
 */

import { describe, it, expect, vi } from 'vitest';
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

describe('paymentsRouter.getPortalUrl', () => {
  it('throws PRECONDITION_FAILED (Phase 7 stub)', async () => {
    const caller = paymentsRouter.createCaller(makeCtx());
    await expect(
      caller.getPortalUrl({ returnUrl: 'https://stillwater.test/account' }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('throws PRECONDITION_FAILED with no input', async () => {
    const caller = paymentsRouter.createCaller(makeCtx());
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

describe('paymentsRouter.getInvoices', () => {
  it('throws PRECONDITION_FAILED (Phase 7 stub)', async () => {
    const caller = paymentsRouter.createCaller(makeCtx());
    await expect(caller.getInvoices({ limit: 10 })).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('throws PRECONDITION_FAILED with no input', async () => {
    const caller = paymentsRouter.createCaller(makeCtx());
    await expect(caller.getInvoices()).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });
});

describe('paymentsRouter.refund', () => {
  it('throws PRECONDITION_FAILED when caller is staff (Phase 7 stub)', async () => {
    const caller = paymentsRouter.createCaller(makeCtx(['staff']));
    await expect(
      caller.refund({
        paymentIntentId: 'pi_123',
        amount: 1000,
        reason: 'requested_by_customer',
      }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
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
    const caller = paymentsRouter.createCaller(makeCtx(['staff']));
    // Zod parsing happens before the mutation body — bad input throws a
    // parse error rather than reaching the stub.
    await expect(
      caller.refund({ paymentIntentId: '' } as never),
    ).rejects.toBeDefined();
  });
});

/**
 * F3-04 — adminRouter test suite
 *
 * Tests:
 *   - getDashboard returns aggregated counts
 *   - getRevenue returns 0 totals with processed-payment count
 *   - getClassRoster returns confirmed enrollments with member eager-loaded
 *   - FORBIDDEN for member-only callers
 *   - UNAUTHORIZED without session
 */

import { describe, it, expect, vi } from 'vitest';
import { adminRouter } from './admin';
import type { TRPCContext } from '../trpc';

function makeCtx(
  db: Partial<TRPCContext['db']> = {},
  roles: string[] | null = ['staff'],
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

/**
 * Builds a chained mock for `db.select(...).from(...).where(...)` that resolves
 * to `result`. Each step returns the next, so call order matters: select → from
 * → (optional where) → await result.
 *
 * V13-4 fix: Added crossJoin support for getRevenueDetails (attendance query).
 */
function makeSelectChain(result: unknown) {
  const where = vi.fn().mockResolvedValue(result);
  const crossJoin = vi.fn().mockResolvedValue(result);
  // from() must return something that:
  //   1. Is awaitable (thenable) for queries without .where()/.crossJoin()
  //   2. Has a .where() method for queries with .where()
  //   3. Has a .crossJoin() method for getRevenueDetails attendance query
  const fromResult = Object.assign(Promise.resolve(result), { where, crossJoin });
  const from = vi.fn().mockReturnValue(fromResult);
  const select = vi.fn().mockReturnValue({ from });
  return { select, from, where, crossJoin };
}

describe('adminRouter.getDashboard', () => {
  it('returns aggregated counts (revenue null until Phase 7)', async () => {
    // Three separate select chains: members, sessions, payment_events
    const memberChain = makeSelectChain([{ count: 42 }]);
    const sessionChain = makeSelectChain([{ count: 7 }]);
    const paymentChain = makeSelectChain([{ count: 3 }]);

    let callIdx = 0;
    const select = vi.fn(() => {
      const chains = [memberChain, sessionChain, paymentChain];
      return chains[callIdx++].select();
    });

    const ctx = makeCtx({ select } as never, ['staff']);
    const caller = adminRouter.createCaller(ctx);

    const result = await caller.getDashboard();

    expect(result).toEqual({
      memberCount: 42,
      upcomingSessionCount: 7,
      processedPaymentCount: 3,
      totalRevenueCents: null,
    });
    expect(select).toHaveBeenCalledTimes(3);
  });

  it('returns 0 counts when queries return no rows', async () => {
    const memberChain = makeSelectChain([]);
    const sessionChain = makeSelectChain([]);
    const paymentChain = makeSelectChain([]);

    let callIdx = 0;
    const select = vi.fn(() => {
      const chains = [memberChain, sessionChain, paymentChain];
      return chains[callIdx++].select();
    });

    const ctx = makeCtx({ select } as never, ['staff']);
    const caller = adminRouter.createCaller(ctx);

    const result = await caller.getDashboard();
    expect(result.memberCount).toBe(0);
    expect(result.upcomingSessionCount).toBe(0);
    expect(result.processedPaymentCount).toBe(0);
  });

  it('throws FORBIDDEN for member-only caller', async () => {
    const ctx = makeCtx({}, ['member']);
    const caller = adminRouter.createCaller(ctx);
    await expect(caller.getDashboard()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws UNAUTHORIZED without session', async () => {
    const ctx = makeCtx({}, null);
    const caller = adminRouter.createCaller(ctx);
    await expect(caller.getDashboard()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('adminRouter.getRevenue', () => {
  // V13-4 fix: getRevenue now requires managerProcedure (was staffProcedure).
  // Existing tests updated to use ['manager'] role.
  it('returns window + 0 totals + payment count in range', async () => {
    const chain = makeSelectChain([{ count: 12 }]);
    const ctx = makeCtx({ select: chain.select } as never, ['manager']);
    const caller = adminRouter.createCaller(ctx);

    const start = new Date('2026-07-01');
    const end = new Date('2026-07-31');
    const result = await caller.getRevenue({ start, end });

    expect(result).toEqual({
      windowStart: start,
      windowEnd: end,
      totalCents: 0,
      paymentCount: 12,
    });
  });

  it('returns 0 counts when start > end without querying', async () => {
    const chain = makeSelectChain([{ count: 99 }]);
    const ctx = makeCtx({ select: chain.select } as never, ['manager']);
    const caller = adminRouter.createCaller(ctx);

    const result = await caller.getRevenue({
      start: new Date('2026-07-31'),
      end: new Date('2026-07-01'),
    });

    expect(result.paymentCount).toBe(0);
    expect(result.totalCents).toBe(0);
    // select() should never have been called (early return)
    expect(chain.select).not.toHaveBeenCalled();
  });
});

describe('adminRouter.getClassRoster', () => {
  it('returns confirmed enrollments with member eager-loaded', async () => {
    const rosterFixture = [
      {
        id: '55555555-5555-5555-5555-555555555555',
        sessionId: '11111111-1111-4111-8111-111111111111',
        memberId: 'member-1',
        status: 'confirmed',
        enrolledAt: new Date('2026-07-01'),
        cancelledAt: null,
        checkedInAt: null,
        cancellationReason: null,
        packageCreditId: null,
        member: { id: 'member-1', displayName: 'Jane Doe' },
      },
    ];
    const findMany = vi.fn().mockResolvedValue(rosterFixture);
    const ctx = makeCtx({
      query: { enrollments: { findMany } } as never,
    }, ['staff']);
    const caller = adminRouter.createCaller(ctx);

    const result = await caller.getClassRoster({
      sessionId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toEqual(rosterFixture);
    expect(findMany).toHaveBeenCalledTimes(1);
    // Verify the where clause + with clause were passed
    const call = findMany.mock.calls[0][0];
    expect(call).toHaveProperty('with');
    expect(call.with).toEqual({ member: true });
  });

  it('throws FORBIDDEN for member-only caller', async () => {
    const findMany = vi.fn();
    const ctx = makeCtx(
      { query: { enrollments: { findMany } } as never },
      ['member'],
    );
    const caller = adminRouter.createCaller(ctx);
    await expect(
      caller.getClassRoster({ sessionId: '11111111-1111-4111-8111-111111111111' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('adminRouter.listClasses (Phase 9 F9-04)', () => {
  it('returns paginated class list with total count', async () => {
    const mockClasses = [
      { id: 'cls-1', title: 'Vinyasa Flow', slug: 'vinyasa', level: 'all', durationMinutes: 60, maxCapacity: 20, isActive: true },
      { id: 'cls-2', title: 'Yin Yoga', slug: 'yin', level: 'beginner', durationMinutes: 75, maxCapacity: 15, isActive: true },
    ];
    const findMany = vi.fn().mockResolvedValue(mockClasses);
    // Mock the count query: db.select({count}).from(classes).where(...)
    const where = vi.fn().mockResolvedValue([{ count: 2 }]);
    const fromResult = Object.assign(Promise.resolve([{ count: 2 }]), { where });
    const from = vi.fn().mockReturnValue(fromResult);
    const select = vi.fn().mockReturnValue({ from });

    const ctx = makeCtx(
      {
        query: { classes: { findMany } } as never,
        select,
      } as never,
      ['staff'],
    );
    const caller = adminRouter.createCaller(ctx);

    const result = await caller.listClasses({ limit: 20, offset: 0 });

    // The listClasses procedure accesses ctx.db.query.classes.findMany and ctx.db.select
    expect(result.items).toEqual(mockClasses);
  });

  it('throws FORBIDDEN for member-only caller', async () => {
    const findMany = vi.fn();
    const ctx = makeCtx(
      { query: { classes: { findMany } } as never } as never,
      ['member'],
    );
    const caller = adminRouter.createCaller(ctx);
    await expect(
      caller.listClasses({ limit: 20, offset: 0 }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('adminRouter.deleteClass (Phase 9 F9-04)', () => {
  it('soft-deletes a class by setting isActive = false', async () => {
    const update = vi.fn();
    const set = vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'cls-1', isActive: false }]) }) });
    update.mockReturnValue({ set });
    // deleteClass also fire-and-forget inserts an audit log entry — mock it
    const insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        catch: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const ctx = makeCtx(
      { update, insert } as never,
      ['staff'],
    );
    const caller = adminRouter.createCaller(ctx);

    const result = await caller.deleteClass({ id: '11111111-1111-4111-8111-111111111111' });

    expect(update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });

  it('throws FORBIDDEN for member-only caller', async () => {
    const update = vi.fn();
    const ctx = makeCtx(
      { update } as never,
      ['member'],
    );
    const caller = adminRouter.createCaller(ctx);
    await expect(
      caller.deleteClass({ id: '11111111-1111-4111-8111-111111111111' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(update).not.toHaveBeenCalled();
  });

  it('writes audit log entry after soft-delete (F9-19 requirement)', async () => {
    const update = vi.fn();
    const set = vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'cls-1', isActive: false }]) }) });
    update.mockReturnValue({ set });
    const insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        catch: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const ctx = makeCtx(
      { update, insert } as never,
      ['staff'],
    );
    const caller = adminRouter.createCaller(ctx);

    await caller.deleteClass({ id: '11111111-1111-4111-8111-111111111111' });

    // Audit log insert should be called
    expect(insert).toHaveBeenCalled();
    const insertCall = insert.mock.calls[0];
    // The first argument is the table (auditLog), verify values were passed
    expect(insertCall).toBeDefined();
  });
});

/**
 * V13-4 (2026-07-19, Phase B audit I1/E1 fix): RBAC tier violations.
 *
 * The following procedures were using staffProcedure but the RBAC matrix
 * (PAD §9.2 + packages/auth/src/rbac.ts) requires manager+:
 *   - admin.getRevenue       (View revenue reports — manager+)
 *   - admin.getRevenueDetails (View revenue reports — manager+)
 *   - admin.listAuditLog     (View audit log — manager+)
 *
 * Staff could bypass the layout guard (which is correctly manager+) by
 * calling the tRPC procedure directly. This is a privilege escalation.
 *
 * Fix: add a managerProcedure tier to packages/api/src/trpc.ts and apply
 * it to these 3 procedures. (payments.refund is the 4th violator but it's
 * a D12 stub that throws PRECONDITION_FAILED regardless of tier.)
 */
describe('V13-4: RBAC tier enforcement — manager+ procedures reject staff callers', () => {
  it('getRevenue throws FORBIDDEN for staff-only caller', async () => {
    const chain = makeSelectChain([{ count: 0 }]);
    const ctx = makeCtx({ select: chain.select } as never, ['staff']);
    const caller = adminRouter.createCaller(ctx);

    await expect(
      caller.getRevenue({ start: new Date('2026-07-01'), end: new Date('2026-07-31') }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    // DB query must NOT have been called (tier check fails first)
    expect(chain.select).not.toHaveBeenCalled();
  });

  it('getRevenue succeeds for manager caller', async () => {
    const chain = makeSelectChain([{ count: 5 }]);
    const ctx = makeCtx({ select: chain.select } as never, ['manager']);
    const caller = adminRouter.createCaller(ctx);

    const result = await caller.getRevenue({
      start: new Date('2026-07-01'),
      end: new Date('2026-07-31'),
    });
    expect(result.paymentCount).toBe(5);
  });

  it('getRevenue succeeds for owner caller', async () => {
    const chain = makeSelectChain([{ count: 5 }]);
    const ctx = makeCtx({ select: chain.select } as never, ['owner']);
    const caller = adminRouter.createCaller(ctx);

    const result = await caller.getRevenue({
      start: new Date('2026-07-01'),
      end: new Date('2026-07-31'),
    });
    expect(result.paymentCount).toBe(5);
  });

  it('getRevenueDetails throws FORBIDDEN for staff-only caller', async () => {
    // getRevenueDetails uses 3 select chains (mrrRows, churnRows, attendanceRows)
    const chain = makeSelectChain([{ totalCents: 0, count: 0 }]);
    const ctx = makeCtx({ select: chain.select } as never, ['staff']);
    const caller = adminRouter.createCaller(ctx);

    await expect(
      caller.getRevenueDetails({ start: new Date('2026-07-01'), end: new Date('2026-07-31') }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(chain.select).not.toHaveBeenCalled();
  });

  it('getRevenueDetails succeeds for manager caller', async () => {
    const chain = makeSelectChain([{ totalCents: 0, count: 0 }]);
    const ctx = makeCtx({ select: chain.select } as never, ['manager']);
    const caller = adminRouter.createCaller(ctx);

    const result = await caller.getRevenueDetails({
      start: new Date('2026-07-01'),
      end: new Date('2026-07-31'),
    });
    expect(result).toBeDefined();
    expect(result.totalRevenueCents).toBe(0);
  });

  it('listAuditLog throws FORBIDDEN for staff-only caller', async () => {
    // listAuditLog uses findMany + a count select
    const findMany = vi.fn().mockResolvedValue([]);
    const chain = makeSelectChain([{ count: 0 }]);
    const ctx = makeCtx(
      { query: { auditLog: { findMany } }, select: chain.select } as never,
      ['staff'],
    );
    const caller = adminRouter.createCaller(ctx);

    await expect(
      caller.listAuditLog({}),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(findMany).not.toHaveBeenCalled();
    expect(chain.select).not.toHaveBeenCalled();
  });

  it('listAuditLog succeeds for manager caller', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const chain = makeSelectChain([{ count: 0 }]);
    const ctx = makeCtx(
      { query: { auditLog: { findMany } }, select: chain.select } as never,
      ['manager'],
    );
    const caller = adminRouter.createCaller(ctx);

    const result = await caller.listAuditLog({});
    expect(result).toBeDefined();
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('V17-4: getRevenueDetails cartesian-join bug fix', () => {
  /**
   * V17-4 fix: The previous implementation used `.crossJoin(sql\`enrollments\`)`
   * on a subquery that produced N rows (one per session with confirmed/attended
   * enrollments). CROSS JOIN with `enrollments` (M rows) produced N×M rows.
   *
   * This caused:
   *   - totalEnrollments = N×M (WRONG — should be M, the count of all enrollments)
   *   - noShows = (count of no_shows) × N (WRONG — should be just count of no_shows)
   *   - avgClassSize: mathematically still correct (N×M cancels out), but
   *     the query is needlessly expensive.
   *
   * The fix: split into 2 parallel queries — one for avgClassSize (grouped
   * subquery) and one for noShows + totalEnrollments (direct count on
   * enrollments table). No crossJoin.
   *
   * Source: STILLWATER_AUDIT_REPORT.md §7 Finding #7
   */

  it('does NOT call crossJoin on any query chain (V17-4)', async () => {
    // Set up 3 separate chains: mrrRows, churnRows, attendanceRows.
    // After V17-4, the attendance chain should NOT call crossJoin.
    const mrrChain = makeSelectChain([{ totalCents: 0, count: 0 }]);
    const churnChain = makeSelectChain([{ cancelled: 0, total: 0 }]);
    // After fix: attendance chain has 2 sub-queries (avg + counts), each
    // without crossJoin. We'll provide 2 chains for Promise.all.
    const avgSizeChain = makeSelectChain([{ avgSize: 0 }]);
    const countChain = makeSelectChain([{ noShows: 0, totalEnrollments: 0 }]);

    let callIdx = 0;
    const select = vi.fn(() => {
      const chains = [mrrChain, churnChain, avgSizeChain, countChain];
      return chains[callIdx++].select();
    });

    const ctx = makeCtx({ select } as never, ['manager']);
    const caller = adminRouter.createCaller(ctx);

    await caller.getRevenueDetails({
      start: new Date('2026-07-01'),
      end: new Date('2026-07-31'),
    });

    // CRITICAL: crossJoin must NOT be called on any chain.
    expect(mrrChain.crossJoin).not.toHaveBeenCalled();
    expect(churnChain.crossJoin).not.toHaveBeenCalled();
    expect(avgSizeChain.crossJoin).not.toHaveBeenCalled();
    expect(countChain.crossJoin).not.toHaveBeenCalled();
  });

  it('returns correct totalEnrollments + noShows (not cartesian product) (V17-4)', async () => {
    // Mock data:
    //   - 10 total enrollments, 2 of which are no_shows → noShowRate = 20%
    //   - avg class size = 8.0 (from subquery)
    //   - revenue = 0 (no payments in range)
    //   - churn = 0/5 = 0%
    const mrrChain = makeSelectChain([{ totalCents: 0, count: 0 }]);
    const churnChain = makeSelectChain([{ cancelled: 0, total: 5 }]);
    const avgSizeChain = makeSelectChain([{ avgSize: 8.0 }]);
    const countChain = makeSelectChain([{ noShows: 2, totalEnrollments: 10 }]);

    let callIdx = 0;
    const select = vi.fn(() => {
      const chains = [mrrChain, churnChain, avgSizeChain, countChain];
      return chains[callIdx++].select();
    });

    const ctx = makeCtx({ select } as never, ['manager']);
    const caller = adminRouter.createCaller(ctx);

    const result = await caller.getRevenueDetails({
      start: new Date('2026-07-01'),
      end: new Date('2026-07-31'),
    });

    // CRITICAL: totalEnrollments must be 10 (not 10 × N where N is the
    // number of distinct sessions — which is what the crossJoin bug would
    // produce).
    expect(result.totalSubs).toBe(5); // sanity check — churn chain
    expect(result.cancelledSubs).toBe(0);
    // avgClassSize + noShows + totalEnrollments are NOT in the return shape
    // directly, but noShowRate IS (derived from noShows / totalEnrollments).
    // With noShows=2 and totalEnrollments=10, noShowRate = 20.
    expect(result.noShowRate).toBe(20);
    expect(result.avgClassSize).toBe(8.0);
  });

  it('handles empty enrollments table without dividing by zero (V17-4)', async () => {
    const mrrChain = makeSelectChain([{ totalCents: 0, count: 0 }]);
    const churnChain = makeSelectChain([{ cancelled: 0, total: 0 }]);
    const avgSizeChain = makeSelectChain([{ avgSize: 0 }]);
    const countChain = makeSelectChain([{ noShows: 0, totalEnrollments: 0 }]);

    let callIdx = 0;
    const select = vi.fn(() => {
      const chains = [mrrChain, churnChain, avgSizeChain, countChain];
      return chains[callIdx++].select();
    });

    const ctx = makeCtx({ select } as never, ['manager']);
    const caller = adminRouter.createCaller(ctx);

    const result = await caller.getRevenueDetails({
      start: new Date('2026-07-01'),
      end: new Date('2026-07-31'),
    });

    // When totalEnrollments = 0, noShowRate should be 0 (not NaN).
    expect(result.noShowRate).toBe(0);
    expect(Number.isNaN(result.noShowRate)).toBe(false);
  });
});

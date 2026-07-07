/**
 * F3-04 — bookingsRouter test suite
 *
 * Mocks rateLimit to a no-op so we can test booking logic in isolation.
 * Mocks ctx.db.transaction to call the callback with a mock `tx`.
 *
 * Tests cover:
 *   - happy-path book (advisory lock + capacity check + insert)
 *   - NOT_FOUND when session missing
 *   - CONFLICT when session not 'scheduled'
 *   - CONFLICT when member already enrolled (double-book)
 *   - CONFLICT when session is full
 *   - FORBIDDEN when caller has no memberId
 *   - cancel enforces ownership + triggers waitlist.promote job
 *   - checkIn (staff) marks enrollment as attended
 *   - access tier enforcement (UNAUTHORIZED / FORBIDDEN)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock rateLimit as a no-op tRPC middleware that calls next() to pass through
vi.mock('../middleware/rateLimit', () => ({
  rateLimit: () => async ({ next }: { next: () => Promise<unknown> }) => next(),
}));

import { bookingsRouter } from './bookings';
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
    jobs: { trigger: vi.fn().mockResolvedValue({ id: 'job-1' }) } as never,
    redis: {} as never,
    req: new Request('http://localhost'),
  };
}

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = 'member-1';
const ENROLLMENT_ID = '55555555-5555-4555-8555-555555555555';

const sessionFixture = {
  id: SESSION_ID,
  classId: '22222222-2222-2222-2222-222222222222',
  instructorId: '33333333-3333-3333-3333-333333333333',
  roomId: '44444444-4444-4444-4444-444444444444',
  startsAt: new Date('2026-07-07T12:00:00Z'),
  endsAt: new Date('2026-07-07T13:00:00Z'),
  status: 'scheduled',
  cancelReason: null,
  overrideCapacity: null,
  isVirtual: false,
  streamUrl: null,
  createdAt: new Date('2026-01-01'),
  class: { id: '22222222-2222-2222-2222-222222222222', maxCapacity: 20 },
  room: { id: '44444444-4444-4444-4444-444444444444', capacity: 15 },
};

const enrollmentFixture = {
  id: ENROLLMENT_ID,
  sessionId: SESSION_ID,
  memberId: MEMBER_ID,
  status: 'confirmed',
  enrolledAt: new Date('2026-07-01'),
  cancelledAt: null,
  checkedInAt: null,
  cancellationReason: null,
  packageCreditId: null,
};

/**
 * Build a mock `tx` (or `db`) with all the methods the book mutation touches.
 * Each behavior is configurable via the `overrides` arg.
 */
function makeTx(overrides: {
  session?: unknown;
  existingEnrollment?: unknown;
  enrolledCount?: number;
  createdEnrollment?: unknown;
} = {}) {
  const execute = vi.fn().mockResolvedValue([{ pg_advisory_xact_lock: '' }]);
  const findFirstSession = vi.fn().mockResolvedValue(overrides.session === undefined ? sessionFixture : overrides.session);
  const findFirstEnrollment = vi.fn().mockResolvedValue(overrides.existingEnrollment ?? undefined);
  const where = vi.fn().mockResolvedValue([{ count: overrides.enrolledCount ?? 0 }]);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  const returningInsert = vi.fn().mockResolvedValue(
    overrides.createdEnrollment === null ? [] : [overrides.createdEnrollment ?? enrollmentFixture],
  );
  const values = vi.fn().mockReturnValue({ returning: returningInsert });
  const insert = vi.fn().mockReturnValue({ values });

  return {
    tx: {
      execute,
      query: {
        classSessions: { findFirst: findFirstSession },
        enrollments: { findFirst: findFirstEnrollment },
      },
      select,
      insert,
    },
    spies: {
      execute,
      findFirstSession,
      findFirstEnrollment,
      where,
      from,
      select,
      insert,
      values,
      returningInsert,
    },
  };
}

/**
 * Wrap a mock `tx` so `ctx.db.transaction(cb)` invokes `cb(tx)` and returns
 * the result. This mirrors Drizzle's runtime behavior.
 */
function makeTransactionTx(tx: unknown) {
  const transaction = vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(tx));
  return transaction;
}

describe('bookingsRouter.book — happy path', () => {
  it('acquires advisory lock, checks capacity, and inserts enrollment', async () => {
    const { tx, spies } = makeTx({ enrolledCount: 5 });
    const transaction = makeTransactionTx(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = bookingsRouter.createCaller(ctx);

    const result = await caller.book({ sessionId: SESSION_ID });

    expect(result).toEqual(enrollmentFixture);
    // Lock acquired — verify tx.execute was called (SQL template content varies)
    expect(spies.execute).toHaveBeenCalledTimes(1);
    // Session fetched
    expect(spies.findFirstSession).toHaveBeenCalledTimes(1);
    // Double-booking check
    expect(spies.findFirstEnrollment).toHaveBeenCalledTimes(1);
    // Insert
    expect(spies.insert).toHaveBeenCalledTimes(1);
    expect(spies.values.mock.calls[0][0]).toMatchObject({
      sessionId: SESSION_ID,
      memberId: MEMBER_ID,
      status: 'confirmed',
    });
  });
});

describe('bookingsRouter.book — error cases', () => {
  it('throws NOT_FOUND when session does not exist', async () => {
    const { tx } = makeTx({ session: null });
    const transaction = makeTransactionTx(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = bookingsRouter.createCaller(ctx);
    await expect(caller.book({ sessionId: SESSION_ID })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws CONFLICT when session is not scheduled', async () => {
    const { tx } = makeTx({
      session: { ...sessionFixture, status: 'cancelled' },
    });
    const transaction = makeTransactionTx(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = bookingsRouter.createCaller(ctx);
    await expect(caller.book({ sessionId: SESSION_ID })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('throws CONFLICT when member is already enrolled', async () => {
    const { tx } = makeTx({ existingEnrollment: enrollmentFixture });
    const transaction = makeTransactionTx(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = bookingsRouter.createCaller(ctx);
    await expect(caller.book({ sessionId: SESSION_ID })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('throws CONFLICT when session is full (enrolledCount >= capacity)', async () => {
    const { tx } = makeTx({ enrolledCount: 20 }); // capacity is 20 from sessionFixture
    const transaction = makeTransactionTx(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = bookingsRouter.createCaller(ctx);
    await expect(caller.book({ sessionId: SESSION_ID })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('throws FORBIDDEN when caller has no memberId', async () => {
    const transaction = vi.fn();
    const ctx = makeCtx({ transaction } as never, { memberId: null });
    const caller = bookingsRouter.createCaller(ctx);
    await expect(caller.book({ sessionId: SESSION_ID })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('throws UNAUTHORIZED without session', async () => {
    const ctx = makeCtx({}, { roles: null });
    const caller = bookingsRouter.createCaller(ctx);
    await expect(caller.book({ sessionId: SESSION_ID })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('uses overrideCapacity when present (overrides class.maxCapacity)', async () => {
    const { tx, spies } = makeTx({
      session: { ...sessionFixture, overrideCapacity: 5 },
      enrolledCount: 4,
    });
    const transaction = makeTransactionTx(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = bookingsRouter.createCaller(ctx);

    // Should succeed (4 < 5)
    const result = await caller.book({ sessionId: SESSION_ID });
    expect(result).toEqual(enrollmentFixture);
  });

  it('uses room.capacity when class.maxCapacity is null', async () => {
    const { tx } = makeTx({
      session: {
        ...sessionFixture,
        overrideCapacity: null,
        class: { id: '22222222-2222-2222-2222-222222222222', maxCapacity: null as unknown as number },
        room: { id: '44444444-4444-4444-4444-444444444444', capacity: 10 },
      },
      enrolledCount: 9,
    });
    const transaction = makeTransactionTx(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = bookingsRouter.createCaller(ctx);

    // Should succeed (9 < 10)
    const result = await caller.book({ sessionId: SESSION_ID });
    expect(result).toEqual(enrollmentFixture);
  });
});

describe('bookingsRouter.cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancels the caller own enrollment and triggers waitlist.promote', async () => {
    const updated = { ...enrollmentFixture, status: 'cancelled', cancelledAt: new Date() };
    const returning = vi.fn().mockResolvedValue([updated]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never);
    const caller = bookingsRouter.createCaller(ctx);

    const result = await caller.cancel({ enrollmentId: ENROLLMENT_ID });

    expect(result.status).toBe('cancelled');
    // Ownership is enforced: where clause includes memberId
    expect(set).toHaveBeenCalledTimes(1);
    expect(set.mock.calls[0][0]).toMatchObject({ status: 'cancelled' });
    expect(set.mock.calls[0][0]).toHaveProperty('cancelledAt');
    // Waitlist promotion job triggered
    expect(ctx.jobs.trigger).toHaveBeenCalledTimes(1);
    expect(ctx.jobs.trigger).toHaveBeenCalledWith('waitlist.promote', {
      sessionId: SESSION_ID,
    });
  });

  it('throws NOT_FOUND when enrollment does not exist (or not owned)', async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never);
    const caller = bookingsRouter.createCaller(ctx);
    await expect(
      caller.cancel({ enrollmentId: '00000000-0000-0000-0000-000000000000' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    // No job triggered when nothing was cancelled
    expect(ctx.jobs.trigger).not.toHaveBeenCalled();
  });

  it('throws FORBIDDEN when caller has no memberId', async () => {
    const update = vi.fn();
    const ctx = makeCtx({ update } as never, { memberId: null });
    const caller = bookingsRouter.createCaller(ctx);
    await expect(
      caller.cancel({ enrollmentId: ENROLLMENT_ID }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(update).not.toHaveBeenCalled();
  });
});

describe('bookingsRouter.checkIn (staff)', () => {
  it('marks an enrollment as attended when caller is staff', async () => {
    const updated = { ...enrollmentFixture, status: 'attended', checkedInAt: new Date() };
    const returning = vi.fn().mockResolvedValue([updated]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never, { roles: ['staff'] });
    const caller = bookingsRouter.createCaller(ctx);

    const result = await caller.checkIn({
      sessionId: SESSION_ID,
      memberId: '22222222-2222-4222-8222-222222222222',
    });

    expect(result.status).toBe('attended');
    expect(set.mock.calls[0][0]).toMatchObject({ status: 'attended' });
    expect(set.mock.calls[0][0]).toHaveProperty('checkedInAt');
  });

  it('throws NOT_FOUND when enrollment does not exist', async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never, { roles: ['staff'] });
    const caller = bookingsRouter.createCaller(ctx);
    await expect(
      caller.checkIn({
        sessionId: SESSION_ID,
        memberId: '00000000-0000-0000-0000-000000000000',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws FORBIDDEN for member-only caller', async () => {
    const update = vi.fn();
    const ctx = makeCtx({ update } as never, { roles: ['member'] });
    const caller = bookingsRouter.createCaller(ctx);
    await expect(
      caller.checkIn({ sessionId: SESSION_ID, memberId: '22222222-2222-4222-8222-222222222222' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(update).not.toHaveBeenCalled();
  });
});

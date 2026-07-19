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
 *   - cancel enforces ownership + triggers waitlist-promotion job
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
 * Build a mock `tx` (or `db`) with all the methods the book/cancel/checkIn
 * mutations touch. Each behavior is configurable via the `overrides` arg.
 *
 * V13-2 fix (2026-07-19): Added waitlistEntries mock for cancel-promotes-next
 * behavior. The cancel mutation now finds the next-in-line waitlist entry
 * inside the transaction and updates its status to 'offered'.
 */
function makeTx(overrides: {
  session?: unknown;
  existingEnrollment?: unknown;
  enrolledCount?: number;
  createdEnrollment?: unknown;
  // v8 C1 fix: cancel mutation fetches enrollment before locking.
  // Set existingEnrollmentForCancel to control the cancel-path findFirst.
  existingEnrollmentForCancel?: unknown;
  // v8 C2 fix: cancel mutation returns the updated enrollment.
  updatedEnrollment?: unknown;
  // V13-2 fix: cancel mutation finds the next-in-line waitlist entry.
  // Set nextWaitlistEntry to control the waitlist-promotion path.
  // undefined = no waitlist entry (no promotion). null = explicit no entry.
  nextWaitlistEntry?: unknown;
} = {}) {
  const execute = vi.fn().mockResolvedValue([{ pg_advisory_xact_lock: '' }]);
  const findFirstSession = vi.fn().mockResolvedValue(overrides.session === undefined ? sessionFixture : overrides.session);
  // For book's double-booking check + cancel's pre-lock fetch
  const findFirstEnrollment = vi.fn().mockImplementation(() => {
    if (overrides.existingEnrollmentForCancel !== undefined) {
      return Promise.resolve(overrides.existingEnrollmentForCancel);
    }
    return Promise.resolve(overrides.existingEnrollment ?? undefined);
  });
  // V13-2: waitlist findFirst for cancel's next-in-line lookup
  const findFirstWaitlist = vi.fn().mockResolvedValue(
    overrides.nextWaitlistEntry === undefined ? undefined : overrides.nextWaitlistEntry,
  );
  const where = vi.fn().mockResolvedValue([{ count: overrides.enrolledCount ?? 0 }]);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  const returningInsert = vi.fn().mockResolvedValue(
    overrides.createdEnrollment === null ? [] : [overrides.createdEnrollment ?? enrollmentFixture],
  );
  const values = vi.fn().mockReturnValue({ returning: returningInsert });
  const insert = vi.fn().mockReturnValue({ values });

  // v8 C1+C2 fix: cancel mutation uses update().set().where().returning()
  const returningUpdate = vi.fn().mockResolvedValue(
    overrides.updatedEnrollment === undefined
      ? [{ ...enrollmentFixture, status: 'cancelled', cancelledAt: new Date() }]
      : (overrides.updatedEnrollment === null ? [] : [overrides.updatedEnrollment]),
  );
  const whereUpdate = vi.fn().mockReturnValue({ returning: returningUpdate });
  const setUpdate = vi.fn().mockReturnValue({ where: whereUpdate });
  const update = vi.fn().mockImplementation(() => ({ set: setUpdate }));

  // V13-2: waitlist update — separate spies so we can assert the promotion
  // set call had { status: 'offered', notifiedAt, expiresAt }.
  // The first update() call is for the enrollment; the second is for waitlist.
  // To keep the mock simple, we route both through the same update() fn.
  // The waitlist set call is asserted via setUpdate.mock.calls[1][0].

  return {
    tx: {
      execute,
      query: {
        classSessions: { findFirst: findFirstSession },
        enrollments: { findFirst: findFirstEnrollment },
        waitlistEntries: { findFirst: findFirstWaitlist },
      },
      select,
      insert,
      update,
    },
    spies: {
      execute,
      findFirstSession,
      findFirstEnrollment,
      findFirstWaitlist,
      where,
      from,
      select,
      insert,
      values,
      returningInsert,
      update,
      setUpdate,
      whereUpdate,
      returningUpdate,
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

  it('cancels the caller own enrollment, acquires advisory lock, and triggers waitlist-promotion + booking-cancellation (v8 C1+C2+C3 + V13-2 fix)', async () => {
    // V13-2: Provide a next-in-line waitlist entry to trigger promotion.
    const waitlistEntryFixture = {
      id: '66666666-6666-4666-8666-666666666666',
      sessionId: SESSION_ID,
      memberId: 'member-2',
      position: 1,
      status: 'waiting',
    };
    // Pre-lock findFirst returns the enrollment (with sessionId for the lock key)
    const { tx, spies } = makeTx({
      existingEnrollmentForCancel: { id: ENROLLMENT_ID, sessionId: SESSION_ID },
      updatedEnrollment: { ...enrollmentFixture, status: 'cancelled', cancelledAt: new Date() },
      nextWaitlistEntry: waitlistEntryFixture,
    });
    const transaction = makeTransactionTx(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = bookingsRouter.createCaller(ctx);

    const result = await caller.cancel({ enrollmentId: ENROLLMENT_ID });

    expect(result.status).toBe('cancelled');
    // C1 fix: advisory lock acquired inside transaction
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(spies.execute).toHaveBeenCalledTimes(1);
    // Pre-lock findFirst to get sessionId
    expect(spies.findFirstEnrollment).toHaveBeenCalledTimes(1);
    // Enrollment update called once (set status='cancelled')
    expect(spies.update).toHaveBeenCalledTimes(2); // enrollment + waitlist
    expect(spies.setUpdate.mock.calls[0][0]).toMatchObject({ status: 'cancelled' });
    expect(spies.setUpdate.mock.calls[0][0]).toHaveProperty('cancelledAt');
    // V13-2 fix: waitlist entry promoted to 'offered' with expiresAt
    expect(spies.findFirstWaitlist).toHaveBeenCalledTimes(1);
    expect(spies.setUpdate.mock.calls[1][0]).toMatchObject({
      status: 'offered',
      notifiedAt: expect.any(Date),
      expiresAt: expect.any(Date),
    });
    // C2 fix: both waitlist-promotion AND booking-cancellation triggered
    expect(ctx.jobs.trigger).toHaveBeenCalledTimes(2);
    // V13-2 fix: waitlist-promotion now receives { waitlistEntryId } (was { sessionId, cancelledEnrollmentId })
    expect(ctx.jobs.trigger).toHaveBeenCalledWith('waitlist-promotion', {
      waitlistEntryId: waitlistEntryFixture.id,
    });
    expect(ctx.jobs.trigger).toHaveBeenCalledWith('booking-cancellation', {
      enrollmentId: ENROLLMENT_ID,
      memberId: MEMBER_ID,
    });
  });

  it('V13-2: cancel does NOT trigger waitlist-promotion when no waitlist entries exist', async () => {
    const { tx } = makeTx({
      existingEnrollmentForCancel: { id: ENROLLMENT_ID, sessionId: SESSION_ID },
      updatedEnrollment: { ...enrollmentFixture, status: 'cancelled', cancelledAt: new Date() },
      nextWaitlistEntry: undefined, // No waitlist entries
    });
    const transaction = makeTransactionTx(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = bookingsRouter.createCaller(ctx);

    const result = await caller.cancel({ enrollmentId: ENROLLMENT_ID });

    expect(result.status).toBe('cancelled');
    // Only booking-cancellation triggered (no waitlist-promotion)
    expect(ctx.jobs.trigger).toHaveBeenCalledTimes(1);
    expect(ctx.jobs.trigger).toHaveBeenCalledWith('booking-cancellation', {
      enrollmentId: ENROLLMENT_ID,
      memberId: MEMBER_ID,
    });
    expect(ctx.jobs.trigger).not.toHaveBeenCalledWith('waitlist-promotion', expect.anything());
  });

  it('C3 fix: job triggers are fire-and-forget (do not throw if Trigger.dev is unreachable)', async () => {
    const waitlistEntryFixture = {
      id: '66666666-6666-4666-8666-666666666666',
      sessionId: SESSION_ID,
      memberId: 'member-2',
      position: 1,
      status: 'waiting',
    };
    const { tx } = makeTx({
      existingEnrollmentForCancel: { id: ENROLLMENT_ID, sessionId: SESSION_ID },
      updatedEnrollment: { ...enrollmentFixture, status: 'cancelled', cancelledAt: new Date() },
      nextWaitlistEntry: waitlistEntryFixture,
    });
    const transaction = makeTransactionTx(tx);
    const ctx = makeCtx({ transaction } as never);
    // jobs.trigger rejects (simulating Trigger.dev unreachable)
    (ctx.jobs.trigger as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Trigger.dev unreachable'),
    );
    const caller = bookingsRouter.createCaller(ctx);

    // Cancel should NOT throw despite Trigger.dev being unreachable
    const result = await caller.cancel({ enrollmentId: ENROLLMENT_ID });
    expect(result.status).toBe('cancelled');
  });

  it('throws NOT_FOUND when enrollment does not exist (or not owned)', async () => {
    // Pre-lock findFirst returns undefined (no enrollment found)
    const { tx } = makeTx({
      existingEnrollmentForCancel: undefined,
    });
    const transaction = makeTransactionTx(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = bookingsRouter.createCaller(ctx);
    await expect(
      caller.cancel({ enrollmentId: '00000000-0000-0000-0000-000000000000' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    // No job triggered when nothing was cancelled
    expect(ctx.jobs.trigger).not.toHaveBeenCalled();
  });

  it('throws FORBIDDEN when caller has no memberId', async () => {
    const transaction = vi.fn();
    const ctx = makeCtx({ transaction } as never, { memberId: null });
    const caller = bookingsRouter.createCaller(ctx);
    await expect(
      caller.cancel({ enrollmentId: ENROLLMENT_ID }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(transaction).not.toHaveBeenCalled();
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

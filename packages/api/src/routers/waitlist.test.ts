/**
 * F3-04 — waitlistRouter test suite
 *
 * Tests:
 *   - join: happy path (computes next position, inserts)
 *   - join: NOT_FOUND when session missing
 *   - join: CONFLICT when already waiting
 *   - leave: marks waiting entry as 'removed' (ownership enforced)
 *   - leave: NOT_FOUND when no waiting entry exists
 *   - getMyPosition: returns the entry (or null when not waiting)
 *   - access-tier enforcement (UNAUTHORIZED, FORBIDDEN for missing memberId)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitlistRouter } from './waitlist';
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

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = 'member-1';

const sessionFixture = {
  id: SESSION_ID,
  classId: '22222222-2222-2222-2222-222222222222',
  instructorId: '33333333-3333-3333-3333-333333333333',
  roomId: null,
  startsAt: new Date('2026-07-07T12:00:00Z'),
  endsAt: new Date('2026-07-07T13:00:00Z'),
  status: 'scheduled',
  cancelReason: null,
  overrideCapacity: null,
  isVirtual: false,
  streamUrl: null,
  createdAt: new Date('2026-01-01'),
};

const waitlistFixture = {
  id: '55555555-5555-4555-8555-555555555555',
  sessionId: SESSION_ID,
  memberId: MEMBER_ID,
  position: 3,
  joinedAt: new Date('2026-07-01'),
  notifiedAt: null,
  expiresAt: null,
  status: 'waiting' as const,
};

function makeTxForJoin(overrides: {
  session?: unknown;
  existing?: unknown;
  nextPosition?: number;
  created?: unknown;
} = {}) {
  const findFirstSession = vi.fn().mockResolvedValue(overrides.session === undefined ? sessionFixture : overrides.session);
  const findFirstExisting = vi.fn().mockResolvedValue(overrides.existing ?? undefined);
  const wherePosition = vi.fn().mockResolvedValue([
    { max: overrides.nextPosition ?? 1 },
  ]);
  const fromPosition = vi.fn().mockReturnValue({ where: wherePosition });
  const selectPosition = vi.fn().mockReturnValue({ from: fromPosition });
  const returningInsert = vi.fn().mockResolvedValue(
    overrides.created === null ? [] : [overrides.created ?? waitlistFixture],
  );
  const values = vi.fn().mockReturnValue({ returning: returningInsert });
  const insert = vi.fn().mockReturnValue({ values });

  return {
    tx: {
      query: {
        classSessions: { findFirst: findFirstSession },
        waitlistEntries: { findFirst: findFirstExisting },
      },
      select: selectPosition,
      insert,
    },
    spies: {
      findFirstSession,
      findFirstExisting,
      wherePosition,
      fromPosition,
      selectPosition,
      insert,
      values,
      returningInsert,
    },
  };
}

function makeTransaction(tx: unknown) {
  return vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(tx));
}

describe('waitlistRouter.join — happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes next position and inserts a waiting entry', async () => {
    const { tx, spies } = makeTxForJoin({ nextPosition: 4 });
    const transaction = makeTransaction(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = waitlistRouter.createCaller(ctx);

    const result = await caller.join({ sessionId: SESSION_ID });

    expect(result).toEqual(waitlistFixture);
    expect(spies.findFirstSession).toHaveBeenCalledTimes(1);
    expect(spies.findFirstExisting).toHaveBeenCalledTimes(1);
    expect(spies.insert).toHaveBeenCalledTimes(1);
    expect(spies.values.mock.calls[0][0]).toMatchObject({
      sessionId: SESSION_ID,
      memberId: MEMBER_ID,
      status: 'waiting',
    });
    expect(spies.values.mock.calls[0][0]).toHaveProperty('position');
  });

  it('uses position=1 when no existing entries', async () => {
    const { tx, spies } = makeTxForJoin({ nextPosition: 1 });
    const transaction = makeTransaction(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = waitlistRouter.createCaller(ctx);

    await caller.join({ sessionId: SESSION_ID });
    expect(spies.values.mock.calls[0][0].position).toBe(1);
  });
});

describe('waitlistRouter.join — error cases', () => {
  it('throws NOT_FOUND when session does not exist', async () => {
    const { tx } = makeTxForJoin({ session: null });
    const transaction = makeTransaction(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = waitlistRouter.createCaller(ctx);
    await expect(caller.join({ sessionId: SESSION_ID })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws CONFLICT when already on the waitlist', async () => {
    const { tx } = makeTxForJoin({ existing: waitlistFixture });
    const transaction = makeTransaction(tx);
    const ctx = makeCtx({ transaction } as never);
    const caller = waitlistRouter.createCaller(ctx);
    await expect(caller.join({ sessionId: SESSION_ID })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('throws FORBIDDEN when caller has no memberId', async () => {
    const transaction = vi.fn();
    const ctx = makeCtx({ transaction } as never, { memberId: null });
    const caller = waitlistRouter.createCaller(ctx);
    await expect(caller.join({ sessionId: SESSION_ID })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('throws UNAUTHORIZED without session', async () => {
    const ctx = makeCtx({}, { roles: null });
    const caller = waitlistRouter.createCaller(ctx);
    await expect(caller.join({ sessionId: SESSION_ID })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});

describe('waitlistRouter.leave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks the waiting entry as removed', async () => {
    const updated = { ...waitlistFixture, status: 'removed' };
    const returning = vi.fn().mockResolvedValue([updated]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never);
    const caller = waitlistRouter.createCaller(ctx);

    const result = await caller.leave({ sessionId: SESSION_ID });

    expect(result.status).toBe('removed');
    expect(set.mock.calls[0][0]).toEqual({ status: 'removed' });
  });

  it('throws NOT_FOUND when no waiting entry exists', async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never);
    const caller = waitlistRouter.createCaller(ctx);
    await expect(caller.leave({ sessionId: SESSION_ID })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws FORBIDDEN when caller has no memberId', async () => {
    const update = vi.fn();
    const ctx = makeCtx({ update } as never, { memberId: null });
    const caller = waitlistRouter.createCaller(ctx);
    await expect(caller.leave({ sessionId: SESSION_ID })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(update).not.toHaveBeenCalled();
  });
});

describe('waitlistRouter.getMyPosition', () => {
  it('returns the waiting entry when present', async () => {
    const findFirst = vi.fn().mockResolvedValue(waitlistFixture);
    const ctx = makeCtx({
      query: { waitlistEntries: { findFirst } } as never,
    });
    const caller = waitlistRouter.createCaller(ctx);
    const result = await caller.getMyPosition({ sessionId: SESSION_ID });
    expect(result).toEqual(waitlistFixture);
  });

  it('returns null when no waiting entry exists', async () => {
    const findFirst = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({
      query: { waitlistEntries: { findFirst } } as never,
    });
    const caller = waitlistRouter.createCaller(ctx);
    const result = await caller.getMyPosition({ sessionId: SESSION_ID });
    expect(result).toBeNull();
  });

  it('returns null without querying when memberId is null', async () => {
    const findFirst = vi.fn();
    const ctx = makeCtx(
      { query: { waitlistEntries: { findFirst } } as never },
      { memberId: null },
    );
    const caller = waitlistRouter.createCaller(ctx);
    const result = await caller.getMyPosition({ sessionId: SESSION_ID });
    expect(result).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('throws UNAUTHORIZED without session', async () => {
    const ctx = makeCtx({}, { roles: null });
    const caller = waitlistRouter.createCaller(ctx);
    await expect(
      caller.getMyPosition({ sessionId: SESSION_ID }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

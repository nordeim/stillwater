/**
 * F3-04 — sessionsRouter test suite
 */

import { describe, it, expect, vi } from 'vitest';
import { sessionsRouter } from './sessions';
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

const SESSION_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const CLASS_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const INSTRUCTOR_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const ENROLLMENT_ID = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
const MEMBER_ID = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';

const sessionFixture = {
  id: SESSION_ID,
  classId: CLASS_ID,
  instructorId: INSTRUCTOR_ID,
  roomId: null,
  startsAt: new Date('2026-07-07T12:00:00Z'),
  endsAt: new Date('2026-07-07T13:00:00Z'),
  status: 'scheduled',
  cancelReason: null,
  overrideCapacity: null,
  isVirtual: false,
  streamUrl: null,
  createdAt: new Date('2026-01-01'),
  class: { id: CLASS_ID, slug: 'vinyasa', title: 'Vinyasa' },
  instructor: { id: INSTRUCTOR_ID, slug: 'jane' },
  room: null,
};

describe('sessionsRouter.listByDateRange', () => {
  it('returns sessions in range', async () => {
    const findMany = vi.fn().mockResolvedValue([sessionFixture]);
    const ctx = makeCtx({
      query: { classSessions: { findMany } } as never,
    }, null);
    const caller = sessionsRouter.createCaller(ctx);
    const result = await caller.listByDateRange({
      start: new Date('2026-07-01'),
      end: new Date('2026-07-31'),
    });
    expect(result).toEqual([sessionFixture]);
  });

  it('throws BAD_REQUEST when start > end', async () => {
    const findMany = vi.fn();
    const ctx = makeCtx({
      query: { classSessions: { findMany } } as never,
    }, null);
    const caller = sessionsRouter.createCaller(ctx);
    await expect(
      caller.listByDateRange({
        start: new Date('2026-07-31'),
        end: new Date('2026-07-01'),
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('sessionsRouter.create', () => {
  it('creates a session when caller is staff', async () => {
    const returning = vi.fn().mockResolvedValue([sessionFixture]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });
    const ctx = makeCtx({ insert } as never, ['staff']);
    const caller = sessionsRouter.createCaller(ctx);

    const result = await caller.create({
      classId: CLASS_ID,
      instructorId: INSTRUCTOR_ID,
      startsAt: new Date('2026-07-07T12:00:00Z'),
      endsAt: new Date('2026-07-07T13:00:00Z'),
    });

    expect(result).toEqual(sessionFixture);
    expect(values.mock.calls[0][0]).toMatchObject({ status: 'scheduled' });
  });

  it('throws BAD_REQUEST when startsAt >= endsAt', async () => {
    const insert = vi.fn();
    const ctx = makeCtx({ insert } as never, ['staff']);
    const caller = sessionsRouter.createCaller(ctx);
    await expect(
      caller.create({
        classId: CLASS_ID,
        instructorId: INSTRUCTOR_ID,
        startsAt: new Date('2026-07-07T13:00:00Z'),
        endsAt: new Date('2026-07-07T12:00:00Z'),
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('throws FORBIDDEN for member-only caller', async () => {
    const insert = vi.fn();
    const ctx = makeCtx({ insert } as never, ['member']);
    const caller = sessionsRouter.createCaller(ctx);
    await expect(
      caller.create({
        classId: CLASS_ID,
        instructorId: INSTRUCTOR_ID,
        startsAt: new Date('2026-07-07T12:00:00Z'),
        endsAt: new Date('2026-07-07T13:00:00Z'),
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('sessionsRouter.cancel', () => {
  it('cancels a session when caller is staff', async () => {
    const updated = { ...sessionFixture, status: 'cancelled', cancelReason: 'sick' };
    const returning = vi.fn().mockResolvedValue([updated]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never, ['staff']);
    const caller = sessionsRouter.createCaller(ctx);

    const result = await caller.cancel({
      sessionId: SESSION_ID,
      reason: 'sick',
    });

    expect(result.status).toBe('cancelled');
    expect(result.cancelReason).toBe('sick');
    expect(set.mock.calls[0][0]).toMatchObject({ status: 'cancelled', cancelReason: 'sick' });
  });

  it('throws NOT_FOUND when session does not exist', async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never, ['staff']);
    const caller = sessionsRouter.createCaller(ctx);
    await expect(
      caller.cancel({
        sessionId: '00000000-0000-0000-0000-000000000000',
        reason: 'no-show',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('sessionsRouter.checkIn', () => {
  it('marks an enrollment as attended', async () => {
    const enrollmentFixture = {
      id: ENROLLMENT_ID,
      sessionId: SESSION_ID,
      memberId: MEMBER_ID,
      status: 'attended',
      enrolledAt: new Date('2026-07-01'),
      cancelledAt: null,
      checkedInAt: new Date('2026-07-07T12:00:00Z'),
      cancellationReason: null,
      packageCreditId: null,
    };
    const returning = vi.fn().mockResolvedValue([enrollmentFixture]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never, ['staff']);
    const caller = sessionsRouter.createCaller(ctx);

    const result = await caller.checkIn({
      sessionId: SESSION_ID,
      memberId: MEMBER_ID,
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
    const ctx = makeCtx({ update } as never, ['staff']);
    const caller = sessionsRouter.createCaller(ctx);
    await expect(
      caller.checkIn({
        sessionId: '00000000-0000-0000-0000-000000000000',
        memberId: '00000000-0000-0000-0000-000000000000',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

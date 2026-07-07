/**
 * F3-04 — scheduleRouter test suite
 *
 * Mocks ctx.db.query.classSessions + ctx.db.select to avoid real DB calls.
 * Uses createCaller with a public (no-session) context.
 */

import { describe, it, expect, vi } from 'vitest';
import { scheduleRouter } from './schedule';
import type { TRPCContext } from '../trpc';

function makeCtx(db: Partial<TRPCContext['db']> = {}): TRPCContext {
  return {
    db: { ...db } as TRPCContext['db'],
    session: null,
    jobs: { trigger: vi.fn() } as never,
    redis: {} as never,
    req: new Request('http://localhost'),
  };
}

const SESSION_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const CLASS_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const INSTRUCTOR_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const ROOM_ID = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

const sessionFixture = {
  id: SESSION_ID,
  classId: CLASS_ID,
  instructorId: INSTRUCTOR_ID,
  roomId: ROOM_ID,
  startsAt: new Date('2026-07-07T12:00:00Z'),
  endsAt: new Date('2026-07-07T13:00:00Z'),
  status: 'scheduled' as const,
  cancelReason: null,
  overrideCapacity: null,
  isVirtual: false,
  streamUrl: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  class: { id: CLASS_ID, slug: 'vinyasa', title: 'Vinyasa' },
  instructor: { id: INSTRUCTOR_ID, slug: 'jane', bio: 'hi' },
  room: { id: ROOM_ID, name: 'Studio A', capacity: 20 },
};

describe('scheduleRouter.getWeek', () => {
  it('returns sessions in the 7-day window with relations', async () => {
    const findMany = vi.fn().mockResolvedValue([sessionFixture]);
    const ctx = makeCtx({
      query: { classSessions: { findMany } } as never,
    });
    const caller = scheduleRouter.createCaller(ctx);
    const result = await caller.getWeek({ weekStart: new Date('2026-07-06') });

    expect(result).toEqual([sessionFixture]);
    expect(findMany).toHaveBeenCalledTimes(1);
    // The where clause filters by date range + status='scheduled'
    const call = findMany.mock.calls[0][0];
    expect(call).toHaveProperty('with');
    expect(call.with).toEqual({ class: true, instructor: true, room: true });
  });

  it('returns empty array when no sessions match', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const ctx = makeCtx({
      query: { classSessions: { findMany } } as never,
    });
    const caller = scheduleRouter.createCaller(ctx);
    const result = await caller.getWeek({ weekStart: new Date('2026-07-06') });
    expect(result).toEqual([]);
  });
});

describe('scheduleRouter.getSession', () => {
  it('returns session + enrolledCount when session exists', async () => {
    const findFirst = vi.fn().mockResolvedValue(sessionFixture);
    const select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      }),
    });
    const ctx = makeCtx({
      query: { classSessions: { findFirst } } as never,
      select,
    } as never);
    const caller = scheduleRouter.createCaller(ctx);
    const result = await caller.getSession({
      sessionId: SESSION_ID,
    });

    expect(result.id).toBe(sessionFixture.id);
    expect(result.enrolledCount).toBe(5);
  });

  it('throws NOT_FOUND when session does not exist', async () => {
    const findFirst = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({
      query: { classSessions: { findFirst } } as never,
    });
    const caller = scheduleRouter.createCaller(ctx);
    await expect(
      caller.getSession({ sessionId: SESSION_ID }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns 0 enrolledCount when no confirmed enrollments', async () => {
    const findFirst = vi.fn().mockResolvedValue(sessionFixture);
    const select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    });
    const ctx = makeCtx({
      query: { classSessions: { findFirst } } as never,
      select,
    } as never);
    const caller = scheduleRouter.createCaller(ctx);
    const result = await caller.getSession({
      sessionId: SESSION_ID,
    });
    expect(result.enrolledCount).toBe(0);
  });
});

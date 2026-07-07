/**
 * F3-04 — instructorsRouter test suite
 */

import { describe, it, expect, vi } from 'vitest';
import { instructorsRouter } from './instructors';
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

const instructorFixture = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: '22222222-2222-2222-2222-222222222222',
  slug: 'jane-doe',
  bio: 'Vinyasa specialist',
  specialties: ['vinyasa', 'yin'],
  imageKey: null,
  isActive: true,
  sortOrder: 0,
};

describe('instructorsRouter.list', () => {
  it('returns all active instructors', async () => {
    const findMany = vi.fn().mockResolvedValue([instructorFixture]);
    const ctx = makeCtx({
      query: { instructors: { findMany } } as never,
    });
    const caller = instructorsRouter.createCaller(ctx);
    const result = await caller.list();
    expect(result).toEqual([instructorFixture]);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when no instructors', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const ctx = makeCtx({
      query: { instructors: { findMany } } as never,
    });
    const caller = instructorsRouter.createCaller(ctx);
    const result = await caller.list();
    expect(result).toEqual([]);
  });
});

describe('instructorsRouter.getBySlug', () => {
  it('returns instructor when slug exists and isActive=true', async () => {
    const findFirst = vi.fn().mockResolvedValue(instructorFixture);
    const ctx = makeCtx({
      query: { instructors: { findFirst } } as never,
    });
    const caller = instructorsRouter.createCaller(ctx);
    const result = await caller.getBySlug({ slug: 'jane-doe' });
    expect(result).toEqual(instructorFixture);
  });

  it('throws NOT_FOUND when instructor does not exist', async () => {
    const findFirst = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({
      query: { instructors: { findFirst } } as never,
    });
    const caller = instructorsRouter.createCaller(ctx);
    await expect(
      caller.getBySlug({ slug: 'missing' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws NOT_FOUND when instructor is inactive', async () => {
    const findFirst = vi.fn().mockResolvedValue({ ...instructorFixture, isActive: false });
    const ctx = makeCtx({
      query: { instructors: { findFirst } } as never,
    });
    const caller = instructorsRouter.createCaller(ctx);
    await expect(
      caller.getBySlug({ slug: 'jane-doe' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

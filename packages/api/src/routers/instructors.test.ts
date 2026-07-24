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
  published: true,
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

  // Phase 4: published filter (SKILL §7.5.1)
  it('filters by published == true (Phase 4 — SKILL §7.5.1)', async () => {
    const findMany = vi.fn().mockResolvedValue([instructorFixture]);
    const ctx = makeCtx({
      query: { instructors: { findMany } } as never,
    });
    const caller = instructorsRouter.createCaller(ctx);
    await caller.list();
    // Verify the where clause includes published: true
    const callArg = findMany.mock.calls[0][0];
    expect(callArg.where).toBeDefined();
  });

  // V19-4: eager-load user so instructor display name is available
  // (the instructors table has only slug, not name; name lives on users)
  it('eager-loads user relation (V19-4 — unblocks V18-1, V18-4, V18-7)', async () => {
    const findMany = vi.fn().mockResolvedValue([instructorFixture]);
    const ctx = makeCtx({
      query: { instructors: { findMany } } as never,
    });
    const caller = instructorsRouter.createCaller(ctx);
    await caller.list();
    const callArg = findMany.mock.calls[0][0];
    expect(callArg.with).toEqual({ user: true });
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

  // Phase 4: published filter (SKILL §7.5.1)
  it('throws NOT_FOUND when instructor is unpublished (Phase 4 — SKILL §7.5.1)', async () => {
    const findFirst = vi.fn().mockResolvedValue({ ...instructorFixture, published: false });
    const ctx = makeCtx({
      query: { instructors: { findFirst } } as never,
    });
    const caller = instructorsRouter.createCaller(ctx);
    await expect(
      caller.getBySlug({ slug: 'jane-doe' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  // V19-4: eager-load user so instructor detail page can show user.name
  it('eager-loads user relation (V19-4 — unblocks V18-7 instructor detail)', async () => {
    const findFirst = vi.fn().mockResolvedValue(instructorFixture);
    const ctx = makeCtx({
      query: { instructors: { findFirst } } as never,
    });
    const caller = instructorsRouter.createCaller(ctx);
    await caller.getBySlug({ slug: 'jane-doe' });
    const callArg = findFirst.mock.calls[0][0];
    expect(callArg.with).toEqual({ user: true });
  });
});

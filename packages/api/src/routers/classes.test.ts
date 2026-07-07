/**
 * F3-04 — classesRouter test suite
 *
 * Tests both public (list/getBySlug) and staff (create/update) procedures.
 * Verifies FORBIDDEN when non-staff attempts staff mutations.
 */

import { describe, it, expect, vi } from 'vitest';
import { classesRouter } from './classes';
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

const CLASS_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const STYLE_ID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

const classFixture = {
  id: CLASS_ID,
  slug: 'vinyasa-flow',
  title: 'Vinyasa Flow',
  description: 'A flowing yoga class',
  styleId: STYLE_ID,
  level: 'all' as const,
  durationMinutes: 60,
  maxCapacity: 20,
  isActive: true,
  imageKey: null,
  metaTitle: null,
  metaDescription: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  style: { id: STYLE_ID, name: 'Vinyasa' },
};

describe('classesRouter.list', () => {
  it('returns all active classes with style', async () => {
    const findMany = vi.fn().mockResolvedValue([classFixture]);
    const ctx = makeCtx({
      query: { classes: { findMany } } as never,
    });
    const caller = classesRouter.createCaller(ctx);
    const result = await caller.list();
    expect(result).toEqual([classFixture]);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});

describe('classesRouter.getBySlug', () => {
  it('returns class when slug exists and isActive=true', async () => {
    const findFirst = vi.fn().mockResolvedValue(classFixture);
    const ctx = makeCtx({
      query: { classes: { findFirst } } as never,
    });
    const caller = classesRouter.createCaller(ctx);
    const result = await caller.getBySlug({ slug: 'vinyasa-flow' });
    expect(result).toEqual(classFixture);
  });

  it('throws NOT_FOUND when class is missing', async () => {
    const findFirst = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({
      query: { classes: { findFirst } } as never,
    });
    const caller = classesRouter.createCaller(ctx);
    await expect(
      caller.getBySlug({ slug: 'missing' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('classesRouter.create', () => {
  it('creates a class when caller is staff', async () => {
    const returning = vi.fn().mockResolvedValue([classFixture]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });
    const ctx = makeCtx({ insert } as never, ['staff']);
    const caller = classesRouter.createCaller(ctx);

    const result = await caller.create({
      slug: 'vinyasa-flow',
      title: 'Vinyasa Flow',
      level: 'all',
      durationMinutes: 60,
      maxCapacity: 20,
    });

    expect(result).toEqual(classFixture);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledTimes(1);
  });

  it('throws FORBIDDEN when caller is only a member', async () => {
    const insert = vi.fn();
    const ctx = makeCtx({ insert } as never, ['member']);
    const caller = classesRouter.createCaller(ctx);
    await expect(
      caller.create({
        slug: 'vinyasa-flow',
        title: 'Vinyasa Flow',
        level: 'all',
        durationMinutes: 60,
        maxCapacity: 20,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('throws INTERNAL_SERVER_ERROR when insert returns nothing', async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });
    const ctx = makeCtx({ insert } as never, ['staff']);
    const caller = classesRouter.createCaller(ctx);
    await expect(
      caller.create({
        slug: 'vinyasa-flow',
        title: 'Vinyasa Flow',
        level: 'all',
        durationMinutes: 60,
        maxCapacity: 20,
      }),
    ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
  });
});

describe('classesRouter.update', () => {
  it('updates a class when caller is staff', async () => {
    const updated = { ...classFixture, title: 'New Title' };
    const returning = vi.fn().mockResolvedValue([updated]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never, ['staff']);
    const caller = classesRouter.createCaller(ctx);

    const result = await caller.update({
      id: CLASS_ID,
      title: 'New Title',
    });

    expect(result.title).toBe('New Title');
    expect(set).toHaveBeenCalledTimes(1);
    expect(set.mock.calls[0][0]).toHaveProperty('title', 'New Title');
    expect(set.mock.calls[0][0]).toHaveProperty('updatedAt');
  });

  it('throws NOT_FOUND when class does not exist', async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never, ['staff']);
    const caller = classesRouter.createCaller(ctx);
    await expect(
      caller.update({
        id: '00000000-0000-0000-0000-000000000000',
        title: 'New Title',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws FORBIDDEN when caller is unauthenticated', async () => {
    const update = vi.fn();
    const ctx = makeCtx({ update } as never, null);
    const caller = classesRouter.createCaller(ctx);
    await expect(
      caller.update({
        id: CLASS_ID,
        title: 'New Title',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(update).not.toHaveBeenCalled();
  });
});

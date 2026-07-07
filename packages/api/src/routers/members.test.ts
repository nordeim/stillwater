/**
 * F3-04 — membersRouter test suite
 *
 * All procedures require a session. Tests verify:
 *   - profile fetch returns the linked member
 *   - NOT_FOUND when session.user.memberId is null
 *   - updateProfile only patches allowed fields
 *   - UNAUTHORIZED when no session
 */

import { describe, it, expect, vi } from 'vitest';
import { membersRouter } from './members';
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

const memberFixture = {
  id: 'member-1',
  userId: '22222222-2222-2222-2222-222222222222',
  displayName: 'Jane Doe',
  phone: '+1-555-0100',
  dateOfBirth: null,
  emergencyContact: null,
  emergencyPhone: null,
  notes: null,
  joinedAt: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
  stripeCustomerId: null,
};

describe('membersRouter.getProfile', () => {
  it('returns the linked member profile', async () => {
    const findFirst = vi.fn().mockResolvedValue(memberFixture);
    const ctx = makeCtx({
      query: { members: { findFirst } } as never,
    });
    const caller = membersRouter.createCaller(ctx);
    const result = await caller.getProfile();
    expect(result).toEqual(memberFixture);
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('throws NOT_FOUND when session.user.memberId is null', async () => {
    const findFirst = vi.fn();
    const ctx = makeCtx(
      { query: { members: { findFirst } } as never },
      { memberId: null },
    );
    const caller = membersRouter.createCaller(ctx);
    await expect(caller.getProfile()).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND when member row is missing', async () => {
    const findFirst = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx({
      query: { members: { findFirst } } as never,
    });
    const caller = membersRouter.createCaller(ctx);
    await expect(caller.getProfile()).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws UNAUTHORIZED when no session', async () => {
    const ctx = makeCtx({}, { roles: null });
    const caller = membersRouter.createCaller(ctx);
    await expect(caller.getProfile()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('membersRouter.updateProfile', () => {
  it('patches only provided fields', async () => {
    const updated = { ...memberFixture, displayName: 'New Name' };
    const returning = vi.fn().mockResolvedValue([updated]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never);
    const caller = membersRouter.createCaller(ctx);

    const result = await caller.updateProfile({ displayName: 'New Name' });

    expect(result.displayName).toBe('New Name');
    expect(set.mock.calls[0][0]).toEqual({ displayName: 'New Name' });
  });

  it('throws NOT_FOUND when memberId is null', async () => {
    const update = vi.fn();
    const ctx = makeCtx({ update } as never, { memberId: null });
    const caller = membersRouter.createCaller(ctx);
    await expect(
      caller.updateProfile({ displayName: 'New Name' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(update).not.toHaveBeenCalled();
  });

  it('throws NOT_FOUND when member row is missing', async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const ctx = makeCtx({ update } as never);
    const caller = membersRouter.createCaller(ctx);
    await expect(
      caller.updateProfile({ displayName: 'New Name' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('membersRouter.getHistory', () => {
  it('returns enrollments with session.class eager-loaded', async () => {
    const enrollmentFixture = {
      id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
      sessionId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      memberId: 'member-1',
      status: 'confirmed',
      enrolledAt: new Date('2026-07-01'),
      cancelledAt: null,
      checkedInAt: null,
      cancellationReason: null,
      packageCreditId: null,
      session: {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        class: { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', title: 'Vinyasa' },
      },
    };
    const findMany = vi.fn().mockResolvedValue([enrollmentFixture]);
    const ctx = makeCtx({
      query: { enrollments: { findMany } } as never,
    });
    const caller = membersRouter.createCaller(ctx);
    const result = await caller.getHistory();
    expect(result).toEqual([enrollmentFixture]);
  });

  it('throws NOT_FOUND when memberId is null', async () => {
    const findMany = vi.fn();
    const ctx = makeCtx(
      { query: { enrollments: { findMany } } as never },
      { memberId: null },
    );
    const caller = membersRouter.createCaller(ctx);
    await expect(caller.getHistory()).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(findMany).not.toHaveBeenCalled();
  });
});

/**
 * F3-17 — Server-side tRPC caller test suite
 *
 * Verifies the apiCaller returns a tRPC caller with all 10 routers.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock server-only (throws in vitest)
vi.mock('server-only', () => ({}));

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock @stillwater/api
vi.mock('@stillwater/api', () => ({
  appRouter: {
    createCaller: vi.fn().mockReturnValue({
      schedule: { getWeek: vi.fn(), getSession: vi.fn() },
      classes: { list: vi.fn(), getBySlug: vi.fn() },
      sessions: { listByDateRange: vi.fn() },
      bookings: { book: vi.fn(), cancel: vi.fn(), checkIn: vi.fn() },
      waitlist: { join: vi.fn(), leave: vi.fn(), getMyPosition: vi.fn() },
      members: { getProfile: vi.fn(), getHistory: vi.fn() },
      instructors: { list: vi.fn(), getBySlug: vi.fn() },
      memberships: { getPlans: vi.fn() },
      payments: { getInvoices: vi.fn() },
      admin: { getDashboard: vi.fn() },
    }),
  },
  createContext: vi.fn().mockResolvedValue({
    db: {},
    session: null,
    jobs: { trigger: vi.fn() },
    redis: {},
    req: new Request('http://localhost'),
  }),
}));

import { apiCaller } from './server';

describe('F3-17: Server-side tRPC caller', () => {
  it('apiCaller() returns object with all 10 router keys', async () => {
    const caller = await apiCaller();
    expect(caller).toHaveProperty('schedule');
    expect(caller).toHaveProperty('classes');
    expect(caller).toHaveProperty('sessions');
    expect(caller).toHaveProperty('bookings');
    expect(caller).toHaveProperty('waitlist');
    expect(caller).toHaveProperty('members');
    expect(caller).toHaveProperty('instructors');
    expect(caller).toHaveProperty('memberships');
    expect(caller).toHaveProperty('payments');
    expect(caller).toHaveProperty('admin');
  });

  it('apiCaller() returns caller with schedule.getWeek as a function', async () => {
    const caller = await apiCaller();
    expect(typeof caller.schedule.getWeek).toBe('function');
  });
});

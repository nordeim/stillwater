/**
 * F3-02 — Context builder + F3-03 — Rate limit middleware
 * Combined test suite (RED phase)
 */

import { describe, it, expect, vi } from 'vitest';

// Mock infrastructure clients before importing
vi.mock('@stillwater/db', () => ({
  db: { query: {}, execute: vi.fn(), transaction: vi.fn(), select: vi.fn(), insert: vi.fn() },
}));
vi.mock('@stillwater/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock('@upstash/redis', () => {
  return {
    Redis: class MockRedis {
      get = vi.fn().mockResolvedValue(null);
      set = vi.fn().mockResolvedValue('OK');
      pipeline = vi.fn();
    },
  };
});
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    class MockRatelimit {
      limit = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 });
    },
    { slidingWindow: vi.fn().mockReturnValue({}) },
  ),
}));
vi.mock('@trigger.dev/sdk', () => ({
  TriggerClient: class MockTriggerClient {
    trigger = vi.fn().mockResolvedValue({ id: 'mock' });
  },
}));

import { createContext } from './context';

describe('F3-02: Context builder', () => {
  it('createContext returns object with db, session, jobs, redis, req keys', async () => {
    const req = new Request('http://localhost:3000/api/trpc');
    const ctx = await createContext({ req });
    expect(ctx).toHaveProperty('db');
    expect(ctx).toHaveProperty('session');
    expect(ctx).toHaveProperty('jobs');
    expect(ctx).toHaveProperty('redis');
    expect(ctx).toHaveProperty('req');
    expect(ctx.req).toBe(req);
  });

  it('session is null when no auth cookie', async () => {
    const { auth } = await import('@stillwater/auth');
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never);
    const req = new Request('http://localhost:3000/api/trpc');
    const ctx = await createContext({ req });
    expect(ctx.session).toBeNull();
  });
});

describe('F3-03: Rate limit middleware factory', () => {
  it('rateLimit is a function that returns middleware', async () => {
    const { rateLimit } = await import('./middleware/rateLimit');
    expect(typeof rateLimit).toBe('function');
    const middleware = rateLimit({ limit: 10, window: '1 m' });
    expect(middleware).toBeDefined();
  });
});

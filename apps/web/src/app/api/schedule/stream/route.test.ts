import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the server-only module
vi.mock('server-only', () => ({}));

// Mock the tRPC server caller
const mockGetSession = vi.fn();
vi.mock('@/lib/trpc/server', () => ({
  apiCaller: vi.fn(() =>
    Promise.resolve({
      schedule: {
        getSession: mockGetSession,
      },
    }),
  ),
}));

describe('SSE schedule stream endpoint', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.useRealTimers();
  });

  it('exports maxDuration = 300 (5 min, per SKILL §9.9 Gotcha 8)', async () => {
    const mod = await import('./route');
    expect(mod.maxDuration).toBe(300);
  });

  it('does NOT export dynamic = force-dynamic (SKILL §9.1 Gotcha 7)', async () => {
    const mod = await import('./route');
    // dynamic should not be exported at all (SSE routes are dynamic by default)
    expect((mod as Record<string, unknown>).dynamic).toBeUndefined();
  });

  it('returns 200 with text/event-stream content type', async () => {
    mockGetSession.mockResolvedValue({
      id: 'session-1',
      enrolledCount: 5,
      class: { maxCapacity: 10 },
      room: { capacity: 10 },
      overrideCapacity: null,
    });

    const { GET } = await import('./route');
    const req = new Request('http://localhost:3000/api/schedule/stream?sessionId=00000000-0000-4000-8000-000000000001');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    expect(res.headers.get('cache-control')).toContain('no-cache');
    expect(res.headers.get('connection')).toBe('keep-alive');
  });

  it('returns 400 when sessionId query param is missing', async () => {
    const { GET } = await import('./route');
    const req = new Request('http://localhost:3000/api/schedule/stream');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when sessionId is not a valid UUID', async () => {
    const { GET } = await import('./route');
    const req = new Request('http://localhost:3000/api/schedule/stream?sessionId=not-a-uuid');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns initial seat availability event immediately', async () => {
    mockGetSession.mockResolvedValue({
      id: 'session-1',
      enrolledCount: 5,
      class: { maxCapacity: 10 },
      room: { capacity: 10 },
      overrideCapacity: null,
    });

    const { GET } = await import('./route');
    const req = new Request('http://localhost:3000/api/schedule/stream?sessionId=00000000-0000-4000-8000-000000000001');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.body).not.toBeNull();
    // The response is a ReadableStream — verify it's readable
    expect(typeof res.body?.getReader).toBe('function');
  });

  it('returns 404 when session is not found', async () => {
    mockGetSession.mockRejectedValue(new Error('NOT_FOUND'));

    const { GET } = await import('./route');
    const req = new Request('http://localhost:3000/api/schedule/stream?sessionId=00000000-0000-4000-8000-000000000001');
    const res = await GET(req);

    expect(res.status).toBe(404);
  });

  // v8 A1 fix: getSeatAvailability must log errors instead of silently
  // swallowing them. Without this, a DB connectivity issue affecting the
  // SSE endpoint would be invisible in Sentry.
  it('v8 A1 fix: logs errors when getSeatAvailability fails (does not silently swallow)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGetSession.mockRejectedValue(new Error('DB unreachable'));

    const { GET } = await import('./route');
    const req = new Request('http://localhost:3000/api/schedule/stream?sessionId=00000000-0000-4000-8000-000000000001');
    await GET(req);

    // console.error should have been called with the SSE error context
    expect(consoleErrorSpy).toHaveBeenCalled();
    const callArgs = consoleErrorSpy.mock.calls[0];
    // noUncheckedIndexedAccess: callArgs may be undefined — guard with ?
    // First arg should mention SSE + getSeatAvailability for Sentry triage
    expect(String(callArgs?.[0] ?? '')).toMatch(/SSE|getSeatAvailability|seat/i);
    consoleErrorSpy.mockRestore();
  });

  // V17-10 fix: SSE endpoint must enforce per-IP rate limiting to prevent
  // DoS via excessive concurrent connections. Each connection polls the DB
  // every 10s for up to 5 min — 100 concurrent connections = 600 DB
  // queries/min. Without rate limiting, a malicious client could exhaust
  // the DB connection pool.
  describe('V17-10: per-IP rate limiting', () => {
    beforeEach(() => {
      // Reset the in-memory counter between tests
      vi.resetModules();
    });

    it('returns 429 when per-IP concurrent connection limit is exceeded (V17-10)', async () => {
      mockGetSession.mockResolvedValue({
        id: 'session-1',
        enrolledCount: 5,
        class: { maxCapacity: 10 },
        room: { capacity: 10 },
        overrideCapacity: null,
      });

      const { GET, MAX_CONCURRENT_SSE_PER_IP = 5 } = await import('./route');

      // Open MAX_CONCURRENT_SSE_PER_IP connections from the same IP
      const reqs = Array.from({ length: MAX_CONCURRENT_SSE_PER_IP }, () =>
        new Request('http://localhost:3000/api/schedule/stream?sessionId=00000000-0000-4000-8000-000000000001', {
          headers: { 'x-forwarded-for': '203.0.113.1' },
        }),
      );
      const responses = await Promise.all(reqs.map((r) => GET(r)));
      for (const res of responses) {
        expect(res.status).toBe(200);
      }

      // The next connection from the same IP should be rejected
      const overflowReq = new Request('http://localhost:3000/api/schedule/stream?sessionId=00000000-0000-4000-8000-000000000001', {
        headers: { 'x-forwarded-for': '203.0.113.1' },
      });
      const overflowRes = await GET(overflowReq);
      expect(overflowRes.status).toBe(429);
      expect(overflowRes.headers.get('retry-after')).toBeTruthy();
    });

    it('allows connections from different IPs independently (V17-10)', async () => {
      mockGetSession.mockResolvedValue({
        id: 'session-1',
        enrolledCount: 5,
        class: { maxCapacity: 10 },
        room: { capacity: 10 },
        overrideCapacity: null,
      });

      const { GET, MAX_CONCURRENT_SSE_PER_IP = 5 } = await import('./route');

      // Open MAX_CONCURRENT_SSE_PER_IP connections from IP A
      const reqsA = Array.from({ length: MAX_CONCURRENT_SSE_PER_IP }, () =>
        new Request('http://localhost:3000/api/schedule/stream?sessionId=00000000-0000-4000-8000-000000000001', {
          headers: { 'x-forwarded-for': '203.0.113.1' },
        }),
      );
      await Promise.all(reqsA.map((r) => GET(r)));

      // A connection from IP B should still succeed
      const reqB = new Request('http://localhost:3000/api/schedule/stream?sessionId=00000000-0000-4000-8000-000000000001', {
        headers: { 'x-forwarded-for': '198.51.100.1' },
      });
      const resB = await GET(reqB);
      expect(resB.status).toBe(200);
    });

    it('exports MAX_CONCURRENT_SSE_PER_IP constant (V17-10)', async () => {
      const mod = await import('./route');
      expect(mod.MAX_CONCURRENT_SSE_PER_IP).toBeDefined();
      expect(typeof mod.MAX_CONCURRENT_SSE_PER_IP).toBe('number');
      expect(mod.MAX_CONCURRENT_SSE_PER_IP).toBeGreaterThanOrEqual(1);
    });
  });
});

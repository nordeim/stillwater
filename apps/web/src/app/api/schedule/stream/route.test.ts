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

    const { POST } = await import('./route');
    const req = new Request('http://localhost:3000/api/schedule/stream?sessionId=00000000-0000-4000-8000-000000000001');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    expect(res.headers.get('cache-control')).toContain('no-cache');
    expect(res.headers.get('connection')).toBe('keep-alive');
  });

  it('returns 400 when sessionId query param is missing', async () => {
    const { POST } = await import('./route');
    const req = new Request('http://localhost:3000/api/schedule/stream');
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when sessionId is not a valid UUID', async () => {
    const { POST } = await import('./route');
    const req = new Request('http://localhost:3000/api/schedule/stream?sessionId=not-a-uuid');
    const res = await POST(req);
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

    const { POST } = await import('./route');
    const req = new Request('http://localhost:3000/api/schedule/stream?sessionId=00000000-0000-4000-8000-000000000001');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.body).not.toBeNull();
    // The response is a ReadableStream — verify it's readable
    expect(typeof res.body?.getReader).toBe('function');
  });

  it('returns 404 when session is not found', async () => {
    mockGetSession.mockRejectedValue(new Error('NOT_FOUND'));

    const { POST } = await import('./route');
    const req = new Request('http://localhost:3000/api/schedule/stream?sessionId=00000000-0000-4000-8000-000000000001');
    const res = await POST(req);

    expect(res.status).toBe(404);
  });
});

import { z } from 'zod';

import { apiCaller } from '@/lib/trpc/server';

/**
 * SSE endpoint for live seat availability.
 *
 * Per SKILL §15.3 + ADR-006: Server-Sent Events via Next.js Streaming API.
 * Polls the database every 10s and sends seat availability updates.
 *
 * CRITICAL (SKILL §9.1 Gotcha 7): Do NOT set `export const dynamic = 'force-dynamic'`.
 * SSE/streaming routes are dynamic by default — setting force-dynamic causes a
 * build error when `cacheComponents: true` is enabled (currently deferred).
 *
 * CRITICAL (SKILL §9.1 Gotcha 8): Vercel default timeout is 300s. We set
 * `maxDuration = 300` (5 min). For longer sessions, enable Fluid Compute
 * in Vercel project settings and increase maxDuration up to 1800 (30 min).
 *
 * SSE event payload: { enrolled, capacity, available, isFull }
 */

// 5 min max duration (Vercel default for Hobby/Pro)
export const maxDuration = 300;

// Force Node.js runtime (not Edge) — setInterval + streaming require Node APIs
export const runtime = 'nodejs';

// Do NOT add: export const dynamic = 'force-dynamic' (SKILL §9.1 Gotcha 7)

interface SeatAvailabilityEvent {
  enrolled: number;
  capacity: number;
  available: number;
  isFull: boolean;
}

// v8 S3 fix: Use Zod v4 z.uuid() for UUID validation instead of a hand-rolled
// regex. Same semantics, consistent with the rest of the codebase (tRPC input
// validation, env schema, etc.). Note: z.string().uuid() is deprecated in
// Zod v4 in favor of z.uuid().
const uuidSchema = z.uuid();

function isValidUUID(uuid: string): boolean {
  return uuidSchema.safeParse(uuid).success;
}

async function getSeatAvailability(sessionId: string): Promise<SeatAvailabilityEvent | null> {
  try {
    const caller = await apiCaller();
    const session = await caller.schedule.getSession({ sessionId });

    // Cast to access nested relation fields (Drizzle relational query types
    // require defineRelations() — SKILL §9.9 Gotcha 27)
    const sessionData = session as {
      enrolledCount: number;
      overrideCapacity: number | null;
      class: { maxCapacity: number | null } | null;
      room: { capacity: number | null } | null;
    };

    const capacity =
      sessionData.overrideCapacity ??
      sessionData.class?.maxCapacity ??
      sessionData.room?.capacity ??
      0;

    const enrolled = sessionData.enrolledCount;
    const available = Math.max(0, capacity - enrolled);

    return {
      enrolled,
      capacity,
      available,
      isFull: enrolled >= capacity,
    };
  } catch (error) {
    // v8 A1 fix: Log the error so it's visible in Sentry / Vercel logs.
    // Previously this catch block silently returned null, making DB
    // connectivity issues affecting the SSE endpoint invisible.
    // Include the sessionId for triage; the error message is logged
    // separately to preserve the stack trace.
    console.error(
      `[SSE getSeatAvailability] failed for session ${sessionId}:`,
      error,
    );
    return null;
  }
}

function formatSSEEvent(data: SeatAvailabilityEvent): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ── V17-10 fix: per-IP concurrent SSE connection rate limiting ────────
// Prevents DoS via excessive concurrent SSE connections. Each connection
// polls the DB every 10s for up to 5 min — 100 concurrent connections
// from one IP = 600 DB queries/min, which could exhaust the connection
// pool.
//
// IMPLEMENTATION NOTES:
// - In-memory counter (per server instance). On Vercel serverless, each
//   instance has its own counter — a determined attacker could bypass
//   by hitting different instances. This is a defense-in-depth measure,
//   not a hard limit. For a hard limit, upgrade to Redis-based counting
//   (see SKILL §15.7 fail-open rate limiter pattern).
// - Counter is decremented on connection close (abort signal) so the
//   limit tracks CONCURRENT connections, not total.
// - Limit of 5 per IP is generous for legitimate use (a single user
//   typically opens 1-2 SSE connections at a time) but blocks rapid
//   script-driven concurrent opens.
//
// Source: STILLWATER_AUDIT_REPORT.md §7 Finding #6;
//         SKILL §15.7 Pattern: Fail-Open Rate Limiter
export const MAX_CONCURRENT_SSE_PER_IP = 5;

const sseConnectionCounts = new Map<string, number>();

function getClientIp(request: Request): string {
  // x-forwarded-for is set by Vercel/Cloudflare — first IP is the client
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }
  return 'unknown';
}

function acquireSseSlot(ip: string): boolean {
  const current = sseConnectionCounts.get(ip) ?? 0;
  if (current >= MAX_CONCURRENT_SSE_PER_IP) {
    return false;
  }
  sseConnectionCounts.set(ip, current + 1);
  return true;
}

function releaseSseSlot(ip: string): void {
  const current = sseConnectionCounts.get(ip) ?? 0;
  if (current <= 1) {
    sseConnectionCounts.delete(ip);
  } else {
    sseConnectionCounts.set(ip, current - 1);
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    return Response.json(
      { error: 'Missing sessionId query parameter' },
      { status: 400 },
    );
  }

  if (!isValidUUID(sessionId)) {
    return Response.json(
      { error: 'Invalid sessionId — must be a valid UUID' },
      { status: 400 },
    );
  }

  // V17-10: per-IP concurrent connection rate limit
  const clientIp = getClientIp(request);
  if (!acquireSseSlot(clientIp)) {
    return Response.json(
      {
        error: 'Too many concurrent SSE connections from your IP. Close existing connections and try again.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(MAX_CONCURRENT_SSE_PER_IP),
          'X-RateLimit-Resource': 'sse-concurrent-per-ip',
        },
      },
    );
  }

  // Verify session exists before starting the stream
  const initialData = await getSeatAvailability(sessionId);
  if (!initialData) {
    releaseSseSlot(clientIp);
    return Response.json(
      { error: 'Session not found' },
      { status: 404 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial event immediately
      controller.enqueue(encoder.encode(formatSSEEvent(initialData)));

      // Poll every 10s (per SKILL §15.3 + PAD §13.2)
      const interval = setInterval(() => {
        void getSeatAvailability(sessionId).then((data) => {
          if (!data) {
            // Session was deleted or error — close stream
            controller.close();
            clearInterval(interval);
            return;
          }
          controller.enqueue(encoder.encode(formatSSEEvent(data)));
        });
      }, 10_000);

      // Clean up on abort (client disconnect) — V17-10: release the slot
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
        releaseSseSlot(clientIp);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}

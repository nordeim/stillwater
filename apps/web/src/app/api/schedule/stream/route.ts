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

// Do NOT add: export const dynamic = 'force-dynamic' (SKILL §9.1 Gotcha 7)

interface SeatAvailabilityEvent {
  enrolled: number;
  capacity: number;
  available: number;
  isFull: boolean;
}

function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
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
  } catch {
    return null;
  }
}

function formatSSEEvent(data: SeatAvailabilityEvent): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request): Promise<Response> {
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

  // Verify session exists before starting the stream
  const initialData = await getSeatAvailability(sessionId);
  if (!initialData) {
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

      // Clean up on abort (client disconnect)
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
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

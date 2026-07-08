'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * SSE event payload from /api/schedule/stream.
 * Matches the server-side SeatAvailabilityEvent type.
 */
export interface SeatAvailabilityEvent {
  enrolled: number;
  capacity: number;
  available: number;
  isFull: boolean;
}

/**
 * useSessionAvailability — subscribes to SSE for live seat counts.
 *
 * Per SKILL §6.2: SSE subscription for live seat count.
 * - Connects to /api/schedule/stream?sessionId=X
 * - 3 reconnection attempts with exponential backoff (1s → 2s → 4s)
 * - Cleans up on unmount (non-negotiable)
 * - Returns { data, isLoading, error }
 *
 * Usage:
 *   const { data, isLoading, error } = useSessionAvailability(sessionId);
 *   if (isLoading) return <Spinner />;
 *   if (error) return <ErrorState />;
 *   return <SeatAvailability data={data} />;
 */

const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_RECONNECT_DELAY = 1000; // 1s

export function useSessionAvailability(sessionId: string): {
  data: SeatAvailabilityEvent | null;
  isLoading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<SeatAvailabilityEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCancelledRef = useRef(false);

  const connect = useCallback(() => {
    if (!sessionId || isCancelledRef.current) return;

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const eventSource = new EventSource(
      `/api/schedule/stream?sessionId=${encodeURIComponent(sessionId)}`,
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const rawData: unknown = JSON.parse(String(event.data));
        const parsed = rawData as SeatAvailabilityEvent;
        setData(parsed);
        setIsLoading(false);
        setError(null);
        // Reset reconnection attempts on successful message
        reconnectAttemptsRef.current = 0;
      } catch {
        // Ignore malformed messages
      }
    };

    eventSource.onerror = () => {
      eventSource.close();

      if (isCancelledRef.current) return;

      // Exponential backoff: 1s → 2s → 4s
      const attempt = reconnectAttemptsRef.current;
      if (attempt < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, attempt);
        reconnectAttemptsRef.current++;
        reconnectTimerRef.current = setTimeout(() => {
          if (!isCancelledRef.current) {
            connect();
          }
        }, delay);
      } else {
        // Max attempts reached — set error state
        setError(new Error('SSE connection failed after 3 attempts'));
        setIsLoading(false);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    isCancelledRef.current = false;
    reconnectAttemptsRef.current = 0;
    setIsLoading(true);
    setData(null);
    setError(null);

    if (sessionId) {
      connect();
    } else {
      setIsLoading(false);
    }

    return () => {
      // Cleanup — non-negotiable per SKILL §6.2
      isCancelledRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [sessionId, connect]);

  return { data, isLoading, error };
}

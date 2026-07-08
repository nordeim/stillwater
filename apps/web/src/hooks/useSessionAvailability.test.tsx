// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock EventSource globally
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  listeners: Record<string, EventListener[]> = {};
  readyState = 0;
  closeCalled = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  close() {
    this.closeCalled = true;
    this.readyState = 2;
  }

  // Test helper: simulate server sending an event
  emitMessage(data: unknown) {
    const event = new MessageEvent('message', { data: JSON.stringify(data) });
    // Call both onmessage handler and addEventListener listeners
    this.onmessage?.(event);
    this.listeners.message?.forEach((l) => { l(event); });
  }

  emitError() {
    const event = new Event('error');
    this.onerror?.(event);
    this.listeners.error?.forEach((l) => { l(event); });
  }
}

import { useSessionAvailability } from './useSessionAvailability';

describe('useSessionAvailability hook', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    (globalThis as Record<string, unknown>).EventSource = MockEventSource;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial loading state', () => {
    const { result } = renderHook(() => useSessionAvailability('test-session-id'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('creates EventSource to /api/schedule/stream?sessionId=X', () => {
    renderHook(() => useSessionAvailability('test-session-id'));
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0]!.url).toContain('/api/schedule/stream');
    expect(MockEventSource.instances[0]!.url).toContain('sessionId=test-session-id');
  });

  it('updates data when SSE message is received', () => {
    const { result } = renderHook(() => useSessionAvailability('test-session-id'));
    const eventSource = MockEventSource.instances[0]!;

    act(() => {
      eventSource.emitMessage({ enrolled: 5, capacity: 10, available: 5, isFull: false });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({ enrolled: 5, capacity: 10, available: 5, isFull: false });
    expect(result.current.error).toBeNull();
  });

  it('sets error when SSE error occurs after max reconnection attempts', async () => {
    const { result } = renderHook(() => useSessionAvailability('test-session-id'));

    // The hook tries 3 reconnection attempts before setting error.
    // Each attempt has exponential backoff: 1s → 2s → 4s.
    // We need to trigger 4 errors (initial + 3 reconnects) and advance timers.
    vi.useFakeTimers();

    for (let i = 0; i < 4; i++) {
      const eventSource = MockEventSource.instances[MockEventSource.instances.length - 1];
      act(() => {
        eventSource?.emitError();
      });
      // Advance past the reconnect delay
      act(() => {
        vi.advanceTimersByTime(5000);
      });
    }

    vi.useRealTimers();

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('closes EventSource on unmount (cleanup)', () => {
    const { unmount } = renderHook(() => useSessionAvailability('test-session-id'));
    const eventSource = MockEventSource.instances[0]!;

    unmount();

    expect(eventSource.closeCalled).toBe(true);
  });

  it('does not create EventSource when sessionId is empty', () => {
    renderHook(() => useSessionAvailability(''));
    expect(MockEventSource.instances).toHaveLength(0);
  });
});

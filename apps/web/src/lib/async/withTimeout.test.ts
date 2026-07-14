import { describe, it, expect, vi } from 'vitest';

import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
  it('returns the resolved value when the promise settles before the timeout', async () => {
    const fast = Promise.resolve('fast-value');
    const result = await withTimeout(fast, 1_000, 'fallback');
    expect(result).toBe('fast-value');
  });

  it('returns the fallback when the promise hangs beyond the timeout', async () => {
    const hanging = new Promise<string>(() => {
      // Never resolves, never rejects — simulates a hung fetch()
      // (intentionally empty executor — the whole point is that it never settles)
    });
    const result = await withTimeout(hanging, 50, 'fallback');
    expect(result).toBe('fallback');
  });

  it('returns the fallback when the promise rejects (catch is upstream)', async () => {
    // In practice, marketing pages wrap the promise in .catch(() => []) before
    // passing to withTimeout. Here we test the raw rejection path: withTimeout
    // does NOT swallow rejections — the rejection wins the race if it happens
    // before the timeout.
    const rejecting = Promise.reject(new Error('db down'));
    await expect(withTimeout(rejecting, 1_000, 'fallback')).rejects.toThrow(
      'db down',
    );
  });

  it('clears the timeout timer after the promise settles (no leak)', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const fast = Promise.resolve('value');
    await withTimeout(fast, 1_000, 'fallback');
    // clearTimeout is called in the finally block regardless of outcome
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('handles complex fallback types (arrays, objects, null)', async () => {
    // Intentionally never-settling executors simulate hung fetch() calls
    const hanging = new Promise<unknown[]>(() => undefined);
    const arr = await withTimeout(hanging, 50, []);
    expect(arr).toEqual([]);

    const hangingObj = new Promise<{ id: string } | null>(() => undefined);
    const obj = await withTimeout(hangingObj, 50, null);
    expect(obj).toBeNull();
  });
});

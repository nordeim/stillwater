/**
 * F8-11 — attendance-summary worker tests (JOB-011)
 *
 * Tests the attendance-summary Trigger.dev task.
 *
 * Mock strategy:
 * - @trigger.dev/sdk: task() returns its config (so we can access .run)
 * - @stillwater/db: not used (v1 simplified no-op) — mocked for consistency
 *
 * Per MEP F8-11: 3 tests
 * (1) Returns success (v1 simplified — no DB writes)
 * (2) Has correct task config (60s budget, 2 retries)
 * (3) Has correct task id
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: unknown) => config),
}));

vi.mock('@stillwater/db', () => ({
  db: {
    query: {},
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('attendance-summary (JOB-011)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success (v1 simplified — no DB writes)', async () => {
    const { attendanceSummary } = await import('./attendance-summary');

    const result = await attendanceSummary.run();

    expect(result.processed).toBe(true);
    expect(result.timestamp).toEqual(expect.any(String));
    // Verify timestamp is a valid ISO date string
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('has correct task config (60s budget, 2 retries)', async () => {
    const { attendanceSummary } = await import('./attendance-summary');
    expect(attendanceSummary.maxDuration).toBe(60);
    expect(attendanceSummary.retry).toEqual({
      maxAttempts: 2,
      minTimeoutInMs: 1000,
      factor: 2,
      randomize: true,
    });
  });

  it('has correct task id', async () => {
    const { attendanceSummary } = await import('./attendance-summary');
    expect(attendanceSummary.id).toBe('attendance-summary');
  });
});

/**
 * F8-11 — attendance-summary Trigger.dev task
 *
 * Trigger: Scheduled cron (Daily 23:00 PT)
 * CPU Budget: 60s
 * Retries: 2 (cron-triggered and idempotent — fewer retries)
 *
 * For v1, this is a simplified version that just returns success. The full
 * implementation would query sessions that ended >30min ago, mark
 * un-checked-in enrollments as 'no_show', and mark sessions as 'completed'.
 * For v1, return a summary count.
 *
 * The cron schedule (Daily 23:00 PT) is configured in the Trigger.dev
 * dashboard — this task is invoked with no payload.
 *
 * Source: MEP F8-11, PAD §17.1, ADR-010.
 */

import { task } from '@trigger.dev/sdk';

export const attendanceSummary = task({
  id: 'attendance-summary',
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 1000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 60,
  run: async () => {
    // v1: simplified — returns success. Full no-show marking in v2.
    // The cron schedule (Daily 23:00 PT) is configured in Trigger.dev dashboard.
    return { processed: true, timestamp: new Date().toISOString() };
  },
});

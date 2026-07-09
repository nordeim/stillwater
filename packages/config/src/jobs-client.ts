/**
 * Shared Trigger.dev client singleton
 *
 * Per SKILL §15.20: infrastructure clients use process.env directly with
 * null fallback (NOT Zod env module which throws in browser context).
 *
 * This module is importable from both:
 *   - packages/api (tRPC context) — triggers jobs from mutations
 *   - packages/payments (webhook handler) — triggers jobs from Stripe events
 *
 * Per ADR-007: Trigger.dev v4 cloud-hosted. SDK root import.
 *
 * Source: MEP Phase 8 Day 4, PAD §17.2, ADR-007, SKILL §15.20.
 */

import { tasks } from '@trigger.dev/sdk';

/**
 * Jobs client interface — what tRPC context + webhook handlers see.
 * The trigger function enqueues a task by ID with a typed payload.
 */
export interface JobsClient {
  trigger: (task: string, payload: unknown) => Promise<{ id: string }>;
}

// Lazy singleton — created on first use
let cachedClient: JobsClient | null = null;

/**
 * Get the shared Trigger.dev jobs client.
 *
 * Returns a stub client (console.warn + no-op) when TRIGGER_SECRET_KEY
 * is not set — this happens in tests, builds, and preview environments
 * without Trigger.dev configured.
 *
 * Per SKILL §15.20: infrastructure clients use process.env directly.
 */
export function getJobsClient(): JobsClient {
  const key = process.env.TRIGGER_SECRET_KEY;

  if (!key || key === 'tr_dev_placeholder') {
    // Null fallback: return a stub that logs warnings (not in test env)
    return {
      trigger: async (task: string, _payload: unknown) => {
        if (process.env.NODE_ENV !== 'test') {
          console.warn(
            `[jobs] trigger('${task}') called — TRIGGER_SECRET_KEY not configured (stub mode)`,
          );
        }
        return { id: 'stub' };
      },
    };
  }

  // Cache the real client
  if (cachedClient) return cachedClient;

  // Use the tasks.trigger() API from @trigger.dev/sdk v4
  cachedClient = {
    trigger: async (task: string, payload: unknown) => {
      const result = await tasks.trigger(task, payload as Record<string, unknown>);
      return { id: result.id };
    },
  };

  return cachedClient;
}

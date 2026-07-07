/**
 * F3-02 — Context builder
 *
 * Runs on every request, assembles db + session + jobs + redis.
 * Singletons (redis, jobs) are created once at module load, not per request.
 *
 * Source: MEP Phase 3 F3-02, PAD §8.5, SKILL §3.4 (infrastructure clients use process.env).
 */

import { db } from '@stillwater/db';
import { auth } from '@stillwater/auth';
import { Redis } from '@upstash/redis';
import type { TRPCContext } from './trpc';

// Singletons — created once at module load (not per request)
const redis = new Redis({
  url: process.env['UPSTASH_REDIS_REST_URL'] ?? 'https://placeholder.upstash.io',
  token: process.env['UPSTASH_REDIS_REST_TOKEN'] ?? 'placeholder',
});

// Jobs client — stub until Phase 8 (Trigger.dev tasks exist)
const jobs = {
  trigger: async (_task: string, _payload: unknown) => {
    // Phase 8 will replace this with real TriggerClient
    if (process.env['NODE_ENV'] !== 'test') {
      console.warn(`[jobs] trigger('${_task}') called — Trigger.dev integration pending Phase 8`);
    }
    return { id: 'pending' };
  },
};

export async function createContext({ req }: { req: Request }): Promise<TRPCContext> {
  const session = await auth.api.getSession({ headers: req.headers });
  return { db, session: session as TRPCContext['session'], jobs, redis, req };
}

/**
 * F3-02 — Context builder
 *
 * Runs on every request, assembles db + session + jobs + redis.
 * Singletons (redis, jobs) are created once at module load, not per request.
 *
 * Phase 8: Jobs client now uses real TriggerClient (with stub fallback
 * when TRIGGER_SECRET_KEY is not set — tests, builds, preview envs).
 *
 * Source: MEP Phase 3 F3-02 + Phase 8 Day 4, PAD §8.5, SKILL §15.20.
 */

import { db } from '@stillwater/db';
import { auth } from '@stillwater/auth';
import { Redis } from '@upstash/redis';
import { getJobsClient } from '@stillwater/config/jobs-client';
import type { TRPCContext } from './trpc';

// Singletons — created once at module load (not per request)
const redis = new Redis({
  url: process.env['UPSTASH_REDIS_REST_URL'] ?? 'https://placeholder.upstash.io',
  token: process.env['UPSTASH_REDIS_REST_TOKEN'] ?? 'placeholder',
});

// Jobs client — Phase 8: real TriggerClient with stub fallback
const jobs = getJobsClient();

export async function createContext({ req }: { req: Request }): Promise<TRPCContext> {
  const session = await auth.api.getSession({ headers: req.headers });
  return { db, session: session as TRPCContext['session'], jobs, redis, req };
}

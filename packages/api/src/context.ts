/**
 * F3-02 — Context builder
 *
 * Runs on every request, assembles db + session + jobs + redis.
 * Singletons (redis, jobs) are created once at module load, not per request.
 *
 * Phase 8: Jobs client now uses real TriggerClient (with stub fallback
 * when TRIGGER_SECRET_KEY is not set — tests, builds, preview envs).
 *
 * P0 fix (2026-07-14): auth.api.getSession() is wrapped in a 5s timeout.
 * For unauthenticated requests, Better Auth returns null without hitting
 * the DB. But for requests WITH a session cookie, it queries the DB to
 * validate the session. If the DB hangs (neon-http cold start, network
 * stall), getSession() hangs, which hangs apiCaller(), which hangs the
 * page BEFORE any page-level withTimeout can help. The 5s timeout is
 * shorter than the 8s page-level timeout, so it fails faster and lets
 * public procedures proceed with a null session.
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

// P0 fix: session lookup timeout. If the DB hangs during session validation,
// return null (treat as unauthenticated) after 5s. Public procedures proceed
// normally; protected procedures throw UNAUTHORIZED (which is correct — the
// session couldn't be validated).
const SESSION_LOOKUP_TIMEOUT_MS = 5_000;

async function getSessionWithTimeout(headers: Headers) {
  const sessionPromise = auth.api.getSession({ headers });
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), SESSION_LOOKUP_TIMEOUT_MS);
  });
  return Promise.race([sessionPromise, timeout]);
}

export async function createContext({ req }: { req: Request }): Promise<TRPCContext> {
  const session = await getSessionWithTimeout(req.headers);
  return { db, session: session as TRPCContext['session'], jobs, redis, req };
}

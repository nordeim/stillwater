/**
 * F3-03 — Per-procedure rate limiting using Upstash Ratelimit
 *
 * Sliding window rate limiter. Identifier is user ID (authed) or IP (anon).
 * Returns 429 (TOO_MANY_REQUESTS) when limit exceeded.
 *
 * Source: MEP Phase 3 F3-03, SKILL §15.7 Pattern: Fail-Open Rate Limiter.
 */

import { TRPCError } from '@trpc/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { middleware } from '../trpc';

// Singleton Redis client for rate limiting
const redis = new Redis({
  url: process.env['UPSTASH_REDIS_REST_URL'] ?? 'https://placeholder.upstash.io',
  token: process.env['UPSTASH_REDIS_REST_TOKEN'] ?? 'placeholder',
});

// Cache ratelimiter instances by config signature
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, window: string): Ratelimit {
  const key = `${limit}:${window}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window as '1 m' | '1 h'),
      prefix: 'stillwater:ratelimit',
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

export function rateLimit(opts: {
  limit: number;
  window: '1 m' | '1 h';
  identifier?: 'user' | 'ip';
}) {
  const { limit, window, identifier = 'user' } = opts;
  const limiter = getLimiter(limit, window);

  return middleware(async ({ ctx, next }) => {
    const id =
      identifier === 'user' && ctx.session
        ? ctx.session.user.id
        : ctx.req.headers.get('x-forwarded-for') ?? 'unknown';

    const { success, reset } = await limiter.limit(id);
    if (!success) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded. Please try again later.',
        cause: { retryAfter: Math.ceil((reset - Date.now()) / 1000) },
      });
    }
    return next({ ctx });
  });
}

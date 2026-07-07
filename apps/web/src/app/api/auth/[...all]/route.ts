/**
 * F2-06 — Better Auth HTTP handler
 *
 * Catches all /api/auth/* requests. Per guide_auth-v5_vs_better-auth.md G3:
 * - File path: /api/auth/[...all]/route.ts  (NOT [...nextauth])
 * - Handler: toNextJsHandler(auth)          (NOT export const { handlers } = NextAuth(...))
 *
 * Better Auth routes served:
 *   GET  /api/auth/session     — get current session
 *   POST /api/auth/sign-in/*   — sign in (social, magic link)
 *   POST /api/auth/sign-out    — sign out
 *   GET  /api/auth/callback/*  — OAuth callback
 *   GET  /api/auth/ok          — health check
 *
 * Source: MEP Phase 2 F2-06, guide_auth-v5_vs_better-auth.md G3.
 */

import { toNextJsHandler } from 'better-auth/next-js';

import { auth } from '@stillwater/auth';

export const { GET, POST } = toNextJsHandler(auth);

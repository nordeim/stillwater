/**
 * F2-10 — Server-side auth helpers
 *
 * These functions are the Layer 2 security boundary (per ADR-009 + SKILL §5.6).
 * They run in Server Components / layouts (Node.js runtime) and do full
 * session validation via auth.api.getSession().
 *
 * CRITICAL: requireAuth() and requireRole() throw NEXT_REDIRECT — never
 * wrap in try/catch (it would catch the redirect and silently swallow it).
 *
 * Source: MEP Phase 2 F2-10, SKILL §5.6 Auth Patterns, ADR-009.
 */

import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@stillwater/auth';

import type { StudioRole } from '@stillwater/auth';

/**
 * Get the current session (or null if unauthenticated).
 * Uses auth.api.getSession() with explicit headers (Better Auth pattern).
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Require an authenticated session.
 * Throws NEXT_REDIRECT to /auth/sign-in if unauthenticated.
 * NEVER wrap in try/catch — it catches the redirect.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect('/auth/sign-in');
  return session;
}

/**
 * Require a specific role (RBAC check).
 * Throws NEXT_REDIRECT to /auth/sign-in if unauthenticated.
 * Throws NEXT_REDIRECT to /dashboard if authenticated but insufficient role.
 * NEVER wrap in try/catch — it catches the redirect.
 */
export async function requireRole(...roles: StudioRole[]) {
  const session = await requireAuth();
  const hasRole = session.user.roles.some((r: string) => roles.includes(r as StudioRole));
  if (!hasRole) redirect('/dashboard');
  return session;
}

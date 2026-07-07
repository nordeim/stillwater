/**
 * F2-15 — OAuth callback handler
 *
 * Better Auth handles OAuth callbacks internally via the [...all] route handler.
 * This file exists as a redirect target for any client-side OAuth callback
 * routing that needs to land on a page (not an API route).
 *
 * Better Auth's callback flow:
 *   1. User clicks Google sign-in → redirected to Google
 *   2. Google redirects to /api/auth/callback/google (handled by [...all] route)
 *   3. Better Auth processes the callback, sets session cookie
 *   4. Better Auth redirects to the callbackURL (e.g., /dashboard)
 *
 * This route is a no-op redirect for edge cases where a page-level callback
 * is needed. The actual callback processing happens in the API route.
 *
 * Source: MEP Phase 2 F2-15.
 */

import { redirect } from 'next/navigation';

export function GET() {
  // Better Auth handles callbacks at /api/auth/callback/* — this page-level
  // route just redirects to the dashboard (or sign-in on error)
  redirect('/dashboard');
}

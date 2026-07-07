/**
 * F2-11 — Sign-out POST handler
 *
 * Calls auth.api.signOut to clear the session, then redirects to /.
 * POST only — rejects GET (prevents CSRF via image tags/links).
 *
 * Source: MEP Phase 2 F2-11.
 */

import { NextResponse } from 'next/server';

import { toNextJsHandler } from 'better-auth/next-js';

import { auth } from '@stillwater/auth';

const { POST: betterAuthPOST } = toNextJsHandler(auth);

export async function POST() {
  // Delegate to Better Auth's sign-out handler
  // Better Auth handles session deletion + cookie clearing
  const response = await betterAuthPOST(new Request('http://localhost/api/auth/sign-out', {
    method: 'POST',
  }));

  // If sign-out successful, redirect to home
  if (response.ok) {
    return NextResponse.redirect(new URL('/', 'http://localhost:3000'), {
      status: 303, // See Other — POST → GET redirect
    });
  }

  return response;
}

// Reject GET — sign-out must be a POST (CSRF protection)
export function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to sign out.' },
    { status: 405 },
  );
}

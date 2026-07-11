/**
 * SignOutButton — client component for signing out
 *
 * POSTs to /auth/sign-out (Better Auth handler), which clears the session
 * and redirects to /. Uses a form POST for CSRF safety (no fetch needed).
 *
 * Source: MEP Phase 9 F9-02 (admin shell sign-out), Phase 2 F2-11 route.
 */

'use client';

import { useState } from 'react';

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <form
      action="/auth/sign-out"
      method="POST"
      onSubmit={() => { setIsSigningOut(true); }}
    >
      <button
        type="submit"
        disabled={isSigningOut}
        aria-label="Sign out"
        className="border border-stone-300 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.1em] text-stone-600 transition-colors hover:border-clay-400 hover:bg-sand-warm hover:text-stone-900 disabled:opacity-50"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {isSigningOut ? 'Signing out…' : 'Sign out'}
      </button>
    </form>
  );
}

'use client';

/**
 * F2-08 — SignInForm client component
 *
 * Two sections: Google OAuth + Magic Link.
 * Uses Better Auth client API (signIn.social, signIn.magicLink).
 *
 * Source: MEP Phase 2 F2-08.
 */

import { useState } from 'react';

import { MagicLinkForm } from './MagicLinkForm';

export function SignInForm({ callbackUrl = '/dashboard' }: { callbackUrl?: string }) {
  const [googlePending, setGooglePending] = useState(false);

  const handleGoogleSignIn = async () => {
    setGooglePending(true);
    try {
      const { authClient } = await import('@stillwater/auth/client');
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: callbackUrl,
      });
    } catch {
      setGooglePending(false);
    }
  };

  return (
    <div className="sign-in-form">
      {/* Google OAuth section */}
      <section className="sign-in__google">
        <h2>Sign in with Google</h2>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googlePending}
          aria-label="Sign in with Google"
        >
          {googlePending ? 'Redirecting…' : 'Continue with Google'}
        </button>
      </section>

      {/* Divider */}
      <div className="sign-in__divider" role="separator" aria-label="or">
        <span>or</span>
      </div>

      {/* Magic Link section */}
      <section className="sign-in__magic-link">
        <h2>Sign in with email</h2>
        <p>We&apos;ll send a magic link to your inbox. No password needed.</p>
        <MagicLinkForm callbackUrl={callbackUrl} />
      </section>
    </div>
  );
}

/**
 * F2-02 — Better Auth React client (for client components)
 *
 * Better Auth centralizes all client APIs on a single `authClient` object
 * (different from Auth.js's discrete `signIn`/`signOut`/`useSession` exports).
 *
 * The magicLink plugin is registered on the client side to enable
 * authClient.signIn.magicLink() — this must match the server-side plugin.
 *
 * Usage examples (in client components):
 *   // Google sign-in
 *   await authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' });
 *
 *   // Magic link
 *   await authClient.signIn.magicLink({ email: 'user@example.com', callbackURL: '/dashboard' });
 *
 *   // Sign out
 *   await authClient.signOut();
 *
 *   // Use session (in React component)
 *   const { data: session, error, isPending } = authClient.useSession();
 *
 * Source: MEP Phase 2 F2-02, guide_auth-v5_vs_better-auth.md G4,
 *         SKILL §5.6 Auth Patterns.
 */

import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

// Use process.env directly (not Zod env module) per SKILL §3.4
const baseURL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';

export const authClient = createAuthClient({
  baseURL,
  plugins: [magicLinkClient()],
});

// Destructure for convenience (matches Auth.js DX for migration)
export const { signIn, signOut, useSession } = authClient;

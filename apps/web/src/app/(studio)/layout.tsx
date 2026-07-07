/**
 * F2-16 — Studio route group layout (Layer 2 auth)
 *
 * Enforces requireAuth() at the layout boundary — NOT in proxy.ts.
 * This is the actual security boundary (Layer 2 per ADR-009).
 *
 * Calls requireAuth() which:
 *   1. Gets the full session via auth.api.getSession() (DB-backed)
 *   2. Throws NEXT_REDIRECT to /auth/sign-in if unauthenticated
 *
 * NEVER wrap in try/catch — it catches the redirect (SKILL §5.7).
 *
 * Source: MEP Phase 2 F2-16, SKILL §5.7 Layout-Level Auth Guards.
 */

import { requireAuth } from '@/lib/auth';

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  return (
    <div className="studio-shell" data-session={session.user.id}>
      {children}
    </div>
  );
}

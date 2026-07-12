/**
 * F10-02 — Sentry Node SDK init (server-side)
 *
 * Captures server errors + tRPC procedure paths.
 * Source: MEP Phase 10 F10-02, PAD §18.1.
 *
 * If NEXT_PUBLIC_SENTRY_DSN is unset or a placeholder, Sentry is skipped.
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Skip Sentry if DSN is missing or is a placeholder from .env.example
if (dsn && !dsn.includes('your-key') && !dsn.includes('your-project')) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // Capture tRPC errors with procedure context
    ignoreErrors: [
      'NEXT_REDIRECT', // Expected redirect from requireAuth/requireRole
      'NEXT_NOT_FOUND', // Expected 404s
    ],
  });
}

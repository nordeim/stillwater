/**
 * F10-02 — Sentry Node SDK init (server-side)
 *
 * Captures server errors + tRPC procedure paths.
 * Source: MEP Phase 10 F10-02, PAD §18.1.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Capture tRPC errors with procedure context
  ignoreErrors: [
    'NEXT_REDIRECT', // Expected redirect from requireAuth/requireRole
    'NEXT_NOT_FOUND', // Expected 404s
  ],
});

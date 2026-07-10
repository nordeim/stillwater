/**
 * F10-03 — Sentry Edge config (for proxy.ts errors)
 *
 * Minimal config — Edge runtime has restrictions.
 * Source: MEP Phase 10 F10-03, PAD §18.1.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

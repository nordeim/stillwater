/**
 * F10-03 — Sentry Edge config (for proxy.ts errors)
 *
 * Minimal config — Edge runtime has restrictions.
 * Source: MEP Phase 10 F10-03, PAD §18.1.
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
  });
}

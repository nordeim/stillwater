/**
 * F10-01 — Sentry browser SDK init (client-side)
 *
 * Captures unhandled client errors + session replay (PII-aware).
 * Source: MEP Phase 10 F10-01, PAD §18.1.
 *
 * If NEXT_PUBLIC_SENTRY_DSN is unset or a placeholder (your-key@sentry.io),
 * Sentry.init is skipped — the app runs without error tracking rather than
 * crashing with "Invalid Sentry Dsn".
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Skip Sentry if DSN is missing or is a placeholder from .env.example
if (dsn && !dsn.includes('your-key') && !dsn.includes('your-project')) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // PII-aware: do not send request bodies for booking endpoints
    beforeBreadcrumb(breadcrumb) {
      const url: unknown = breadcrumb.data?.url;
      if (breadcrumb.category === 'fetch' && typeof url === 'string' && url.includes('/api/trpc/bookings')) {
        return null;
      }
      return breadcrumb;
    },
  });
}

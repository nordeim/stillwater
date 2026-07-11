/**
 * F10-01 — Sentry browser SDK init (client-side)
 *
 * Captures unhandled client errors + session replay (PII-aware).
 * Source: MEP Phase 10 F10-01, PAD §18.1.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
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

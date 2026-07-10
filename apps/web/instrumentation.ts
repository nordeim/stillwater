/**
 * F10-08 — Next.js instrumentation hook
 *
 * Runs on server startup. Loads Sentry configs conditionally per runtime.
 * Source: MEP Phase 10 F10-08, PAD §18.1.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

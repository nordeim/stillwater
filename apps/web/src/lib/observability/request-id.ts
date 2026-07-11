/**
 * F10-07 — Request ID generator
 *
 * Generates a UUID v4 for every request. Attached to all log entries
 * for distributed tracing across Sentry/Axiom.
 *
 * In Next.js 16, this is done in proxy.ts (Edge/Node) by setting the
 * x-request-id header. The logger picks it up from headers() in
 * Server Components.
 *
 * Source: MEP Phase 10 F10-07, PAD §18.1.
 */

import 'server-only';
import { randomUUID } from 'crypto';

import { headers } from 'next/headers';

/**
 * Get the request ID from the x-request-id header, or generate a new one.
 * The proxy.ts middleware sets this header on every request.
 */
export async function getRequestId(): Promise<string> {
  const headerStore = await headers();
  const existing = headerStore.get('x-request-id');
  if (existing) return existing;

  // Fallback: generate a new UUID (for tests or non-proxied contexts)
  return randomUUID();
}

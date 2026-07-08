import 'server-only';

import { createClient, type SanityClient, type ClientConfig } from '@sanity/client';

/**
 * Sanity client factory with null fallback.
 *
 * Per SKILL §15.6: Infrastructure clients MUST use `process.env` directly
 * (NOT the Zod env module) with a null fallback. This prevents build-time
 * crashes when env vars are not set (e.g., during `next build` in CI without
 * Sanity credentials).
 *
 * Per SKILL §7.5.1: All GROQ queries MUST filter `published == true`.
 * This filter is enforced in the query registry, not here.
 *
 * @returns SanityClient | null — null when env vars are missing
 */
let cachedClient: SanityClient | null | undefined;

export function getSanityClient(): SanityClient | null {
  // Return cached client (singleton pattern)
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const apiToken = process.env.SANITY_API_TOKEN;

  // Null fallback when env vars are missing (build context, CI without secrets)
  if (!projectId || !dataset) {
    cachedClient = null;
    return null;
  }

  // Per exactOptionalPropertyTypes: only pass token when defined
  const clientConfig: ClientConfig = {
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    useCdn: true,
  };
  if (apiToken) {
    clientConfig.token = apiToken;
  }

  cachedClient = createClient(clientConfig);

  return cachedClient;
}

/**
 * Type guard: check if Sanity is configured (env vars present).
 * Used by marketing pages to fall back to tRPC-only data when Sanity is not configured.
 */
export function isSanityConfigured(): boolean {
  return getSanityClient() !== null;
}

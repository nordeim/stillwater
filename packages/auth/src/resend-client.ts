/**
 * F2-03 — Resend SDK singleton for auth emails (magic link, verification)
 *
 * Separate from packages/email (which handles booking confirmations, etc.)
 * to keep the auth package self-contained.
 *
 * Uses process.env directly (not Zod env module) per SKILL §3.4 —
 * infrastructure clients must not throw in build/test contexts.
 *
 * V20-4 fix: In production (non-build context), RESEND_API_KEY MUST be set.
 * Before V20-4, this silently fell back to 're_placeholder' — which caused
 * the production auth 500 outage (Resend rejected the placeholder API key
 * when magic-link sign-in tried to send the email). Now we throw with a
 * clear message. Build/test contexts are exempt (no actual emails sent).
 *
 * Source: MASTER_EXECUTION_PLAN.md F2-03.
 */

import { Resend } from 'resend';

const isBuildContext =
  process.env['NEXT_PHASE'] === 'phase-production-build' ||
  process.env['NODE_ENV'] === 'test';

const apiKey = process.env['RESEND_API_KEY'];

if (!apiKey && !isBuildContext) {
  throw new Error(
    '[auth] RESEND_API_KEY is not set. Set it in your Vercel project settings ' +
      '(or apps/web/.env.local for local dev). Without it, magic-link sign-in ' +
      'will return HTTP 500 (cannot send the magic-link email).',
  );
}

// Build/test contexts can use a placeholder — no actual emails are sent.
export const resend = new Resend(apiKey ?? 're_placeholder');

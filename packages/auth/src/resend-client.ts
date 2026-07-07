/**
 * F2-03 — Resend SDK singleton for auth emails (magic link, verification)
 *
 * Separate from packages/email (which handles booking confirmations, etc.)
 * to keep the auth package self-contained.
 *
 * Uses process.env directly (not Zod env module) per SKILL §3.4 —
 * infrastructure clients must not throw in build/test contexts.
 *
 * Source: MASTER_EXECUTION_PLAN.md F2-03.
 */

import { Resend } from 'resend';

const apiKey = process.env['RESEND_API_KEY'] ?? 're_placeholder';

export const resend = new Resend(apiKey);

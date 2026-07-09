/**
 * F8-29 — Email sending helper (dual-path per ADR-010)
 *
 * TWO functions:
 *
 * 1. sendEmail() — Local JSX render (for Next.js Server Components)
 *    Uses `render()` from react-email to produce HTML, then sends via Resend.
 *    Pulls the 1.8MB React Email v6 bundle — OK for Server Components
 *    (Node.js runtime, no strict CPU budget).
 *
 * 2. sendEmailNative() — Resend Native Templates (for Trigger.dev workers)
 *    Sends { templateId, variables } to Resend — zero bundle bloat, 0ms
 *    rendering CPU time. Templates are deployed to Resend dashboard.
 *
 * Per ADR-010 (Accepted 2026-07-09):
 * - Workers MUST use sendEmailNative() to protect 30s CPU budgets
 * - Server Components MAY use sendEmail() (rare — e.g., welcome email)
 *
 * Per SKILL §15.20: Infrastructure clients use `process.env` directly
 * with null fallback (NOT Zod env module which throws in browser context).
 *
 * Source: MEP F8-29, PAD §16.3, ADR-010.
 */

import { Resend } from 'resend';
import { render } from 'react-email';
import type { ReactElement } from 'react';

let cachedResend: Resend | null = null;
let cachedKey: string | null = null;

/**
 * Get the Resend singleton. Returns null when RESEND_API_KEY is not set.
 * Per SKILL §15.20: infrastructure clients use process.env directly.
 */
function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  if (cachedResend && cachedKey === key) return cachedResend;

  cachedResend = new Resend(key);
  cachedKey = key;
  return cachedResend;
}

/**
 * Send an email by rendering a React Email template locally.
 *
 * For Next.js Server Components ONLY — pulls 1.8MB React Email v6 bundle.
 * Trigger.dev workers MUST use sendEmailNative() instead (ADR-010).
 *
 * @returns null when Resend is unavailable; otherwise void.
 */
export async function sendEmail<T extends Record<string, unknown>>(
  template: (props: T) => ReactElement,
  props: T,
  opts: { to: string; subject: string },
): Promise<void | null> {
  const resend = getResendClient();
  if (!resend) return null;

  const from = process.env.EMAIL_FROM ?? 'hello@stillwater.studio';

  // Render the React Email template to HTML string
  const html = (await render(template(props))) as string;

  await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html,
  });
}

/**
 * Send an email via Resend Native Templates.
 *
 * For Trigger.dev workers ONLY — zero bundle bloat (no react-email import).
 * The template must already be deployed to Resend dashboard with the given
 * templateId. Type safety is preserved by exporting template ID constants
 * from packages/email/src/index.ts.
 *
 * Per ADR-010: This is the REQUIRED path for all worker email sending.
 *
 * @returns null when Resend is unavailable; otherwise void.
 */
export async function sendEmailNative(
  templateId: string,
  variables: Record<string, unknown>,
  opts: { to: string; subject: string },
): Promise<void | null> {
  const resend = getResendClient();
  if (!resend) return null;

  const from = process.env.EMAIL_FROM ?? 'hello@stillwater.studio';

  // Per Resend SDK v6: the `template` field takes an object with `id`
  // (the template slug) and `variables` (the template data).
  // This is the Resend Native Templates API per ADR-010.
  await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    template: { id: templateId, variables: variables as Record<string, string | number> },
  });
}

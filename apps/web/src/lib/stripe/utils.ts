/**
 * F7-14 — Stripe utility functions
 *
 * Helper functions for formatting Stripe amounts and logging webhook events.
 *
 * Source: MEP F7-14, PAD §15.1.
 */

/**
 * Format a Stripe amount (in cents) as a human-readable currency string.
 *
 * Stripe stores amounts in the smallest currency unit (cents for USD,
 * pence for GBP, etc.). This helper converts to a display string.
 *
 * @param cents  - The amount in cents (e.g., 9900 = $99.00)
 * @param currency - ISO 4217 currency code (default: 'usd')
 * @returns Formatted string (e.g., '$99.00')
 *
 * @example
 * formatStripeAmount(9900) // '$99.00'
 * formatStripeAmount(500, 'usd') // '$5.00'
 * formatStripeAmount(0) // '$0.00'
 */
export function formatStripeAmount(cents: number, currency = 'usd'): string {
  // Handle null/undefined/NaN gracefully — Stripe draft invoices may have
  // null totals, and defensive coding prevents UI crashes.
  const safeCents = typeof cents === 'number' && !Number.isNaN(cents) ? cents : 0;
  const dollars = safeCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(dollars);
}

/**
 * Convert a Stripe webhook event to a compact log string for debugging
 * and audit logging.
 *
 * @param event - The Stripe event object (minimal shape)
 * @returns Compact log string (e.g., 'evt_123 | invoice.paid | in_001')
 *
 * @example
 * stripeEventToWebhookLog({ id: 'evt_123', type: 'invoice.paid', data: { object: { id: 'in_001' } } })
 * // 'evt_123 | invoice.paid | in_001'
 */
export function stripeEventToWebhookLog(event: {
  id: string;
  type: string;
  data: { object: { id?: string } };
}): string {
  const objectId = event.data.object.id ?? 'unknown';
  return `${event.id} | ${event.type} | ${objectId}`;
}

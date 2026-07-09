/**
 * F7-05 — Invoice listing with cursor-based pagination
 *
 * Thin wrapper around stripe.invoices.list() that:
 *   - Filters by customer ID
 *   - Supports cursor-based pagination (starting_after)
 *   - Transforms raw Stripe invoice objects into DTOs
 *
 * Per MEP F7-05: returns DTOs (not raw Stripe objects) to insulate the
 * API surface from Stripe SDK changes. Cursor-based pagination is
 * preferred over offset for large datasets (Stripe's recommended pattern).
 *
 * Per SKILL §15.20: uses getStripeClient() with null fallback.
 *
 * Source: MEP F7-05, PAD §15.1.
 */

import { getStripeClient } from './client';

/**
 * DTO for a Stripe invoice, exposed to the tRPC layer + UI.
 * Only includes fields the UI actually displays.
 */
export interface InvoiceDTO {
  id: string;
  customerId: string;
  subscriptionId: string | null;
  amountTotal: number;
  currency: string;
  status: string;
  createdAt: Date;
  invoicePdfUrl: string | null;
}

/**
 * Result of a paginated invoice list query.
 */
export interface InvoiceListResult {
  invoices: InvoiceDTO[];
  hasMore: boolean;
  /** The last invoice ID in this page — pass as startingAfter for the next page. */
  nextCursor: string | null;
}

/**
 * List a customer's invoices with cursor-based pagination.
 *
 * @returns The invoice list result, or null if the Stripe client is unavailable.
 */
export async function listInvoices(params: {
  customerId: string;
  limit?: number;
  /** The ID of the last invoice from the previous page (for pagination). */
  startingAfter?: string;
}): Promise<InvoiceListResult | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const response = await stripe.invoices.list({
    customer: params.customerId,
    limit: params.limit ?? 10,
    ...(params.startingAfter
      ? { starting_after: params.startingAfter }
      : {}),
  });

  const invoices: InvoiceDTO[] = response.data.map((inv) => {
    // Cast to access fields that vary across Stripe API versions.
    // In SDK v22 Dahlia, `subscription` may be typed differently.
    const raw = inv as unknown as Record<string, unknown>;
    return {
      id: inv.id,
      customerId:
        typeof inv.customer === 'string' ? inv.customer : '',
      subscriptionId:
        typeof raw.subscription === 'string' ? raw.subscription : null,
      amountTotal: inv.total ?? 0,
      currency: inv.currency ?? 'usd',
      status: inv.status ?? 'draft',
      createdAt: new Date((inv.created ?? 0) * 1000),
      invoicePdfUrl: inv.invoice_pdf ?? null,
    };
  });

  const lastInvoice = invoices[invoices.length - 1];

  return {
    invoices,
    hasMore: response.has_more ?? false,
    nextCursor: response.has_more && lastInvoice ? lastInvoice.id : null,
  };
}

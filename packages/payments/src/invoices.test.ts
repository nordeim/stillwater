/**
 * F7-05 — Invoice listing tests
 *
 * TDD RED phase: verifies the invoice listing helper with cursor-based
 * pagination and DTO transformation.
 *
 * Per MEP F7-05: returns DTOs (not raw Stripe objects), cursor-based
 * pagination for large datasets.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Per SKILL §15.21: use vi.hoisted() for mock objects.
// The client mock return value is toggleable so we can test both the
// "client available" and "client null" paths without polluting the
// module cache between tests.
const { mockInvoicesList, mockStripeClient, getClientReturn } = vi.hoisted(
  () => {
    const mockInvoicesList = vi.fn();
    const mockStripeClient = {
      invoices: { list: mockInvoicesList },
    };
    // Mutable holder — tests can set this to null to simulate no client
    const getClientReturn: { value: unknown } = { value: mockStripeClient };
    return { mockInvoicesList, mockStripeClient, getClientReturn };
  },
);

vi.mock('./client', () => ({
  getStripeClient: () => getClientReturn.value,
}));

describe('listInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default: client available
    getClientReturn.value = mockStripeClient;
  });

  it('calls stripe.invoices.list with customer filter + limit', async () => {
    const { listInvoices } = await import('./invoices');
    mockInvoicesList.mockResolvedValue({
      data: [
        {
          id: 'in_001',
          customer: 'cus_123',
          subscription: 'sub_123',
          total: 9900,
          currency: 'usd',
          status: 'paid',
          created: 1700000000,
          invoice_pdf: 'https://example.com/invoice.pdf',
        },
      ],
      has_more: false,
    });

    const result = await listInvoices({
      customerId: 'cus_123',
      limit: 10,
    });

    expect(result).not.toBeNull();
    expect(mockInvoicesList).toHaveBeenCalledWith({
      customer: 'cus_123',
      limit: 10,
    });
    expect(result!.invoices).toHaveLength(1);
    expect(result!.invoices[0]).toEqual({
      id: 'in_001',
      customerId: 'cus_123',
      subscriptionId: 'sub_123',
      amountTotal: 9900,
      currency: 'usd',
      status: 'paid',
      createdAt: expect.any(Date),
      invoicePdfUrl: 'https://example.com/invoice.pdf',
    });
  });

  it('returns nextCursor when has_more is true', async () => {
    const { listInvoices } = await import('./invoices');
    mockInvoicesList.mockResolvedValue({
      data: [
        {
          id: 'in_001',
          customer: 'cus_123',
          total: 9900,
          currency: 'usd',
          status: 'paid',
          created: 1700000000,
        },
      ],
      has_more: true,
    });

    const result = await listInvoices({
      customerId: 'cus_123',
      limit: 10,
    });

    expect(result).not.toBeNull();
    expect(result!.hasMore).toBe(true);
    expect(result!.nextCursor).toBe('in_001');
  });

  it('returns hasMore=false and nextCursor=null when has_more is false', async () => {
    const { listInvoices } = await import('./invoices');
    mockInvoicesList.mockResolvedValue({
      data: [
        {
          id: 'in_002',
          customer: 'cus_123',
          total: 5000,
          currency: 'usd',
          status: 'paid',
          created: 1700000001,
        },
      ],
      has_more: false,
    });

    const result = await listInvoices({
      customerId: 'cus_123',
      limit: 10,
    });

    expect(result).not.toBeNull();
    expect(result!.hasMore).toBe(false);
    expect(result!.nextCursor).toBeNull();
  });

  it('passes starting_after cursor for pagination', async () => {
    const { listInvoices } = await import('./invoices');
    mockInvoicesList.mockResolvedValue({
      data: [],
      has_more: false,
    });

    await listInvoices({
      customerId: 'cus_123',
      limit: 10,
      startingAfter: 'in_001',
    });

    expect(mockInvoicesList).toHaveBeenCalledWith({
      customer: 'cus_123',
      limit: 10,
      starting_after: 'in_001',
    });
  });

  it('returns empty array when no invoices', async () => {
    const { listInvoices } = await import('./invoices');
    mockInvoicesList.mockResolvedValue({
      data: [],
      has_more: false,
    });

    const result = await listInvoices({
      customerId: 'cus_123',
      limit: 10,
    });

    expect(result).not.toBeNull();
    expect(result!.invoices).toEqual([]);
    expect(result!.hasMore).toBe(false);
    expect(result!.nextCursor).toBeNull();
  });

  it('returns null when Stripe client is unavailable', async () => {
    // Toggle the mock to return null for this test only
    getClientReturn.value = null;
    const { listInvoices } = await import('./invoices');
    const result = await listInvoices({
      customerId: 'cus_123',
      limit: 10,
    });
    expect(result).toBeNull();
  });

  it('handles missing optional fields (subscription, invoice_pdf)', async () => {
    const { listInvoices } = await import('./invoices');
    mockInvoicesList.mockResolvedValue({
      data: [
        {
          id: 'in_003',
          customer: 'cus_123',
          // subscription, invoice_pdf, status all omitted
          total: 1000,
          currency: 'usd',
          created: 1700000002,
        },
      ],
      has_more: false,
    });

    const result = await listInvoices({
      customerId: 'cus_123',
      limit: 10,
    });

    expect(result).not.toBeNull();
    expect(result!.invoices).toHaveLength(1);
    const invoice = result!.invoices[0]!;
    expect(invoice.subscriptionId).toBeNull();
    expect(invoice.invoicePdfUrl).toBeNull();
    expect(invoice.status).toBe('draft'); // default
  });
});

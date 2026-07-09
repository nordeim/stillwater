/**
 * F7-08 — @stillwater/payments barrel export
 *
 * Re-exports all public APIs from the payments package.
 * Replaces the Phase 0 placeholder.
 *
 * Source: MEP F7-08, PAD §6.1.
 */

export { getStripeClient, _resetStripeClientForTesting } from './client';
export type {
  StripeWebhookEvent,
  StripeSubscriptionObject,
  StripeInvoiceObject,
  StripeSubscriptionEvent,
  StripeInvoiceEvent,
  StripeWebhookResult,
  HandledStripeEventType,
} from './types';
export { HANDLED_STRIPE_EVENT_TYPES } from './types';
export {
  createCheckoutSession,
  createCustomerPortalSession,
  pauseSubscription,
  resumeSubscription,
  cancelAtPeriodEnd,
} from './subscriptions';
export { handleStripeWebhook } from './webhooks';
export { listInvoices } from './invoices';
export type { InvoiceDTO, InvoiceListResult } from './invoices';
export { createCreditPackCheckout } from './credit-packs';
export { createRefund } from './refunds';
export type { RefundDTO } from './refunds';

/**
 * F3-04 — paymentsRouter: Stripe portal / invoices / refunds (Phase 7 stubs)
 *
 * All procedures are STUBS until Phase 7 wires the Stripe SDK.
 *   getPortalUrl  — protected mutation — returns a Billing Portal URL
 *   getInvoices   — protected query    — returns a member's invoice list
 *   refund        — staff mutation     — initiates a refund for a payment
 *
 * Each stub throws PRECONDITION_FAILED so the API surface is stable
 * while the implementation is pending. The web client can feature-detect
 * via the error code.
 *
 * Source: MEP Phase 3 F3-04 (router scaffold) + Phase 7 (Stripe wiring),
 *         PAD §8.4 + §8.5.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, staffProcedure } from '../trpc';

const STUB_MESSAGE = 'Stripe integration pending Phase 7';

export const paymentsRouter = router({
  /**
   * STUB — return a Stripe Billing Portal URL for the caller.
   * Phase 7 will call stripe.billingPortal.sessions.create().
   */
  getPortalUrl: protectedProcedure
    .input(
      z
        .object({
          returnUrl: z.string().url().optional(),
        })
        .optional(),
    )
    .mutation(async () => {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: STUB_MESSAGE });
    }),

  /**
   * STUB — return a list of the caller's invoices.
   * Phase 7 will call stripe.invoices.list({ customer: ... }).
   */
  getInvoices: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).optional(),
        })
        .optional(),
    )
    .query(async () => {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: STUB_MESSAGE });
    }),

  /**
   * STUB — initiate a refund for a payment. Staff only.
   * Phase 7 will call stripe.refunds.create({ payment_intent: ... }).
   */
  refund: staffProcedure
    .input(
      z.object({
        paymentIntentId: z.string().min(1).max(200),
        amount: z.number().int().min(1).optional(),
        reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
      }),
    )
    .mutation(async () => {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: STUB_MESSAGE });
    }),
});

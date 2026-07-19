/**
 * F3-04 — paymentsRouter: Stripe portal / invoices / refunds
 *
 * Phase 7: getPortalUrl + getInvoices are wired to Stripe.
 * refund remains a stub (D12 — v1 uses Stripe Dashboard only).
 *
 *   getPortalUrl  — protected mutation — returns a Billing Portal URL
 *   getInvoices   — protected query    — returns a member's invoice list
 *   refund        — staff mutation     — D12 stub (v1 uses Stripe Dashboard)
 *
 * Source: MEP Phase 3 F3-04 (router scaffold) + Phase 7 (Stripe wiring),
 *         PAD §8.4 + §8.5 + §15.1, D12 (refund scope reduction).
 */

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, managerProcedure } from '../trpc';
import { members } from '@stillwater/db';
import { createCustomerPortalSession, listInvoices } from '@stillwater/payments';

const REFUND_STUB_MESSAGE =
  'Refund UI deferred to v2 (D12) — use Stripe Dashboard for refunds';

export const paymentsRouter = router({
  /**
   * Return a Stripe Billing Portal URL for the caller.
   * The member can manage their subscription (update payment method,
   * view invoices, cancel) in the Stripe-hosted portal.
   */
  getPortalUrl: protectedProcedure
    .input(
      z
        .object({
          returnUrl: z.string().url().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const memberId = ctx.session.user.memberId;
      if (!memberId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No member profile linked to this account',
        });
      }

      const member = await ctx.db.query.members.findFirst({
        where: eq(members.id, memberId),
      });
      if (!member) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
      }
      if (!member.stripeCustomerId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'No Stripe customer ID — member has no billing history',
        });
      }

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const returnUrl = input?.returnUrl ?? `${appUrl}/dashboard`;
      const portalUrl = await createCustomerPortalSession({
        customerId: member.stripeCustomerId,
        returnUrl,
      });

      if (!portalUrl) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create Stripe Billing Portal session',
        });
      }

      return { portalUrl };
    }),

  /**
   * Return a list of the caller's invoices from Stripe.
   * Uses cursor-based pagination (pass nextCursor as startingAfter
   * for the next page).
   */
  getInvoices: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).optional(),
          startingAfter: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const memberId = ctx.session.user.memberId;
      if (!memberId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No member profile linked to this account',
        });
      }

      const member = await ctx.db.query.members.findFirst({
        where: eq(members.id, memberId),
      });
      if (!member) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
      }
      if (!member.stripeCustomerId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'No Stripe customer ID — member has no billing history',
        });
      }

      const result = await listInvoices({
        customerId: member.stripeCustomerId,
        ...(input?.limit !== undefined ? { limit: input.limit } : {}),
        ...(input?.startingAfter !== undefined
          ? { startingAfter: input.startingAfter }
          : {}),
      });

      if (!result) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list invoices from Stripe',
        });
      }

      return result;
    }),

  /**
   * D12 STUB — initiate a refund for a payment. Manager+ only (V13-4 fix).
   *
   * v1 scope: refunds are handled via Stripe Dashboard only.
   * In-app refund UI is deferred to v2. The createRefund helper exists
   * in @stillwater/payments (F7-07) but is not wired here until v2.
   *
   * V13-4 fix (2026-07-19): Changed from staffProcedure to managerProcedure.
   * The RBAC matrix (PAD §9.2) requires manager+ for refund initiation.
   * Even though this is a D12 stub that throws PRECONDITION_FAILED, the
   * tier must be correct so that when v2 wires it up, the tier is already
   * enforced. Staff should not be able to initiate refunds.
   */
  refund: managerProcedure
    .input(
      z.object({
        paymentIntentId: z.string().min(1).max(200),
        amount: z.number().int().min(1).optional(),
        reason: z
          .enum(['duplicate', 'fraudulent', 'requested_by_customer'])
          .optional(),
      }),
    )
    .mutation(async () => {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: REFUND_STUB_MESSAGE,
      });
    }),
});

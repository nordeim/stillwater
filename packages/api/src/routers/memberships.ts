/**
 * F3-04 — membershipsRouter: plan browse + subscription management
 *
 * Public:
 *   getPlans — list all active membership plans (sorted by sortOrder)
 *
 * Protected (authenticated member):
 *   getMySubscription — fetch the caller's active subscription
 *   subscribe — create a Stripe Checkout Session for a plan
 *   cancel — cancel the caller's subscription at period end
 *   pause — pause the caller's subscription
 *   resume — resume the caller's paused subscription
 *
 * Phase 7: Stubs replaced with real Stripe integration via
 * @stillwater/payments helpers.
 *
 * Source: MEP Phase 3 F3-04 (router scaffold) + Phase 7 (Stripe wiring),
 *         PAD §8.4 + §8.5 + §15.1 + §15.2.
 */

import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { membershipPlans, memberSubscriptions, members } from '@stillwater/db';
import {
  createCheckoutSession,
  cancelAtPeriodEnd,
  pauseSubscription,
  resumeSubscription,
} from '@stillwater/payments';

export const membershipsRouter = router({
  /**
   * List all active membership plans, ordered by sortOrder then name.
   * Public — used by the pricing page.
   */
  getPlans: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.membershipPlans.findMany({
      where: eq(membershipPlans.isActive, true),
      orderBy: [asc(membershipPlans.sortOrder), asc(membershipPlans.name)],
    });
  }),

  /**
   * Get the caller's active subscription with plan details.
   * Returns null if none.
   *
   * Phase 6: Added `with: { plan: true }` so the dashboard can display
   * plan name, billing interval, and credit info without a second query.
   */
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    const memberId = ctx.session.user.memberId;
    if (!memberId) return null;

    const subscription = await ctx.db.query.memberSubscriptions.findFirst({
      where: eq(memberSubscriptions.memberId, memberId),
      with: { plan: true },
    });

    return subscription ?? null;
  }),

  /**
   * Subscribe the caller to a plan via Stripe Checkout.
   *
   * Flow:
   *   1. Find the plan by planId → get stripePriceId
   *   2. Find the member by memberId → get stripeCustomerId
   *   3. If member has no stripeCustomerId, throw PRECONDITION_FAILED
   *      (member must complete checkout via Stripe first to create a customer)
   *   4. Create a Stripe Checkout Session (mode: 'subscription')
   *   5. Return the checkout URL for browser redirect
   */
  subscribe: protectedProcedure
    .input(z.object({ planId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Find the plan
      const plan = await ctx.db.query.membershipPlans.findFirst({
        where: eq(membershipPlans.id, input.planId),
      });
      if (!plan) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });
      }

      // 2. Find the member to get stripeCustomerId
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

      // 3. Check for existing stripeCustomerId
      if (!member.stripeCustomerId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'No Stripe customer ID — member must be provisioned via Stripe first',
        });
      }

      // 4. Create Checkout Session
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const session = await createCheckoutSession({
        customerId: member.stripeCustomerId,
        priceId: plan.stripePriceId,
        successUrl: `${appUrl}/membership/success`,
        cancelUrl: `${appUrl}/membership`,
      });

      if (!session) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create Stripe Checkout Session',
        });
      }

      // 5. Return the checkout URL
      return { checkoutUrl: session.url };
    }),

  /**
   * Cancel the caller's subscription at period end.
   * Calls Stripe's cancelAtPeriodEnd — the subscription remains active
   * until the current period ends, then a customer.subscription.deleted
   * webhook fires to set status = 'cancelled'.
   */
  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    const memberId = ctx.session.user.memberId;
    if (!memberId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No member profile linked to this account',
      });
    }

    const sub = await ctx.db.query.memberSubscriptions.findFirst({
      where: eq(memberSubscriptions.memberId, memberId),
    });
    if (!sub || !sub.stripeSubscriptionId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No active subscription found',
      });
    }

    await cancelAtPeriodEnd(sub.stripeSubscriptionId);
    return { success: true };
  }),

  /**
   * Pause the caller's subscription.
   * Calls Stripe's pauseSubscription with behavior: 'void'.
   * Updates the DB record with pausedAt + pauseResumesAt.
   */
  pause: protectedProcedure
    .input(
      z.object({
        resumeAt: z.coerce.date().optional(),
      }).optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const memberId = ctx.session.user.memberId;
      if (!memberId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No member profile linked to this account',
        });
      }

      const sub = await ctx.db.query.memberSubscriptions.findFirst({
        where: eq(memberSubscriptions.memberId, memberId),
      });
      if (!sub || !sub.stripeSubscriptionId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No active subscription found',
        });
      }

      await pauseSubscription(sub.stripeSubscriptionId);

      // Update DB record
      await ctx.db
        .update(memberSubscriptions)
        .set({
          status: 'paused',
          pausedAt: new Date(),
          pauseResumesAt: input?.resumeAt ?? null,
        })
        .where(eq(memberSubscriptions.id, sub.id));

      return { success: true };
    }),

  /**
   * Resume the caller's paused subscription.
   * Calls Stripe's resumeSubscription (clears pause_collection).
   * Updates the DB record to clear pausedAt + pauseResumesAt.
   */
  resume: protectedProcedure.mutation(async ({ ctx }) => {
    const memberId = ctx.session.user.memberId;
    if (!memberId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No member profile linked to this account',
      });
    }

    const sub = await ctx.db.query.memberSubscriptions.findFirst({
      where: eq(memberSubscriptions.memberId, memberId),
    });
    if (!sub || !sub.stripeSubscriptionId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No subscription found',
      });
    }

    await resumeSubscription(sub.stripeSubscriptionId);

    // Update DB record
    await ctx.db
      .update(memberSubscriptions)
      .set({
        status: 'active',
        pausedAt: null,
        pauseResumesAt: null,
      })
      .where(eq(memberSubscriptions.id, sub.id));

    return { success: true };
  }),
});

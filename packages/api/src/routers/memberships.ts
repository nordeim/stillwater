/**
 * F3-04 — membershipsRouter: plan browse + subscription management
 *
 * Public:
 *   getPlans — list all active membership plans (sorted by sortOrder)
 *
 * Protected (authenticated member):
 *   getMySubscription — fetch the caller's active subscription
 *
 * STUB procedures (Phase 7 — Stripe integration not yet built):
 *   subscribe — throws PRECONDITION_FAILED until Stripe is wired
 *   cancel    — throws PRECONDITION_FAILED until Stripe is wired
 *   pause     — throws PRECONDITION_FAILED until Stripe is wired
 *
 * Source: MEP Phase 3 F3-04 (router scaffold) + Phase 7 (Stripe wiring),
 *         PAD §8.4 + §8.5.
 */

import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { membershipPlans, memberSubscriptions } from '@stillwater/db';

const STUB_MESSAGE = 'Stripe integration pending Phase 7';

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
   * Get the caller's active subscription. Returns null if none.
   */
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    const memberId = ctx.session.user.memberId;
    if (!memberId) return null;

    const subscription = await ctx.db.query.memberSubscriptions.findFirst({
      where: eq(memberSubscriptions.memberId, memberId),
    });

    return subscription ?? null;
  }),

  /**
   * STUB — subscribe the caller to a plan.
   * Phase 7 will replace this with a Stripe Checkout / Billing Portal flow.
   */
  subscribe: protectedProcedure
    .input(z.object({ planId: z.string().uuid() }))
    .mutation(async () => {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: STUB_MESSAGE });
    }),

  /**
   * STUB — cancel the caller's subscription at period end.
   * Phase 7 will replace this with a Stripe Subscription update.
   */
  cancel: protectedProcedure.mutation(async () => {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: STUB_MESSAGE });
  }),

  /**
   * STUB — pause the caller's subscription.
   * Phase 7 will replace this with a Stripe Subscription pause.
   */
  pause: protectedProcedure
    .input(
      z.object({
        resumeAt: z.coerce.date().optional(),
      }).optional(),
    )
    .mutation(async () => {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: STUB_MESSAGE });
    }),
});

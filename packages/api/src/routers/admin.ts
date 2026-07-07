/**
 * F3-04 — adminRouter: staff dashboard data (read-only)
 *
 * All procedures require a staff-tier session (staffProcedure).
 *   getDashboard   — top-level KPIs (counts of members, sessions, revenue)
 *   getRevenue     — aggregated revenue in a date range (Phase 7 will power this fully)
 *   getClassRoster — confirmed enrollments for a session, with member display names
 *
 * Source: MEP Phase 3 F3-04, PAD §8.5 (staff endpoints).
 */

import { z } from 'zod';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { router, staffProcedure } from '../trpc';
import {
  members,
  classSessions,
  enrollments,
  paymentEvents,
} from '@stillwater/db';

export const adminRouter = router({
  /**
   * Top-level dashboard KPIs. Counts rows in each key table.
   * Phase 7 will replace the revenue placeholder with a real SUM.
   */
  getDashboard: staffProcedure.query(async ({ ctx }) => {
    const memberCountRows = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(members);
    const sessionCountRows = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(classSessions)
      .where(eq(classSessions.status, 'scheduled'));
    const paymentCountRows = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(paymentEvents)
      .where(eq(paymentEvents.status, 'processed'));

    return {
      memberCount: memberCountRows[0]?.count ?? 0,
      upcomingSessionCount: sessionCountRows[0]?.count ?? 0,
      processedPaymentCount: paymentCountRows[0]?.count ?? 0,
      // Revenue requires Stripe payout reconciliation (Phase 7) — leave null for now
      totalRevenueCents: null as number | null,
    };
  }),

  /**
   * Aggregated revenue in a [start, end] date range.
   * Phase 7 will replace this stub with a real SUM over paymentEvents.
   * For now returns the count of processed payments in the window.
   */
  getRevenue: staffProcedure
    .input(
      z.object({
        start: z.coerce.date(),
        end: z.coerce.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.start > input.end) {
        return { windowStart: input.start, windowEnd: input.end, totalCents: 0, paymentCount: 0 };
      }

      const rows = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(paymentEvents)
        .where(
          and(
            eq(paymentEvents.status, 'processed'),
            gte(paymentEvents.createdAt, input.start),
            lte(paymentEvents.createdAt, input.end),
          ),
        );

      const paymentCount = rows[0]?.count ?? 0;
      return {
        windowStart: input.start,
        windowEnd: input.end,
        // Stripe payout reconciliation lands in Phase 7
        totalCents: 0,
        paymentCount,
      };
    }),

  /**
   * Confirmed roster for a single session, with member display names.
   * Used by the front-desk check-in UI.
   */
  getClassRoster: staffProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.enrollments.findMany({
        where: and(
          eq(enrollments.sessionId, input.sessionId),
          eq(enrollments.status, 'confirmed'),
        ),
        with: { member: true },
        orderBy: enrollments.enrolledAt,
      });
    }),
});

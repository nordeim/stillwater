/**
 * F3-04 — scheduleRouter: public schedule queries
 *
 * Powers the public schedule page (next 7 days of classes) and the
 * session detail page (single session + enrolled count).
 *
 * Source: MEP Phase 3 F3-04, PAD §8.4 (Public read endpoints).
 */

import { z } from 'zod';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import {
  classSessions,
  enrollments,
} from '@stillwater/db';

export const scheduleRouter = router({
  /**
   * Get all scheduled sessions for the 7-day window starting at `weekStart`.
   * Used by the public /schedule page. Eager-loads class, instructor, room.
   */
  getWeek: publicProcedure
    .input(z.object({ weekStart: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      const weekEnd = new Date(input.weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const sessions = await ctx.db.query.classSessions.findMany({
        where: and(
          gte(classSessions.startsAt, input.weekStart),
          lte(classSessions.startsAt, weekEnd),
          eq(classSessions.status, 'scheduled'),
        ),
        with: {
          class: true,
          instructor: true,
          room: true,
        },
        orderBy: classSessions.startsAt,
      });

      return sessions;
    }),

  /**
   * Get a single session by ID with eager-loaded relations + enrolled count.
   * Throws NOT_FOUND if the session does not exist.
   */
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.query.classSessions.findFirst({
        where: eq(classSessions.id, input.sessionId),
        with: {
          class: true,
          instructor: true,
          room: true,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      const countRows = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.sessionId, input.sessionId),
            eq(enrollments.status, 'confirmed'),
          ),
        );

      const enrolledCount = countRows[0]?.count ?? 0;

      return { ...session, enrolledCount };
    }),
});

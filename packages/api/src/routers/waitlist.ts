/**
 * F3-04 — waitlistRouter: member-facing waitlist join / leave / position
 *
 * All procedures require an authenticated session with a linked memberId.
 *
 *   join           — add the caller to a session's waitlist. Atomic:
 *                    computes the next position via max(position)+1 inside a
 *                    transaction. Throws CONFLICT if already on the waitlist.
 *   leave          — mark the caller's waitlist entry as 'removed'. Ownership
 *                    enforced via memberId in the where clause.
 *   getMyPosition  — return the caller's waiting entry for a session (or null)
 *
 * Source: MEP Phase 3 F3-04 + Phase 6 F6-04, PAD §8.4 + §8.5.
 */

import { z } from 'zod';
import { eq, and, sql, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { waitlistEntries, classSessions } from '@stillwater/db';

export const waitlistRouter = router({
  /**
   * Add the caller to a session's waitlist. Position is computed as
   * max(position)+1 for waiting entries on that session, inside a
   * transaction so concurrent joins don't collide.
   *
   * Throws NOT_FOUND if the session doesn't exist.
   * Throws CONFLICT if the caller is already waiting for this session.
   */
  join: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const memberId = ctx.session.user.memberId;
      if (!memberId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No member profile linked to this account',
        });
      }

      return ctx.db.transaction(async (tx) => {
        // Verify the session exists
        const session = await tx.query.classSessions.findFirst({
          where: eq(classSessions.id, input.sessionId),
        });
        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
        }

        // Reject if already waiting
        const existing = await tx.query.waitlistEntries.findFirst({
          where: and(
            eq(waitlistEntries.sessionId, input.sessionId),
            eq(waitlistEntries.memberId, memberId),
            eq(waitlistEntries.status, 'waiting'),
          ),
        });
        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Already on the waitlist for this session',
          });
        }

        // Compute next position atomically
        const positionRows = await tx
          .select({ max: sql<number>`coalesce(max(${waitlistEntries.position}), 0)::int + 1` })
          .from(waitlistEntries)
          .where(eq(waitlistEntries.sessionId, input.sessionId));
        const nextPosition = positionRows[0]?.max ?? 1;

        const [created] = await tx
          .insert(waitlistEntries)
          .values({
            sessionId: input.sessionId,
            memberId,
            position: nextPosition,
            status: 'waiting',
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to join waitlist',
          });
        }

        return created;
      });
    }),

  /**
   * Remove the caller from a session's waitlist (status='removed').
   * Ownership is enforced by the memberId match in the where clause.
   * Throws NOT_FOUND if no waiting entry exists for this (session, member).
   */
  leave: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const memberId = ctx.session.user.memberId;
      if (!memberId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No member profile linked to this account',
        });
      }

      const [updated] = await ctx.db
        .update(waitlistEntries)
        .set({ status: 'removed' as const })
        .where(
          and(
            eq(waitlistEntries.sessionId, input.sessionId),
            eq(waitlistEntries.memberId, memberId),
            eq(waitlistEntries.status, 'waiting'),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No active waitlist entry found',
        });
      }

      return updated;
    }),

  /**
   * Get the caller's waiting entry for a session, including position.
   * Returns null if the caller is not currently waiting for the session.
   */
  getMyPosition: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const memberId = ctx.session.user.memberId;
      if (!memberId) return null;

      const entry = await ctx.db.query.waitlistEntries.findFirst({
        where: and(
          eq(waitlistEntries.sessionId, input.sessionId),
          eq(waitlistEntries.memberId, memberId),
          eq(waitlistEntries.status, 'waiting'),
        ),
        orderBy: desc(waitlistEntries.position),
      });

      return entry ?? null;
    }),
});

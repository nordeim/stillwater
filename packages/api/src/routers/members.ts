/**
 * F3-04 — membersRouter: authenticated member profile + history
 *
 * All procedures require an authenticated session (protectedProcedure).
 * The caller may only access their own member profile (identified by
 * session.user.memberId). Throws NOT_FOUND if the session has no memberId.
 *
 * Source: MEP Phase 3 F3-04, PAD §8.4 + §8.5.
 */

import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';
import { members, enrollments } from '@stillwater/db';

const updateProfileInput = z.object({
  displayName: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).optional(),
  dateOfBirth: z.coerce.date().optional(),
  emergencyContact: z.string().max(200).optional(),
  emergencyPhone: z.string().max(40).optional(),
  notes: z.string().max(5000).optional(),
});

export const membersRouter = router({
  /**
   * Get the caller's own member profile.
   * Throws NOT_FOUND if session.user.memberId is null.
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const memberId = ctx.session.user.memberId;
    if (!memberId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No member profile linked to this account',
      });
    }

    const profile = await ctx.db.query.members.findFirst({
      where: eq(members.id, memberId),
    });

    if (!profile) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
    }

    return profile;
  }),

  /**
   * Update the caller's own member profile.
   * Only allows editing profile fields (not stripeCustomerId, id, userId).
   * Throws NOT_FOUND if no member profile is linked.
   */
  updateProfile: protectedProcedure
    .input(updateProfileInput)
    .mutation(async ({ ctx, input }) => {
      const memberId = ctx.session.user.memberId;
      if (!memberId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No member profile linked to this account',
        });
      }

      // Strip undefined fields so we don't null-out untouched columns
      const patch = Object.fromEntries(
        Object.entries(input).filter(([, v]) => v !== undefined),
      );

      const [updated] = await ctx.db
        .update(members)
        .set(patch)
        .where(eq(members.id, memberId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
      }

      return updated;
    }),

  /**
   * Get the caller's enrollment history (most recent first).
   * Includes the related class session so the UI can show class title + date.
   * Throws NOT_FOUND if no member profile is linked.
   */
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const memberId = ctx.session.user.memberId;
    if (!memberId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No member profile linked to this account',
      });
    }

    const memberEnrollments = await ctx.db.query.enrollments.findMany({
      where: eq(enrollments.memberId, memberId),
      with: { session: { with: { class: true } } },
      orderBy: [desc(enrollments.enrolledAt)],
    });

    return memberEnrollments;
  }),
});

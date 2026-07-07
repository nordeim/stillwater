/**
 * F3-04 — instructorsRouter: public instructor profile queries
 *
 * Powers the /instructors list page and the /instructors/[slug] detail page.
 * Only returns active instructors (isActive = true) on the public list.
 *
 * Source: MEP Phase 3 F3-04, PAD §8.4.
 */

import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { instructors } from '@stillwater/db';

export const instructorsRouter = router({
  /**
   * List all active instructors, ordered by sortOrder then slug.
   * Used by the public /instructors page.
   */
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.instructors.findMany({
      where: eq(instructors.isActive, true),
      orderBy: [asc(instructors.sortOrder), asc(instructors.slug)],
    });
  }),

  /**
   * Get a single instructor by slug. Throws NOT_FOUND if missing or inactive.
   * Used by the public /instructors/[slug] page.
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      const instructor = await ctx.db.query.instructors.findFirst({
        where: eq(instructors.slug, input.slug),
      });

      if (!instructor || !instructor.isActive) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Instructor not found',
        });
      }

      return instructor;
    }),
});

/**
 * F3-04 — instructorsRouter: public instructor profile queries
 *
 * Powers the /instructors list page and the /instructors/[slug] detail page.
 * Only returns active instructors (isActive = true) on the public list.
 *
 * Source: MEP Phase 3 F3-04, PAD §8.4.
 */

import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc';
import { instructors } from '@stillwater/db';

export const instructorsRouter = router({
  /**
   * List all active + published instructors, ordered by sortOrder then slug.
   * Used by the public /instructors page.
   *
   * Phase 4: filters published == true per SKILL §7.5.1.
   *
   * V19-4: eager-load `user` so consumers can display the instructor's name
   * (the instructors table has only `slug`, not `name`; name lives on `users`).
   * Unblocks V18-1 (home page), V18-4 (admin instructors), V18-7 (slug-as-name).
   */
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.instructors.findMany({
      where: and(
        eq(instructors.isActive, true),
        eq(instructors.published, true),
      ),
      with: { user: true },
      orderBy: [asc(instructors.sortOrder), asc(instructors.slug)],
    });
  }),

  /**
   * Get a single instructor by slug. Throws NOT_FOUND if missing, inactive, or unpublished.
   * Used by the public /instructors/[slug] page.
   *
   * Phase 4: filters published == true per SKILL §7.5.1.
   *
   * V19-4: eager-load `user` so the detail page can display user.name + user.email.
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      const instructor = await ctx.db.query.instructors.findFirst({
        where: eq(instructors.slug, input.slug),
        with: { user: true },
      });

      if (!instructor || !instructor.isActive || !instructor.published) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Instructor not found',
        });
      }

      return instructor;
    }),
});

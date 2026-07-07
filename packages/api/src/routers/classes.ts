/**
 * F3-04 — classesRouter: class catalog queries + staff CRUD
 *
 * Public:
 *   list      — all active classes (with style relation)
 *   getBySlug — single class by slug
 *
 * Staff (staffProcedure):
 *   create    — insert a new class template
 *   update    — patch an existing class by id
 *
 * Source: MEP Phase 3 F3-04, PAD §8.4 (public) + §8.5 (staff).
 */

import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, staffProcedure } from '../trpc';
import { classes } from '@stillwater/db';

const classLevelValues = ['all', 'beginner', 'intermediate', 'advanced'] as const;

const createInput = z.object({
  slug: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  styleId: z.string().uuid().optional(),
  level: z.enum(classLevelValues),
  durationMinutes: z.number().int().min(5).max(480),
  maxCapacity: z.number().int().min(1).max(500),
  imageKey: z.string().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
});

const updateInput = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(120).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  styleId: z.string().uuid().optional(),
  level: z.enum(classLevelValues).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  maxCapacity: z.number().int().min(1).max(500).optional(),
  isActive: z.boolean().optional(),
  imageKey: z.string().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
});

export const classesRouter = router({
  /**
   * List all active classes, ordered by title. Eager-loads style.
   */
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.classes.findMany({
      where: eq(classes.isActive, true),
      with: { style: true },
      orderBy: [asc(classes.title)],
    });
  }),

  /**
   * Get a single class by slug with style relation.
   * Throws NOT_FOUND if missing or inactive.
   */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      const cls = await ctx.db.query.classes.findFirst({
        where: eq(classes.slug, input.slug),
        with: { style: true },
      });

      if (!cls || !cls.isActive) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
      }

      return cls;
    }),

  /**
   * Create a new class template. Staff only.
   */
  create: staffProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(classes)
        .values(input)
        .returning();

      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create class',
        });
      }

      return created;
    }),

  /**
   * Patch an existing class by id. Staff only.
   * Throws NOT_FOUND if the class does not exist.
   */
  update: staffProcedure
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;

      const [updated] = await ctx.db
        .update(classes)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(classes.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
      }

      return updated;
    }),
});

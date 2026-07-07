/**
 * F3-04 — sessionsRouter: class session queries + staff CRUD
 *
 * Public:
 *   listByDateRange — sessions in a date range (for calendar widgets)
 *
 * Staff (staffProcedure):
 *   create  — schedule a new class session
 *   cancel  — mark a session as cancelled (with reason)
 *   checkIn — mark an enrollment as attended (used at the front desk)
 *
 * Source: MEP Phase 3 F3-04, PAD §8.4 + §8.5.
 */

import { z } from 'zod';
import { eq, and, gte, lte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, staffProcedure } from '../trpc';
import { classSessions, enrollments } from '@stillwater/db';

const sessionStatusValues = ['scheduled', 'cancelled', 'completed', 'in_progress'] as const;

export const sessionsRouter = router({
  /**
   * List scheduled sessions within a [start, end] date range.
   * Used by the public schedule calendar.
   */
  listByDateRange: publicProcedure
    .input(
      z.object({
        start: z.coerce.date(),
        end: z.coerce.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.start > input.end) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'start must be <= end',
        });
      }
      return ctx.db.query.classSessions.findMany({
        where: and(
          gte(classSessions.startsAt, input.start),
          lte(classSessions.startsAt, input.end),
          eq(classSessions.status, 'scheduled'),
        ),
        with: { class: true, instructor: true, room: true },
        orderBy: classSessions.startsAt,
      });
    }),

  /**
   * Schedule a new class session. Staff only.
   */
  create: staffProcedure
    .input(
      z.object({
        classId: z.string().uuid(),
        instructorId: z.string().uuid(),
        roomId: z.string().uuid().optional(),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        overrideCapacity: z.number().int().min(1).max(500).optional(),
        isVirtual: z.boolean().optional(),
        streamUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.startsAt >= input.endsAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'startsAt must be before endsAt',
        });
      }

      const [created] = await ctx.db
        .insert(classSessions)
        .values({
          ...input,
          status: 'scheduled',
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create session',
        });
      }

      return created;
    }),

  /**
   * Cancel a class session. Staff only.
   * Sets status='cancelled' and records the reason.
   * Throws NOT_FOUND if the session does not exist.
   */
  cancel: staffProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(classSessions)
        .set({
          status: 'cancelled' as const,
          cancelReason: input.reason,
        })
        .where(eq(classSessions.id, input.sessionId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      return updated;
    }),

  /**
   * Check in a member to a session (front-desk workflow). Staff only.
   * Sets the enrollment status to 'attended' and records checkedInAt.
   * Throws NOT_FOUND if the enrollment does not exist.
   */
  checkIn: staffProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        memberId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(enrollments)
        .set({
          status: 'attended' as const,
          checkedInAt: new Date(),
        })
        .where(
          and(
            eq(enrollments.sessionId, input.sessionId),
            eq(enrollments.memberId, input.memberId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Enrollment not found',
        });
      }

      return updated;
    }),
});

// Re-export status values for downstream consumers (test files, root router)
export const SESSION_STATUS_VALUES = sessionStatusValues;

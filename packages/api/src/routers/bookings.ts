/**
 * F3-04 — bookingsRouter: member-facing booking + cancellation
 *
 * The `book` mutation is the most safety-critical endpoint in the system.
 * It uses a PostgreSQL advisory lock (per ADR-004) to serialize concurrent
 * bookings against the same session, preventing oversold capacity under
 * race conditions.
 *
 * Flow:
 *   1. Acquire pg_advisory_xact_lock(hash(sessionId)) inside a transaction
 *   2. Fetch the session with class + room (for capacity lookup)
 *   3. Reject if session is missing / not 'scheduled'
 *   4. Reject if member already has an enrollment (no double-booking)
 *   5. Count confirmed enrollments; reject if >= capacity (CONFLICT)
 *   6. Insert the enrollment with status='confirmed'
 *   7. Commit (releases the advisory lock)
 *
 * `cancel` enforces ownership (only the caller's own enrollment can be
 * cancelled) and triggers a waitlist promotion job.
 *
 * `checkIn` is a staff-only alias of sessions.checkIn (front-desk workflow).
 *
 * Source: MEP Phase 3 F3-04 + ADR-004 (advisory locks), PAD §8.5.
 */

import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, staffProcedure } from '../trpc';
import { rateLimit } from '../middleware/rateLimit';
import { classSessions, enrollments } from '@stillwater/db';

// Rate limit: max 10 bookings per minute per user (MEP acceptance criteria)
const bookingRateLimit = rateLimit({ limit: 10, window: '1 m' });

/**
 * Deterministically maps a session UUID to a 64-bit bigint for advisory locks.
 * Takes the first 16 hex chars (64 bits) of the UUID (with dashes stripped),
 * which is more than enough entropy to avoid collisions across sessions.
 */
function sessionUuidToLockKey(sessionId: string): bigint {
  return BigInt('0x' + sessionId.replace(/-/g, '').slice(0, 16));
}

export const bookingsRouter = router({
  /**
   * Book a spot in a session. Per ADR-004, uses pg_advisory_xact_lock to
   * serialize concurrent bookings against the same session.
   */
  book: protectedProcedure
    .use(bookingRateLimit)
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const memberId = ctx.session!.user.memberId;
      if (!memberId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No member profile linked to this account',
        });
      }

      const created = await ctx.db.transaction(async (tx) => {
        // 1. Acquire advisory lock keyed by session UUID
        const lockKey = sessionUuidToLockKey(input.sessionId);
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

        // 2. Fetch session + class + room (for capacity)
        const session = await tx.query.classSessions.findFirst({
          where: eq(classSessions.id, input.sessionId),
          with: { class: true, room: true },
        });

        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
        }
        if (session.status !== 'scheduled') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Session is ${session.status}, not bookable`,
          });
        }

        // 3. Reject double-booking (member already enrolled)
        const existing = await tx.query.enrollments.findFirst({
          where: and(
            eq(enrollments.sessionId, input.sessionId),
            eq(enrollments.memberId, memberId),
          ),
        });
        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Already enrolled in this session',
          });
        }

        // 4. Compute capacity & count confirmed enrollments
        // v8 R2 fix (comment clarity): Drizzle 0.45 relational query types
        // infer as `never` for nested fields without defineRelations() (which
        // requires Drizzle ≥1.0.0-beta). Cast to the expected shape as a
        // workaround. Remove cast when migrating to Drizzle 1.0 stable.
        const sessionData = session as {
          overrideCapacity: number | null;
          class: { maxCapacity: number | null } | null;
          room: { capacity: number | null } | null;
        };
        const capacity =
          sessionData.overrideCapacity ??
          sessionData.class?.maxCapacity ??
          sessionData.room?.capacity ??
          0;

        const countRows = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.sessionId, input.sessionId),
              eq(enrollments.status, 'confirmed'),
            ),
          );
        const enrolledCount = countRows[0]?.count ?? 0;

        if (enrolledCount >= capacity) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Session is full',
          });
        }

        // 5. Insert enrollment
        const [created] = await tx
          .insert(enrollments)
          .values({
            sessionId: input.sessionId,
            memberId,
            status: 'confirmed',
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create enrollment',
          });
        }

        return created;
      });

      // Phase 8: Trigger booking-confirmation job POST-COMMIT (fire-and-forget).
      // MUST be outside the transaction — if the tx rolls back, the email
      // should NOT be sent. This pattern mirrors webhooks.ts:88-118.
      // Note: class-reminder-24h and class-reminder-1h are NO LONGER
      // triggered per-booking. They run as cron jobs (every 15min / 5min)
      // that fan out to find sessions starting in the 24h/1h window.
      ctx.jobs.trigger('booking-confirmation', {
        enrollmentId: created.id,
        memberId,
      }).catch(() => {
        // Job trigger failure shouldn't fail the booking — Trigger.dev retries
      });

      return created;
    }),

  /**
   * Cancel the caller's own enrollment by ID. Ownership is enforced by the
   * where clause (memberId match), so a missing/foreign enrollment returns
   * NOT_FOUND rather than revealing the row's existence.
   *
   * v8 audit remediation (C1+C2+C3):
   *   - C1: Wrapped in a transaction with pg_advisory_xact_lock on the
   *     sessionId to serialize concurrent cancel + waitlist-promotion.
   *     Matches the bookings.book pattern per ADR-004.
   *   - C2: Triggers BOTH waitlist-promotion AND booking-cancellation
   *     (new worker task). The BookingCancellation email template existed
   *     but was never sent before this fix.
   *   - C3: Job triggers use fire-and-forget pattern (.catch(() => {}))
   *     matching bookings.book — so a Trigger.dev outage doesn't fail
   *     the cancellation.
   *
   * Source: Stillwater Audit Report v1.0 §5 C1/C2/C3; ADR-004.
   */
  cancel: protectedProcedure
    .input(z.object({ enrollmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const memberId = ctx.session!.user.memberId;
      if (!memberId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No member profile linked to this account',
        });
      }

      const updated = await ctx.db.transaction(async (tx) => {
        // C1 fix: Acquire advisory lock keyed by session UUID.
        // We don't know the sessionId until AFTER the update, but the lock
        // must serialize concurrent cancellations against the same session.
        // Approach: fetch the enrollment's sessionId FIRST (within the
        // transaction), acquire the lock, then perform the update.
        // Ownership is enforced by the where clause on the update.
        const existing = await tx.query.enrollments.findFirst({
          where: and(
            eq(enrollments.id, input.enrollmentId),
            eq(enrollments.memberId, memberId),
          ),
          columns: { id: true, sessionId: true },
        });

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Enrollment not found',
          });
        }

        // C1 fix: Acquire advisory lock on the session.
        const lockKey = sessionUuidToLockKey(existing.sessionId);
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

        const [result] = await tx
          .update(enrollments)
          .set({
            status: 'cancelled' as const,
            cancelledAt: new Date(),
          })
          .where(
            and(
              eq(enrollments.id, input.enrollmentId),
              eq(enrollments.memberId, memberId),
            ),
          )
          .returning();

        // noUncheckedIndexedAccess: result may be undefined if the row was
        // deleted between the findFirst and the update. Treat as NOT_FOUND.
        if (!result) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Enrollment not found',
          });
        }

        return result;
      });

      // C2+C3 fix: Trigger both jobs POST-COMMIT (fire-and-forget per C3).
      // If Trigger.dev is unreachable, the cancellation still succeeds —
      // Trigger.dev retries handle the rest.
      ctx.jobs.trigger('waitlist-promotion', {
        sessionId: updated.sessionId,
        cancelledEnrollmentId: updated.id,
      }).catch(() => {
        // C3: Job trigger failure shouldn't fail the cancellation — Trigger.dev retries
      });
      ctx.jobs.trigger('booking-cancellation', {
        enrollmentId: updated.id,
        memberId,
      }).catch(() => {
        // C3: Job trigger failure shouldn't fail the cancellation — Trigger.dev retries
      });

      return updated;
    }),

  /**
   * Front-desk check-in. Staff only.
   * Marks an enrollment as 'attended' and records checkedInAt.
   * Throws NOT_FOUND if the (session, member) pair has no enrollment.
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

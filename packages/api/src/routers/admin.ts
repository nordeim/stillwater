/**
 * F3-04 + F9-04 — adminRouter: staff dashboard data + class management
 *
 * All procedures require a staff-tier session (staffProcedure).
 *   getDashboard    — top-level KPIs (counts of members, sessions, revenue)
 *   getRevenue      — aggregated revenue in a date range
 *   getClassRoster  — confirmed enrollments for a session, with member display names
 *   listClasses     — paginated class list with search + filter (Phase 9)
 *   deleteClass     — soft-delete a class (isActive = false) (Phase 9)
 *
 * Source: MEP Phase 3 F3-04, Phase 9 F9-04, PAD §8.5 (staff endpoints).
 */

import { z } from 'zod';
import { eq, and, gte, lte, sql, ilike, or, desc } from 'drizzle-orm';
import { router, staffProcedure, ownerProcedure, managerProcedure } from '../trpc';
import {
  members,
  classes,
  classSessions,
  enrollments,
  paymentEvents,
  roleAssignments,
  auditLog,
} from '@stillwater/db';
import { escapeIlikePattern } from '../lib/ilike';

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
  getRevenue: managerProcedure
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

  /**
   * Paginated class list with search + active filter (Phase 9 F9-04).
   * Used by the admin class catalog table.
   */
  listClasses: staffProcedure
    .input(
      z.object({
        search: z.string().max(200).optional(),
        isActive: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.search) {
        conditions.push(
          or(
            ilike(classes.title, `%${escapeIlikePattern(input.search)}%`),
            ilike(classes.slug, `%${escapeIlikePattern(input.search)}%`),
          ),
        );
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(classes.isActive, input.isActive));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await ctx.db.query.classes.findMany({
        where,
        with: { style: true },
        orderBy: classes.title,
        limit: input.limit,
        offset: input.offset,
      });

      // Count total for pagination
      const countRows = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(classes)
        .where(where ?? sql`true`);
      const total = countRows[0]?.count ?? 0;

      return { items, total, limit: input.limit, offset: input.offset };
    }),

  /**
   * Soft-delete a class (set isActive = false). Phase 9 F9-04.
   * Does NOT actually delete the row — preserves referential integrity
   * for historical enrollments and sessions.
   * Audit-logged per F9-19 (fire-and-forget pattern — Lesson 79).
   */
  deleteClass: staffProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(classes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(classes.id, input.id))
        .returning();

      if (!updated) {
        return null; // 404 handled by caller
      }

      // Audit log — fire-and-forget (never block mutation per Lesson 79)
      await ctx.db.insert(auditLog).values({
        staffMemberId: ctx.session.user.memberId ?? ctx.session.user.id,
        action: 'class.delete',
        entityType: 'class',
        entityId: input.id,
        metadata: { title: updated.title },
      }).catch(() => {
        // Audit logging should never block the mutation
      });

      return updated;
    }),

  /**
   * Paginated member list with search + subscription filter (Phase 9 F9-09).
   * Used by the admin member directory.
   */
  listMembers: staffProcedure
    .input(
      z.object({
        search: z.string().max(200).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.search) {
        conditions.push(
          or(
            ilike(members.displayName, `%${escapeIlikePattern(input.search)}%`),
            ilike(members.notes, `%${escapeIlikePattern(input.search)}%`),
          ),
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await ctx.db.query.members.findMany({
        where,
        with: { user: true, roles: true },
        orderBy: members.joinedAt,
        limit: input.limit,
        offset: input.offset,
      });

      const countRows = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(members)
        .where(where ?? sql`true`);
      const total = countRows[0]?.count ?? 0;

      return { items, total, limit: input.limit, offset: input.offset };
    }),

  /**
   * Single member detail with subscription + attendance + payment history (Phase 9 F9-10).
   */
  getMemberDetail: staffProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.query.members.findFirst({
        where: eq(members.id, input.memberId),
        with: { user: true, roles: true },
      });

      if (!member) {
        return null;
      }

      // Fetch enrollments (attendance history)
      const enrollmentHistory = await ctx.db.query.enrollments.findMany({
        where: eq(enrollments.memberId, input.memberId),
        with: { session: { with: { class: true } } },
        orderBy: enrollments.enrolledAt,
        limit: 50,
      });

      // Fetch payment events
      const paymentHistory = await ctx.db.query.paymentEvents.findMany({
        where: eq(paymentEvents.memberId, input.memberId),
        orderBy: paymentEvents.createdAt,
        limit: 50,
      });

      return {
        member,
        enrollmentHistory,
        paymentHistory,
      };
    }),

  /**
   * Revenue details: MRR (last 12 months), churn rate, attendance metrics (Phase 9 F9-11).
   * Replaces the stub getRevenue with real calculations from payment_events.
   */
  getRevenueDetails: managerProcedure
    .input(
      z.object({
        start: z.coerce.date().optional(),
        end: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const end = input.end ?? new Date();
      const start = input.start ?? new Date(end.getFullYear() - 1, end.getMonth(), 1);

      // MRR: sum of successful payment amounts in the period
      // Amount is stored in payload jsonb (Stripe event payload) — extract via SQL
      const mrrRows = await ctx.db
        .select({
          totalCents: sql<number>`coalesce(sum((${paymentEvents.payload}->>'amount_received')::bigint), 0)::int`,
          count: sql<number>`count(*)::int`,
        })
        .from(paymentEvents)
        .where(
          and(
            eq(paymentEvents.status, 'processed'),
            gte(paymentEvents.createdAt, start),
            lte(paymentEvents.createdAt, end),
          ),
        );

      const totalRevenueCents = mrrRows[0]?.totalCents ?? 0;
      const paymentCount = mrrRows[0]?.count ?? 0;

      // Churn: count of cancelled subscriptions / total subscriptions ever
      // (simplified — Phase 10 will add proper cohort analysis)
      const churnRows = await ctx.db
        .select({
          cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(sql`member_subscriptions`);

      const cancelledCount = churnRows[0]?.cancelled ?? 0;
      const totalSubs = churnRows[0]?.total ?? 0;
      const churnRate = totalSubs > 0 ? (cancelledCount / totalSubs) * 100 : 0;

      // Attendance: avg class size + no-show rate
      //
      // V17-4 fix (2026-07-21): Removed the `.crossJoin(sql\`enrollments\`)`
      // that produced a cartesian product (N sessions × M enrollments = N×M
      // rows). The crossJoin caused:
      //   - totalEnrollments = N×M (WRONG — should be M, the count of ALL
      //     enrollments)
      //   - noShows = (count of no_shows) × N (WRONG — should be just count
      //     of no_shows)
      //   - avgClassSize: mathematically still correct (N×M cancels out),
      //     but the query was needlessly expensive.
      //
      // The fix: split into 2 parallel queries — one for avgClassSize
      // (grouped subquery) and one for noShows + totalEnrollments (direct
      // count on enrollments table). No crossJoin.
      //
      // Source: STILLWATER_AUDIT_REPORT.md §7 Finding #7
      const [avgSizeRows, countRows] = await Promise.all([
        // Avg class size: group enrollments by session, then avg the group
        // sizes. Only counts 'confirmed' + 'attended' enrollments (skips
        // 'cancelled' + 'no_show').
        ctx.db
          .select({
            avgSize: sql<number>`coalesce(avg(session_size), 0)::float`,
          })
          .from(
            sql`(select count(*) as session_size from enrollments where enrollments.status in ('confirmed', 'attended') group by enrollments.session_id) as session_counts`,
          ),
        // Total + no-show counts directly from enrollments table. Counts
        // ALL enrollment statuses (confirmed, attended, cancelled, no_show).
        ctx.db
          .select({
            noShows: sql<number>`count(*) filter (where status = 'no_show')::int`,
            totalEnrollments: sql<number>`count(*)::int`,
          })
          .from(sql`enrollments`),
      ]);

      const avgClassSize = avgSizeRows[0]?.avgSize ?? 0;
      const noShows = countRows[0]?.noShows ?? 0;
      const totalEnrollments = countRows[0]?.totalEnrollments ?? 0;
      const noShowRate = totalEnrollments > 0 ? (noShows / totalEnrollments) * 100 : 0;

      return {
        windowStart: start,
        windowEnd: end,
        totalRevenueCents,
        paymentCount,
        churnRate,
        avgClassSize,
        noShowRate,
        totalSubs,
        cancelledSubs: cancelledCount,
      };
    }),

  /**
   * Assign a role to a member (owner only). Phase 9 F9-18.
   * Logs the action to audit_log.
   */
  assignRole: ownerProcedure
    .input(
      z.object({
        memberId: z.string().uuid(),
        role: z.enum(['member', 'instructor', 'staff', 'manager', 'owner']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if role already assigned (idempotent)
      const existing = await ctx.db.query.roleAssignments.findFirst({
        where: and(
          eq(roleAssignments.memberId, input.memberId),
          eq(roleAssignments.role, input.role),
        ),
      });

      if (existing) {
        return existing; // Already assigned — no-op
      }

      const [created] = await ctx.db
        .insert(roleAssignments)
        .values({
          memberId: input.memberId,
          role: input.role,
        })
        .returning();

      // Audit log
      await ctx.db.insert(auditLog).values({
        staffMemberId: ctx.session.user.memberId ?? ctx.session.user.id,
        action: 'role.assign',
        entityType: 'role',
        entityId: input.memberId,
        metadata: { role: input.role },
      }).catch(() => {
        // Audit logging should never block the mutation
      });

      return created;
    }),

  /**
   * Remove a role from a member (owner only). Phase 9 F9-18.
   * Logs the action to audit_log.
   */
  removeRole: ownerProcedure
    .input(
      z.object({
        memberId: z.string().uuid(),
        role: z.enum(['member', 'instructor', 'staff', 'manager', 'owner']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(roleAssignments)
        .where(
          and(
            eq(roleAssignments.memberId, input.memberId),
            eq(roleAssignments.role, input.role),
          ),
        );

      // Audit log
      await ctx.db.insert(auditLog).values({
        staffMemberId: ctx.session.user.memberId ?? ctx.session.user.id,
        action: 'role.remove',
        entityType: 'role',
        entityId: input.memberId,
        metadata: { role: input.role },
      }).catch(() => {
        // Audit logging should never block the mutation
      });

      return { success: true };
    }),

  /**
   * List audit log entries with filters (manager+ only). Phase 9 F9-20.
   */
  listAuditLog: managerProcedure
    .input(
      z.object({
        staffMemberId: z.string().uuid().optional(),
        action: z.string().max(100).optional(),
        start: z.coerce.date().optional(),
        end: z.coerce.date().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.staffMemberId) {
        conditions.push(eq(auditLog.staffMemberId, input.staffMemberId));
      }
      if (input.action) {
        conditions.push(eq(auditLog.action, input.action));
      }
      if (input.start) {
        conditions.push(gte(auditLog.createdAt, input.start));
      }
      if (input.end) {
        conditions.push(lte(auditLog.createdAt, input.end));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await ctx.db.query.auditLog.findMany({
        where,
        orderBy: desc(auditLog.createdAt),
        limit: input.limit,
        offset: input.offset,
      });

      const countRows = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLog)
        .where(where ?? sql`true`);
      const total = countRows[0]?.count ?? 0;

      return { items, total, limit: input.limit, offset: input.offset };
    }),

  /**
   * Recent member signups for dashboard (Phase 9 F9-03).
   * Returns the N most recently joined members with their email.
   */
  getRecentSignups: staffProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(5) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.members.findMany({
        with: { user: true },
        orderBy: desc(members.joinedAt),
        limit: input.limit,
      });
    }),
});

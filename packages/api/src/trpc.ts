/**
 * F3-01 — tRPC router factory, context type, and 4 procedure tiers.
 *
 * Per PAD §8.3, there are 4 access tiers:
 *   publicProcedure    — no auth required
 *   protectedProcedure — any authenticated user
 *   staffProcedure     — staff, manager, or owner
 *   ownerProcedure     — owner only
 *
 * Source: MEP Phase 3 F3-01, PAD §8.3 + §8.5, SKILL §5.8.
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { DrizzleDB } from '@stillwater/db';
import type { StudioRole } from '@stillwater/auth';

// ── Context shape (PAD §8.5) ──────────────────────────────────────
export interface TRPCContext {
  db: DrizzleDB;
  session: {
    user: {
      id: string;
      email: string;
      name: string | null;
      memberId: string | null;
      roles: StudioRole[];
    };
    session: { expires: string };
  } | null;
  jobs: { trigger: (task: string, payload: unknown) => Promise<unknown> };
  redis: { get: (key: string) => Promise<string | null>; set: (key: string, val: string) => Promise<string | null> };
  req: Request;
}

// ── tRPC instance ─────────────────────────────────────────────────
const t = initTRPC.context<TRPCContext>().create();

// ── Router factory ────────────────────────────────────────────────
export const router = t.router;
export const middleware = t.middleware;

// ── Procedure tiers (PAD §8.3) ────────────────────────────────────

// Tier 1: Public — no auth required
export const publicProcedure = t.procedure;

// Tier 2: Protected — any authenticated user
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

// Tier 3: Staff — staff, manager, or owner
export const staffProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const hasStaff = ctx.session.user.roles.some(
    (r: string) => ['staff', 'manager', 'owner'].includes(r),
  );
  if (!hasStaff) throw new TRPCError({ code: 'FORBIDDEN' });
  return next();
});

// Tier 4: Owner — owner only (highest privilege)
export const ownerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session.user.roles.includes('owner')) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next();
});

/**
 * F3-14 — Root router merging all 10 domain routers.
 *
 * This is the single entry point for the tRPC API. The `AppRouter` type
 * is exported for client-side type inference.
 *
 * Source: MEP Phase 3 F3-14, PAD §8.2.
 */

import { router } from './trpc';
import { scheduleRouter } from './routers/schedule';
import { classesRouter } from './routers/classes';
import { sessionsRouter } from './routers/sessions';
import { bookingsRouter } from './routers/bookings';
import { waitlistRouter } from './routers/waitlist';
import { membersRouter } from './routers/members';
import { instructorsRouter } from './routers/instructors';
import { membershipsRouter } from './routers/memberships';
import { paymentsRouter } from './routers/payments';
import { adminRouter } from './routers/admin';

export const appRouter = router({
  schedule: scheduleRouter,
  classes: classesRouter,
  sessions: sessionsRouter,
  bookings: bookingsRouter,
  waitlist: waitlistRouter,
  members: membersRouter,
  instructors: instructorsRouter,
  memberships: membershipsRouter,
  payments: paymentsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

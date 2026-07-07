/**
 * F3-15 — packages/api barrel export
 *
 * Public API surface for the @stillwater/api package.
 *
 * Source: MEP Phase 3 F3-15.
 */

export { appRouter, type AppRouter } from './root';
export { createContext } from './context';
export {
  router,
  publicProcedure,
  protectedProcedure,
  staffProcedure,
  ownerProcedure,
  middleware,
  type TRPCContext,
} from './trpc';
export { rateLimit } from './middleware/rateLimit';

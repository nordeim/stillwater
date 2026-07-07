/**
 * F2-05 — packages/auth barrel export
 *
 * Exports the Better Auth server config, client, and types.
 * Server-only `auth` is NOT bundled into client components —
 * client components import from `@stillwater/auth/client`.
 *
 * Source: MASTER_EXECUTION_PLAN.md F2-05.
 */

export { auth } from './config';
export type { Session } from './config';
export { resend } from './resend-client';

// Re-export client + types (created in Cycle 2)
export { authClient, signIn, signOut, useSession } from './client';
export type {
  ActiveSubscriptionSummary,
  StillwaterSession,
} from './types';

// RBAC (created in Cycle 3)
export { can, type Permission, type Role, type StudioRole } from './rbac';

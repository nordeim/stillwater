/**
 * F1-14 — Schema barrel export
 *
 * Re-exports all 14 tables and 8 enums for use by the db client (F1-15)
 * and the tRPC API layer (Phase 3).
 *
 * This file is the schema entry point referenced by drizzle.config.ts:
 *   schema: "./src/schema/index.ts"
 *
 * Source: MASTER_EXECUTION_PLAN.md F1-14, PAD.md §7.1.
 */

// Enums (8)
export * from './enums';

// Identity tables (3)
export * from './users';
export * from './members';
export * from './instructors';

// Class catalog tables (3)
export * from './class-styles';
export * from './classes';
export * from './rooms';

// Booking tables (3)
export * from './sessions';
export * from './enrollments';
export * from './waitlist';

// Billing tables (3)
export * from './memberships';
export * from './payments';

// RBAC table (1)
export * from './role-assignments';

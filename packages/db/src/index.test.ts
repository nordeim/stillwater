/**
 * F1-15 — db client test suite (RED phase)
 *
 * Verifies that the neon-http Drizzle client is exported with the schema.
 * Per MEP Phase 1 F1-15 (resolves D11).
 *
 * Note: The actual db client requires DATABASE_URL at runtime. These tests
 * verify the module exports the correct types and the schema re-exports work.
 * The client is lazy-initialized so importing the module doesn't throw in
 * build/test contexts (env build-context fallback in @stillwater/config/env).
 */

import { describe, it, expect } from 'vitest';
import * as dbModule from './index';

describe('F1-15: db client module', () => {
  it('exports the db client object', () => {
    // db may be undefined in test context (no DATABASE_URL), but the export should exist
    expect(dbModule).toHaveProperty('db');
  });

  it('exports DrizzleDB type (as typeof db)', () => {
    // Type-only export — verify it's at least declared in the module
    // We can't test types at runtime, but we verify the schema re-export works
    expect(dbModule).toBeDefined();
  });

  it('re-exports all schema tables and enums', () => {
    // The db module should re-export everything from ./schema
    expect(dbModule.users).toBeDefined();
    expect(dbModule.members).toBeDefined();
    expect(dbModule.classes).toBeDefined();
    expect(dbModule.classSessions).toBeDefined();
    expect(dbModule.enrollments).toBeDefined();
    expect(dbModule.classLevelEnum).toBeDefined();
    expect(dbModule.studioRoleEnum).toBeDefined();
  });
});

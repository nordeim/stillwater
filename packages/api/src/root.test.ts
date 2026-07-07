/**
 * F3-14 — Root router test suite
 *
 * Verifies all 10 routers are merged into appRouter.
 * tRPC v11 flattens procedure paths (e.g., 'schedule.getWeek').
 */

import { describe, it, expect } from 'vitest';
import { appRouter } from './root';

describe('F3-14: Root router', () => {
  it('appRouter has all 10 router keys as prefixes in procedure paths', () => {
    const procedurePaths = Object.keys(appRouter._def.procedures);

    // tRPC v11 flattens paths: 'schedule.getWeek', 'bookings.book', etc.
    const routerPrefixes = new Set(
      procedurePaths.map((p) => p.split('.')[0]),
    );

    const expectedRouters = [
      'schedule', 'classes', 'sessions', 'bookings', 'waitlist',
      'members', 'instructors', 'memberships', 'payments', 'admin',
    ];

    for (const router of expectedRouters) {
      expect(routerPrefixes.has(router)).toBe(true);
    }
    expect(routerPrefixes.size).toBe(10);
  });

  it('appRouter has ~30+ procedures across all routers', () => {
    const procedurePaths = Object.keys(appRouter._def.procedures);
    // 10 routers × ~3 procedures each = ~30 minimum
    expect(procedurePaths.length).toBeGreaterThanOrEqual(25);
  });
});

/**
 * F3-19 — Centralised query key factory for cache invalidation
 *
 * Used by useQuery and utils.invalidateQueries() to ensure consistent
 * cache keys across the app.
 *
 * Source: MEP Phase 3 F3-19.
 */

export const queryKeys = {
  schedule: {
    week: (weekStart: Date) => ['schedule', 'week', weekStart.toISOString()] as const,
    session: (id: string) => ['schedule', 'session', id] as const,
  },
  classes: {
    list: () => ['classes', 'list'] as const,
    bySlug: (slug: string) => ['classes', 'bySlug', slug] as const,
  },
  instructors: {
    list: () => ['instructors', 'list'] as const,
    bySlug: (slug: string) => ['instructors', 'bySlug', slug] as const,
  },
  bookings: {
    myClasses: () => ['bookings', 'my-classes'] as const,
  },
  members: {
    profile: () => ['members', 'profile'] as const,
    history: () => ['members', 'history'] as const,
  },
  memberships: {
    plans: () => ['memberships', 'plans'] as const,
    mySubscription: () => ['memberships', 'my-subscription'] as const,
  },
  admin: {
    dashboard: () => ['admin', 'dashboard'] as const,
    revenue: (start: string, end: string) => ['admin', 'revenue', start, end] as const,
    roster: (sessionId: string) => ['admin', 'roster', sessionId] as const,
  },
} as const;

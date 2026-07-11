/**
 * F12-21 — Static stats (42+ classes, 8 instructors, 3 rooms)
 *
 * Falls back to hardcoded values if DB unreachable.
 * Refreshed on ISR revalidation.
 *
 * Source: MEP Phase 12 F12-21.
 */

export interface StudioStats {
  weeklyClasses: number;
  instructorCount: number;
  studioRooms: number;
}

const FALLBACK_STATS: StudioStats = {
  weeklyClasses: 42,
  instructorCount: 8,
  studioRooms: 3,
};

/**
 * Get studio stats. In production, these would be computed from the DB
 * at build time (ISR). For now, returns hardcoded fallback values.
 *
 * To wire to DB: call from a Server Component with apiCaller() and
 * count active classes + instructors. If the call fails, fall back.
 */
export function getStudioStats(): StudioStats {
  return FALLBACK_STATS;
}

export const STATS_DISPLAY = [
  { label: 'Weekly Classes', value: `${String(FALLBACK_STATS.weeklyClasses)}+` },
  { label: 'Instructors', value: String(FALLBACK_STATS.instructorCount) },
  { label: 'Studio Rooms', value: String(FALLBACK_STATS.studioRooms) },
] as const;

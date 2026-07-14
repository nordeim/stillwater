/**
 * F12-21 — Studio stats (used on home page hero + studio space section)
 *
 * M3 fix (2026-07-14): Updated fallback values to match the actual seed
 * data (3 instructors, 2 rooms, 7 weekly sessions) rather than the
 * aspirational mockup numbers (8 instructors, 3 rooms, 42+ classes).
 * The mockup numbers are marketing aspirations; the production site
 * should show real data. When the DB is reachable, getStudioStats()
 * should be wired to count active records.
 *
 * Source: MEP Phase 12 F12-21, static_landing_page_mockup.html §05.
 */

export interface StudioStats {
  weeklyClasses: number;
  instructorCount: number;
  studioRooms: number;
}

// Fallback values match the seed data (packages/db/src/seed/fixtures/)
// — 3 instructors, 2 rooms, 7 weekly sessions.
const FALLBACK_STATS: StudioStats = {
  weeklyClasses: 7,
  instructorCount: 3,
  studioRooms: 2,
};

/**
 * Get studio stats. Returns fallback values matching seed data.
 *
 * To wire to DB: call from a Server Component with apiCaller() and
 * count active classes + instructors. If the call fails, fall back.
 */
export function getStudioStats(): StudioStats {
  return FALLBACK_STATS;
}

export const STATS_DISPLAY = [
  { label: 'Weekly Classes', value: String(FALLBACK_STATS.weeklyClasses) },
  { label: 'Instructors', value: String(FALLBACK_STATS.instructorCount) },
  { label: 'Studio Rooms', value: String(FALLBACK_STATS.studioRooms) },
] as const;

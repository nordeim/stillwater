/**
 * V17-6 fix: escapeIlikePattern utility
 *
 * Escapes PostgreSQL ILIKE wildcards (%, _) and the escape character (\)
 * in user-supplied search strings so they're treated as literal characters.
 *
 * Without this escape, a search for "%admin%" would match every row
 * containing "admin" (because % is the ILIKE wildcard for "any sequence"),
 * rather than only rows containing the literal string "%admin%".
 *
 * PostgreSQL ILIKE escape rules (https://www.postgresql.org/docs/current/functions-matching.html):
 *   - % — matches any sequence of zero or more characters
 *   - _ — matches any single character
 *   - \ — the default escape character (to match a literal \, write \\)
 *
 * To match a literal % or _, prefix with backslash: \%, \_
 * To match a literal \, write \\ (which in a JS string literal is '\\\\')
 *
 * Usage in Drizzle:
 *   import { ilike } from 'drizzle-orm';
 *   import { escapeIlikePattern } from '../lib/ilike';
 *
 *   const results = await db.query.classes.findMany({
 *     where: ilike(classes.title, `%${escapeIlikePattern(input.search)}%`),
 *   });
 *
 * The outer `%...%` wrapper is intentional — it makes the search a
 * substring match. The escape only applies to the user-supplied middle part.
 *
 * Source: STILLWATER_AUDIT_REPORT.md §7 Finding #12;
 *         PostgreSQL docs — https://www.postgresql.org/docs/current/functions-matching.html
 */

/**
 * Escape a user-supplied search string for safe interpolation into a
 * PostgreSQL ILIKE pattern.
 *
 * @param input - The raw user input (e.g. from a tRPC procedure input)
 * @returns The escaped string, safe to interpolate into an ILIKE pattern
 *
 * @example
 *   escapeIlikePattern('vinyasa')        // → 'vinyasa'
 *   escapeIlikePattern('%admin%')        // → '\\%admin\\%'
 *   escapeIlikePattern('y_ga')           // → 'y\\_ga'
 *   escapeIlikePattern('\\')             // → '\\\\' (matches literal backslash)
 */
export function escapeIlikePattern(input: string): string {
  if (input === '') return '';

  // Escape backslash FIRST (otherwise the backslashes we add for % and _
  // would themselves be escaped). Each literal \ in the input becomes \\.
  // In a JS string literal, '\\' is one backslash, so '\\\\' is two.
  // We use .replace(/\\/g, '\\\\\\\\') which is "replace \ with \\\\".
  return input
    .replace(/\\/g, '\\\\') // \ → \\ (must be first)
    .replace(/%/g, '\\%') // % → \%
    .replace(/_/g, '\\_'); // _ → \_
}

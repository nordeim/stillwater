/**
 * V17-6 fix: escapeIlikePattern utility
 *
 * The admin router's search procedures used `ilike(classes.title, \`%${input.search}%\`)`
 * which doesn't escape user-supplied wildcards. A search for "%admin%" would match
 * unintended rows because the % wildcard was being inserted verbatim.
 *
 * The fix: escapeIlikePattern escapes % and _ in user input so they're treated as
 * literal characters, not wildcards. Drizzle's ilike() uses Postgres ILIKE under
 * the hood, which supports ESCAPE clauses — but the default escape character is
 * backslash (\), so we escape via backslash.
 *
 * Source: STILLWATER_AUDIT_REPORT.md §7 Finding #12;
 *         PostgreSQL docs — https://www.postgresql.org/docs/current/functions-matching.html
 */

import { describe, it, expect } from 'vitest';

import { escapeIlikePattern } from './ilike';

describe('V17-6: escapeIlikePattern', () => {
  it('returns empty string for empty input', () => {
    expect(escapeIlikePattern('')).toBe('');
  });

  it('returns input unchanged when no wildcards present', () => {
    expect(escapeIlikePattern('vinyasa')).toBe('vinyasa');
    expect(escapeIlikePattern('Yin Yoga')).toBe('Yin Yoga');
    expect(escapeIlikePattern('class-name')).toBe('class-name');
  });

  it('escapes % wildcard (matches any sequence in ILIKE)', () => {
    // User searching for "%admin%" should NOT match every row containing "admin"
    // — they should match only the literal string "%admin%".
    expect(escapeIlikePattern('%admin%')).toBe('\\%admin\\%');
  });

  it('escapes _ wildcard (matches any single char in ILIKE)', () => {
    // User searching for "y_ga" should NOT match "yoga", "yaga", etc. — they
    // should match only the literal string "y_ga".
    expect(escapeIlikePattern('y_ga')).toBe('y\\_ga');
  });

  it('escapes backslash itself (the escape character)', () => {
    // Drizzle uses parameterized queries (bind parameters) — the pattern is
    // NOT processed by PostgreSQL's string-literal parser. So we only need
    // 2 backslashes in the JS string (not 4 as the PostgreSQL docs suggest
    // for SQL string literals).
    //
    // ILIKE parses: '\\' → 1 literal backslash match.
    // JS string: '\\\\' = 2 backslashes (each \\ in source = 1 backslash).
    expect(escapeIlikePattern('\\')).toBe('\\\\');
  });

  it('escapes mixed wildcards + literal backslash', () => {
    // Input: '50%_off\deal' (1 backslash before 'deal')
    // Output: '50\%\_off\\deal' (% and _ escaped, \ doubled)
    expect(escapeIlikePattern('50%_off\\deal')).toBe('50\\%\\_off\\\\deal');
  });

  it('does NOT escape other regex metacharacters (they are literals in ILIKE)', () => {
    // ILIKE is NOT regex — it's SQL LIKE (case-insensitive). Characters like
    // ., *, +, ?, (), [], {} are literal in ILIKE and should NOT be escaped.
    expect(escapeIlikePattern('class.*')).toBe('class.*');
    expect(escapeIlikePattern('[vip]')).toBe('[vip]');
  });
});

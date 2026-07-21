/**
 * V17-7 fix: studio layout must NOT leak user UUID to the DOM
 *
 * VERIFIES that the (studio)/layout.tsx does not render a `data-session`
 * attribute containing the user's UUID.
 *
 * V17-7 fix: The previous implementation had
 *   <div className="studio-shell" data-session={session.user.id}>
 * which leaked the user's UUID into the DOM. While UUIDs are not directly
 * sensitive (they're not sequential and not guessable), exposing them:
 *   - Makes user enumeration easier if combined with other vectors
 *   - Provides no functional benefit (the attribute wasn't read anywhere)
 *   - Violates the principle of least exposure (don't expose identifiers
 *     that aren't needed client-side)
 *
 * The fix: remove the data-session attribute entirely.
 *
 * Source: STILLWATER_AUDIT_REPORT.md §7 Finding #13
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const studioLayoutContent = readFileSync(
  resolve(__dirname, '../../../../app/(studio)/layout.tsx'),
  'utf-8',
);

describe('V17-7: studio layout must not leak user UUID to DOM', () => {
  it('does NOT render data-session attribute (V17-7)', () => {
    // The layout must NOT contain 'data-session' anywhere — not in JSX,
    // not in a comment, not in a string. The attribute was removed because
    // it leaked the user's UUID into the DOM with no functional benefit.
    expect(studioLayoutContent).not.toContain('data-session');
  });

  it('still calls requireAuth (Layer 2 auth boundary preserved)', () => {
    // Sanity check: removing data-session must NOT also remove the auth check.
    expect(studioLayoutContent).toContain('requireAuth');
  });

  it('still renders main#main-content (accessibility preserved)', () => {
    // Sanity check: skip-link target must still be present.
    expect(studioLayoutContent).toContain('id="main-content"');
  });
});

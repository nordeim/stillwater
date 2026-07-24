/**
 * V19-1 regression test: --color-sand-50 and --color-sand-100 must be defined.
 *
 * These tokens are referenced 100+ times across the codebase
 * (Hero CTA, Footer wordmark, NewsletterForm, SkipLink, Checkbox checkmark, etc.).
 * Before V19-1, they were NEVER defined, causing every primary CTA and the
 * Footer wordmark to render INVISIBLE (dark inherited text on dark backgrounds).
 *
 * This test guarantees the tokens stay defined in both:
 *   - packages/ui/src/tokens/colors.css  (the :root source of truth)
 *   - apps/web/src/app/globals.css       (the @theme mapping for Tailwind v4)
 *
 * Per SKILL.md §11.5 regression test verification cycle:
 *   1. Write the regression test  ✓
 *   2. Run → MUST PASS (with fix applied)
 *   3. Revert the fix → MUST FAIL (confirms test guards the bug)
 *   4. Restore the fix → MUST PASS
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const COLORS_CSS = resolve(
  __dirname,
  '../../../../../packages/ui/src/tokens/colors.css',
);
const GLOBALS_CSS = resolve(__dirname, '../../app/globals.css');

describe('V19-1: sand-50 and sand-100 tokens are defined', () => {
  it('colors.css defines --color-sand-50 in :root', () => {
    const css = readFileSync(COLORS_CSS, 'utf8');
    expect(css).toMatch(/--color-sand-50:\s*#[0-9a-fA-F]{6}/);
  });

  it('colors.css defines --color-sand-100 in :root', () => {
    const css = readFileSync(COLORS_CSS, 'utf8');
    expect(css).toMatch(/--color-sand-100:\s*#[0-9a-fA-F]{6}/);
  });

  it('globals.css maps --color-sand-50 in @theme', () => {
    const css = readFileSync(GLOBALS_CSS, 'utf8');
    expect(css).toMatch(/--color-sand-50:\s*var\(--color-sand-50\)/);
  });

  it('globals.css maps --color-sand-100 in @theme', () => {
    const css = readFileSync(GLOBALS_CSS, 'utf8');
    expect(css).toMatch(/--color-sand-100:\s*var\(--color-sand-100\)/);
  });
});

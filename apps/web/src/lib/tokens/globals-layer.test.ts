/**
 * V20-1 regression test: globals.css resets must be wrapped in @layer base.
 *
 * Before V20-1, the `* { margin: 0; padding: 0; box-sizing: border-box; }`
 * reset and `a { color: var(--color-action); }` link style in
 * `packages/ui/src/globals.css` were UNLAYERED. In Tailwind v4, unlayered
 * rules beat `@layer utilities` rules — so every `px-6`, `py-3`, `text-sand-50`
 * utility on anchor CTAs was silently overridden.
 *
 * Symptoms on the live site:
 *   - Navbar height 33px (should be ~65px with `py-4`)
 *   - Every `<section class="px-6 py-24">` had padding 0
 *   - Hero CTA 123×22px (should be ~172×46px with `px-6 py-3`)
 *   - Schedule "Book" buttons: clay-400 text on clay-500 bg = 1.67:1 contrast (WCAG AA FAIL)
 *   - SkipLink focus state 1×1 px (invisible — WCAG 2.4.1 + 2.4.7 FAIL)
 *
 * The fix: wrap both rules in `@layer base { ... }` so Tailwind v4's cascade
 * (`@layer base` < `@layer utilities`) works as intended.
 *
 * Per SKILL.md §11.5 regression test verification cycle.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

const UI_GLOBALS_CSS = resolve(
  __dirname,
  '../../../../../packages/ui/src/globals.css',
);

describe('V20-1: globals.css resets wrapped in @layer base', () => {
  it('globals.css contains @layer base block', () => {
    const css = readFileSync(UI_GLOBALS_CSS, 'utf8');
    expect(css).toMatch(/@layer\s+base\s*\{/);
  });

  it('the * { margin: 0; padding: 0 } reset is INSIDE @layer base', () => {
    const css = readFileSync(UI_GLOBALS_CSS, 'utf8');
    // Find the @layer base block and verify the reset is inside it
    const layerMatch = /@layer\s+base\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(layerMatch).not.toBeNull();
    const layerContent = layerMatch![1] ?? '';
    expect(layerContent).toMatch(/\*[\s\S]*?margin:\s*0/);
    expect(layerContent).toMatch(/\*[\s\S]*?padding:\s*0/);
  });

  it('the a { color: var(--color-action) } link style is INSIDE @layer base', () => {
    const css = readFileSync(UI_GLOBALS_CSS, 'utf8');
    const layerMatch = /@layer\s+base\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(layerMatch).not.toBeNull();
    const layerContent = layerMatch![1] ?? '';
    expect(layerContent).toMatch(/a\s*\{[\s\S]*?color:\s*var\(--color-action\)/);
  });

  it('the * reset is NOT unlayered (must be inside @layer base)', () => {
    const css = readFileSync(UI_GLOBALS_CSS, 'utf8');
    // Remove the @layer base block, then verify no unlayered * reset remains
    const withoutLayer = css.replace(/@layer\s+base\s*\{[\s\S]*?\n\}/, '');
    // Should NOT find an unlayered * { margin: 0 } rule
    expect(withoutLayer).not.toMatch(/^\*[\s\S]*?margin:\s*0/m);
  });
});

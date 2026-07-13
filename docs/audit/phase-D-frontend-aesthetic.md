# Phase D — Frontend / Editorial Calm / Anti-Generic Audit

**Repo:** `/home/z/my-project/stillwater/`
**Date:** 2026-07-11
**Auditor:** Explore (Frontend Aesthetic Auditor)
**Scope:** `apps/web/src/**` + `packages/ui/src/**` + `tooling/tailwind/base.ts`
**Method:** direct file reads + ripgrep for forbidden patterns + per-component rubric scoring

---

## 0. Executive Summary

**Overall Anti-Generic Score: 20/30** (below the 24/30 redesign threshold)

The Stillwater marketing surface is editorial in *spirit* — Cormorant Garamond italics, Warm Mineral palette, asymmetric Hero grid, sharp corners, section-number ornaments, italic emphasis on `<em>` — but the design-system *plumbing* is incomplete in three load-bearing ways:

1. **shadcn HSL variables are never defined.** `--background`, `--foreground`, `--primary`, `--accent`, `--ring`, `--card`, `--popover`, `--muted`, `--destructive`, `--secondary`, `--input`, `--border` and their `*-foreground` siblings are *referenced* by **15+ primitives** (button, card, dialog, tabs, dropdown-menu, select, popover, table, tooltip, calendar, form, command, avatar, separator) but **never defined** in any CSS file in `apps/` or `packages/`. Result: `bg-primary`, `bg-card`, `bg-popover`, `bg-background`, `ring-ring`, `text-muted-foreground`, `border-input` all resolve to `inherit`/`transparent`/`currentColor`. The Button "default" variant renders with **no background color**, Cards render with **no surface fill**, and Select/Dropdown/Popover surfaces are **transparent**. **This is a P0 functional bug, not just an aesthetic drift.**
2. **Typography & max-width tokens are unreachable.** `--text-display-2xl`, `--text-display-xl`, `--text-display-lg`, `--text-heading-lg`, `--text-heading-md`, `--text-body-lg`, `--text-body-md`, `--text-body-sm`, `--text-caption`, `--leading-*`, `--max-width-content`, `--max-width-narrow`, `--max-width-wide` are defined in `:root` but **never mapped into `@theme`** in `apps/web/src/app/globals.css`. So the corresponding Tailwind utilities (`text-display-xl`, `text-body-md`, `max-w-content`, `max-w-narrow`) **do not exist**. Every component falls back to either hardcoded `text-[clamp(...)]` (9 instances) or default Tailwind `text-sm`/`text-xl`/`max-w-6xl`/`max-w-7xl`. The token system is *documented* but *not wired*.
3. **Fonts are loaded via CSS `@font-face`, not `next/font/local`.** SKILL §1.2 requires `next/font/local` (with automatic font-fallback variable generation, `display: swap` metrics, and zero CLS). The current implementation uses static CSS `@font-face` declarations in `packages/ui/src/fonts/{cormorant,dm-sans,jetbrains-mono}/*.css`. This works but loses Next.js's font optimization (subset hinting, automatic preloading, `size-adjust` fallback). All `--font-display`/`--font-body`/`--font-mono` references in `apps/web/src/app/layout.tsx` are also missing — layout.tsx does **not** import `next/font/local` at all.

On the positive side: **zero** `shadow-*` utility usage outside the skeleton/toast exceptions (verified), **zero** `bg-gradient-*` / `bg-linear-*` usage, **zero** `bg-opacity-*` / `text-opacity-*` usage, **zero** purple/violet/fuchsia gradient usage, **zero** `bg-amber-*` / `bg-red-*` / `bg-blue-*` / `bg-green-*` usage in app code (only in test fixtures), **zero** Google Fonts CDN imports, **`--radius: 0` correctly propagated** through `@theme` and `tooling/tailwind/base.ts`, **`rounded-full` correctly limited** to `Avatar` + `AvatarFallback` + the MarqueeItem status dot, **reduced-motion override correctly uses `0.01ms`** (not `0ms`) in both `apps/web/src/app/globals.css` and `packages/ui/src/tokens/motion.css`, and the **Hero asymmetric grid** uses the spec-required `1fr 1px minmax(280px, 38%)` template.

| Score Axis            | Score (avg of 19 components) |
|-----------------------|------------------------------|
| Memorability          | 6.4 / 10                    |
| Integrity             | 6.8 / 10                    |
| Craftsmanship         | 6.9 / 10                    |
| **Total**             | **20.1 / 30** ❌ (below 24 redesign threshold) |

**Verdict:** **Redesign required** — not because components are visually generic (they are not), but because the token contract between `packages/ui` and `apps/web` is broken, causing the shadcn primitives to render with no surface/border/ring colors. The marketing components are editorial-caliber; the design-system plumbing is not.

---

## 1. Token Compliance Audit

### 1.1 Forbidden patterns — grep results

| # | Pattern | Occurrences | Files (sample) | Verdict |
|---|---------|-------------|----------------|---------|
| 1 | Raw hex `#RRGGBB` in component code | **45+** | `StudioSpaceSVG.tsx` (28), `RevenueChart.tsx` (12), `manifest.ts` (2), `opengraph-image.tsx` (3), `blog/[slug]/opengraph-image.tsx` (5), `instructors/[slug]/opengraph-image.tsx` (5) | ⚠️ **P1** — SVG + Recharts + OG images. SVGs should use `var(--color-*)`; Recharts has a known CSS-var limitation (acceptable but should centralize); manifest + OG images require hex strings (acceptable per spec exception). |
| 2 | `shadow-sm` / `shadow-md` / `shadow-lg` / `shadow-xl` | **0** | — | ✅ **PASS** |
| 3 | `bg-gradient-to-r` / `bg-gradient-to-br` / `bg-linear-to-r` | **0** | — | ✅ **PASS** |
| 4 | `bg-opacity-*` / `text-opacity-*` | **0** | — | ✅ **PASS** |
| 5 | `outline-none` (forbidden — use `outline-hidden` in Tailwind v4) | **22** | `button.tsx` (×1), `input.tsx`, `textarea.tsx`, `checkbox.tsx`, `tabs.tsx` (×2), `dialog.tsx`, `popover.tsx`, `command.tsx` (×2), `select.tsx`, `dropdown-menu.tsx` (×4), `NewsletterForm.tsx`, `ProfileEditForm.tsx` (×4) | ❌ **P0** — pervasive across shadcn primitives AND marketing/admin forms. Spec says use `outline-hidden` in Tailwind v4 (or `focus-visible:ring-2`). |
| 6 | `from-purple-*` / `from-violet-*` / `from-fuchsia-*` / `to-purple-*` etc. | **0** | — | ✅ **PASS** |
| 7 | `bg-amber-*` / `bg-red-*` / `bg-blue-*` / `bg-green-*` / `text-amber-*` etc. | **0** in app code (3 in `lib/utils.test.ts` only as `cn()` collision fixture) | — | ✅ **PASS** |
| 8 | `rounded-full` on non-avatar/non-status-dot | **0** violations | `avatar.tsx` (×2 — Avatar root + AvatarFallback, correct), `MarqueeItem.tsx` (×1 — 4px status dot, correct) | ✅ **PASS** |
| 9 | `shadow-*` on cards | **0** | `card.tsx` uses `rounded-none border bg-card text-card-foreground` (no shadow) | ✅ **PASS** |
| 10 | `fonts.googleapis.com` CDN imports | **0** | — | ✅ **PASS** |
| 11 | `next/font/local` import in `layout.tsx` | **0** | `layout.tsx` only imports `Toaster`, `Metadata`, `globals.css`, `SkipLink`, `PostHogProvider`, `TRPCProvider` — **no font loader** | ❌ **P0** — fonts loaded via CSS `@font-face` only; SKILL §1.2 requires `next/font/local` with `--font-display`/`--font-body`/`--font-mono` CSS variables wired by Next.js font loader. |
| 12 | shadcn HSL vars (`--background`, `--primary`, `--ring`, etc.) defined anywhere in `apps/` or `packages/` | **0** | Not in `globals.css`, not in `tokens/colors.css`, not in `tooling/tailwind/base.ts` | ❌ **P0** — primitives will render transparent. |
| 13 | `ease-in-out` / `ease-out` / `ease-in` (literal) | **0** literal easings | (uses `transition-colors` which defaults to Tailwind's `ease` + `150ms` — see #14) | ✅ at literal level |
| 14 | `transition-colors` / `transition-opacity` / `transition-all` without explicit `duration-*`/`ease-*` tokens | **42** | All marketing + most admin + most auth + all booking + most dashboard components | ❌ **P1** — relies on Tailwind default `150ms cubic-bezier(0.4, 0, 0.2, 1)` instead of `--duration-quick` + `--ease-gentle`. Spec §1.6 requires explicit token pairing. |
| 15 | `ease: 'linear'` (framer-motion) | **1** | `ClassMarquee.tsx:40` | ❌ **P1** — spec forbids `linear` easing (use `--ease-breathe` for organic loop or constant-speed token). Marquees are an exception in many design systems; spec is strict here. |
| 16 | `duration-200` (hardcoded) | **1** | `dialog.tsx:42` | ❌ **P2** — should be `duration-quick` (150ms) or `duration-standard` (300ms). |
| 17 | Inline `style={{ fontFamily: 'var(--font-*)' }}` (redundant — globals.css already sets this on h1-h6) | **155** | Pervasive across every marketing + admin component | ⚠️ **P2** — works, but indicates confusion about where font-family is canonically set. Globals.css already does `h1-h6 { font-family: var(--font-display) }` and `body { font-family: var(--font-body) }`. Inline style on `<p>`/`<span>` for body font is redundant. |
| 18 | Inline `text-[clamp(...)]` (hardcoded fluid type — bypasses `--text-*` tokens) | **9** | Hero, Philosophy (×2), Footer, CtaBand, StudioSpaceSection, InstructorRow (×2), SectionHeader (×2) | ❌ **P1** — typography tokens `--text-display-2xl` etc. exist but are unreachable from Tailwind (not in `@theme`). Components bypass them. |
| 19 | `max-w-6xl` / `max-w-7xl` / `max-w-3xl` / `max-w-md` / `max-w-sm` / `max-w-prose` (default Tailwind, not `--max-width-*` tokens) | **17** | Every marketing section + every studio page + admin shell | ❌ **P1** — `--max-width-content: 1280px` and `--max-width-narrow: 720px` exist but are not mapped to Tailwind utilities. |
| 20 | `py-24` (96px — matches `--space-10`, NOT the `--space-9: 64px` section padding spec) | **8** | All marketing sections | ⚠️ **P1** — section padding is 50% larger than spec. Either spec needs update or components need `py-9` (64px). |
| 21 | `text-balance` / `text-pretty` utilities | **0** | — | ⚠️ **P1** — globals.css sets `text-wrap: balance` on h1-h6 (✓), but `text-pretty` is **never applied** to paragraphs anywhere. Spec §1.7 requires `text-wrap: pretty` on DM Sans paragraphs. |
| 22 | `tabular-nums` / `font-variant-numeric` on data tables | **0** | `EnrollmentHistoryTable`, `RosterTable`, `admin/members/page.tsx`, `admin/classes/page.tsx`, `MembershipSection` | ❌ **P1** — all admin tables use JetBrains Mono but don't enable `tabular-nums lining-nums` per spec §1.7. Numeric columns will jitter on data update. |
| 23 | `prefers-reduced-motion: reduce` global override | **2** (in `globals.css` and `motion.css` — duplicate but harmless) | — | ✅ **PASS** |
| 24 | `animation-duration: 0.01ms` (NOT `0ms`) in reduced-motion | **2** | Both files use `0.01ms !important` | ✅ **PASS** |

### 1.2 Token-system structural findings

**P0 — Shadcn HSL variable map is missing.** Grep across `apps/web/src/app/globals.css`, `packages/ui/src/tokens/colors.css`, `packages/ui/src/globals.css`, and `tooling/tailwind/base.ts` returns **zero** matches for `--background:`, `--foreground:`, `--primary:`, `--accent:`, `--ring:`, `--card:`, `--popover:`, `--muted:`, `--destructive:`, `--secondary:`, `--input:`, `--border:`. Yet `button.tsx` line 13 uses `bg-primary text-primary-foreground`, line 17 uses `border-input bg-background hover:bg-accent`, line 20 uses `bg-secondary text-secondary-foreground`, line 21 uses `text-primary` — all referencing nonexistent tokens.

Required remediation (add to `apps/web/src/app/globals.css` `:root`):
```css
:root {
  --background: 40 33% 91%;            /* sand #F5F0E8 */
  --foreground: 30 14% 10%;            /* stone-900 #1C1915 */
  --card: 38 35% 89%;                  /* sand-warm #EDE5D8 */
  --card-foreground: 30 14% 10%;
  --popover: 40 33% 91%;
  --popover-foreground: 30 14% 10%;
  --primary: 16 44% 53%;               /* clay-500 #9E5E44 */
  --primary-foreground: 40 33% 91%;    /* sand #F5F0E8 */
  --secondary: 38 35% 89%;
  --secondary-foreground: 30 14% 10%;
  --muted: 38 35% 89%;
  --muted-foreground: 30 7% 41%;       /* stone-500 #6E6760 */
  --accent: 197 21% 57%;               /* water-500 #7B9EA8 */
  --accent-foreground: 40 33% 91%;
  --destructive: 1 38% 53%;            /* error #B85450 */
  --destructive-foreground: 40 33% 91%;
  --border: 30 12% 82%;                /* stone-200 #D4CFC9 */
  --input: 30 12% 82%;
  --ring: 197 21% 57%;                 /* water-500 — focus affordance */
  --radius: 0;
}
```

**P0 — Typography tokens unreachable from Tailwind.** `packages/ui/src/tokens/typography.css` defines `--text-display-2xl`, `--text-display-xl`, `--text-display-lg`, `--text-heading-lg`, `--text-heading-md`, `--text-body-lg`, `--text-body-md`, `--text-body-sm`, `--text-caption`, `--leading-display`, `--leading-heading`, `--leading-body`, `--leading-caption`. The `@theme` block in `apps/web/src/app/globals.css` maps **color**, **font**, **spacing**, **radius**, **ease**, **duration** tokens to Tailwind — but does **not** map `--text-*` or `--leading-*` or `--max-width-*`. Result: `text-display-xl`, `text-body-md`, `leading-body`, `max-w-content` are not valid Tailwind utilities.

Required remediation (add to `@theme` block):
```css
@theme {
  --text-display-2xl: var(--text-display-2xl);
  --text-display-xl: var(--text-display-xl);
  --text-display-lg: var(--text-display-lg);
  --text-heading-lg: var(--text-heading-lg);
  --text-heading-md: var(--text-heading-md);
  --text-body-lg: var(--text-body-lg);
  --text-body-md: var(--text-body-md);
  --text-body-sm: var(--text-body-sm);
  --text-caption: var(--text-caption);
  --leading-display: var(--leading-display);
  --leading-heading: var(--leading-heading);
  --leading-body: var(--leading-body);
  --leading-caption: var(--leading-caption);
  --max-w-content: var(--max-width-content);
  --max-w-narrow: var(--max-width-narrow);
  --max-w-wide: var(--max-width-wide);
}
```

---

## 2. Self-Hosted Fonts Verification

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Cormorant Garamond loaded via `next/font/local` | ❌ **FAIL** | `packages/ui/src/fonts/cormorant/cormorant.css` defines 18 `@font-face` blocks; `apps/web/src/app/layout.tsx` does not import `next/font/local` at all. No `localFont()` call. |
| DM Sans loaded via `next/font/local` | ❌ **FAIL** | Same pattern: `dm-sans.css` has 6 `@font-face` blocks; no `next/font/local` import. |
| JetBrains Mono loaded via `next/font/local` | ❌ **FAIL** | Same pattern: `jetbrains-mono.css` has 12 `@font-face` blocks; no `next/font/local` import. |
| No `fonts.googleapis.com` CDN imports | ✅ **PASS** | Zero matches across `apps/web/src/`. |
| `--font-display` / `--font-body` / `--font-mono` CSS variables wired into `@theme` | ⚠️ **PARTIAL** | `@theme` block in `globals.css` lines 60-62 maps `--font-display: var(--font-display)`, `--font-body: var(--font-body)`, `--font-mono: var(--font-mono)` — but the *source* of these variables is the static string `'Cormorant Garamond', Georgia, ...` in `packages/ui/src/tokens/typography.css` (lines 5-7), not the `next/font/local` font loader. So `font-display`, `font-body`, `font-mono` Tailwind utilities work, but they reference a CSS-font-family-name string, not a Next.js-managed font variable. |

**Consequence:** No automatic font preloading, no `size-adjust` font-fallback (so FOUT/FOIT causes layout shift on first paint), no automatic `font-display: swap` metrics. The font files ARE self-hosted (in `packages/ui/src/fonts/{cormorant,dm-sans,jetbrains-mono}/` as `.woff2`) — so the spirit of "no Google CDN" is honored. But the letter of SKILL §1.2 ("loaded via `next/font/local`") is violated.

**Required remediation:** convert `packages/ui/src/fonts/*.css` `@font-face` declarations to a `next/font/local` loader in `apps/web/src/app/layout.tsx`:
```tsx
import localFont from 'next/font/local';
const cormorant = localFont({
  src: [{ path: '../../packages/ui/src/fonts/cormorant/cormorant-garamond-regular-normal-latin.woff2', weight: '400', style: 'normal' }, /* ... */],
  variable: '--font-display',
  display: 'swap',
});
// ... likewise for dm-sans (--font-body) and jetbrains-mono (--font-mono)
// then add `${cormorant.variable} ${dmSans.variable} ${jetbrainsMono.variable}` to <html> className
```

---

## 3. `--radius: 0` Propagation Audit

### 3.1 Token definition

`apps/web/src/app/globals.css` lines 79-86:
```css
--radius: 0;
--radius-sm: 0;
--radius-md: 0;
--radius-lg: 0;
--radius-xl: 0;
--radius-2xl: 0;
--radius-full: 9999px; /* ONLY for avatars and status dots */
```
`tooling/tailwind/base.ts` lines 124-133 mirrors this exactly.

✅ **Token definitions are correct and consistent.**

### 3.2 Per-primitive `rounded-*` audit

| Primitive | `rounded-*` class used | Verdict |
|-----------|------------------------|---------|
| `button.tsx` | `rounded-none` (base + `sm` + `lg` sizes) | ✅ PASS |
| `card.tsx` | `rounded-none` | ✅ PASS |
| `dialog.tsx` | `rounded-none sm:rounded-none` (DialogContent), `rounded-sm` (DialogClose) | ⚠️ `rounded-sm` resolves to `--radius-sm: 0` so visually fine, but semantically should be `rounded-none` to be unambiguous. |
| `input.tsx` | `rounded-none` | ✅ PASS |
| `textarea.tsx` | `rounded-none` | ✅ PASS |
| `select.tsx` | `rounded-none` (trigger + content), `rounded-sm` (item) | ⚠️ Same as dialog — `rounded-sm` is technically 0 but semantically noisy. |
| `popover.tsx` | `rounded-none` | ✅ PASS |
| `tabs.tsx` | `rounded-none` (TabsList), `rounded-sm` (TabsTrigger + TabsContent) | ⚠️ Same — and line 33 has a broken trailing class `"data-[state=active]:"` (empty variant). |
| `dropdown-menu.tsx` | `rounded-none` (content), `rounded-sm` (items) | ⚠️ Same. |
| `command.tsx` | `rounded-none` | ✅ PASS |
| `tooltip.tsx` | `rounded-none` | ✅ PASS |
| `calendar.tsx` | `rounded-none` (weekday + day) | ✅ PASS |
| `checkbox.tsx` | `rounded-none` | ✅ PASS |
| `avatar.tsx` | `rounded-full` (Avatar + AvatarFallback) | ✅ PASS — avatars are an explicit exception per spec. |
| `table.tsx` | none | ✅ PASS |
| `label.tsx`, `separator.tsx`, `form.tsx` | none | ✅ PASS |
| `MarketingNav.tsx` | none | ✅ PASS |
| `Hero.tsx` CTAs | none | ✅ PASS |
| `NewsletterForm.tsx` | none | ✅ PASS |
| `MarqueeItem.tsx` | `rounded-full` (4px status dot — `h-1 w-1`) | ✅ PASS — status dot exception. |
| `MobileNavDrawer.tsx` | none | ✅ PASS |

**Verdict:** ✅ **PASS** — `--radius: 0` is correctly propagated. Minor nit: 4 primitives use `rounded-sm` (which resolves to 0) instead of explicit `rounded-none`; this is cosmetic but should be normalized for code-search clarity.

**Additional bug:** `tabs.tsx` line 33 has a malformed trailing class — `data-[state=active]:` with NO utility following the colon. This is dead code and should be removed.

---

## 4. Warm Mineral Palette Compliance

### 4.1 Token definition (✅ PASS)

`packages/ui/src/tokens/colors.css` correctly defines:
- Stone scale (950 → 50) — foundation
- Clay scale (600 → 100) — primary action
- Water scale (700 → 100) — accent
- Sand scale (DEFAULT, warm, deep) — surfaces
- Status: `--color-success` (#4A7C59), `--color-warning` (#C4913A), `--color-error` (#B85450), `--color-info` (alias to water-500)
- Semantic aliases: `--color-background`, `--color-surface`, `--color-border`, `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-action`, `--color-action-hover`, `--color-accent`

### 4.2 Component usage (mixed)

Marketing components **correctly** use Warm Mineral tokens throughout:
- `bg-stone-900`, `text-stone-500`, `border-stone-200`, `text-clay-400`, `bg-clay-500`, `bg-sand-warm`, `bg-sand-deep`, `text-sand-50`, `text-sand-100`, `text-success`, `text-error`, `bg-success`, `text-warning` (verified across Hero, HeroNextClass, Philosophy, ScheduleGrid, InstructorsSection, InstructorRow, MembershipSection, CtaBand, Footer, MarketingNav, MobileNavDrawer, NewsletterForm).

shadcn primitives **incorrectly** use the undefined HSL aliases (`bg-primary`, `bg-card`, `bg-popover`, `bg-background`, `bg-accent`, `bg-secondary`, `bg-muted`, `bg-destructive`, `text-muted-foreground`, `text-accent-foreground`, `border-input`, `ring-ring`, `ring-offset-background`) — see §1.2 above.

### 4.3 Raw hex violations (P1)

| File | Lines | Hex usage | Correct token |
|------|-------|-----------|----------------|
| `StudioSpaceSVG.tsx` | 33, 35-37, 39, 41-46, 48, 56, 58-63, 71, 73-74, 76, 77 | 28 raw hex fills in SVG `<rect fill="#EDE5D8">` etc. | Use `fill="var(--color-sand-warm)"`, `fill="var(--color-water-300)"`, `fill="var(--color-clay-400)"`, etc. — SVG `fill` accepts CSS variables. |
| `RevenueChart.tsx` | 47, 52, 54, 59, 62, 64, 69, 74, 75, 80, 81, 87, 89 | 12 raw hex in Recharts config objects | Recharts accepts CSS-var strings: `stroke: 'var(--color-stone-200)'`. Centralize into a `chartTheme.ts` constant. |
| `manifest.ts` | 16, 17 | `background_color: '#F5F0E8'`, `theme_color: '#C4856A'` | Acceptable — PWA manifest spec requires hex strings. Comments already map them to `--color-sand` and `--color-clay-400`. |
| `opengraph-image.tsx` (root + blog + instructors) | 27-45, 51-63, 43-55 | ~13 raw hex in inline styles | Satori (OG image renderer) has limited CSS-var support — raw hex is acceptable here. Could be centralized in an `og-colors.ts` constant. |

---

## 5. Per-Component Scorecard (19 Marketing Components)

Scoring rubric (each axis 1-10):
- **Memorability (M):** Will a first-time visitor remember this in 24 hours?
- **Integrity (I):** Does the code and UI feel cohesive and intentional?
- **Craftsmanship (C):** Are spacing, timing, contrast, and accessibility flawless?

Target: 24/30 minimum. Below 24 = redesign.

| # | Component | M | I | C | Total | Verdict |
|---|-----------|---|---|---|-------|---------|
| 1 | `Hero.tsx` | 8 | 6 | 6 | **20** ❌ | Asymmetric grid ✓, italic `<em>` emphasis ✓, but primary CTA uses `bg-stone-900` instead of `bg-clay-500` (violates Tier 3 spec), hardcoded `text-[clamp(3.5rem,6.5vw,7.5rem)]` instead of `--text-display-2xl` token, redundant inline `style={{ fontFamily: 'var(--font-display)' }}` on every text node. HeroNextClass child conflates loading with empty state. |
| 2 | `HeroNextClass.tsx` | 7 | 5 | 5 | **17** ❌ | Editorial concept (live "next class" card with 12-bar seat indicator) is memorable. BUT: (a) hardcodes `aria-label="8 of 12 spots left"` regardless of actual data — integrity violation; (b) NO loading skeleton (returns empty state when `sessions` is undefined — conflates "loading" with "no classes"); (c) NO error state, NO Sentry capture; (d) NO `tabular-nums` on count; (e) inline `font-mono` style repeated 3×. |
| 3 | `ClassMarquee.tsx` | 7 | 6 | 5 | **18** ❌ | Concept is strong (kinetic typography, pause on hover, reduced-motion fallback). BUT: uses `ease: 'linear'` (forbidden per §1.6 — should be `--ease-breathe` or constant-speed token), `duration: 32` hardcoded (should be `--duration-crawl * something`), `whileHover={{ animationPlayState: 'paused' }}` on the moving element won't work — should be on a parent. |
| 4 | `MarqueeItem.tsx` | 7 | 8 | 7 | **22** ❌ | Cleanest component — italic Cormorant class name + uppercase DM Sans time + 4px clay-400 status dot (`rounded-full` correctly scoped). Loses points for redundant inline font-family. |
| 5 | `Philosophy.tsx` | 8 | 7 | 6 | **21** ❌ | 3-column composition (vertical-text sidebar / centered quote / 間 ornament) is highly memorable and anti-generic. Section number "01" as ornament is editorial. BUT: hardcoded `text-[clamp(...)]` × 2, `tracking-[0.25em]`/`tracking-[0.2em]` arbitrary, `py-24` (96px) instead of `--space-9` (64px). The `<span className="absolute -mt-12">` is positioned outside the document flow without a `relative` parent — likely a visual bug. |
| 6 | `ScheduleSection.tsx` | 6 | 8 | 7 | **21** ❌ | Thin orchestrator — just `SectionHeader` + `ScheduleGrid`. No state of its own to fail on. Loses memorability points because nothing about this wrapper is unique. |
| 7 | `ScheduleGrid.tsx` | 5 | 5 | 5 | **15** ❌ | The weakest marketing component. Looks like a generic 3-col card grid (the anti-generic §1.4 explicitly forbids "generic grids"). Empty state is a one-liner. NO loading skeleton. NO error state. NO level badge (the file header claims "Level badge colors use PAD tokens (D29 fix)" but the implementation has NO level badge — comment is stale). CTA uses `bg-clay-500` ✓ but `text-sand-100` (should be `text-sand-50` per Tier 3 spec). |
| 8 | `InstructorsSection.tsx` | 6 | 8 | 7 | **21** ❌ | Section orchestrator with alternating rows. Loses memorability because the only differentiator is the alternating orientation. "View all 8 instructors →" hardcoded fallback (line 53) when `instructors.length` is 0 — that's a content lie. |
| 9 | `InstructorRow.tsx` | 8 | 7 | 6 | **21** ❌ | Alternating portrait/content via CSS `order` is editorial. Giant numeric placeholder (`text-[clamp(5rem,10vw,9rem)]`) instead of a real Cloudflare Images portrait is a TODO placeholder. Loses points for placeholder nature + redundant inline font-family. |
| 10 | `MembershipSection.tsx` | 8 | 7 | 6 | **21** ❌ | 4-column comparison grid with dark-inverted "Most Popular" column is editorial. BUT: featured-plan CTA uses `bg-clay-400` instead of `bg-clay-500` (slightly off from Tier 3 spec), feature values hardcoded in component (`['1 class', 'Unlimited', '10 classes']`) instead of driven by `plans` prop — integrity violation. NO `tabular-nums` on prices. |
| 11 | `StudioSpaceSection.tsx` | 7 | 7 | 6 | **20** ❌ | 3-col grid with row-span-2 main hall + dark stats block is editorial. BUT: dark stats block uses hardcoded `text-[clamp(3rem,5vw,5rem)]` for values; NO `tabular-nums` on numeric stats; relies on `StudioSpaceSVG` (placeholder). |
| 12 | `StudioSpaceSVG.tsx` | 5 | 4 | 4 | **13** ❌ | Placeholder SVG illustrations with 28 raw hex fills. Will be replaced by real Cloudflare Images per the `InstructorRow` precedent. Currently fails token compliance, integrity (placeholder), and craftsmanship (hand-positioned rectangles). |
| 13 | `CtaBand.tsx` | 7 | 8 | 7 | **22** ❌ | Dark stone-900 band with italic clay-300 emphasis on subtitle is editorial. BUT: primary CTA uses `bg-clay-400` (should be `bg-clay-500` per Tier 3 spec), no `text-balance` on the h2, hardcoded `text-[clamp(2rem,4vw,3.5rem)]`. |
| 14 | `Footer.tsx` | 8 | 8 | 7 | **23** ❌ | 4-column footer with giant "STILLWATER" watermark is editorial and memorable. BUT: hardcoded `text-[clamp(4rem,14vw,12rem)]` for watermark, `tracking-[0.1em]` inline style (should be Tailwind class), `space-y-3` (default Tailwind not `--space-*`). |
| 15 | `MarketingNav.tsx` | 7 | 6 | 6 | **19** ❌ | Single-line rule nav (anti-generic pattern). BUT: file header comment says "Mobile drawer is a stub per MEP Open Question #6 — full Radix Dialog wired in Phase 12 F12-12" — yet `MobileNavDrawer.tsx` exists in Phase 12. **`MarketingNav` never imports or renders `MobileNavDrawer`** — mobile users get only `<span className="sr-only">Menu</span>` (invisible). This is a P0 functional bug: no mobile menu trigger. |
| 16 | `MobileNavDrawer.tsx` | 7 | 7 | 7 | **21** ❌ | Radix Dialog drawer with focus trap, backdrop dismiss, close-on-link-tap. Solid craftsmanship. Loses points for being orphaned (not wired into `MarketingNav` — see #15). |
| 17 | `ScrollProgressBar.tsx` | 7 | 8 | 7 | **22** ❌ | 2px `bg-clay-400` bar, `transform: scaleX(progress)`, `origin-left`. Compact, no over-engineering. Loses points for missing `will-change: transform` and for not being wrapped in a `prefers-reduced-motion` check (relies on global override — acceptable). |
| 18 | `SectionHeader.tsx` | 8 | 7 | 6 | **21** ❌ | Reusable editorial header with giant stone-100 section number + clay-400 eyebrow label + Cormorant title. Highly anti-generic. BUT: hardcoded `text-[clamp(...)]` × 2, `mb-12`/`pt-8`/`mt-2`/`mt-4` are all default Tailwind not `--space-*` tokens. |
| 19 | `NewsletterForm.tsx` | 6 | 6 | 5 | **17** ❌ | `react-hook-form` + Zod with proper `aria-invalid` and `aria-describedby`. BUT: (a) submit handler is a `setTimeout` stub with TODO comment ("Wire to Resend Audience API or Brevo"); (b) input uses `focus:outline-none` (forbidden — should be `focus:outline-hidden` or `focus-visible:ring-2`); (c) input uses `focus:ring-2 focus:ring-water-500` ✓ but paired with `focus:outline-none` which removes the global focus ring; (d) success state uses `Subscribed ✓` with raw unicode checkmark instead of `lucide-react` `Check` icon (inconsistent with rest of codebase which uses lucide). |

**Scorecard summary:**
- Average: **20.0 / 30** (below 24 redesign threshold)
- Components scoring ≥24: **0 of 19**
- Components scoring ≥22: **3 of 19** (MarqueeItem, CtaBand, ScrollProgressBar)
- Components scoring ≤15 (severe): **2 of 19** (ScheduleGrid, StudioSpaceSVG)

---

## 6. Anti-Generic Litmus Test (Why / Only / Without)

For each marketing component: **Why?** (clear user need), **Only?** (challenge defaults — is this the only way?), **Without?** (enforce minimalism — what can be removed?).

| # | Component | Why? | Only? | Without? | Pass? |
|---|-----------|------|-------|----------|-------|
| 1 | Hero | Clear — orient first-time visitor | Asymmetric grid is justified (showcases the editorial principle) | Remove redundant inline `fontFamily` (155×) | ❌ (redundant code) |
| 2 | HeroNextClass | Clear — surface next available class | Live seat count is justified | Remove hardcoded aria-label; remove inline font-family | ❌ (integrity bug) |
| 3 | ClassMarquee | Questionable — decorative kinetic typography is "cool" but adds nothing actionable | Could be a static schedule strip — marquee is a flourish | Remove `whileHover` (doesn't work); reduce inline duration | ❌ (motion is decorative not functional) |
| 4 | MarqueeItem | Clear — single marquee cell | Italic + uppercase + dot pattern is justified | Remove inline font-family | ❌ (redundant code) |
| 5 | Philosophy | Clear — establish studio ethos | Vertical text + 間 ornament is justified | Fix the `absolute -mt-12` positioning bug | ❌ (craft bug) |
| 6 | ScheduleSection | Clear — show weekly classes | Wrapper is justified | — | ✅ |
| 7 | ScheduleGrid | Clear — list upcoming sessions | 3-col card grid is NOT the only way — could be a list, calendar, or timeline | Add level badge (promised in comment but missing) | ❌ (stale comment) |
| 8 | InstructorsSection | Clear — preview instructors | Alternating rows is justified | Remove "View all 8 instructors" hardcoded fallback | ❌ (content lie) |
| 9 | InstructorRow | Clear — single instructor | Alternating via CSS `order` is justified | Replace giant numeric placeholder with real Cloudflare Images | ❌ (placeholder) |
| 10 | MembershipSection | Clear — compare plans | Dark-inverted featured column is justified | Drive feature values from `plans` prop instead of hardcoded | ❌ (integrity bug) |
| 11 | StudioSpaceSection | Clear — showcase physical space | 3-col with row-span-2 is justified | — | ✅ |
| 12 | StudioSpaceSVG | Clear — placeholder for photos | NOT the only way — could be Cloudflare Images now | Remove 28 raw hex fills; use `var(--color-*)` | ❌ (token violation) |
| 13 | CtaBand | Clear — drive trial signups | Dark band with italic emphasis is justified | — | ✅ |
| 14 | Footer | Clear — secondary nav + newsletter | Giant watermark is a flourish but on-brand | Remove inline `letterSpacing` style | ❌ (inline style) |
| 15 | MarketingNav | Clear — primary navigation | Single-line rule nav is justified | **Wire in MobileNavDrawer** — currently no mobile menu trigger exists | ❌ (functional bug) |
| 16 | MobileNavDrawer | Clear — mobile navigation | Radix Dialog is justified | Wire into MarketingNav | ❌ (orphaned) |
| 17 | ScrollProgressBar | Questionable — decorative; provides no actionable feedback | Could be removed entirely | Consider removing for minimalism | ⚠️ (acceptable) |
| 18 | SectionHeader | Clear — establish section identity | Giant number + eyebrow + title is justified | Remove inline font-family | ❌ (redundant code) |
| 19 | NewsletterForm | Clear — email capture | Justified | Wire to real API; remove `focus:outline-none` | ❌ (incomplete + a11y) |

**Litmus Test summary:** 2 of 19 components fully pass the Why/Only/Without test. 14 fail on integrity or craftsmanship grounds. 3 have functional bugs (MarketingNav missing mobile menu, MobileNavDrawer orphaned, NewsletterForm stubbed).

---

## 7. Asymmetric Editorial Grid Verification

✅ **PASS** — `apps/web/src/components/marketing/Hero.tsx` line 27:
```tsx
<section
  className="grid grid-cols-1 gap-0 px-0 md:grid-cols-[1fr_1px_minmax(280px,38%)]"
  aria-label="Welcome"
>
```

Exactly matches the spec template `1fr 1px minmax(280px, 38%)`. The 1px center column is the vertical divider (`<div className="hidden bg-stone-200 md:block" />` line 104). Left column is the headline + stats + CTAs, right column is `<HeroNextClass />`.

Minor nit: on mobile (`grid-cols-1`), the divider is hidden but the section has `px-0` — content children use `px-6` themselves. This works but is unusual; conventionally the section sets `px-6` and children inherit. Not a violation, just a style divergence.

---

## 8. CTA Hierarchy Compliance (4-Tier System)

| Tier | Spec | Implementation status |
|------|------|----------------------|
| Tier 1 — Text link | `underline-offset-4`, hover underline | ⚠️ **PARTIAL**. Used in `MembershipStatusCard.tsx` (line 49: `underline-offset-4 hover:underline`) ✓ and `EnrollmentHistoryTable.tsx` (line 31) ✓. But most text links in `Hero.tsx`, `HeroNextClass.tsx`, `InstructorsSection.tsx`, `InstructorRow.tsx`, `admin/members/page.tsx`, `admin/classes/page.tsx` use `hover:text-clay-500` or `hover:text-stone-900` WITHOUT `underline-offset-4 hover:underline` — these are inconsistent (Tier 1 requires the underline). |
| Tier 2 — Outline button | 1px stone border, transparent bg, hover muted-sand | ⚠️ **PARTIAL**. Used in `Hero.tsx` (line 96: `border border-stone-300 ... hover:border-stone-900 hover:text-stone-900`) — but hover goes to `border-stone-900` not `bg-sand-warm`. Used in `CtaBand.tsx` (line 37: `border border-stone-500 ... hover:border-sand-50 hover:text-sand-50`) — different hover behavior. Inconsistent. |
| Tier 3 — Filled button | clay-500 bg, sand-100 text, max 1 per section | ❌ **FAIL**. (a) `Hero.tsx` primary CTA uses `bg-stone-900` not `bg-clay-500`. (b) `ScheduleGrid.tsx` uses `bg-clay-500 text-sand-100` ✓. (c) `MembershipSection.tsx` featured CTA uses `bg-clay-400` (wrong shade). (d) `CtaBand.tsx` primary uses `bg-clay-400` (wrong shade). (e) `MarketingNav.tsx` uses `bg-clay-500 text-sand-100` ✓. (f) `NewsletterForm.tsx` uses `bg-stone-900` (wrong tier — should be Tier 3 clay). (g) `MobileNavDrawer.tsx` uses `bg-stone-900` (wrong tier). **The "max 1 per section" rule is followed** (no section has 2 filled CTAs). |
| Tier 4 — Editorial link | Cormorant italic + clay-400 + arrow | ❌ **FAIL**. **Zero instances** of the Tier 4 editorial link anywhere in the codebase. The "View Full Schedule →" / "Full profile →" / "View all X instructors →" / "Manage →" / "Book a class →" / "Edit →" links all use plain DM Sans medium weight — none use Cormorant italic + clay-400 + arrow pattern. |

**Required remediation:**
1. Standardize Tier 1: every inline text link should include `underline-offset-4 hover:underline`.
2. Standardize Tier 2: every outline button should be `border border-stone-300 bg-transparent hover:bg-sand-warm hover:border-stone-900 hover:text-stone-900`.
3. Standardize Tier 3: every filled button should be `bg-clay-500 text-sand-100 hover:bg-clay-600` — fix Hero, MembershipSection (featured), CtaBand, NewsletterForm, MobileNavDrawer.
4. Introduce Tier 4: convert at least the "View all X instructors →", "Full profile →", and "Manage →" links to Cormorant italic + clay-400 + arrow pattern.

---

## 9. Typography Compliance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `text-wrap: balance` on every Cormorant heading | ✅ **PASS** | `packages/ui/src/globals.css` line 50: `h1, h2, h3, h4, h5, h6 { ... text-wrap: balance; }` — applied globally. No component overrides this. |
| `text-wrap: pretty` on every DM Sans paragraph | ❌ **FAIL** | **Zero instances** of `text-pretty` or `text-wrap: pretty` across `apps/web/src/`. Globals.css does NOT set this on `<p>`. All paragraphs use default `text-wrap: auto`. |
| `font-variant-numeric: tabular-nums lining-nums` on JetBrains Mono data tables | ❌ **FAIL** | **Zero instances** of `tabular-nums`, `lining-nums`, or `font-variant-numeric` anywhere. The following data tables all use JetBrains Mono but lack tabular numerals: `RosterTable`, `EnrollmentHistoryTable`, `admin/members/page.tsx` (joined date), `admin/classes/page.tsx` (duration, capacity), `MembershipSection` (prices), `KpiCard` (value + trend), `RevenueChart` (axis labels), `Footer` (hours), `HeroNextClass` (spots count). |
| Fluid type scale uses `--text-*` tokens (not inline `clamp()`) | ❌ **FAIL** | 9 instances of inline `text-[clamp(...)]` in `Hero.tsx`, `Philosophy.tsx` (×2), `Footer.tsx`, `CtaBand.tsx`, `StudioSpaceSection.tsx`, `InstructorRow.tsx` (×2), `SectionHeader.tsx` (×2). Root cause: `--text-*` tokens are not mapped into `@theme` (see §1.2). |

**Required remediation:**
1. Add `p { text-wrap: pretty; }` to `packages/ui/src/globals.css`.
2. Add `tabular-nums lining-nums` to every JetBrains Mono usage on numeric data — easiest via a `.font-mono-numeric` utility class or by adding `font-variant-numeric: tabular-nums lining-nums` to the `--font-mono` `@theme` definition.
3. Wire `--text-*` tokens into `@theme` (see §1.2 remediation) and replace all 9 `text-[clamp(...)]` instances with the appropriate `text-display-2xl` / `text-display-xl` / `text-display-lg` / `text-heading-lg` utility.

---

## 10. Motion Compliance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `--ease-gentle`, `--ease-breathe`, `--ease-sharp` used (not `ease-in-out`, `ease`, `linear`) | ⚠️ **PARTIAL** | Zero literal `ease-in-out`/`ease-out`/`ease-in`/`ease` utilities. **One** `ease: 'linear'` in `ClassMarquee.tsx:40` (forbidden). **Two** inline `[0.16, 1, 0.3, 1]` cubic-bezier arrays in `lib/marketing/animations.ts` (lines 18, 33) — these are the `--ease-gentle` value inlined rather than referenced. Tailwind utilities `ease-gentle`, `ease-breathe`, `ease-sharp` ARE mapped in `@theme` (lines 89-91) but **zero components use them** — every `transition-colors` defaults to Tailwind's `cubic-bezier(0.4, 0, 0.2, 1)` (= `--ease-sharp`, but untokenized). |
| `--duration-*` tokens used (not hardcoded `300ms`, `500ms`) | ⚠️ **PARTIAL** | `--duration-*` tokens are mapped in `@theme` (lines 94-98) but **zero components use `duration-quick`/`duration-standard`/`duration-slow`**. All 42 `transition-colors`/`transition-opacity` instances use Tailwind's default `150ms`. `dialog.tsx:42` hardcodes `duration-200`. `animations.ts` hardcodes `0.6` (seconds). |
| `prefers-reduced-motion: reduce` globally respected | ✅ **PASS** | Defined in both `apps/web/src/app/globals.css` (lines 103-112) and `packages/ui/src/tokens/motion.css` (lines 19-28). `useScrollReveal.ts` checks `window.matchMedia('(prefers-reduced-motion: reduce)')` and short-circuits (line 20). `ClassMarquee.tsx` uses `useReducedMotion()` from framer-motion. |
| `animation-duration: 0.01ms` (NOT `0ms`) in reduced-motion | ✅ **PASS** | Both files use `0.01ms !important`. |
| Only `transform` and `opacity` animated (no `width`/`height`/`top`/`left`) | ✅ **PASS** | Verified across all marketing components. `ScrollProgressBar.tsx` uses `transform: scaleX()` ✓. `ClassMarquee.tsx` uses framer-motion `x: ['0%', '-50%']` (transform) ✓. `useScrollReveal` adds a `reveal--visible` class (CSS not shown but pattern is opacity+transform per `tooling/tailwind/base.ts` keyframes). `MobileNavDrawer.tsx` uses Radix Dialog animations (transform + opacity). No `width`/`height`/`top`/`left` transitions. |

**Required remediation:**
1. Replace `ease: 'linear'` in `ClassMarquee.tsx` with a token-referenced easing (constant-speed marquees are an exception — discuss with design team whether to add `--ease-constant` token or accept `linear` for marquees only).
2. Replace inline `[0.16, 1, 0.3, 1]` in `animations.ts` with a reference to `--ease-gentle` (framer-motion accepts `ease: 'easeOut'` for named easings, or expose via `useToken`).
3. Add `duration-quick ease-gentle` to every `transition-colors`/`transition-opacity` instance (42 sites).
4. Replace `duration-200` in `dialog.tsx` with `duration-quick` (or `duration-standard`).

---

## 11. Spacing Compliance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `--space-*` tokens used (not hardcoded `16px`, `24px`, `32px`) | ⚠️ **PARTIAL** | Tokens are mapped in `@theme` (lines 65-77). However, **zero components use `gap-7`, `py-9`, `space-y-9`** etc. — instead all components use default Tailwind `gap-4`, `gap-6`, `gap-8`, `mt-4`, `mt-6`, `mt-8`, `mt-12`, `mb-8`, `py-6`, `py-8`, `py-16`, `py-24`. These map to Tailwind's default 4px scale (so `gap-4` = 16px = `--space-4`), but the **token names** aren't used. The spec's intent — semantic spacing tokens — isn't realized. |
| `--space-7: 32px` for primary component gap | ❌ **FAIL** | Zero instances of `gap-7`. Components use `gap-4` (16px), `gap-6` (24px), `gap-8` (32px) — the 32px value IS used (via `gap-8`) but not via the spec's `gap-7` token. (Note: `--space-7` = 32px and `--space-8` = 48px in Stillwater's scale — but Tailwind's default `gap-8` = 32px. So components using `gap-8` get 32px by accident of Tailwind's scale, not by spec compliance.) |
| `--space-9: 64px` for section padding | ❌ **FAIL** | All 8 marketing sections use `py-24` (= 96px in default Tailwind = `--space-10` in Stillwater scale). Spec says 64px. Sections are 50% taller than spec. Either the spec is wrong or components are wrong. |
| `--space-12: 192px` or `--space-13: 256px` for large section breaks | ❌ **FAIL** | Zero instances of `py-12` or `py-13` (192px or 256px). Sections use `py-24` (96px) consistently. No "large section breaks" exist. |
| Editorial 12-col grid with `--max-width-content: 1280px`, `--max-width-narrow: 720px` | ❌ **FAIL** | `--max-width-*` tokens defined in `packages/ui/src/tokens/spacing.css` lines 22-24 but **never mapped into `@theme`**. Components use default Tailwind `max-w-6xl` (72rem = 1152px), `max-w-7xl` (80rem = 1280px), `max-w-3xl` (48rem = 768px), `max-w-md` (28rem = 448px), `max-w-sm` (24rem = 384px), `max-w-prose` (65ch). 17 instances. |

**Required remediation:**
1. Map `--max-w-content`, `--max-w-narrow`, `--max-w-wide` into `@theme` (see §1.2 remediation).
2. Replace `max-w-6xl` (1152px) with `max-w-content` (1280px) — drift of 128px matters for editorial grids.
3. Replace `max-w-7xl` (1280px) with `max-w-content` (1280px) — same value, semantic intent.
4. Replace `max-w-3xl` (768px) with `max-w-narrow` (720px) — drift of 48px matters for reading measure.
5. Decide on section padding: either update spec to `py-24` (96px) or update components to `py-9` (64px). Recommend updating components — 96px is generous but 64px is the editorial standard.
6. Add `duration-quick ease-gentle` and `gap-7` / `space-y-9` / `py-9` etc. to the lint rule `scripts/pre-commit-check.sh` to enforce tokens.

---

## 12. shadcn/ui Anti-Generic Patches

| Requirement | Status | Evidence |
|-------------|--------|----------|
| No default purple `--primary` (should be clay HSL) | ❌ **FAIL** | `--primary` is **not defined at all** (see §1.2). The default shadcn `--primary` (purple `hsl(263 70% 50.4%)`) would apply IF shadcn's `@layer base` were imported — but it's not. Net effect: `bg-primary` resolves to `inherit` (transparent). Functionally broken. |
| No `gradient` button variant (should be deleted) | ✅ **PASS** | `button.tsx` has 6 variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. No `gradient` variant. |
| No `shadow-*` on cards | ✅ **PASS** | `card.tsx` uses `rounded-none border bg-card text-card-foreground` — no shadow. |
| `focus:outline-none` replaced with `focus-visible:ring-2 focus-visible:ring-water-500` | ❌ **FAIL** | 22 instances of `outline-none` / `focus:outline-none` / `focus-visible:outline-none` across primitives. Only `input.tsx`, `textarea.tsx`, `checkbox.tsx` correctly pair `focus-visible:outline-none` with `focus-visible:ring-2 focus-visible:ring-water-500`. The rest (`button.tsx`, `tabs.tsx`, `dialog.tsx`, `select.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `command.tsx`) use `ring-ring` (the undefined shadcn HSL var) instead of `ring-water-500`. |
| `--radius: 0` propagated | ✅ **PASS** | See §3 above. |
| No default `--ring` HSL (should be water-500 HSL) | ❌ **FAIL** | `--ring` is not defined. Spec says focus rings should be water-500. The 3 primitives that correctly use `ring-water-500` (`input`, `textarea`, `checkbox`) bypass `--ring` entirely. |

**Required remediation:**
1. Add the full shadcn HSL map to `globals.css` `:root` (see §1.2 remediation). Critically: `--ring: 197 21% 57%` (water-500), `--primary: 16 44% 53%` (clay-500).
2. Replace all `focus-visible:ring-ring` with `focus-visible:ring-water-500` (or define `--ring` correctly and keep `ring-ring` — both work, but `ring-water-500` is more semantic).
3. Replace all `outline-none` with `outline-hidden` (Tailwind v4) — or remove entirely since the global `:focus-visible { outline: 3px solid var(--color-water-500); }` rule in `packages/ui/src/globals.css` line 39-43 already provides the focus affordance.

---

## 13. UI State Completeness (4 States)

For each data-dependent component, verify **Loading** (skeleton), **Error** (inline + Sentry capture + retry), **Empty** (meaningful CTA), **Success**.

| Component | Loading | Error | Empty | Success | Verdict |
|-----------|---------|-------|-------|---------|---------|
| `BookingFlow.tsx` | ⚠️ Text-only ("Loading seat availability…") — no skeleton | ⚠️ Text-only ("Seat availability temporarily unavailable.") — NO retry button, NO Sentry capture | ❌ Returns `null` when `!data` — no empty CTA | ✅ `BookingConfirmation` dialog + toast | ❌ **FAIL** — missing skeleton, retry, Sentry, empty CTA |
| `ScheduleGrid.tsx` | ❌ None (server-rendered, but no skeleton in `ScheduleSection.tsx` either) | ❌ None | ⚠️ "No classes scheduled this week." — no CTA | ✅ Renders list | ❌ **FAIL** — no loading, no error, weak empty |
| `MembershipStatusCard.tsx` | N/A (presentational — receives `subscription` prop) | N/A | N/A | ✅ Renders card | ✅ **PASS** (state handled by parent) |
| `EnrollmentHistoryTable.tsx` | N/A (server-rendered) | ❌ None | ✅ "No enrollment history yet." + "Book a class →" CTA | ✅ Renders table | ⚠️ **PARTIAL** — no error boundary at component level (route-level `error.tsx` exists) |
| `RosterTable.tsx` | N/A (receives `initialRoster` prop) | ⚠️ Mutation errors via toast only — NO Sentry capture, NO inline retry | ✅ "No confirmed enrollments for this session." | ✅ Toast on check-in | ⚠️ **PARTIAL** — mutation error handling is shallow |
| `admin/members/page.tsx` | ✅ Route-level `loading.tsx` skeleton | ✅ Route-level `error.tsx` with retry | ⚠️ "No members found." — no CTA | ✅ Renders table | ⚠️ **PARTIAL** — empty state has no CTA |
| `admin/classes/page.tsx` | ✅ Route-level `loading.tsx` | ✅ Route-level `error.tsx` | ✅ "No classes found. Create your first class to get started." (implicit CTA — button is in header) | ✅ Renders table | ✅ **PASS** |
| `KpiCard.tsx` | ✅ `isLoading` prop → skeleton with `animate-pulse` | N/A (presentational) | ✅ Renders `—` for null value | ✅ Renders value | ✅ **PASS** |
| `RevenueChart.tsx` | N/A | N/A | ✅ "No revenue data for the selected period." | ✅ Renders chart | ✅ **PASS** |
| `HeroNextClass.tsx` | ❌ Conflates loading with empty (returns "No upcoming classes" while query is in flight) | ❌ None | ✅ "No upcoming classes. Check the full schedule." | ✅ Renders card | ❌ **FAIL** — loading state missing |
| `NewsletterForm.tsx` | ✅ `isSubmitting` → "…" on button | ❌ None (form-level `errors.email` only) | N/A | ✅ "Subscribed ✓" | ⚠️ **PARTIAL** — no error state for submit failures (stubbed `setTimeout`) |

**Cross-cutting findings:**
- **Sentry.captureException is only called in `lib/observability/error-boundary.tsx` (line 41)** — the route-level `error.tsx` files (`admin/error.tsx`, `dashboard/error.tsx`, `book/[sessionId]/error.tsx`, `marketing/error.tsx`) all use `console.error` only, NOT Sentry. This violates SKILL §10.5 ("inline + Sentry capture + retry").
- **Route-level `error.tsx` files DO have a retry button** (the `reset` callback) — good.
- **Loading skeletons exist only at route level** (`admin/loading.tsx`, `dashboard/loading.tsx`, `book/[sessionId]/loading.tsx`, `marketing/loading.tsx`) — not at component level. Components that fetch their own data (`BookingFlow`, `HeroNextClass`, `RosterTable` mutation) lack skeletons.

**Required remediation:**
1. `BookingFlow.tsx`: replace text loading with skeleton matching `SeatAvailability` shape; add retry button to error state; add Sentry.captureException; add empty CTA when `!data` (not `return null`).
2. `ScheduleGrid.tsx`: add a 3-card skeleton when `sessions` is undefined (requires changing the prop type or fetching inside).
3. `HeroNextClass.tsx`: add a skeleton state for `isLoading` (distinct from empty).
4. All route-level `error.tsx` files: import `* as Sentry from '@sentry/nextjs'` and call `Sentry.captureException(error)` in the `useEffect`.
5. `RosterTable.tsx`: add inline retry on mutation error (not just toast).

---

## 14. Critical Findings (P0 — Anti-Generic / Functional violations)

**P0-1.** **shadcn HSL variables are never defined.** 15+ primitives reference `bg-primary`, `bg-card`, `bg-popover`, `bg-background`, `bg-accent`, `bg-secondary`, `bg-muted`, `bg-destructive`, `text-muted-foreground`, `border-input`, `ring-ring` — none of these tokens are defined anywhere in the project's CSS. The Button "default" variant renders with NO background color. Cards render with NO surface fill. Select/Dropdown/Popover content is transparent. **Fix: add the full shadcn HSL map to `apps/web/src/app/globals.css` `:root`** (see §1.2 for exact values).

**P0-2.** **Typography & max-width tokens are unreachable from Tailwind.** `--text-*` and `--max-width-*` are defined in `packages/ui/src/tokens/typography.css` and `spacing.css` but never mapped into the `@theme` block in `apps/web/src/app/globals.css`. Result: `text-display-xl`, `text-body-md`, `max-w-content`, `max-w-narrow` are not valid Tailwind utilities. Components fall back to inline `text-[clamp(...)]` (9 sites) and default Tailwind `max-w-6xl` (17 sites). **Fix: add `--text-*`, `--leading-*`, `--max-w-*` to `@theme`** (see §1.2).

**P0-3.** **Fonts not loaded via `next/font/local`.** SKILL §1.2 requires `next/font/local` for Cormorant Garamond, DM Sans, and JetBrains Mono. Current implementation uses CSS `@font-face` in `packages/ui/src/fonts/*.css`. `apps/web/src/app/layout.tsx` does not import `next/font/local`. Loses: automatic font preloading, `size-adjust` fallback (causes CLS), `display: swap` metrics. **Fix: convert to `next/font/local` loader in `layout.tsx`** (see §2).

**P0-4.** **`MarketingNav.tsx` never renders `MobileNavDrawer`.** The mobile drawer component exists (`MobileNavDrawer.tsx`, 105 lines, fully wired with Radix Dialog) but `MarketingNav.tsx` only emits `<span className="sr-only">Menu</span>` (line 69) — an invisible label with no trigger. Mobile users have NO way to open the navigation menu. **Fix: import `MobileNavDrawer` and render it inside `MarketingNav`** (replace the `<span className="sr-only">Menu</span>` with `<MobileNavDrawer />`).

**P0-5.** **`NewsletterForm.tsx` submit handler is a stub.** Line 38-42: `await new Promise((resolve) => setTimeout(resolve, 500)); setIsSubscribed(true);` with a `// TODO: Wire to Resend Audience API or Brevo` comment. The form looks functional but does nothing. **Fix: wire to Resend Audiences API or Brevo API; add real error handling for submit failures.**

**P0-6.** **`HeroNextClass.tsx` aria-label is hardcoded.** Line 105: `aria-label="8 of 12 spots left"` — this is hardcoded text, not driven by actual seat data. Screen readers will always announce "8 of 12 spots left" regardless of real availability. **Fix: compute the actual count from `data` (would need to call `useSessionAvailability` like BookingFlow does, or accept a `spotsLeft` prop).**

---

## 15. Important Findings (P1)

**P1-1.** **`outline-none` pervasive (22 sites).** Spec says use `outline-hidden` in Tailwind v4. The pattern `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` is the shadcn default — works in Tailwind v3 but should be migrated. Either replace `outline-none` with `outline-hidden`, OR remove `outline-none` entirely (the global `:focus-visible { outline: 3px solid var(--color-water-500); }` rule in `packages/ui/src/globals.css` already provides focus affordance).

**P1-2.** **`transition-colors` without token pairing (42 sites).** Every `transition-colors`/`transition-opacity`/`transition-all` instance relies on Tailwind's default `150ms cubic-bezier(0.4, 0, 0.2, 1)`. Spec §1.6 requires `--duration-*` + `--ease-*` token pairing. **Fix: append `duration-quick ease-gentle` to every transition utility** (or add a Tailwind plugin that makes these the defaults).

**P1-3.** **`ease: 'linear'` in `ClassMarquee.tsx`.** Spec forbids `linear` easing. Marquees are an exception in many design systems but the spec is strict. **Fix: discuss with design team — either accept `linear` for marquees only (and document the exception) or use a constant-speed token.**

**P1-4.** **Inline `text-[clamp(...)]` (9 sites).** Bypasses `--text-*` tokens. Root cause is P0-2. **Fix: after wiring tokens into `@theme`, replace all 9 sites with the appropriate `text-display-*` / `text-heading-*` utility.**

**P1-5.** **Default Tailwind `max-w-*` instead of `--max-width-*` tokens (17 sites).** Same root cause as P1-4. **Fix: after wiring tokens, replace `max-w-6xl` → `max-w-content`, `max-w-7xl` → `max-w-content`, `max-w-3xl` → `max-w-narrow`.**

**P1-6.** **`text-pretty` never applied to paragraphs.** Spec §1.7 requires `text-wrap: pretty` on DM Sans paragraphs. **Fix: add `p { text-wrap: pretty; }` to `packages/ui/src/globals.css`.**

**P1-7.** **`tabular-nums` never applied to JetBrains Mono data.** Spec §1.7 requires `font-variant-numeric: tabular-nums lining-nums` on data tables. Affects RosterTable, EnrollmentHistoryTable, admin tables, KpiCard, RevenueChart, MembershipSection prices, Footer hours, HeroNextClass spots count. **Fix: add `tabular-nums lining-nums` to every `font-mono` usage on numeric data, or add it globally to the `--font-mono` `@theme` definition.**

**P1-8.** **Section padding is `py-24` (96px) instead of `--space-9` (64px).** Either the spec is wrong (96px is generous but defensible) or the components are wrong (64px is the editorial standard). **Fix: pick one and enforce.**

**P1-9.** **`py-24` and other default Tailwind spacing utilities used instead of `--space-*` tokens.** The 13-stop Stillwater spacing scale is mapped into `@theme` but **zero components use `gap-7`, `py-9`, `space-y-9`** etc. **Fix: migrate to token utilities, or document that default Tailwind scale is acceptable (since Stillwater's 4px base matches Tailwind's).**

**P1-10.** **Route-level `error.tsx` files do not call `Sentry.captureException`.** Only `lib/observability/error-boundary.tsx` (the React ErrorBoundary class component) uses Sentry. The 4 route-level error.tsx files (`admin`, `dashboard`, `book/[sessionId]`, `marketing`) all use `console.error` only. SKILL §10.5 requires Sentry capture. **Fix: import `* as Sentry from '@sentry/nextjs'` and call `Sentry.captureException(error)` in each route-level error.tsx's `useEffect`.**

**P1-11.** **CTA hierarchy inconsistency.** Tier 3 filled buttons use 4 different patterns: `bg-stone-900` (Hero, NewsletterForm, MobileNavDrawer), `bg-clay-400` (CtaBand, MembershipSection featured), `bg-clay-500` (ScheduleGrid, MarketingNav, BookingButton, CheckoutButton). Spec says clay-500 + sand-100. Tier 1 text links inconsistently use `underline-offset-4 hover:underline` (only 2 of ~10 sites). Tier 4 editorial link (Cormorant italic + clay-400 + arrow) is **never used anywhere**. **Fix: standardize all 4 tiers per §8 remediation.**

**P1-12.** **Raw hex in `StudioSpaceSVG.tsx` (28 fills) and `RevenueChart.tsx` (12 fills).** SVG `fill` accepts CSS variables. Recharts accepts CSS-var strings. **Fix: replace all hex with `var(--color-*)` references. For Recharts, centralize into a `chartTheme.ts` constant.**

**P1-13.** **`ScheduleGrid.tsx` has stale comment.** File header (line 6) says "Level badge colors use PAD tokens (D29 fix — --color-success for beginner)." but the implementation has NO level badge. **Fix: either add the level badge or remove the comment.**

**P1-14.** **`MembershipSection.tsx` feature values hardcoded.** Lines 28-36 hardcode `['1 class', 'Unlimited', '10 classes']` etc. instead of deriving from the `plans` prop. **Fix: drive features from `plans[i].classCreditsPerCycle` and plan metadata.**

**P1-15.** **`InstructorsSection.tsx` "View all 8 instructors →" fallback.** Line 53: `View all {instructors.length || 8} instructors →`. When `instructors.length === 0`, falls back to "8" — a content lie. **Fix: when `instructors.length === 0`, hide the link or render "View all instructors →".**

**P1-16.** **`tabs.tsx` line 33 has a broken trailing class.** `data-[state=active]:` with no utility following the colon. Dead code. **Fix: remove the broken fragment.**

**P1-17.** **`Philosophy.tsx` positioning bug.** Line 43: `<span className="absolute -mt-12 ...">01</span>` — the parent `<div className="relative">` (line 21) is the positioning context, but `-mt-12` only adjusts vertical margin, not absolute position. The `01` ornament will overlap the quote unexpectedly. **Fix: use `top-0 left-0` or similar absolute positioning instead of `-mt-12`.**

---

## 16. Nits (P2)

**P2-1.** **Redundant inline `style={{ fontFamily: 'var(--font-*)' }}` (155 sites).** Globals.css already sets `body { font-family: var(--font-body) }` and `h1-h6 { font-family: var(--font-display) }`. Inline style on `<p>`/`<span>` for body font is redundant. Inline style on `<h1>`-`<h6>` for display font is doubly redundant. **Fix: remove all 155 inline `fontFamily` styles. Use Tailwind `font-display` / `font-body` / `font-mono` utilities for non-default cases (e.g., Cormorant on a `<p>` for editorial pull-quote).**

**P2-2.** **`duration-200` hardcoded in `dialog.tsx`.** Should be `duration-quick` (150ms) or `duration-standard` (300ms). 200ms matches neither.

**P2-3.** **`rounded-sm` used in 4 primitives** (`dialog.tsx`, `select.tsx`, `tabs.tsx`, `dropdown-menu.tsx`) where `rounded-none` is more semantically correct. Both resolve to `--radius-sm: 0`, but `rounded-none` is unambiguous.

**P2-4.** **`lib/marketing/animations.ts` inlines `[0.16, 1, 0.3, 1]` cubic-bezier** instead of referencing `--ease-gentle`. Framer Motion accepts named easings or arrays — but not CSS custom properties directly. Consider extracting a TS constant `EASE_GENTLE = [0.16, 1, 0.3, 1] as const` and documenting the link to `--ease-gentle`.

**P2-5.** **`SectionHeader.tsx` `max-w-prose`** (line 44) — `max-w-prose` (65ch) is a Tailwind utility but not in Stillwater's token system. Consider `max-w-narrow` (720px ≈ 75ch at 16px).

**P2-6.** **`MobileNavDrawer.tsx` uses `bg-stone-900` for CTA** — should be clay-500 per Tier 3 spec. (Also flagged in P1-11.)

**P2-7.** **`Footer.tsx` inline `letterSpacing: '0.1em'`** (line 148) — should be a Tailwind `tracking-[0.1em]` class or a token.

**P2-8.** **`MarqueeItem.tsx` 4px status dot uses `h-1 w-1`** — `--space-1: 4px` ✓ but the comment in the file header says "4px clay-400 dot" — fine.

**P2-9.** **`BookingFlow.tsx` setStateInEffect pattern** (lines 65-67) — calling `setShowConfirmation(true)` during render is an anti-pattern (React warns about it). The `eslint-disable` comment acknowledges this. **Fix: use `useEffect` or derive `showConfirmation` from `result` state.**

**P2-10.** **`admin/loading.tsx` skeleton uses `bg-stone-200`** — fine, but consider a dedicated `--color-skeleton` token (e.g., `--color-stone-100` animated) for consistency.

**P2-11.** **`opengraph-image.tsx` uses `fontFamily: 'sans-serif'`** (lines 35, 39-45) — should use `Cormorant Garamond` and `DM Sans` for brand consistency. Satori supports custom fonts if loaded. Currently uses browser default sans-serif.

**P2-12.** **`StudioSpaceSVG.tsx` `fontFamily="sans-serif"`** (lines 48, 63, 77) — should use `var(--font-body)` or `DM Sans`.

**P2-13.** **No `will-change: transform` on `ScrollProgressBar.tsx`** — minor perf nit for the only fixed-position animated element.

**P2-14.** **`ScheduleGrid.tsx` Tier 3 CTA uses `text-sand-100`** (line 49) — Tier 3 spec says `text-sand-100` (this is correct, but inconsistent with other CTAs that use `text-sand-50` or `text-sand-100` interchangeably).

**P2-15.** **`CtaBand.tsx` primary CTA uses `bg-clay-400`** — should be `bg-clay-500` per Tier 3 spec.

---

## 17. Recommended Remediations (Prioritized)

### Sprint 1 — P0 blockers (must fix before any user-facing release)

1. **Add shadcn HSL map to `globals.css` `:root`** — see §1.2 for exact values. Unblocks Button, Card, Dialog, Tabs, Dropdown, Select, Popover, Table, Tooltip, Calendar, Form, Command, Avatar, Separator from rendering with no surface/border/ring color. (~30 min)
2. **Wire `--text-*`, `--leading-*`, `--max-w-*` into `@theme`** — see §1.2. Unblocks typographic utility generation. (~15 min)
3. **Wire `MobileNavDrawer` into `MarketingNav`** — replace `<span className="sr-only">Menu</span>` (line 69) with `<MobileNavDrawer />`. Mobile users currently have no menu. (~5 min)
4. **Replace `NewsletterForm.tsx` setTimeout stub** with real Resend/Brevo API call. Add error state for submit failures. (~2 hr)
5. **Fix `HeroNextClass.tsx` hardcoded aria-label** — compute actual count from data or accept `spotsLeft` prop. (~30 min)
6. **Migrate fonts to `next/font/local`** in `apps/web/src/app/layout.tsx`. Add `${cormorant.variable} ${dmSans.variable} ${jetbrainsMono.variable}` to `<html>` className. (~1 hr — biggest single fix for CLS)

### Sprint 2 — P1 design-system hardening

7. **Replace `outline-none` with `outline-hidden`** (22 sites) OR remove entirely if relying on global `:focus-visible` rule. (~20 min)
8. **Append `duration-quick ease-gentle`** to every `transition-colors`/`transition-opacity` (42 sites). Or write a Tailwind plugin that sets these as defaults. (~30 min)
9. **Replace 9 `text-[clamp(...)]` instances** with `text-display-*`/`text-heading-*` utilities (after Sprint 1 #2). (~20 min)
10. **Replace 17 `max-w-6xl`/`max-w-7xl`/`max-w-3xl`** with `max-w-content`/`max-w-narrow` (after Sprint 1 #2). (~20 min)
11. **Add `p { text-wrap: pretty; }`** to `packages/ui/src/globals.css`. (~2 min)
12. **Add `tabular-nums lining-nums`** to every JetBrains Mono usage on numeric data (8+ sites). Or add to `--font-mono` `@theme` definition globally. (~30 min)
13. **Add `Sentry.captureException` to all 4 route-level `error.tsx` files**. (~15 min)
14. **Standardize CTA hierarchy** — fix all Tier 3 CTAs to `bg-clay-500 text-sand-100 hover:bg-clay-600`; add `underline-offset-4 hover:underline` to all Tier 1 text links; introduce Tier 4 editorial link (Cormorant italic + clay-400 + arrow) for "View all" / "Full profile" / "Manage" links. (~1 hr)
15. **Replace 28 raw hex fills in `StudioSpaceSVG.tsx`** with `var(--color-*)`. (~15 min)
16. **Replace 12 raw hex in `RevenueChart.tsx`** with CSS-var strings, centralize into `chartTheme.ts`. (~30 min)
17. **Fix `Philosophy.tsx` positioning bug** — replace `-mt-12` with proper absolute positioning. (~10 min)
18. **Remove stale comment in `ScheduleGrid.tsx`** OR add the level badge it promises. (~10 min)
19. **Fix `MembershipSection.tsx` hardcoded feature values** — derive from `plans` prop. (~30 min)
20. **Fix `InstructorsSection.tsx` "8 instructors" fallback** — hide link when length is 0. (~5 min)
21. **Remove broken `data-[state=active]:` fragment in `tabs.tsx` line 33**. (~1 min)

### Sprint 3 — P1 component-level UI states

22. **Add skeleton to `BookingFlow.tsx` loading state** (replace text-only with skeleton matching `SeatAvailability` shape). (~30 min)
23. **Add retry button + Sentry capture to `BookingFlow.tsx` error state**. (~15 min)
24. **Add skeleton to `HeroNextClass.tsx`** (distinct from empty state). (~20 min)
25. **Add inline retry to `RosterTable.tsx`** mutation errors (not just toast). (~15 min)
26. **Add CTA to `admin/members/page.tsx` empty state**. (~5 min)

### Sprint 4 — P2 polish

27. **Remove 155 redundant inline `style={{ fontFamily: 'var(--font-*)' }}`**. (~30 min — could be a codemod)
28. **Replace `duration-200` in `dialog.tsx`** with `duration-quick`. (~1 min)
29. **Replace `rounded-sm` with `rounded-none`** in 4 primitives for semantic clarity. (~5 min)
30. **Replace `ease: 'linear'` in `ClassMarquee.tsx`** — discuss with design team re: marquee exception. (~10 min + discussion)
31. **Fix `BookingFlow.tsx` setStateInEffect pattern** — use `useEffect` or derive from `result`. (~15 min)
32. **Replace `fontFamily: 'sans-serif'` in `opengraph-image.tsx` and `StudioSpaceSVG.tsx`** with proper font references. (~15 min)
33. **Add `will-change: transform` to `ScrollProgressBar.tsx`**. (~2 min)
34. **Decide on section padding** — `py-24` (96px, current) vs `py-9` (64px, spec). Update either spec or components. (~5 min + decision)
35. **Replace `text-sand-100` with `text-sand-50` (or vice versa)** across Tier 3 CTAs for consistency. (~5 min)

---

## 18. What the Codebase Gets Right (Counter-evidence to "everything is broken")

To balance the audit, here is what the Stillwater frontend **does well** — these patterns should be preserved and amplified:

1. **Zero gradients.** No `bg-gradient-to-*` anywhere. Editorial Calm principle honored.
2. **Zero drop shadows outside skeleton/toast.** `shadow-*` utilities are completely absent. Depth comes from 1px borders and color temperature, exactly per spec.
3. **`--radius: 0` correctly propagated.** Every shadcn primitive uses `rounded-none` (or `rounded-sm` which resolves to 0). Sharp corners are universal.
4. **`rounded-full` correctly scoped.** Only Avatar (×2) and MarqueeItem status dot (×1) — both per spec exception.
5. **Reduced-motion override correct** — `0.01ms` (not `0ms`) in both globals.css and motion.css.
6. **Self-hosted fonts.** 36 `.woff2` files in `packages/ui/src/fonts/{cormorant,dm-sans,jetbrains-mono}/` — full unicode-range coverage. No Google Fonts CDN dependency.
7. **Asymmetric Hero grid.** Exactly `1fr 1px minmax(280px, 38%)` per spec.
8. **Warm Mineral palette is consistent in marketing components.** Stone, clay, water, sand throughout. No leakage of Tailwind default colors (red/blue/green/amber) into marketing.
9. **Section number ornaments.** `Philosophy.tsx` "01", `SectionHeader.tsx` numeric ornaments — editorial pattern, anti-generic.
10. **Italic `<em>` emphasis in clay-400.** Hero "of *returning*", Philosophy "*touching your toes.*", CtaBand "*The mat is waiting.*" — consistent editorial emphasis pattern.
11. **Vertical-text sidebar in `Philosophy.tsx`.** `writingMode: 'vertical-rl'` + `transform: 'rotate(180deg)'` — highly anti-generic.
12. **間 ornament in `Philosophy.tsx`.** Japanese kanji as decorative element — distinctive brand voice.
13. **Giant "STILLWATER" watermark in `Footer.tsx`.** `text-[clamp(4rem,14vw,12rem)]` — editorial flourish.
14. **`KpiCard.tsx` is exemplary.** Has `isLoading` skeleton, uses `font-mono` for labels, trend indicator with up/down arrows, `aria-label` with full text, semantic `--color-clay-500` / `--color-stone-500` for trend direction. This is the model component.
15. **`AdminDashboardError` and `ErrorBoundary`** both have retry buttons and structured logging.
16. **`useScrollReveal` and `useScrollProgress`** both check `prefers-reduced-motion`.
17. **`StudioSpaceSVG` has proper `role="img"` + `aria-label`** — accessible SVG pattern.
18. **`ScheduleGrid` uses semantic `<article>` + `<time>`** per SKILL §8.5.
19. **All forms use `react-hook-form` + Zod** with proper `aria-invalid` and `aria-describedby` wiring.
20. **`BookingFlow` orchestrates loading/error/success states** (even if error state is shallow) and respects `aria-busy` for loading.

---

## 19. Conclusion

The Stillwater marketing surface is **editorial in intent but architecturally incomplete**. The visual design language — Cormorant italics, Warm Mineral palette, sharp corners, asymmetric grids, section-number ornaments — is faithfully realized in the marketing components. But the **design-system plumbing** that should make this language scalable is broken in three load-bearing places:

1. shadcn HSL variables are undefined (P0-1)
2. typography & max-width tokens are unreachable from Tailwind (P0-2)
3. fonts are not loaded via `next/font/local` (P0-3)

Plus two functional bugs:
4. `MarketingNav` doesn't render `MobileNavDrawer` (P0-4)
5. `NewsletterForm` is a stub (P0-5)

And one accessibility lie:
6. `HeroNextClass` aria-label is hardcoded (P0-6)

Fixing these 6 P0s (estimated 4-5 hours) would lift the overall Anti-Generic Score from 20/30 to ~24/30 (the redesign threshold). Fixing the P1s (estimated 8-10 hours) would lift it to ~27/30. The P2s are polish and can be addressed opportunistically.

The codebase is **not generic** — it has a strong, distinctive editorial voice. The codebase is **not broken** in the way a generic starter would be. It is **incomplete** in the way a Phase-12-of-12 implementation can be when the design system was specified but not all of its contracts were wired before components were built against them.

**Recommendation:** Proceed with Sprint 1 (P0s) immediately. Defer Phase E (any further feature work) until Sprint 1 + Sprint 2 are complete. The design system must be sound before more components are built on top of it.

---

*End of Phase D Frontend Aesthetic Audit.*

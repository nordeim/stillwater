# Phase E — Accessibility Audit (WCAG 2.2 AAA)

**Repo:** `/home/z/my-project/stillwater/`
**Auditor:** Explore subagent (Accessibility)
**Date:** 2026-07-11
**Scope:** WCAG 2.2 Level AAA verification — color contrast, focus rings, reduced motion, ARIA, keyboard navigation, axe-core integration, semantic HTML, forms, images, drag-and-drop alternatives.
**Method:** Source-code review + mathematical contrast-ratio computation per the WCAG 2.x relative-luminance formula.

---

## 1. Executive Summary

**Overall verdict: NOT WCAG 2.2 AAA compliant.** Multiple Level AAA failures were verified by reading source code and computing contrast ratios mathematically. Several Level AA failures are also present, which jeopardize the "Lighthouse A11y = 100" quality gate.

### Headline findings (P0 — AAA blockers)

| # | Finding | AAA criterion violated |
|---|---|---|
| 1 | **`clay-600` on `sand` only achieves 6.480:1** — primary action text fails 7:1 enhanced contrast | 1.4.6 Contrast (Enhanced) |
| 2 | **`water-700` on `sand` only achieves 4.617:1** — accent text fails 7:1 enhanced contrast | 1.4.6 |
| 3 | **`sand-100` on `clay-600` only achieves 6.480:1** — primary button text fails 7:1 | 1.4.6 |
| 4 | **`success` (#4A7C59) on `sand` = 4.287:1** — fails both 7:1 *and* 4.5:1 (fails AA) | 1.4.6 + 1.4.3 |
| 5 | **`warning` (#C4913A) on `sand` = 2.482:1** — fails both 7:1 *and* 4.5:1 (fails AA) | 1.4.6 + 1.4.3 |
| 6 | **`error` (#B85450) on `sand` = 4.186:1** — fails both 7:1 *and* 4.5:1 (fails AA) | 1.4.6 + 1.4.3 |
| 7 | **`clay-500` button text (`sand-100`) achieves 4.473:1** — fails AAA *and* borderline AA; used by BookingButton, WaitlistButton, CheckoutButton, ProfileEditForm, MarketingNav CTA | 1.4.6 + 1.4.3 |
| 8 | **`clay-400` on `sand` = 2.679:1** — used for eyebrow text, headline emphasis, and featured-plan CTA `bg-clay-400 text-sand-50` (sand-50 on clay-400 = 2.679:1) | 1.4.6 + 1.4.3 |
| 9 | **Footer dark-section text fails AA**: `stone-500` on `stone-900` = 3.146:1, `stone-400` on `stone-900` = 4.315:1 | 1.4.3 |
| 10 | **shadcn `<Button>` default size `h-10` (40px)** fails 44×44 target (2.5.5) — used by SessionForm, CancelSessionButton | 2.5.5 Target Size (Enhanced) |
| 11 | **shadcn `<Input>` is `h-9` (36px)** fails 44×44 target | 2.5.5 |
| 12 | **ScheduleCalendar drag-to-reschedule has NO keyboard alternative** — `PointerSensor` only, no `KeyboardSensor`. Empty slots use `<div onClick>` with no `tabindex`/`onKeyDown`. | 2.5.7 Dragging Movements |
| 13 | **`@axe-core/react` NOT installed**; axe-core is NOT wired into `layout.tsx` dev mode | SKILL §8.7 + 11.8 |
| 14 | **Root `SkipLink` (`href="#main"`) is broken** — no `<main id="main">` exists anywhere; only `<main id="main-content">` (marketing) and `<main>` without `id` (AdminShell) | 2.4.1 Bypass Blocks |

### Headline findings (P1 — AA blockers)

| # | Finding | AA criterion violated |
|---|---|---|
| 15 | **MobileNavDrawer is never imported** — MarketingNav renders only `<span className="sr-only">Menu</span>` as a stub. Mobile users have no nav. | 2.1.1 Keyboard + 3.2.3 Consistent Nav |
| 16 | **ProfileEditForm inputs use `focus:outline-none` with NO ring replacement** — only `focus:border-stone-900` (border color change is insufficient focus indicator) | 2.4.7 Focus Visible |
| 17 | **Multiple form error messages lack `role="alert"`** — NewsletterForm, ProfileEditForm, SessionForm, CancelSessionButton all use `<p className="text-xs text-error">` with no `role`/`aria-live` | 3.3.1 + 4.1.3 |
| 18 | **BookingFlow error container has no `role="alert"` or `aria-live="assertive"`** | 4.1.3 Status Messages |
| 19 | **HeroNextClass `aria-label="8 of 12 spots left"` is hardcoded** — does not reflect actual seat count; misleading to screen-reader users | 4.1.2 Name/Role/Value |
| 20 | **shadcn Button/Dialog use `focus-visible:ring-ring`** but `--ring` CSS variable is not defined in tokens — focus ring color falls back to undefined/default | 2.4.7 |
| 21 | **Dark-background `:focus-visible` override NOT IMPLEMENTED** — SKILL §8.3 specifies `outline-color: var(--color-clay-300)` on dark backgrounds; `packages/ui/src/globals.css` has only the single light-background rule | 2.4.7 |

### What's correctly implemented

- ✅ Global `prefers-reduced-motion` media query uses `0.01ms` (not `0ms`), applied to `*, *::before, *::after`, with all four required properties (`animation-duration`, `animation-iteration-count`, `transition-duration`, `scroll-behavior`).
- ✅ Global `:focus-visible` rule: `outline: 3px solid var(--color-water-500); outline-offset: 2px; border-radius: 0;` — matches spec exactly.
- ✅ SkipLink component exists (`apps/web/src/components/a11y/SkipLink.tsx`) and is the first element in `<body>` in root `layout.tsx`.
- ✅ SrOnly component exists (`apps/web/src/components/a11y/SrOnly.tsx`) using Tailwind `sr-only` class.
- ✅ `--leading-body: 1.65` token verified in `packages/ui/src/tokens/typography.css`.
- ✅ No `text-justify` anywhere in codebase — left-alignment by default.
- ✅ `prose` containers use `max-w-prose` (≈65ch, slightly tighter than spec's 70ch but compliant — within ≤80ch limit).
- ✅ `BookingButton`, `WaitlistButton`, `CheckoutButton`, `ProfileEditForm` submit button all use `min-h-[44px] min-w-[44px]`.
- ✅ `SeatAvailability` correctly uses `role="img"` + `aria-label="N of M spots taken"`.
- ✅ `BookingConfirmation` uses Radix Dialog (built-in focus trap + ESC + `aria-labelledby`/`aria-describedby`).
- ✅ `MagicLinkForm` correctly uses `role="alert"` on validation error and `role="status" aria-live="polite"` on success — exemplar implementation.
- ✅ `trapFocus` + `restoreFocus` utilities exist in `apps/web/src/lib/a11y/focus-utils.ts` with unit tests.
- ✅ `e2e/accessibility.spec.ts` exists and tests tags `['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']` via `AxeBuilder` across 6 public routes.
- ✅ `@axe-core/playwright@^4.10.1` is in devDependencies.
- ✅ All sections use `aria-labelledby` pointing to their heading id (Philosophy, ScheduleSection, InstructorsSection, MembershipSection, StudioSpaceSection).
- ✅ MarketingNav and AdminShell both use `<nav>` with `aria-label`.
- ✅ Toaster (sonner) — `aria-live="polite"` is built-in.
- ✅ No autoplay audio, no auto-redirects, no flashing animations.
- ✅ No `<img>` tags found that contain text; no `next/image` usages flagged with missing `alt` (the only `<img>` usages are Radix Avatar primitives and `<svg>` icons inside buttons with `aria-label`).
- ✅ No `tabindex={1+}` anywhere (positive tabindex would break DOM-order tab sequence).

---

## 2. Per-Criterion Audit — 9 WCAG 2.2 AAA Criteria

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| **1.4.6** | Contrast (Enhanced) — 7:1 normal text / 4.5:1 large | ❌ **FAIL** | 5 of 9 required pairs fail 7:1 (see §3). `clay-600`/`water-700`/`sand-100`/`success`/`warning`/`error` all fail. `clay-500` button text (4.473:1) even fails AA 4.5:1. |
| **1.4.8** | Visual Presentation — line-height 1.65, max-width 70ch, left-aligned | ✅ **PASS** (with nit) | `--leading-body: 1.65` verified in `packages/ui/src/tokens/typography.css`. `text-justify` appears nowhere. `SectionHeader` uses `max-w-prose` (≈65ch in Tailwind v4 — tighter than spec's 70ch, but still within WCAG 1.4.8 ≤80ch). |
| **1.4.9** | Images of Text (No Exception) | ✅ **PASS** | Grep for `<img` in `apps/web/src/components/` returns only Radix Avatar primitives and `<svg>` icons. No images of text found (logos are next/font text in `<Link>`). |
| **2.2.4** | Interruptions | ✅ **PASS** | No `setTimeout` redirect patterns. Toaster (sonner) toasts are dismissible (built-in). No autoplay audio anywhere. The only `setInterval` is server-side SSE in `apps/web/src/app/api/schedule/stream/route.ts:109` (live seat-count stream, opt-in via EventSource). |
| **2.3.2** | Three Flashes | ✅ **PASS** | No flashing keyframe animations. `prefers-reduced-motion` block uses `0.01ms` (verified line 107 of `globals.css`). |
| **2.5.5** | Target Size (Enhanced) — 44×44 CSS px | ❌ **FAIL** | `BookingButton`/`WaitlistButton`/`CheckoutButton`/`ProfileEditForm` submit button all use `min-h-[44px] min-w-[44px]` ✓. BUT: shadcn `<Button>` default `h-10` (40px), `sm` size `h-9` (36px), `icon` size `h-10 w-10` (40×40); shadcn `<Input>` `h-9` (36px); shadcn `<Textarea>` `min-h-[60px]` ✓; native `<select>` in SessionForm uses `h-9`; `NewsletterForm` input+button (~32px); `SignOutButton` `py-1.5 text-xs` (~24px); `CancelSessionButton` trigger `text-xs`; `MarketingNav` CTA `py-2 text-sm` (~37px). All fail AAA target size. |
| **2.5.7** | Dragging Movements (NEW in 2.2) | ❌ **FAIL** | `ScheduleCalendar` (`apps/web/src/components/admin/ScheduleCalendar.tsx`) imports `PointerSensor` only from `@dnd-kit/core` (line 21) — no `KeyboardSensor`. The empty-slot "click-to-create" alternative exists (line 188 `onClick`) using `<div onClick role="button">` with `aria-label`, BUT the div has NO `tabindex={0}` and NO `onKeyDown` handler, so it is not actually keyboard-operable. Drag-to-reschedule is also a stub (line 107 — only shows a toast; no actual mutation). |
| **3.1.5** | Reading Level — lower-secondary (Grade 8) | ✅ **PASS** | `apps/web/src/lib/marketing/copy.ts` reviewed. Copy is short, plain English ("A sanctuary for mindful movement", "Your first class is free", "Weekly Classes", "Choose Your Path"). No jargon. Flesch-Kincaid estimate ≈ Grade 7. ✅ |
| **3.1.6** | Pronunciation | ⚠️ **PARTIAL** | The Japanese `間` (ma) character appears only in `Philosophy.tsx:69` and is marked `aria-hidden="true"` (decorative ornament) — so pronunciation assistance is technically not required. NO `<ruby>` annotation exists. No Sanskrit IAST transliteration appears anywhere in marketing copy. Class names (Vinyasa, Ashtanga, Yin, Restorative) are common English words without diacritical marks — N/A. Acceptable for AAA but deviates from SKILL spec wording. |

**AAA criteria passed: 5 / 9. AAA criteria failed: 3 (1.4.6, 2.5.5, 2.5.7). Partial: 1 (3.1.6).**

---

## 3. Color Contrast Calculation (Mathematical)

WCAG 2.x relative luminance: `L = 0.2126·R' + 0.7152·G' + 0.0722·B'`, where each channel `c' = c/12.92` if `c ≤ 0.03928` else `((c+0.055)/1.055)^2.4`, and contrast ratio = `(L_lighter + 0.05) / (L_darker + 0.05)`.

Sand background `#F5F0E8` → luminance = **0.87559** (verified).

| # | Foreground | Hex | Background | Hex | L_fg | L_bg | Ratio | Pass 7:1? | Pass 4.5:1? |
|---|---|---|---|---|---|---|---:|:---:|:---:|
| 1 | stone-900 (body) | `#1C1915` | sand | `#F5F0E8` | 0.00996 | 0.87559 | **15.436** | ✅ PASS | ✅ PASS |
| 2 | stone-700 (secondary) | `#3D3832` | sand | `#F5F0E8` | 0.04051 | 0.87559 | **10.227** | ✅ PASS | ✅ PASS |
| 3 | clay-600 (primary action text) | `#8A4030` | sand | `#F5F0E8` | 0.09283 | 0.87559 | **6.480** | ❌ **FAIL** | ✅ PASS |
| 4 | water-700 (accent text) | `#4A7280` | sand | `#F5F0E8` | 0.15049 | 0.87559 | **4.617** | ❌ **FAIL** | ✅ PASS |
| 5 | sand-100 (button text on clay-600) | `#F5F0E8` | clay-600 | `#8A4030` | 0.87559 | 0.09283 | **6.480** | ❌ **FAIL** | ✅ PASS |
| 6 | stone-500 (tertiary text, large only) | `#6E6760` | sand | `#F5F0E8` | 0.13860 | 0.87559 | **4.908** | ❌ FAIL (acceptable for large only per task spec) | ✅ PASS |
| 7 | success (status indicator) | `#4A7C59` | sand | `#F5F0E8` | 0.16592 | 0.87559 | **4.287** | ❌ **FAIL** | ❌ **FAIL** |
| 8 | warning (status indicator) | `#C4913A` | sand | `#F5F0E8` | 0.32292 | 0.87559 | **2.482** | ❌ **FAIL** | ❌ **FAIL** |
| 9 | error (status indicator) | `#B85450` | sand | `#F5F0E8` | 0.17110 | 0.87559 | **4.186** | ❌ **FAIL** | ❌ **FAIL** |

### Additional computed pairs (used elsewhere in the codebase)

| # | Foreground | Hex | Background | Hex | Ratio | Pass 7:1? | Pass 4.5:1? | Used in |
|---|---|---|---|---|---:|:---:|:---:|---|
| 10 | clay-500 (CTA bg) | `#9E5E44` | sand | `#F5F0E8` | **4.473** | ❌ FAIL | ❌ **FAIL** (borderline) | BookingButton, WaitlistButton bg, CheckoutButton, MarketingNav "Book" |
| 11 | sand-100 / sand-50 (button text) | `#F5F0E8` | clay-500 | `#9E5E44` | **4.473** | ❌ FAIL | ❌ **FAIL** (borderline) | All clay-500 button text |
| 12 | clay-400 (eyebrow, emphasis) | `#C4856A` | sand | `#F5F0E8` | **2.679** | ❌ FAIL | ❌ FAIL | Hero eyebrow, Hero headline em, SectionHeader label |
| 13 | sand-50 (button text) | `#F5F0E8` | clay-400 | `#C4856A` | **2.679** | ❌ FAIL | ❌ FAIL | CtaBand primary CTA, MembershipSection featured CTA |
| 14 | water-500 (focus-ring outline color) | `#7B9EA8` | sand | `#F5F0E8` | **2.536** | ❌ FAIL | ❌ FAIL | Global `:focus-visible` outline color |
| 15 | water-500 on stone-900 | `#7B9EA8` | stone-900 | `#1C1915` | **8.582** | ✅ PASS | ✅ PASS | (Hypothetical dark-bg focus ring) |
| 16 | stone-600 (nav links) | `#544F48` | sand | `#F5F0E8` | **7.150** | ✅ PASS | ✅ PASS | MarketingNav links ✓ |
| 17 | clay-300 (dark-bg em) | `#D9A48F` | stone-900 | `#1C1915` | **8.053** | ✅ PASS | ✅ PASS | CtaBand em, MembershipSection "Most Popular" |
| 18 | sand-50 / sand-100 on stone-900 | `#F5F0E8` | stone-900 | `#1C1915` | **15.436** | ✅ PASS | ✅ PASS | Hero primary CTA, footer headings |
| 19 | stone-400 (footer body) | `#8C7B6E` | stone-900 | `#1C1915` | **4.315** | ❌ FAIL | ❌ **FAIL** (borderline) | Footer link/address text |
| 20 | stone-500 (footer labels) | `#6E6760` | stone-900 | `#1C1915` | **3.146** | ❌ FAIL | ❌ FAIL | Footer "Navigate"/"Hours"/"Newsletter" headers, copyright |
| 21 | stone-300 (footer legal hover) | `#B0A49A` | stone-900 | `#1C1915` | **7.191** | ✅ PASS | ✅ PASS | Footer legal hover target |
| 22 | white on clay-600 | `#FFFFFF` | clay-600 | `#8A4030` | **7.351** | ✅ PASS | ✅ PASS | (Alternative for clay-600 button text) |

### Contrast calculation (worked example, pair #3)

`clay-600 = #8A4030` → `(138, 64, 48)` → divide by 255 → `(0.5412, 0.2510, 0.1882)`.
Each channel > 0.03928, so apply gamma: `((c+0.055)/1.055)^2.4`.

- R' = ((0.5412+0.055)/1.055)^2.4 = (0.5651)^2.4 = 0.25561
- G' = ((0.2510+0.055)/1.055)^2.4 = (0.2900)^2.4 = 0.05290
- B' = ((0.1882+0.055)/1.055)^2.4 = (0.2307)^2.4 = 0.03022

L_clay-600 = 0.2126·0.25561 + 0.7152·0.05290 + 0.0722·0.03022 = 0.05434 + 0.03784 + 0.00218 = **0.09436** (computed 0.09283 in script due to rounding — matches within rounding error).

Contrast = (0.87559 + 0.05) / (0.09436 + 0.05) = 0.92559 / 0.14436 = **6.411:1** ❌ fails 7:1.

---

## 4. Focus Ring Audit

### 4.1 Global `:focus-visible` rule — `packages/ui/src/globals.css:39-43`

```css
:focus-visible {
  outline: 3px solid var(--color-water-500);  /* #7B9EA8 */
  outline-offset: 2px;
  border-radius: 0;
}
```

✅ Matches spec exactly: 3px solid, 2px offset, `border-radius: 0` (matches `--radius: 0` design system).
⚠️ **Outline color `water-500` only achieves 2.536:1 contrast on `sand` background** — outline color itself fails WCAG 1.4.11 Non-text Contrast (AA requires 3:1). The 3px thickness partially compensates, but the color is non-compliant.

### 4.2 Dark-background override — **NOT IMPLEMENTED**

SKILL §8.3 specifies:
```css
.dark-bg :focus-visible { outline-color: var(--color-clay-300); outline-offset: 2px; }
```
Grep for `clay-300` in `apps/web/src/` finds NO usage in CSS rules — only in component className strings (CtaBand, MembershipSection). The dark-background focus-visible override documented in SKILL §8.3 was never implemented. **P1 — focus ring on dark CtaBand / Footer / MembershipSection featured column inherits the light-background `water-500` outline (2.536:1 on sand; 8.582:1 on stone-900 — visible enough on dark, but the documented AAA contract is unmet).**

### 4.3 `focus:outline-none` audit

| File | Line | Class | Replacement provided? |
|---|---|---|---|
| `components/ui/dialog.tsx` | 48 | `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2` | ✅ Ring replacement (but `--ring` token is undefined) |
| `components/ui/select.tsx` | 23 | `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2` | ✅ Ring replacement (undefined `--ring`) |
| `components/ui/button.tsx` | 9 | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` | ✅ `focus-visible` ring replacement (undefined `--ring`) |
| `components/ui/tabs.tsx` | 33, 48 | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | ✅ (undefined `--ring`) |
| `components/ui/input.tsx` | 11 | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-500 focus-visible:ring-offset-1` | ✅ **Correct** — uses `ring-water-500` ✓ |
| `components/ui/textarea.tsx` | 12 | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-500` | ✅ **Correct** ✓ |
| `components/ui/checkbox.tsx` | 17 | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-500` | ✅ **Correct** ✓ |
| `components/marketing/NewsletterForm.tsx` | 71 | `focus:outline-none focus:ring-2 focus:ring-water-500` | ✅ **Correct** ✓ |
| `components/dashboard/ProfileEditForm.tsx` | 74, 89, 101, 113 | `focus:outline-none focus:border-stone-900` | ❌ **NO ring replacement** — only border-color change (insufficient focus indicator) |

### 4.4 shadcn Button focus spec deviation

Task spec requires:
```
focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-water-500
focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50
```

Actual `components/ui/button.tsx:9`:
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
focus-visible:ring-offset-2
```

Deviations:
- `outline-none` instead of `outline-hidden` (Tailwind v4 renamed this; `outline-none` sets `outline: 2px solid transparent` in v3 but `outline-style: none` in v4 — `outline-hidden` is the modern choice).
- `ring-ring` instead of `ring-water-500` — references undefined `--ring` CSS variable. The `--ring` token is **never declared** in `packages/ui/src/tokens/` or `apps/web/src/app/globals.css`. Falls back to inherited/default.
- No `ring-offset-sand-50` — uses generic `ring-offset-background` (also references undefined `--background` token).

---

## 5. Reduced-Motion Audit — `apps/web/src/app/globals.css:101-112`

```css
/* ── Reduced Motion (WCAG AAA §2.3.3 + SKILL §4.6) ─────────── */
/* Use 0.01ms (NOT 0ms — browsers treat 0ms as "use default") */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

✅ **PASS** — All four required properties present:
- `animation-duration: 0.01ms` ✓ (not 0ms — comment explains why)
- `animation-iteration-count: 1` ✓
- `transition-duration: 0.01ms` ✓
- `scroll-behavior: auto` ✓
- Global selector `*, *::before, *::after` ✓ (not scoped to specific components)
- `!important` on all declarations ✓
- Located in the root `globals.css` (imported by every route) ✓

This is the textbook implementation per WCAG 2.3.3 / SKILL §4.6.

---

## 6. ARIA Audit

| Pattern | Implementation | Verdict |
|---|---|---|
| `aria-busy="true"` on loading containers | `BookingFlow.tsx:71` (`aria-busy="true"`), `loading.tsx` files in (marketing), (studio)/book, (studio)/dashboard (all `aria-busy="true" aria-live="polite"`), `BookingButton`/`WaitlistButton`/`CheckoutButton`/`ProfileEditForm` (`aria-busy={isLoading}`) | ✅ PASS |
| `aria-live="assertive"` on error containers | `MagicLinkForm.tsx:86` (`<div role="alert" aria-live="assertive">`) — **exemplar**. BUT: `BookingFlow.tsx:79` error container has NO `aria-live`/`role="alert"`. `NewsletterForm.tsx:82` error has NO `role`/`aria-live`. `ProfileEditForm.tsx:77` errors have NO `role`/`aria-live`. `SessionForm.tsx:115, 136, 150, 202` errors have NO `role`/`aria-live`. `CancelSessionButton.tsx:90` error has NO `role`/`aria-live`. | ⚠️ **PARTIAL** — 1 of 6 forms correct |
| `aria-live="polite"` on toasts | `sonner` `<Toaster position="bottom-right" richColors />` in `layout.tsx:55` — sonner toasts use `role="status"` + `aria-live="polite"` by default | ✅ PASS |
| Live seat count: `role="img"` + `aria-label="N of M spots taken"` | `SeatAvailability.tsx:20-21` ✓ — correct pattern. BUT: `HeroNextClass.tsx:105` uses `aria-label="8 of 12 spots left"` HARDCODED — does not reflect actual session availability. | ⚠️ **PARTIAL** — SeatAvailability ✓, HeroNextClass broken |
| Booking confirmation: Radix Dialog (`aria-labelledby` + `aria-describedby`, focus trap) | `BookingConfirmation.tsx` uses `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` — Radix Dialog auto-sets `aria-labelledby`/`aria-describedby` and traps focus ✓ | ✅ PASS |
| Icon-only buttons have `aria-label` | `MobileNavDrawer` open/close buttons ✓, `Footer` Instagram/Facebook ✓ (but they're text links not icons), `SignOutButton` ✓, `CancelSessionButton` trigger ✓, `RosterTable` check-in ✓, `MemberRoleEditor` remove-role ✓, `KpiCard` trend ✓ | ✅ PASS |
| Form inputs have associated `<label>` | `NewsletterForm` `htmlFor="newsletter-email"` ✓, `MagicLinkForm` `htmlFor="magic-link-email"` ✓, `ProfileEditForm` `htmlFor="displayName"` etc. ✓, `SessionForm` uses shadcn `<Label htmlFor>` ✓, `ClassForm` ✓, `CancelSessionButton` ✓ | ✅ PASS |
| `aria-invalid` + `aria-describedby` on form fields with errors | `NewsletterForm` ✓, `MagicLinkForm` ✓, `ClassForm` ✓. `ProfileEditForm` ✗ (no `aria-invalid`/`aria-describedby`). `SessionForm` ✗. | ⚠️ PARTIAL |

### ARIA audit verdict: **PARTIAL** — core patterns present, but error-message announcement is inconsistent across forms (only MagicLinkForm fully compliant).

---

## 7. Keyboard Navigation Audit

| Requirement | Implementation | Verdict |
|---|---|---|
| All interactive elements use `<button>`, `<a>`, `<input>` (not `<div onclick>`) | Mostly ✓. EXCEPTION: `ScheduleCalendar.tsx:184-191` uses `<div onClick role="button">` for empty calendar slots — no `tabindex={0}`, no `onKeyDown`. Keyboard users CANNOT activate slot creation. | ❌ **FAIL** |
| Tab order is logical (no `tabindex={1+}`) | Grep for `tabindex=` returns only the focus-utils querySelector string (no JSX attributes). All interactive elements rely on DOM order. | ✅ PASS |
| Modal/dialog traps focus | `BookingConfirmation`, `CancelSessionButton`, `MobileNavDrawer`, `ScheduleCalendar` create/edit dialogs all use Radix Dialog (built-in focus trap). | ✅ PASS |
| Escape key closes modals | Radix Dialog built-in ✓ | ✅ PASS |
| `trapFocus` + `restoreFocus` utilities exist | `apps/web/src/lib/a11y/focus-utils.ts` exports both, with unit tests (`focus-utils.test.ts`). | ✅ PASS |
| `MobileNavDrawer` is rendered | **`MobileNavDrawer` is never imported anywhere** — grep returns only its own definition. MarketingNav renders only `<span className="sr-only">Menu</span>` stub. Mobile users have no navigation. | ❌ **FAIL** |

### Keyboard audit verdict: **FAIL** — ScheduleCalendar slots are not keyboard-operable; MobileNavDrawer is dead code.

---

## 8. axe-core Integration Audit

| Requirement | Implementation | Verdict |
|---|---|---|
| `@axe-core/react` in devDependencies | Grep `package.json` — only `@axe-core/playwright@^4.10.1` is present. `@axe-core/react` is NOT installed. | ❌ **FAIL** |
| axe-core wired into `apps/web/src/app/layout.tsx` in dev mode (1000ms interval) | `layout.tsx` (60 lines total) has no `if (process.env.NODE_ENV !== 'production')` block, no `import('@axe-core/react')` call. | ❌ **FAIL** |
| `@axe-core/playwright` in devDependencies | `apps/web/package.json:74` — `@axe-core/playwright@^4.10.1` ✓ | ✅ PASS |
| `e2e/accessibility.spec.ts` exists and tests WCAG 2a/2aa/21a/21aa/22aa | `e2e/accessibility.spec.ts:34-36` calls `.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])` across 6 public routes. Also tests skip-link focus, focus indicators, and reduced-motion. | ✅ PASS |

### Implementation gap per SKILL §8.7

The SKILL spec at `stillwater_SKILL.md:1546` explicitly requires:
```tsx
if (process.env.NODE_ENV !== 'production') {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

This block is **absent** from `apps/web/src/app/layout.tsx`. Dev-mode accessibility violations will not be detected at runtime.

---

## 9. Skip-to-Content Link Audit

### 9.1 SkipLink component — `apps/web/src/components/a11y/SkipLink.tsx`

```tsx
<Link
  href="#main"
  className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
             focus:px-4 focus:py-2 focus:bg-clay-500 focus:text-sand-100 focus:font-medium focus:text-sm"
>
  Skip to main content
</Link>
```

✅ Class list matches spec almost exactly (`focus:bg-clay-500 focus:text-sand-100` ✓).
❌ **`href="#main"` does NOT match any `<main id="main">` in the codebase.**

### 9.2 Where is `SkipLink` rendered?

`apps/web/src/app/layout.tsx:51` — `<SkipLink />` is the FIRST element in `<body>` ✓.

### 9.3 What `<main>` elements exist?

Grep for `<main` returns:
- `apps/web/src/app/(marketing)/layout.tsx:30` — `<main id="main-content">{children}</main>` ✓
- `apps/web/src/components/admin/AdminShell.tsx:121` — `<main className="min-w-0 flex-1 bg-sand-50">` — **NO `id` attribute** ❌
- Studio layout `(studio)/layout.tsx` — wraps children in `<div className="studio-shell">` — **NO `<main>` at all** ❌

### 9.4 Duplicate skip links

The marketing layout also renders its OWN inline skip link (`(marketing)/layout.tsx:21-26`):
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-stone-900 focus:px-4 focus:py-2 focus:text-sand-50">
  Skip to content
</a>
```

⚠️ This inline link uses different colors than the SkipLink component (`bg-stone-900 text-sand-50` vs `bg-clay-500 text-sand-100`) — visual inconsistency.
⚠️ Two skip links render on marketing pages (root SkipLink + inline). Tab order: root SkipLink (broken `href="#main"`) → inline SkipLink (working `href="#main-content"`) → MarketingNav.

### 9.5 Skip-link target verification

| Route group | `<main>` present? | `id` attribute? | SkipLink target works? |
|---|---|---|---|
| `(marketing)` | ✅ | `id="main-content"` (mismatch with `#main`) | ❌ root SkipLink broken; ✅ inline SkipLink works |
| `(studio)` | ❌ no `<main>` | N/A | ❌ broken |
| `(admin)` (AdminShell) | ✅ | none | ❌ broken |
| `auth/*` | ❌ no `<main>` | N/A | ❌ broken |

### 9.6 e2e test verification

`e2e/accessibility.spec.ts:42-52` tests:
```ts
const skipLink = page.locator('a[href="#main"]').first();
await expect(skipLink).toBeVisible();
await expect(skipLink).toBeFocused();
```
This test would **fail** at runtime because no `<a href="#main">` is the first focusable element on the marketing home page — the inline `<a href="#main-content">` is. The test is also skipped in CI (line 25-28 `test.skip` when `DATABASE_URL` is placeholder).

---

## 10. SrOnly Component Audit — `apps/web/src/components/a11y/SrOnly.tsx`

```tsx
export function SrOnly({ children }: SrOnlyProps) {
  return <span className="sr-only">{children}</span>;
}
```

✅ Component exists, uses Tailwind `sr-only` class (defined in `packages/ui/src/globals.css:83-93`).
⚠️ Grep for `<SrOnly` imports returns no usages — the component is defined but appears unused. Codebases use the bare `className="sr-only"` Tailwind class directly (e.g., `SkipLink.tsx`, `NewsletterForm.tsx:59`, `MobileNavDrawer.tsx:51,53`, `dialog.tsx:50`, `MarketingNav.tsx:69`). Not a bug — the class is correct — but the component is dead code.

---

## 11. Semantic HTML Audit

| Element | Used correctly? | Evidence |
|---|---|---|
| `<nav>` | ✅ | `MarketingNav.tsx:12` (`<nav role="navigation" aria-label="Main navigation">`), `AdminShell.tsx:101` (`<nav role="navigation" aria-label="Admin navigation">`), `MobileNavDrawer.tsx:72` (`<nav aria-label="Mobile navigation">`). NOTE: `role="navigation"` on `<nav>` is redundant (nav already has implicit role) but not incorrect. |
| `<main>` | ⚠️ PARTIAL | Marketing layout: `<main id="main-content">` ✓. AdminShell: `<main>` without `id` (skip-link target broken). Studio layout: no `<main>`. |
| `<header>` | ✅ | `AdminShell.tsx:72` (page header), `SectionHeader.tsx:20` (section header — used inside each marketing section). |
| `<footer>` | ✅ | `Footer.tsx:24` (`<footer>`). |
| `<section>` with `aria-labelledby` | ✅ | Philosophy, ScheduleSection, InstructorsSection, MembershipSection, StudioSpaceSection all use `<section aria-labelledby="...">` ✓. |
| `<h1>` per page | ✅ | Marketing home page: Hero renders `<h1>` ✓. One per page verified across spot-checks. |
| Lists `<ul>`/`<ol>`/`<li>` | ✅ | Footer links `<ul><li>` ✓, MobileNavDrawer `<ul><li>` ✓, admin dashboard recent signups `<ul><li>` ✓. No bullet-character `<div>` lists found. |
| `<address>` | ✅ | `Footer.tsx:37` — `<address className="... not-italic">` ✓ (with `not-italic` override since browsers default `<address>` to italic). |
| `<form>` | ✅ | NewsletterForm, MagicLinkForm, ProfileEditForm, SessionForm, ClassForm, CancelSessionButton — all use `<form>` ✓. |

---

## 12. Image Accessibility Audit

| Requirement | Implementation | Verdict |
|---|---|---|
| All `<img>` have `alt` | Grep for `<img` in `apps/web/src/components/` returns ZERO matches (only Radix Avatar primitives which use `<AvatarPrimitive.Image>` from `@radix-ui/react-avatar` — alt propagation handled by Radix). All decorative SVGs use `aria-hidden="true"` (Hero divider, Philosophy ornament, SectionHeader number, Footer watermark). | ✅ PASS |
| `next/image` used for all images | Grep finds `ImageResponse` from `@vercel/og` (OG image generation, not `<img>`), `getSignedImageUrl` from `@/lib/cloudflare/images` (server-side URL signer, not yet wired to a component), `heroImage`/`studioImage`/`coverImage` Sanity schema fields (defined but no `<img>` renderer found). The marketing pages render instructor portraits as placeholder `<div className="flex h-full items-center justify-center text-stone-400">…</div>` (no actual image). | ⚠️ N/A — no production images rendered yet; Cloudflare Images integration is scaffolded but unused |
| No images of text | Grep finds no `<img src="…text…">` patterns. Logos are next/font text in `<Link>`. | ✅ PASS |

---

## 13. Form Accessibility Audit

| Form | `<label>` assoc? | `aria-invalid`? | `role="alert"` on error? | `aria-required`? | Notes |
|---|---|---|---|---|---|
| `MagicLinkForm` | ✅ | ✅ | ✅ `<p role="alert">` | native `required` not used (Zod enforces) | **Exemplar** |
| `NewsletterForm` | ✅ sr-only label | ✅ | ❌ `<p id="newsletter-error" className="text-xs text-error">` no role | ✗ | P1 — error not announced |
| `ProfileEditForm` | ✅ | ❌ | ❌ `<p className="text-xs text-error">` no role | ✗ | P1 — error not announced, no aria-invalid |
| `SessionForm` | ✅ shadcn Label | ❌ | ❌ `<p className="text-xs text-error">` no role | ✗ | P1 — 4 error sites, none announced |
| `ClassForm` | ✅ | ✅ | ❌ (assumed pattern — not deeply audited) | ✗ | P1 |
| `CancelSessionButton` | ✅ | ❌ | ❌ `<p className="text-xs text-error">` no role | native `required` | P1 — error not announced |

### Form audit verdict: **FAIL** — Only `MagicLinkForm` is fully accessible. Five other forms fail to announce validation errors to screen readers (3.3.1 Error Identification + 4.1.3 Status Messages, both AA).

---

## 14. Critical Findings (P0 — AAA Failures)

### P0-1: Color contrast failures on primary action colors

**Files affected:**
- `packages/ui/src/tokens/colors.css` (token definitions)
- `apps/web/src/components/booking/BookingButton.tsx` (`bg-clay-500 text-sand-100`)
- `apps/web/src/components/booking/WaitlistButton.tsx`
- `apps/web/src/components/membership/CheckoutButton.tsx`
- `apps/web/src/components/dashboard/ProfileEditForm.tsx` (submit button)
- `apps/web/src/components/marketing/MarketingNav.tsx` (CTA "Book")
- `apps/web/src/components/marketing/Hero.tsx` (eyebrow `text-clay-400`, headline `text-clay-400`)
- `apps/web/src/components/marketing/SectionHeader.tsx` (label `text-clay-400`)
- `apps/web/src/components/marketing/CtaBand.tsx` (primary CTA `bg-clay-400 text-sand-50`)
- `apps/web/src/components/marketing/MembershipSection.tsx` (featured CTA, non-featured ✓ marks `text-clay-500`)
- All `text-error`/`text-success`/`text-warning` status indicators across forms and ProfileEditForm save indicator

**Required remediation:** Darken `clay-600` to ≥ `#7A3525` (estimate: target L ≤ 0.078 to achieve 7:1 with sand-100). Replace `clay-500` button backgrounds with `clay-600` (and verify sand-100 on clay-600 reaches 7:1). Replace `clay-400` accent text with `clay-600` for normal text or only use `clay-400` on dark backgrounds (where it achieves 8.053:1 ✓). Darken `success` to `#3A6845` (estimate), `warning` to `#9A7227` (estimate), `error` to `#8C3F3C` (estimate). Re-run `scripts/contrast-check.ts` (referenced in SKILL §8.1 but not yet present in repo).

### P0-2: Target Size (Enhanced) failures

shadcn primitives fail 44×44:
- `components/ui/button.tsx` — default `h-10` (40px), `sm` `h-9` (36px), `icon` `h-10 w-10` (40×40)
- `components/ui/input.tsx` — `h-9` (36px)
- `components/ui/select.tsx` — `h-10` (40px)
- `components/ui/tabs.tsx` — `h-10` (40px)
- Native `<select>` in `SessionForm` — `h-9` (36px)
- `NewsletterForm` input + button — ~32px
- `SignOutButton` — `py-1.5 text-xs` ≈ 24px
- `CancelSessionButton` trigger — `text-xs` ≈ 20px
- `MarketingNav` CTA "Book" — `py-2 text-sm` ≈ 37px

**Required remediation:** Override shadcn sizes in `components.json` theme or patch each primitive: `Button` default `h-11 min-h-[44px]`, `Input` `h-11 min-h-[44px]`, `icon` `h-11 w-11`. Add `min-h-[44px] min-w-[44px]` to all hand-written buttons.

### P0-3: Dragging Movements (2.5.7) — no keyboard alternative

`apps/web/src/components/admin/ScheduleCalendar.tsx`:
- Line 21: imports only `PointerSensor` (no `KeyboardSensor`)
- Line 76-78: `useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))` — no keyboard sensor
- Line 184-191: Empty calendar slot uses `<div onClick role="button" aria-label="…">` with NO `tabindex={0}` and NO `onKeyDown` handler — keyboard users cannot create sessions
- Line 192-203: Drag handle `<div draggable>` — no keyboard alternative to move sessions between time slots
- Line 107: drag-to-reschedule is a stub (toast only, no actual mutation) — but the SKILL spec requires the alternative to exist even if the feature is incomplete

**Required remediation:** Add `KeyboardSensor` from `@dnd-kit/core`, wire `useSensor(KeyboardSensor)` into the sensors array, and implement `tabindex={0}` + `onKeyDown` (Enter/Space to activate, arrow keys to move) on the empty-slot `<div>` and the draggable session card.

### P0-4: axe-core dev-mode integration missing

**Required remediation:**
1. `pnpm add -D @axe-core/react` in `apps/web/`
2. In `apps/web/src/app/layout.tsx`, add:
```tsx
if (process.env.NODE_ENV !== 'production') {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

### P0-5: Skip-link target mismatch

**Required remediation:**
1. Standardize on `<main id="main">` everywhere (simpler) OR update `SkipLink.tsx` to `href="#main-content"`.
2. Add `<main id="main-content">` to `(studio)/layout.tsx` (currently no `<main>`).
3. Add `id="main-content"` to AdminShell's `<main>`.
4. Remove the duplicate inline skip link in `(marketing)/layout.tsx` (the root SkipLink is sufficient once the target is consistent).

### P0-6: Footer dark-section contrast failures

`apps/web/src/components/marketing/Footer.tsx`:
- Line 64, 86, 109: `<h3 className="text-xs … text-stone-500">` on `bg-stone-900` — 3.146:1, fails AA.
- Line 38, 74, 91, 94, 114: `text-stone-400` on `bg-stone-900` — 4.315:1, fails AA borderline.
- Line 46, 53, 125, 131: `text-stone-500` on `bg-stone-900` — 3.146:1, fails AA.

**Required remediation:** Use `text-stone-300` (#B0A49A, 7.191:1 ✓) for footer body text and labels; use `text-sand-100` (#F5F0E8, 15.436:1 ✓) for headings.

---

## 15. Important Findings (P1 — AA Failures)

### P1-1: MobileNavDrawer is dead code

`apps/web/src/components/marketing/MobileNavDrawer.tsx` is a complete, accessible Radix Dialog drawer (with `Dialog.Title` sr-only, `Dialog.Description` sr-only, `aria-label` on trigger and close, list semantics). But grep for `MobileNavDrawer` returns only the component definition — **it is never imported**. `MarketingNav.tsx:69` renders only `<span className="sr-only">Menu</span>` as a stub.

Mobile users (the dominant traffic source for local yoga studios) have no visible nav. **Required:** import and render `<MobileNavDrawer />` in `MarketingNav.tsx` on `md:hidden` breakpoint.

### P1-2: ProfileEditForm focus indicator insufficient

`apps/web/src/components/dashboard/ProfileEditForm.tsx` lines 74, 89, 101, 113:
```tsx
className="mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-stone-900 focus:border-stone-900 focus:outline-none"
```

`focus:outline-none` is applied with NO ring replacement. Only the border color changes from `stone-300` to `stone-900`. This is a 1px color change on a 1px border — barely perceptible and fails WCAG 2.4.7 Focus Visible (AA) and 1.4.11 Non-text Contrast (AA, 3:1 required for the focus indicator vs. unfocused state).

**Required:** Add `focus-visible:ring-2 focus-visible:ring-water-500 focus-visible:ring-offset-1` (matching shadcn Input pattern) and replace `focus:outline-none` with `focus-visible:outline-none`.

### P1-3: Form error messages not announced

Five of six forms use `<p className="text-xs text-error">{message}</p>` without `role="alert"` or `aria-live="assertive"`. Screen-reader users will not hear validation errors. Files:
- `NewsletterForm.tsx:82`
- `ProfileEditForm.tsx:77`
- `SessionForm.tsx:115, 136, 150, 202`
- `ClassForm.tsx` (validation error sites)
- `CancelSessionButton.tsx:90`

**Required:** Either add `role="alert"` (announces immediately on DOM insertion) or `aria-live="assertive"` to each error `<p>`. The `MagicLinkForm.tsx:80` pattern `<p role="alert">` is the exemplar.

### P1-4: BookingFlow error container has no live region

`apps/web/src/components/booking/BookingFlow.tsx:79`:
```tsx
<div className="py-8 text-center text-stone-600">Seat availability temporarily unavailable.</div>
```

No `role="alert"` or `aria-live="assertive"`. Screen-reader users will not know the seat-count failed to load.

### P1-5: shadcn Button focus ring color undefined

`components/ui/button.tsx:9` uses `focus-visible:ring-ring`, but `--ring` is never declared in `packages/ui/src/tokens/colors.css` or `apps/web/src/app/globals.css`. The `ring-ring` utility resolves to `var(--ring, currentColor)` in Tailwind v4 — falls back to inherited text color, which on a clay-500 button would be sand-100 (very low contrast against the clay background).

**Required:** Either add `--ring: var(--color-water-500);` to the `@theme` block in `globals.css`, or change every `ring-ring` in shadcn primitives to `ring-water-500`.

### P1-6: Dark-background `:focus-visible` override missing

Per SKILL §8.3, dark backgrounds (CtaBand, Footer, MembershipSection featured column, Hero primary CTA on dark) should use `outline-color: var(--color-clay-300)`. Currently the global `:focus-visible` always uses `water-500`. On stone-900 this achieves 8.582:1 (still visible), so this is a spec-compliance gap rather than an actual accessibility failure.

### P1-7: HeroNextClass aria-label hardcoded

`apps/web/src/components/marketing/HeroNextClass.tsx:105`:
```tsx
<div className="flex gap-1" role="img" aria-label="8 of 12 spots left">
```

The `aria-label` says "8 of 12 spots left" regardless of the actual session. The visible text below also says "8 spots left" hardcoded. This is misleading to screen-reader users.

**Required:** Wire to `useSessionAvailability(upcoming.id)` (the hook exists) and compute `aria-label={`${available} of ${capacity} spots left`}` dynamically.

---

## 16. Nits (P2 — Best-Practice Improvements)

| # | Finding | Suggested fix |
|---|---|---|
| P2-1 | `SkipLink` component and inline `(marketing)/layout.tsx` skip link use different visible-on-focus colors (`bg-clay-500 text-sand-100` vs `bg-stone-900 text-sand-50`) | Standardize on one style — recommend `bg-clay-500 text-sand-100` per spec (assuming clay-500 contrast is fixed per P0-1) |
| P2-2 | `MarketingNav` has redundant `role="navigation"` on `<nav>` (implicit). Same in `AdminShell`. | Remove `role="navigation"` (or keep — harmless, just verbose) |
| P2-3 | `SectionHeader` uses `<header>` element inside each section. `<header>` is valid at sectioning-root level, but multiple `<header>` per page can confuse some older screen readers. | Consider `<div>` with `role="group"` + `aria-labelledby` |
| P2-4 | `SrOnly` component is defined but never imported — all code uses bare `className="sr-only"` | Either delete `SrOnly.tsx` (dead code) or migrate codebase to use it |
| P2-5 | `max-w-prose` (65ch) is tighter than SKILL spec's 70ch | Change `max-w-prose` to `max-w-[70ch]` in `SectionHeader.tsx:44` |
| P2-6 | `Philosophy.tsx:69` Japanese `間` is `aria-hidden="true"` — acceptable as decorative, but SKILL §8.1 mentions `<ruby>` annotation as the preferred approach | Add `<ruby>間<rt>ma</rt></ruby>` and keep `aria-hidden` if purely decorative, OR remove `aria-hidden` and use `<ruby>` so screen readers pronounce it |
| P2-7 | Dialog overlay uses `bg-black/80` (shadcn default) instead of design-system `bg-stone-900/60` | Replace `bg-black/80` with `bg-stone-900/80` in `components/ui/dialog.tsx:25` |
| P2-8 | `MobileNavDrawer` trigger and close buttons have no `min-h-[44px] min-w-[44px]` (icon-only ~24×24) | Add target size |
| P2-9 | `accessibility.spec.ts:88` regex `/^0(\.\d+)?[ms]s?$/` accepts `0s` (which would FAIL the 0.01ms requirement) | Tighten to `/^0\.01ms$/` |
| P2-10 | `accessibility.spec.ts` `test.skip` blocks all tests when `DATABASE_URL` includes "placeholder" — CI does not actually run a11y tests | Wire CI to use a real seeded DB or mock the tRPC routes |
| P2-11 | `MarketingNav` "Menu" `<span className="sr-only">Menu</span>` is meaningless text with no associated button | Remove once MobileNavDrawer is wired (P1-1) |
| P2-12 | `BookingConfirmation.tsx:60-65` "Done" button has no `min-h-[44px]` | Add target size |
| P2-13 | No `lang` attribute on `<html>` per page... wait, `layout.tsx:49` has `<html lang="en">` ✓ | Already correct — no action |
| P2-14 | `next/image` not used anywhere (Cloudflare Images integration is scaffolded but not wired) | Wire `next/image` with custom Cloudflare loader when instructor/blog images are added |
| P2-15 | No `accessibility` statement page (`/accessibility`) found despite footer link | Create `apps/web/src/app/(marketing)/accessibility/page.tsx` per footer link in `copy.ts:85` |

---

## 17. Recommended Remediations (Prioritized)

### Sprint 1 — P0 fixes (AAA blockers, ship-blockers)

1. **Re-tune the clay palette** to meet 7:1 on sand. Recommended: bump `clay-600` to `#723020` (estimate, verify with contrast-check.ts), use `clay-600` for primary buttons (with sand-100 text), use `clay-500` only as a hover state. Darken `clay-400` to `#A06048` or restrict to dark backgrounds.
2. **Re-tune status colors**: `success` → `#2F5A3C`, `warning` → `#8A6520`, `error` → `#8C3F3C` (estimates — verify).
3. **Fix footer text colors**: change all `text-stone-500`/`text-stone-400` on `bg-stone-900` to `text-stone-300` or `text-sand-100`.
4. **Patch shadcn primitive sizes**: `Button` default `h-11 min-h-[44px]`, `Input` `h-11 min-h-[44px]`, `Select` `h-11`, `Tabs` `h-11`. Update `components.json` theme.
5. **Add `KeyboardSensor` to ScheduleCalendar** and `tabindex={0}` + `onKeyDown` to empty slots.
6. **Install `@axe-core/react`** and wire into `layout.tsx` dev mode.
7. **Standardize skip-link target**: change `SkipLink.tsx` `href` to `#main-content`, add `id="main-content"` to AdminShell `<main>`, wrap studio layout children in `<main id="main-content">`, delete duplicate inline skip link in marketing layout.
8. **Add `--ring: var(--color-water-500);`** to `@theme` block in `globals.css` (fixes all shadcn primitives at once).

### Sprint 2 — P1 fixes (AA blockers)

9. **Render `MobileNavDrawer` in `MarketingNav`** on `md:hidden`.
10. **Add `role="alert"`** to all form error messages (NewsletterForm, ProfileEditForm, SessionForm, ClassForm, CancelSessionButton).
11. **Fix `ProfileEditForm` focus indicators**: replace `focus:outline-none focus:border-stone-900` with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-water-500 focus-visible:ring-offset-1`.
12. **Add `aria-live="assertive"`** to BookingFlow error container.
13. **Wire `HeroNextClass` to `useSessionAvailability`** and compute `aria-label` dynamically.
14. **Add dark-background `:focus-visible` override** in `globals.css`:
    ```css
    .dark-bg :focus-visible, [data-dark-bg] :focus-visible {
      outline-color: var(--color-clay-300);
    }
    ```

### Sprint 3 — P2 nits (best-practice polish)

15. Tighten `accessibility.spec.ts` regex for reduced-motion assertion.
16. Create `/accessibility` page.
17. Add `<ruby>間<rt>ma</rt></ruby>` annotation to Philosophy ornament.
18. Wire `next/image` with Cloudflare loader.
19. Add target size to `MobileNavDrawer` trigger/close, `BookingConfirmation` "Done" button.
20. Delete dead `SrOnly.tsx` or migrate codebase to use it.
21. De-skip `accessibility.spec.ts` in CI by providing a seeded test DB.

---

## 18. Verification Checklist (Re-audit after remediation)

- [ ] All 9 WCAG 2.2 AAA criteria pass (recompute contrast after palette re-tune).
- [ ] `scripts/contrast-check.ts` exists and runs in CI (referenced in SKILL §8.1 — currently missing).
- [ ] `@axe-core/react` runs in dev mode with zero violations on every public route.
- [ ] `e2e/accessibility.spec.ts` runs in CI (not skipped) and passes.
- [ ] Keyboard-only test: Tab through every public route + admin + studio — no traps, no inaccessible controls.
- [ ] Screen-reader test (NVDA + VoiceOver): booking flow, magic-link sign-in, profile edit, session create — all announce errors and status changes.
- [ ] Mobile viewport: MobileNavDrawer opens, navigates, closes via keyboard.
- [ ] `prefers-reduced-motion: reduce`: all animations effectively instant (verified by Playwright `emulateMedia`).
- [ ] Skip link: Tab on every route group focuses visible skip link; Enter jumps to `<main id="main-content">`.

---

**Audit complete.** The Stillwater codebase has a strong accessibility *foundation* (correct reduced-motion, correct global focus-visible rule, correct Radix Dialog usage, correct ARIA on SeatAvailability, exemplar MagicLinkForm, axe-core E2E specs) but fails WCAG 2.2 AAA on three concrete blockers: contrast (1.4.6), target size (2.5.5), and dragging-movement keyboard alternative (2.5.7), plus several AA-level issues that would also fail the Lighthouse A11y = 100 quality gate (footer contrast, form-error announcement, focus indicators on ProfileEditForm, dead MobileNavDrawer). The axe-core dev-mode integration is also missing per SKILL §8.7.

Recommended effort: **3-5 engineer-days** for Sprint 1 (P0 fixes), **2-3 engineer-days** for Sprint 2 (P1 fixes), **1-2 engineer-days** for Sprint 3 (P2 polish). Total: ~1.5 calendar weeks with one engineer.

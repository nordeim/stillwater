# PAD.md vs design.md vs stillwater_SKILL.md — Alignment Validation Report

**Date:** 2026-07-05
**Validator:** Independent review (Frontend Architect & Avant-Garde UI Designer persona)
**Documents under review:**
- `PAD.md` (3,205 lines) — Project Architecture Document
- `design.md` (812 lines) — Design specifications / Phase 1 ANALYZE + Phase 2 PLAN
- `stillwater_SKILL.md` (5,038 lines, v1.3.0) — Project skill file (recently remediated)

**Cross-referenced against actual codebase:**
- `packages/ui/src/tokens/{colors,typography,spacing,motion}.css`
- `apps/web/src/app/globals.css`
- `packages/config/src/env.ts`
- `apps/web/package.json`, `packages/db/package.json`, `packages/auth/package.json`, root `package.json`

**Status:** 4 P0 Critical + 5 P1 High + 6 P2 Medium + 4 P3 Low findings

---

## Executive Summary

The three documents form a hierarchy: **design.md** (original design intent, Phase 1–2) → **PAD.md** (detailed architecture, Phase 1–4) → **stillwater_SKILL.md** (agent-facing implementation guide). In a healthy project, PAD.md should be the superset of design.md (incorporating all its decisions plus refinements), and SKILL.md should be a faithful distillation of PAD.md plus the source skills.

**What's working:** The design philosophy ("Editorial Calm"), the Warm Mineral color palette hex values, the 4px spacing grid, the motion easing curves, the ADR decisions (Better Auth over Auth.js, proxy.ts over middleware.ts, Drizzle over Prisma, tRPC over REST, SSE over WebSockets, Trigger.dev v4 over BullMQ) are all consistent across PAD.md and SKILL.md. The color hex values in PAD.md §11.3 match the actual `colors.css` 100% exactly.

**What's broken:** PAD.md §5.1 (Tech Stack) still carries the same stale claims that were just corrected in SKILL.md v1.3.0 — Stripe "Basil" API + camelCase, pnpm 9.15.4, Tailwind ^4.1.0, Zod v4 `.url()` guidance. PAD.md Appendix A (env vars) uses wrong Cloudflare key names and is missing 4 env vars. design.md is stale on three decisions it originally proposed: Auth.js v5 (superseded by Better Auth per ADR-008), middleware.ts (superseded by proxy.ts per ADR-009), and Trigger.dev v3 (superseded by v4). The four CSS token files all have systematic off-by-one errors in their PAD section references. SKILL.md references a Berkeley Mono font directory that does not exist in the repo.

**Root cause:** PAD.md was the source of truth that SKILL.md distilled from. When SKILL.md was remediated (v1.2.0 → v1.3.0), the corrections were not propagated back to PAD.md. design.md was never updated after the ADR decisions were made — it still reflects the Phase 1 proposal state.

---

## Document Hierarchy & Alignment Model

```
design.md (Phase 1 ANALYZE + Phase 2 PLAN — original design intent)
    │
    │ should be a subset of ↓
    ▼
PAD.md (Phase 1–4 — detailed architecture, ADRs, the superset)
    │
    │ should be distilled into ↓
    ▼
stillwater_SKILL.md (v1.3.0 — agent-facing implementation guide)
    │
    │ should be enforced by ↓
    ▼
Codebase (package.json, tsconfig, env.ts, CSS tokens)
```

**Alignment rule:** Every factual claim in design.md should be either (a) reflected in PAD.md, or (b) explicitly superseded by an ADR in PAD.md. Every factual claim in PAD.md should be reflected in SKILL.md. Every version pin / token value in SKILL.md should match the actual codebase.

---

## Findings

### P0 — Critical (factually wrong; will mislead agents)

#### Finding #1 — PAD.md §5.1 Stripe row carries stale "Basil" + camelCase claims

**Location:** PAD.md line 358 (§5.1 Tech Stack table, Stripe row)
**PAD.md says:** `Stripe | ^22.3.0 | ... ⚠️ "Basil" API (2025-03-31) — current_period_end moved from top-level to items.data[0].current_period_end. SDK v22+ uses camelCase (currentPeriodEnd not current_period_end).`

**SKILL.md v1.3.0 says (line 162):** `Stripe | ^22.3.0 | "Dahlia" API (2026-06-24) pinned by SDK v22; current_period_end moved to items.data[0].current_period_end (introduced in Basil 2025-03-31, carried forward); SDK exposes snake_case to match API wire format (NOT camelCase)`

**Web research ground truth (from prior remediation):**
- SDK v22 pins **Dahlia** (2026-06-24), NOT Basil. Basil was SDK v18.
- Stripe Node SDK exposes **snake_case** (`current_period_end`), NOT camelCase. The SDK has never auto-converted to camelCase.

**Verdict:** PAD.md is wrong on both counts. SKILL.md v1.3.0 is correct. PAD.md was not updated when SKILL.md was remediated.

**Severity:** P0 — payment-handling code is the highest-stakes surface. An agent reading PAD.md §5.1 will write code expecting camelCase properties that don't exist.

**Fix:** Update PAD.md §5.1 Stripe row to match SKILL.md v1.3.0:
`Stripe | ^22.3.0 | ... "Dahlia" API (2026-06-24) pinned by SDK v22; current_period_end moved to items.data[0].current_period_end (introduced in Basil 2025-03-31, carried forward); SDK exposes snake_case to match API wire format (NOT camelCase).`

---

#### Finding #2 — PAD.md §5.1 + §5.2 pnpm version stale (9.15.4 vs 11.0.0)

**Location:** PAD.md line 362 (§5.1 table) + line 376 (§5.2 Runtime Versions)
**PAD.md says:** `pnpm | 9.15.4 (≥9.0.0)` and `pnpm: 9.15.4 (workspace protocol support; ≥9.0.0 floor)`

**SKILL.md v1.3.0 says (line 160):** `pnpm | ^11.0.0 | custom-conditions=@stillwater/source in .npmrc; pnpm-workspace.yaml with packages: ['.']; pnpm 9.x is EOL — use 11.x+`

**Actual root `package.json`:** `"packageManager": "pnpm@11.0.0"`

**Web research ground truth:** pnpm 9.x is end-of-life. Current is pnpm 11.x. pnpm 10 was released early 2025; pnpm 11 is current (July 2026).

**Verdict:** PAD.md is wrong. SKILL.md v1.3.0 and the actual `package.json` are correct and aligned.

**Severity:** P0 — pnpm 9.x is EOL; an agent following PAD.md will install an unsupported package manager.

**Fix:** Update PAD.md §5.1 pnpm row to `pnpm | ^11.0.0` and §5.2 to `pnpm: 11.0.0 (workspace protocol support; pnpm 9.x is EOL)`.

---

#### Finding #3 — PAD.md §5.1 Tailwind version stale (^4.1.0 vs ^4.3.0)

**Location:** PAD.md line 348 (§5.1 table, Styling row)
**PAD.md says:** `Tailwind CSS | ^4.1.0`

**SKILL.md v1.3.0 says (line 151):** `Tailwind CSS | ^4.3.0`

**Actual `apps/web/package.json`:** `"tailwindcss": "^4.3.0"`

**Verdict:** PAD.md is wrong. SKILL.md v1.3.0 and the actual `package.json` are correct and aligned.

**Severity:** P0 — Tailwind v4.3 added features (new colors, scrollbar styling) that v4.1 lacks; an agent following PAD.md will underuse the available capabilities.

**Fix:** Update PAD.md §5.1 Tailwind row to `^4.3.0`.

---

#### Finding #4 — PAD.md Appendix A env vars use wrong Cloudflare key names + missing 4 vars

**Location:** PAD.md lines 2996–3001 (Appendix A, Cloudflare section)

**PAD.md says:**
```bash
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_IMAGES_TOKEN=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=
```
(5 Cloudflare vars, and stops there)

**Actual `packages/config/src/env.ts` defines:**
```typescript
CLOUDFLARE_ACCOUNT_ID: z.string(),
CLOUDFLARE_IMAGES_TOKEN: z.string(),
CLOUDFLARE_R2_ACCESS_KEY_ID: z.string(),   // ← different name
CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string(), // ← different name
CLOUDFLARE_R2_BUCKET: z.string(),
CLOUDFLARE_R2_ENDPOINT: z.string().url(),    // ← missing from PAD.md
NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL: z.string().url(), // ← missing from PAD.md
```
(7 Cloudflare vars total)

**PAD.md also missing (from Observability section):**
- `NEXT_PUBLIC_SENTRY_DSN` (client-side Sentry DSN, optional)

**SKILL.md v1.3.0 §3.3 + §20.5:** Correctly lists all 34 env vars with the right names (verified in the prior remediation pass).

**Verdict:** PAD.md Appendix A is out of sync with the actual env schema. The Cloudflare R2 key names are wrong (`CLOUDFLARE_R2_ACCESS_KEY` vs `CLOUDFLARE_R2_ACCESS_KEY_ID`), and 3 env vars are missing entirely.

**Severity:** P0 — an agent bootstrapping the environment from PAD.md Appendix A will use wrong env var names that silently return `undefined`, and will miss `CLOUDFLARE_R2_ENDPOINT` (required for R2 to work) and `NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL` (required for the §15.4 Cloudflare Images URL signing pattern).

**Fix:** Update PAD.md Appendix A Cloudflare section to:
```bash
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_IMAGES_TOKEN=
CLOUDFLARE_R2_ACCESS_KEY_ID=     # NOTE: _ID suffix, not just _ACCESS_KEY
CLOUDFLARE_R2_SECRET_ACCESS_KEY= # NOTE: _ACCESS_ in the middle
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ENDPOINT=          # e.g., https://<account>.r2.cloudflarestorage.com
NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL= # Public base URL for CF Images
```
And add `NEXT_PUBLIC_SENTRY_DSN=` to the Observability section.

---

### P1 — High (stale design decisions; contradict ADRs)

#### Finding #5 — design.md LAYER 6 uses Auth.js v5 + middleware.ts (superseded by ADR-008 + ADR-009)

**Location:** design.md lines 566–623 (LAYER 6: AUTH & RBAC)
**design.md says:** Shows a full NextAuth/Auth.js v5 config (`import NextAuth from "next-auth"`, `DrizzleAdapter`, `middleware.ts` with `export default auth(async (req) => {...})`).

**PAD.md ADR-008 (line 2853):** "Decision: Better Auth v1.6.23 (replaces Auth.js v5)." — Accepted 2026-07-04.
**PAD.md ADR-009 (line 2889):** "Decision: Use `apps/web/proxy.ts` (not `middleware.ts`)." — Accepted 2026-07-04.
**SKILL.md v1.3.0 §5.6:** Documents the Better Auth + proxy.ts pattern with `toNextJsHandler(auth)`, `getSessionCookie()`, `auth.api.getSession({ headers })`.

**Verdict:** design.md was never updated after ADR-008 and ADR-009 were accepted. The Auth.js v5 + middleware.ts code in design.md LAYER 6 is directly contradicted by the ADRs and by SKILL.md v1.3.0. An agent reading design.md will write Auth.js v5 code that doesn't match the codebase.

**Severity:** P1 — design.md is a historical design intent document, but agents may still read it for context. The contradiction is explicit and will cause confusion.

**Fix:** Add a prominent banner at the top of design.md LAYER 6: "> ⚠️ SUPERSEDED by ADR-008 (Better Auth over Auth.js v5) and ADR-009 (proxy.ts over middleware.ts). See PAD.md §9 and §29 ADR-008/009, and stillwater_SKILL.md §5.6 for the current pattern." Alternatively, rewrite LAYER 6 to show the Better Auth + proxy.ts pattern.

---

#### Finding #6 — design.md Phase 3 VALIDATE item 5 proposes Trigger.dev v3 (superseded by v4)

**Location:** design.md line 757 (Phase 3 VALIDATE, item 5)
**design.md says:** `Plan: Trigger.dev v3 (cloud, generous free tier)`

**PAD.md ADR-007 (line 2829):** "Decision: Trigger.dev v4 (cloud-hosted). v3 is deprecated — new v3 deploys stop working April 1, 2026. v4 reached GA August 2025."
**SKILL.md v1.3.0 §2.1 (line 158):** `Trigger.dev | v4 | ... v3 is deprecated — new v3 deploys stop working April 1, 2026; v4 reached GA August 2025.`

**Verdict:** design.md proposes v3; PAD.md ADR-007 and SKILL.md v1.3.0 mandate v4. design.md is stale.

**Severity:** P1 — v3 is deprecated and stops working April 1, 2026 (already past as of July 2026). An agent following design.md would deploy to a dead platform.

**Fix:** Update design.md Phase 3 item 5 to `Plan: Trigger.dev v4 (cloud, GA August 2025; v3 deprecated April 2026)`.

---

#### Finding #7 — design.md LAYER 2 uses different color token names than PAD.md + SKILL.md + actual CSS

**Location:** design.md lines 273–285 (LAYER 2 Design System, Color Palette)
**design.md uses:** `--color-stone-deep`, `--color-stone-mid`, `--color-stone-light`, `--color-clay`, `--color-clay-deep`, `--color-fog`, `--color-water`, `--color-water-light` (named tokens, 8 stops)

**PAD.md §11.3 uses:** `--color-stone-950` through `--color-stone-50` (11 stops), `--color-clay-100` through `--color-clay-600` (6 stops), `--color-water-100` through `--color-water-700` (6 stops), `--color-sand` / `--color-sand-warm` / `--color-sand-deep` (3 stops)

**SKILL.md v1.3.0 §4.1 + §19 uses:** Same numbered scale as PAD.md (verified — all 30 hex values match exactly).

**Actual `packages/ui/src/tokens/colors.css` uses:** Same numbered scale as PAD.md (verified — all 30 hex values match exactly).

**Verdict:** design.md uses an older, named-token color system that was never implemented. PAD.md, SKILL.md, and the actual CSS all use the numbered scale. The hex values are consistent (e.g., design.md `--color-clay: #C4856A` = PAD.md `--color-clay-400: #C4856A`), but the token names diverge.

**Severity:** P1 — an agent reading design.md will use `bg-clay` (which doesn't exist in the CSS) instead of `bg-clay-400` (which does). This will cause Tailwind classes to silently not apply.

**Fix:** Add a banner at the top of design.md LAYER 2: "> ⚠️ The named color tokens below (--color-stone-deep, --color-clay, --color-fog, etc.) were the Phase 1 proposal. The implemented system uses a numbered scale (--color-stone-950 through --color-stone-50, --color-clay-100 through --color-clay-600, etc.). See PAD.md §11.3 and stillwater_SKILL.md §19 for the authoritative token names." Alternatively, rewrite the color palette block to use the numbered scale.

---

#### Finding #8 — design.md LAYER 2 spacing scale differs from PAD.md + actual CSS

**Location:** design.md lines 287–294 (LAYER 2 Design System, Spacing Scale)
**design.md uses:** 11 stops: `--space-1: 4px` through `--space-11: 192px` (no 20px, no 256px)

**PAD.md §11.4 uses:** 13 stops: `--space-1: 4px` through `--space-13: 256px` (includes `--space-5: 20px` and `--space-13: 256px`)

**Actual `packages/ui/src/tokens/spacing.css` uses:** 13 stops matching PAD.md exactly (includes `--space-5: 20px` and `--space-13: 256px`).

**Verdict:** design.md uses an older, 11-stop spacing scale. PAD.md and the actual CSS use a 13-stop scale with two additional stops (20px and 256px). The numbering is also shifted: design.md `--space-5: 24px` but PAD.md `--space-5: 20px` and `--space-6: 24px`.

**Severity:** P1 — an agent reading design.md will use `--space-5` expecting 24px but get 20px. The off-by-one numbering will cause layout drift.

**Fix:** Add a banner to design.md LAYER 2 spacing section, or rewrite to match PAD.md §11.4's 13-stop scale.

---

#### Finding #9 — design.md LAYER 2 font-mono says 'Berkeley Mono'; PAD.md says 'JetBrains Mono'; actual CSS says 'JetBrains Mono'

**Location:** design.md line 273 (LAYER 2, Typography)
**design.md says:** `--font-mono: 'Berkeley Mono' ← For admin/data surfaces`

**PAD.md §11.2 (line 1234) says:** `--font-mono: 'JetBrains Mono', 'Courier New', mono; /* Data, precision */`

**SKILL.md v1.3.0 §4.1 says:** `--font-mono: var(--font-berkeley-mono), 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace;` — references Berkeley Mono first with JetBrains Mono fallback, but adds a warning that Berkeley Mono is a paid commercial font and the license must be confirmed.

**Actual `packages/ui/src/tokens/typography.css` says:** `--font-mono: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Courier New', monospace;` — JetBrains Mono only, no Berkeley Mono reference.

**Actual font directory check:** `ls packages/ui/src/fonts/` shows only `cormorant/`, `dm-sans/`, `jetbrains-mono/`. There is **no `berkeley-mono/` directory** — the Berkeley Mono font files do not exist in the repo.

**Verdict:** Three-way conflict:
- design.md says Berkeley Mono (paid, never acquired)
- PAD.md says JetBrains Mono (open-source, correct)
- SKILL.md says Berkeley Mono first with JetBrains fallback (aspirational, but the font files don't exist)
- Actual CSS says JetBrains Mono (matches PAD.md)

**Severity:** P1 — SKILL.md §4.4 references a `berkeleyMono` `localFont` declaration pointing to `packages/ui/src/fonts/berkeley-mono/BerkeleyMono-Variable.woff2` which does not exist. An agent following SKILL.md §4.4 will add a `localFont` import that fails at build time.

**Fix:**
1. **SKILL.md §4.1 + §4.4:** Remove the `var(--font-berkeley-mono)` reference from `--font-mono` and the `berkeleyMono` `localFont` declaration from §4.4. Use `'JetBrains Mono'` as the primary (matching PAD.md and the actual CSS). Keep the Berkeley Mono licensing note as a "future consideration" but remove it from the active `@theme` block.
2. **design.md LAYER 2:** Either update to `'JetBrains Mono'` or add a banner noting that Berkeley Mono was the Phase 1 proposal but JetBrains Mono was chosen for licensing reasons.

---

### P2 — Medium (documentation defects; won't break code but will confuse)

#### Finding #10 — PAD.md §5.1 Zod row missing v4-native `z.url({ protocol })` guidance

**Location:** PAD.md line 367 (§5.1 table, Validation row)
**PAD.md says:** `Zod | ^4.4.0 | ... Zod v4 .url() accepts any scheme → compose with .refine().`

**SKILL.md v1.3.0 says (line 168):** `Zod | ^4.4.0 | ... Zod v4 z.string().url() accepts any scheme → use z.url({ protocol: /^https:$/ }) (v4 native) or .refine() for protocol restriction; enum errors use unified { error } param ...`

**Verdict:** PAD.md is partially correct but missing the v4-native `z.url({ protocol })` option that SKILL.md v1.3.0 includes. This is a minor enhancement gap, not a factual error.

**Severity:** P2 — agents will use the older `.refine()` pattern instead of the cleaner v4-native option.

**Fix:** Update PAD.md §5.1 Zod row to match SKILL.md v1.3.0's guidance.

---

#### Finding #11 — PAD.md §5.1 Turborepo version says "latest" instead of pinning

**Location:** PAD.md line 363 (§5.1 table, Monorepo row)
**PAD.md says:** `Turborepo | latest | Incremental builds, task caching, excellent pnpm support`

**SKILL.md v1.3.0 says (line 159):** `Turborepo | ^2.10.0 | Task graph + remote caching; @stillwater/source custom condition; graceful shutdown + deferred input hashing (2.10+)`

**Actual root `package.json`:** `"turbo": "^2.10.0"`

**Verdict:** PAD.md uses "latest" which is not a valid semver pin. The meta-skill (`to-distill-project-into-skill/SKILL.md` §4 IMPLEMENT) requires "Include exact versions, not ranges". SKILL.md v1.3.0 and the actual `package.json` correctly pin `^2.10.0`.

**Severity:** P2 — "latest" is not actionable for reproducible builds.

**Fix:** Update PAD.md §5.1 Turborepo row to `^2.10.0`.

---

#### Finding #12 — PAD.md §5.1 React Email + Resend say "latest" instead of pinning

**Location:** PAD.md lines 360–361 (§5.1 table)
**PAD.md says:** `React Email | latest` and `Resend | latest`

**SKILL.md v1.3.0 says (lines 163–164):** `React Email | ^0.0.36` and `Resend | ^4.1.2`

**Verdict:** Same issue as Finding #11 — "latest" is not a valid pin. SKILL.md v1.3.0 pins specific versions.

**Severity:** P2 — documentation defect.

**Fix:** Update PAD.md §5.1 to pin `React Email | ^0.0.36` and `Resend | ^4.1.2`.

---

#### Finding #13 — All four CSS token files have off-by-one PAD section references

**Location:**
- `packages/ui/src/tokens/colors.css` line 1: `/* Stillwater — Warm Mineral Color Palette (PAD §11.4) */`
- `packages/ui/src/tokens/typography.css` line 1: `/* Stillwater — Typography System (PAD §11.3) */`
- `packages/ui/src/tokens/spacing.css` line 1: `/* Stillwater — Spacing Scale (PAD §11.5) */`
- `packages/ui/src/tokens/motion.css` line 1: `/* Stillwater — Motion System (PAD §11.6) */`

**Actual PAD.md §11 structure (verified):**
- §11.1 Conceptual Direction
- §11.2 Typography System
- §11.3 Color System
- §11.4 Spacing & Layout
- §11.5 Motion System
- §11.6 Component Anatomy (Radix-Based)

**Mismatch:**
| CSS file | Claims | Actual PAD section |
|----------|--------|-------------------|
| `colors.css` | PAD §11.4 | §11.3 (Color System) |
| `typography.css` | PAD §11.3 | §11.2 (Typography System) |
| `spacing.css` | PAD §11.5 | §11.4 (Spacing & Layout) |
| `motion.css` | PAD §11.6 | §11.5 (Motion System) |

All four are off by +1. This suggests the CSS files were written when PAD.md had a different section numbering (perhaps §11.1 was a combined "Conceptual Direction + Typography" section, or §11.0 existed).

**Severity:** P2 — an agent following the CSS comment to find the PAD section will land on the wrong section. Won't break code but will cause confusion.

**Fix:** Update each CSS file's header comment to reference the correct PAD section:
- `colors.css`: `(PAD §11.3)`
- `typography.css`: `(PAD §11.2)`
- `spacing.css`: `(PAD §11.4)`
- `motion.css`: `(PAD §11.5)`

---

#### Finding #14 — design.md LAYER 2 missing `--space-0-5: 2px` and `--space-px: 1px` tokens

**Location:** design.md lines 287–294 (LAYER 2, Spacing Scale)
**design.md uses:** 11 stops starting at `--space-1: 4px`
**PAD.md §11.4 + actual `spacing.css` use:** 13 stops starting at `--space-px: 1px` and `--space-0-5: 2px`

**Verdict:** design.md is missing the two smallest spacing tokens. Minor, but an agent reading design.md won't know `--space-px` and `--space-0-5` exist.

**Severity:** P2 — documentation gap.

**Fix:** Add `--space-px: 1px` and `--space-0-5: 2px` to design.md LAYER 2 spacing scale (or add a banner pointing to PAD.md §11.4 as authoritative).

---

#### Finding #15 — design.md LAYER 2 motion section missing `--duration-instant` and `--duration-crawl`

**Location:** design.md lines 296–301 (LAYER 2, Motion)
**design.md uses:** `--duration-quick: 150ms`, `--duration-standard: 300ms`, `--duration-slow: 600ms` (3 durations)
**PAD.md §11.5 + actual `motion.css` use:** `--duration-instant: 100ms`, `--duration-quick: 150ms`, `--duration-standard: 300ms`, `--duration-slow: 600ms`, `--duration-crawl: 900ms` (5 durations)

**Verdict:** design.md is missing the fastest (`--duration-instant: 100ms`) and slowest (`--duration-crawl: 900ms`) durations.

**Severity:** P2 — documentation gap.

**Fix:** Add the two missing durations to design.md LAYER 2 motion section (or add a banner pointing to PAD.md §11.5).

---

### P3 — Low (cosmetic / editorial)

#### Finding #16 — design.md LAYER 2 missing `--ease-sharp` easing curve

**Location:** design.md lines 296–299 (LAYER 2, Motion)
**design.md uses:** `--ease-gentle` and `--ease-breathe` (2 easings)
**PAD.md §11.5 + actual `motion.css` use:** `--ease-gentle`, `--ease-breathe`, `--ease-sharp` (3 easings)

**Verdict:** design.md is missing `--ease-sharp: cubic-bezier(0.4, 0, 0.2, 1)` (the Material standard easing).

**Severity:** P3 — cosmetic.

**Fix:** Add `--ease-sharp: cubic-bezier(0.4, 0, 0.2, 1)` to design.md LAYER 2 motion section.

---

#### Finding #17 — design.md LAYER 2 missing semantic alias tokens

**Location:** design.md lines 273–285 (LAYER 2, Color Palette)
**design.md uses:** Only primitive + sand tokens (no semantic aliases)
**PAD.md §11.3 + actual `colors.css` use:** Primitives + sand + 9 semantic aliases (`--color-background`, `--color-surface`, `--color-border`, `--color-text-primary`, `--color-text-secondary`, `--color-action`, `--color-action-hover`, `--color-accent`, plus `--color-text-tertiary` in CSS)

**Verdict:** design.md doesn't document the semantic alias layer. This is the most important layer for component authors (you should use `bg-surface` not `bg-sand-warm`).

**Severity:** P3 — design.md is a Phase 1 proposal; the semantic aliases were added in PAD.md Phase 3.

**Fix:** Add the semantic alias table to design.md LAYER 2 (or add a banner pointing to PAD.md §11.3).

---

#### Finding #18 — design.md LAYER 2 missing status colors

**Location:** design.md lines 273–285 (LAYER 2, Color Palette)
**design.md uses:** Stone, Sand, Clay, Fog, Water — no status colors
**PAD.md §11.3 + actual `colors.css` use:** Adds `--color-success: #4A7C59`, `--color-warning: #C4913A`, `--color-error: #B85450`, `--color-info: var(--color-water-500)`

**Verdict:** design.md doesn't document the status colors.

**Severity:** P3 — design.md is a Phase 1 proposal; status colors were added in PAD.md.

**Fix:** Add status colors to design.md LAYER 2 (or add a banner).

---

#### Finding #19 — PAD.md ADR-009 claims proxy.ts "runs on Node.js runtime (not Edge)"

**Location:** PAD.md line 2895 (ADR-009, Rationale) + line 2903 (ADR-009, Trade-offs)
**PAD.md says:** "proxy.ts runs on Node.js runtime (not Edge), enabling full Better Auth API access when needed." and "proxy.ts running on Node.js runtime (not Edge) means slightly higher latency per request than Edge middleware would have"

**SKILL.md v1.3.0 §5.6 says:** "proxy.ts runs on Edge runtime for every request — full session validation (DB lookup, JWT verification) is too expensive and breaks Next.js 16's caching model. Cookie-existence is a fast optimistic check." — This implies proxy.ts runs on Edge.

**Web research (from prior remediation, Claim 12):** "proxy.ts runs on the Edge Runtime by default (the same as middleware did). getSessionCookie() avoids Node.js APIs so it is Edge-safe."

**Verdict:** PAD.md ADR-009 is factually wrong about proxy.ts running on Node.js. Next.js 16's proxy.ts runs on Edge by default (same as middleware did). The whole point of the 2-layer pattern is that proxy.ts (Edge) does cookie-only checks because it CAN'T do DB access, while Server Components (Node.js) do full validation. PAD.md's claim that proxy.ts "runs on Node.js" inverts this logic.

**Severity:** P3 — this is in an ADR's rationale/trade-offs section, not in the actionable pattern. SKILL.md §5.6 has the correct guidance. But an agent reading ADR-009 may be confused about why the 2-layer pattern exists.

**Fix:** Update PAD.md ADR-009 rationale and trade-offs:
- Rationale: "proxy.ts runs on Edge runtime by default (same as middleware did in Next.js 15) — cookie-only check via `getSessionCookie()` is Edge-compatible (no DB access). Full session validation requires Node.js runtime and belongs in Server Component layouts."
- Trade-offs: Remove "proxy.ts running on Node.js runtime (not Edge) means slightly higher latency" — this is incorrect. proxy.ts on Edge has lower latency than Node.js middleware would.

---

## Alignment Matrix

### Design Philosophy & Aesthetic Direction

| Dimension | design.md | PAD.md | SKILL.md v1.3.0 | Aligned? |
|-----------|-----------|--------|------------------|----------|
| Conceptual direction | "Editorial Calm" | "Editorial Calm" | "Editorial Calm" | ✅ |
| Inspiration (Kinfolk + Japanese *ma*) | ✅ | ✅ | ✅ | ✅ |
| Anti-Generic Rejection Matrix | ✅ | ✅ | ✅ (via §1.4) | ✅ |
| CTA hierarchy | Not specified | ✅ | ✅ (§1.5) | ✅ |

### Color System

| Dimension | design.md | PAD.md | SKILL.md v1.3.0 | Actual CSS | Aligned? |
|-----------|-----------|--------|------------------|------------|----------|
| Palette name | "Warm Mineral" | "Warm Mineral" | "Warm Mineral" | "Warm Mineral" | ✅ |
| Token naming convention | Named (`--color-clay`, `--color-fog`) | Numbered (`--color-clay-400`) | Numbered | Numbered | ❌ design.md is stale (Finding #7) |
| Hex values | Match PAD.md subset | 30 tokens | 30 tokens | 30 tokens | ✅ (values match; names differ) |
| Semantic aliases | Absent | 9 aliases | 9 aliases | 9 aliases | ❌ design.md missing (Finding #17) |
| Status colors | Absent | 4 colors | 4 colors | 4 colors | ❌ design.md missing (Finding #18) |
| Forbidden colors | Not specified | Not specified | ✅ (§19.7) | Enforced by test | ✅ (SKILL.md adds) |

### Typography System

| Dimension | design.md | PAD.md | SKILL.md v1.3.0 | Actual CSS | Aligned? |
|-----------|-----------|--------|------------------|------------|----------|
| Display font | Cormorant Garamond | Cormorant Garamond | Cormorant Garamond | Cormorant Garamond | ✅ |
| Body font | DM Sans | DM Sans | DM Sans | DM Sans | ✅ |
| Mono font | Berkeley Mono | JetBrains Mono | Berkeley Mono (first) + JetBrains fallback | JetBrains Mono | ❌ Three-way conflict (Finding #9) |
| Type scale (9 fluid tokens) | Partial | ✅ | ✅ | ✅ | ✅ (values match) |
| Line heights | ✅ | ✅ | ✅ | ✅ | ✅ |

### Spacing & Layout

| Dimension | design.md | PAD.md | SKILL.md v1.3.0 | Actual CSS | Aligned? |
|-----------|-----------|--------|------------------|------------|----------|
| Base unit | 4px | 4px | 4px | 4px | ✅ |
| Stop count | 11 | 13 | 13 | 13 | ❌ design.md is stale (Finding #8) |
| `--space-5` value | 24px | 20px | 20px | 20px | ❌ design.md off-by-one (Finding #8) |
| `--space-px` / `--space-0-5` | Absent | Present | Present | Present | ❌ design.md missing (Finding #14) |
| `--space-13: 256px` | Absent | Present | Present | Present | ❌ design.md missing |
| Max widths | Not specified | ✅ (3 widths) | ✅ | ✅ | ✅ (PAD.md adds) |

### Motion System

| Dimension | design.md | PAD.md | SKILL.md v1.3.0 | Actual CSS | Aligned? |
|-----------|-----------|--------|------------------|------------|----------|
| Easing curves | 2 (gentle, breathe) | 3 (+sharp) | 3 | 3 | ❌ design.md missing `--ease-sharp` (Finding #16) |
| Durations | 3 | 5 | 5 | 5 | ❌ design.md missing instant + crawl (Finding #15) |
| Reduced-motion override | Not specified | ✅ | ✅ (§4.6) | ✅ | ✅ (PAD.md adds) |

### Tech Stack

| Layer | design.md | PAD.md | SKILL.md v1.3.0 | Actual package.json | Aligned? |
|-------|-----------|--------|------------------|---------------------|----------|
| Next.js | — | ^16.2.0 | ^16.2.0 | ^16.2.0 | ✅ (PAD/SKILL/package aligned) |
| React | — | ^19.2.3 | ^19.2.3 | ^19.2.3 | ✅ |
| TypeScript | — | ^5.9.0 | ^5.9.0 | ^5.9.0 | ✅ |
| Tailwind | — | ^4.1.0 ❌ | ^4.3.0 | ^4.3.0 | ❌ PAD.md stale (Finding #3) |
| Stripe | — | ^22.3.0 + "Basil" + camelCase ❌ | ^22.3.0 + "Dahlia" + snake_case | ^22.3.0 | ❌ PAD.md stale (Finding #1) |
| Zod | — | ^4.4.0 (partial guidance) | ^4.4.0 (full v4 guidance) | ^4.4.0 | ⚠️ PAD.md partial (Finding #10) |
| pnpm | — | 9.15.4 ❌ | ^11.0.0 | pnpm@11.0.0 | ❌ PAD.md stale (Finding #2) |
| Turborepo | — | "latest" ❌ | ^2.10.0 | ^2.10.0 | ❌ PAD.md not pinned (Finding #11) |
| React Email | — | "latest" ❌ | ^0.0.36 | — | ❌ PAD.md not pinned (Finding #12) |
| Resend | — | "latest" ❌ | ^4.1.2 | — | ❌ PAD.md not pinned (Finding #12) |
| Better Auth | Auth.js v5 ❌ | ^1.6.23 (ADR-008) | ^1.6.23 | ^1.6.23 | ❌ design.md stale (Finding #5) |
| Trigger.dev | v3 ❌ | v4 (ADR-007) | v4 | — | ❌ design.md stale (Finding #6) |

### Auth & RBAC

| Dimension | design.md | PAD.md | SKILL.md v1.3.0 | Aligned? |
|-----------|-----------|--------|------------------|----------|
| Auth library | Auth.js v5 (NextAuth) | Better Auth (ADR-008) | Better Auth | ❌ design.md stale (Finding #5) |
| Route protection file | middleware.ts | proxy.ts (ADR-009) | proxy.ts | ❌ design.md stale (Finding #5) |
| 2-layer auth pattern | Not documented | ✅ (ADR-009) | ✅ (§5.6) | ✅ (PAD.md + SKILL.md aligned) |
| `getSessionCookie()` | Not mentioned | ✅ (ADR-009) | ✅ (§5.6) | ✅ |
| `toNextJsHandler(auth)` | Not mentioned | ✅ (ADR-008) | ✅ (§5.6) | ✅ |
| proxy.ts runtime | — | "Node.js" ❌ | "Edge" ✅ | ❌ PAD.md ADR-009 wrong (Finding #19) |

### Environment Variables

| Dimension | PAD.md Appendix A | SKILL.md v1.3.0 §3.3/§20.5 | Actual env.ts | Aligned? |
|-----------|-------------------|----------------------------|---------------|----------|
| Total count | ~28 (implied) | 34 | 34 | ❌ PAD.md undercounts |
| Cloudflare R2 key names | `CLOUDFLARE_R2_ACCESS_KEY` ❌ | `CLOUDFLARE_R2_ACCESS_KEY_ID` ✅ | `CLOUDFLARE_R2_ACCESS_KEY_ID` ✅ | ❌ PAD.md wrong (Finding #4) |
| `CLOUDFLARE_R2_ENDPOINT` | Missing ❌ | Present ✅ | Present ✅ | ❌ PAD.md missing (Finding #4) |
| `NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL` | Missing ❌ | Present ✅ | Present ✅ | ❌ PAD.md missing (Finding #4) |
| `NEXT_PUBLIC_SENTRY_DSN` | Missing ❌ | Present ✅ | Present ✅ | ❌ PAD.md missing (Finding #4) |

### ADRs

| ADR | design.md | PAD.md | SKILL.md v1.3.0 | Aligned? |
|-----|-----------|--------|------------------|----------|
| ADR-001 Turborepo | ✅ (proposes) | ✅ (accepts) | ✅ | ✅ |
| ADR-002 tRPC | ✅ (proposes) | ✅ (accepts) | ✅ | ✅ |
| ADR-003 Drizzle | ✅ (proposes) | ✅ (accepts) | ✅ | ✅ |
| ADR-004 Advisory locks | — | ✅ | ✅ | ✅ |
| ADR-005 Sanity CMS | ✅ (proposes) | ✅ (accepts) | ✅ | ✅ |
| ADR-006 SSE | ✅ (proposes) | ✅ (accepts) | ✅ | ✅ |
| ADR-007 Trigger.dev | v3 ❌ | v4 ✅ | v4 ✅ | ❌ design.md stale (Finding #6) |
| ADR-008 Better Auth | Auth.js v5 ❌ | Better Auth ✅ | Better Auth ✅ | ❌ design.md stale (Finding #5) |
| ADR-009 proxy.ts | middleware.ts ❌ | proxy.ts ✅ (but runtime wrong) | proxy.ts ✅ | ❌ design.md stale + PAD.md runtime error (Findings #5, #19) |

---

## Recommendations

### Immediate (P0 — fix before any agent relies on PAD.md for tech stack decisions)

1. **PAD.md §5.1 Stripe row** — update "Basil" → "Dahlia"; remove camelCase claim; add snake_case clarification (matches SKILL.md v1.3.0)
2. **PAD.md §5.1 + §5.2 pnpm** — update `9.15.4` → `^11.0.0` (matches SKILL.md v1.3.0 + actual package.json)
3. **PAD.md §5.1 Tailwind** — update `^4.1.0` → `^4.3.0` (matches SKILL.md v1.3.0 + actual package.json)
4. **PAD.md Appendix A Cloudflare section** — fix R2 key names (`_ACCESS_KEY_ID`, `_SECRET_ACCESS_KEY`); add `CLOUDFLARE_R2_ENDPOINT`, `NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL`, `NEXT_PUBLIC_SENTRY_DSN`

### Short-term (P1 — fix to prevent agent confusion)

5. **design.md LAYER 6** — add superseded banner for ADR-008 + ADR-009, or rewrite to Better Auth + proxy.ts
6. **design.md Phase 3 item 5** — update Trigger.dev v3 → v4
7. **design.md LAYER 2 color tokens** — add banner noting named tokens were superseded by numbered scale; point to PAD.md §11.3
8. **design.md LAYER 2 spacing scale** — add banner noting 11-stop scale was superseded by 13-stop; point to PAD.md §11.4
9. **SKILL.md §4.1 + §4.4 font-mono** — remove Berkeley Mono references (font files don't exist); use JetBrains Mono as primary (matches PAD.md + actual CSS)

### Medium-term (P2 — documentation hygiene)

10. **PAD.md §5.1 Zod row** — add `z.url({ protocol })` v4-native guidance (matches SKILL.md v1.3.0)
11. **PAD.md §5.1 Turborepo / React Email / Resend** — replace "latest" with pinned versions (matches SKILL.md v1.3.0)
12. **CSS token file headers** — fix off-by-one PAD section references in all 4 files (`colors.css`, `typography.css`, `spacing.css`, `motion.css`)
13. **design.md LAYER 2** — add `--space-px`, `--space-0-5`, `--duration-instant`, `--duration-crawl`, `--ease-sharp` (or add banner pointing to PAD.md as authoritative)

### Low-priority (P3 — cosmetic)

14. **design.md LAYER 2** — add semantic alias tokens and status colors (or add banner)
15. **PAD.md ADR-009** — fix proxy.ts runtime claim from "Node.js" to "Edge" (matches SKILL.md §5.6 + web research)

---

## Conclusion

The three documents are **philosophically aligned** — all three share the "Editorial Calm" aesthetic, the Warm Mineral palette, the 4px spacing grid, and the same 9 ADR decisions. The hex color values are 100% consistent across PAD.md, SKILL.md, and the actual CSS.

However, **PAD.md §5.1 (Tech Stack) and Appendix A (env vars) are stale** — they carry the same factual errors that were just corrected in SKILL.md v1.3.0. The remediation pass that fixed SKILL.md did not propagate back to PAD.md. **design.md is stale on three ADR-level decisions** (Auth.js v5 → Better Auth, middleware.ts → proxy.ts, Trigger.dev v3 → v4) and uses an older color token naming convention and spacing scale that were never implemented.

**Recommended action:** Treat PAD.md as the next remediation target (apply the same 4 P0 + 5 P1 fixes that were applied to SKILL.md). Treat design.md as a historical artifact — add superseded banners rather than rewriting it, since its value is as a record of the original design intent.

Once PAD.md is updated to match SKILL.md v1.3.0, the three documents will form a coherent hierarchy: design.md (historical intent, with banners noting what was superseded) → PAD.md (authoritative architecture, fully aligned with SKILL.md) → SKILL.md v1.3.0 (agent-facing distillation, already verified).

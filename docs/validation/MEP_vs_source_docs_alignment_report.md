# MASTER_EXECUTION_PLAN.md — Alignment Validation Report

**Date:** 2026-07-05
**Validator:** Independent review (Frontend Architect & Avant-Garde UI Designer persona)
**Target:** `MASTER_EXECUTION_PLAN.md` (v1.1.0, 4,523 lines)
**Source documents (updated versions):**
- `design.md` (833 lines, with superseded banners added 2026-07-05)
- `PAD.md` (3,208 lines, v1.3.0-equivalent — Stripe Dahlia, pnpm 11, Tailwind 4.3, env vars fixed, ADR-009 runtime corrected)
- `stillwater_SKILL.md` (5,038 lines, v1.3.0 — Berkeley Mono removed, JetBrains Mono primary)
- `static_landing_page_mockup.html` (2,927 lines — visual/aesthetic UI/UX guidance only)

**Status:** 3 P0 Critical + 7 P1 High + 4 P2 Medium + 1 P3 Low findings

---

## Executive Summary

The `MASTER_EXECUTION_PLAN.md` (MEP) is the largest and most operationally critical document in the Stillwater project — it defines the 13-phase build plan (Phase 0 → Phase 12) with per-file instructions, TDD test contracts, and acceptance criteria. It was last updated to v1.1.0 on 2026-07-05, at which point it was "verified against PAD v1.1.0 / SKILL v1.2.0."

Since that verification, both PAD.md and SKILL.md have been further remediated (to v1.3.0-equivalent) with 10+ factual corrections: Stripe API version (Basil → Dahlia), pnpm version (9 → 11), Tailwind version (4.1 → 4.3), env var count (25 → 34), Berkeley Mono → JetBrains Mono, ADR-009 proxy.ts runtime (Node.js → Edge), and more. **The MEP was not updated to reflect these downstream corrections.** This means the MEP now contains stale instructions that, if followed by an implementing agent, would produce code that conflicts with the updated PAD.md and SKILL.md.

Additionally, the MEP's Source Document Map references `static_landing_page_html_mockup.md` (the markdown design spec, 3,056 lines) but the user has directed validation against `static_landing_page_mockup.html` (the standalone HTML file, 2,927 lines). These are **different files** — the .md is a design rationale document, the .html is the actual visual mockup. The MEP never references the .html file.

**Root cause:** The MEP was the canonical resolver of discrepancies between the four source documents. When the source documents were subsequently remediated (to fix the same factual errors the MEP had originally resolved in its D1–D42 table), the MEP's own instructions, acceptance criteria, and discrepancy resolutions were not updated to match.

---

## Findings

### P0 — Critical (implementation code that will fail)

#### Finding #1 — MEP Phase 7 Stripe `apiVersion` pinned to 'basil' (should be 'dahlia' for SDK v22)

**Location:** MEP line 2732 (Phase 7, F7-01 Stripe SDK singleton)

**MEP says:**
```typescript
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-31.basil', // ⚠️ Basil API: current_period_end moved to items.data[0]
  typescript: true,
});
```

**PAD.md §5.1 (updated) says:** `"Dahlia" API (2026-06-24) pinned by SDK v22`
**SKILL.md v1.3.0 §2.1 says:** `"Dahlia" API (2026-06-24) pinned by SDK v22`
**Actual `apps/web/package.json`:** `"stripe": "^22.3.0"`

**Web research ground truth (from prior remediation):**
- SDK v22 pins **Dahlia** (2026-06-24), NOT Basil (2025-03-31).
- Basil was pinned by SDK v18.
- Setting `apiVersion: '2025-03-31.basil'` with SDK v22 installed will cause TypeScript type mismatches — the SDK v22 types are generated for the Dahlia API version shape.

**Impact:** An implementing agent following the MEP Phase 7 instructions will write a Stripe client that either (a) fails TypeScript type-checking because the SDK v22 types don't match the Basil API version, or (b) silently pins to an older API version that may not support features the codebase expects. This is payment-handling code — the highest-stakes surface.

**Severity:** P0 — this is actual implementation code in the execution plan, not just documentation.

**Fix:** Update MEP line 2732 to:
```typescript
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia', // Dahlia API (SDK v22 default); current_period_end at items.data[0]
  typescript: true,
});
```
Or omit `apiVersion` entirely (SDK v22 defaults to Dahlia).

---

#### Finding #2 — MEP Phase 0 env var count says "25 vars" (actual is 34)

**Location:** MEP line 503 (Phase 0, F0-06 env module checklist)

**MEP says:** `// ... all 25 vars mapped to process.env`

**PAD.md Appendix A (updated):** Now lists all 34 vars (Cloudflare key names fixed + 3 missing vars added).
**SKILL.md v1.3.0 §3.3 + §20.5:** "Environment Variables (34 total)" / "Env Schema (34 vars)"
**Actual `packages/config/src/env.ts`:** 34 vars (26 server + 8 client).

**Impact:** An implementing agent following the MEP Phase 0 instructions will write an env module that only maps 25 vars, missing 9 vars (4 Cloudflare R2, 2 PostHog, 1 Sentry client, 1 Cloudflare Images URL, 1 Axiom). Six of those (the Cloudflare R2 set) are required for the MEP's own Phase 5 SSE pattern and Phase 7 Stripe webhook pattern.

**Severity:** P0 — env-var completeness is a bootstrap-blocking issue.

**Fix:** Update MEP line 503 to `// ... all 34 vars mapped to process.env` and ensure the F0-06 checklist references the full 34-var schema from the updated PAD.md Appendix A.

---

#### Finding #3 — MEP F0-23 instructs creating `berkeley-mono/` font directory (doesn't exist; should be `jetbrains-mono/`)

**Location:** MEP lines 678–684 (Phase 0, F0-23)

**MEP says:**
```
##### F0-23. `/packages/ui/src/fonts/berkeley-mono/` (directory + .woff2)
- **Purpose:** Self-hosted Berkeley Mono (data/admin mono font). ⚠️ Berkeley Mono is a **paid font** — Open Question §9.7.
- **Checklist:**
  - [ ] Acquire license (or fall back to JetBrains Mono per §9.7)
  - [ ] Place woff2 files
  - [ ] Create `berkeley-mono.css` with `@font-face`
```

**PAD.md §11.2 (updated):** `--font-mono: 'JetBrains Mono', 'Courier New', mono;`
**SKILL.md v1.3.0 §4.1 (updated):** `--font-mono: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Courier New', monospace;`
**Actual repo:** `packages/ui/src/fonts/jetbrains-mono/` exists with 16 woff2 files. `packages/ui/src/fonts/berkeley-mono/` does NOT exist and has never existed.

**Impact:** An implementing agent following the MEP F0-23 instructions will:
1. Attempt to acquire a Berkeley Mono license (unnecessary — the project has already standardized on JetBrains Mono)
2. Create a `berkeley-mono/` directory that duplicates the existing `jetbrains-mono/` directory
3. Write a `berkeley-mono.css` file that references fonts that don't exist
4. Import Berkeley Mono in the barrel `index.css` (F0-24, line 690: "Imports Cormorant, DM Sans, Berkeley Mono (or fallback)") — creating a broken import

**Severity:** P0 — this is a file-creation instruction in Phase 0 that will produce broken code.

**Fix:** Replace F0-23 entirely:
```
##### F0-23. `/packages/ui/src/fonts/jetbrains-mono/` (directory + .woff2)
- **Purpose:** Self-hosted JetBrains Mono (data/admin mono font). Apache 2.0, open-source — no license required.
- **Checklist:**
  - [ ] Place woff2 files (already present in scaffolding)
  - [ ] Create `jetbrains-mono.css` with `@font-face`
```
And update F0-24 (line 690) to: "Imports Cormorant, DM Sans, JetBrains Mono"

---

### P1 — High (stale instructions that conflict with updated source docs)

#### Finding #4 — MEP Document Control claims verification against stale versions

**Location:** MEP line 14 (Document Control table)

**MEP says:** `Status: ACTIVE — PLAN (verified against PAD v1.1.0 / SKILL v1.2.0)`

**Actual current versions:**
- PAD.md: v1.3.0-equivalent (further remediated with Stripe Dahlia, pnpm 11, Tailwind 4.3, env vars, ADR-009 runtime)
- SKILL.md: v1.3.0 (Berkeley Mono removed, JetBrains Mono primary, all prior corrections applied)

**Impact:** The MEP claims to be verified against versions that are 2 remediation passes behind. An agent reading the MEP's status line will believe the plan is current, when in fact the source documents have diverged.

**Severity:** P1 — credibility erosion; the status claim is false.

**Fix:** Update MEP line 14 to: `Status: ACTIVE — PLAN (verified against PAD v1.3.0 / SKILL v1.3.0; re-validated 2026-07-05)` and add a Change Log entry for v1.2.0 documenting this re-validation.

---

#### Finding #5 — MEP D25 resolution says "self-host Berkeley Mono" (PAD now says JetBrains Mono)

**Location:** MEP line 154 (§2.1, D25)

**MEP says:** `Canonical resolution: Adopt PAD spec: self-host Berkeley Mono; apply to admin/data`

**PAD.md §11.2 (updated):** Uses `'JetBrains Mono'`, not Berkeley Mono.
**SKILL.md v1.3.0 §4.4 (updated):** Uses `jetbrainsMono` localFont, not `berkeleyMono`.
**design.md LAYER 2 (updated):** Has a superseded banner noting "Font-mono: 'Berkeley Mono' (paid, unlicensed) → 'JetBrains Mono' (Apache 2.0, open-source). See PAD.md §11.2."

**Impact:** The D25 discrepancy resolution is stale. It directs agents to adopt a spec that no longer exists.

**Severity:** P1 — the discrepancy table is the MEP's most consulted section; stale resolutions misdirect implementation.

**Fix:** Update D25 resolution to: `**Adopt PAD spec (updated):** self-host JetBrains Mono (Apache 2.0, open-source). Berkeley Mono was the Phase 1 proposal (design.md LAYER 2) but the license was not acquired; JetBrains Mono was chosen as the open-source fallback. See PAD.md §11.2 and SKILL.md §4.4.`

---

#### Finding #6 — MEP D34 resolution says "Self-host Cormorant + DM Sans + Berkeley Mono"

**Location:** MEP line 163 (§2.3, D34)

**MEP says:** `Canonical resolution: Self-host Cormorant + DM Sans + Berkeley Mono in packages/ui/src/fonts/`

**Same issue as Finding #5.** The resolution should reference JetBrains Mono, not Berkeley Mono.

**Fix:** Update D34 resolution to: `**Self-host** Cormorant + DM Sans + JetBrains Mono in packages/ui/src/fonts/ (Berkeley Mono was the Phase 1 proposal; license not acquired; JetBrains Mono is the open-source fallback — see D25).`

---

#### Finding #7 — MEP D41 claims "RESOLVED IN SOURCE (PAD v1.1.0)" but PAD has been further updated

**Location:** MEP line 169 (§2.3, D41)

**MEP says:** `RESOLVED: PAD.md v1.1.0 has been fully remediated. All 14 locations now correctly reference Better Auth v1.6.23, proxy.ts, [...all], BETTER_AUTH_SECRET, Next.js 16, TypeScript ^5.9.0, and stillwater_local_dev. No action required.`

**Reality:** PAD.md has been further remediated since v1.1.0. The v1.1.0 remediation fixed the 14 Auth.js/middleware references, but the v1.3.0 remediation additionally fixed:
- Stripe "Basil" → "Dahlia" + snake_case (not camelCase)
- pnpm 9.15.4 → ^11.0.0
- Tailwind ^4.1.0 → ^4.3.0
- Zod v4 guidance (z.url({ protocol }) + { error } param)
- Turborepo/React Email/Resend version pins
- Drizzle $count floor ≥0.30 → ≥0.34
- ADR-009 proxy.ts runtime "Node.js" → "Edge"
- Appendix A Cloudflare env var names + 3 missing vars
- §5.1 Next.js row: React Compiler opt-in, serverExternalPackages attribution to Next.js 15

**Impact:** The "No action required" claim is false. The MEP's D41 resolution needs to acknowledge the v1.3.0 updates and either (a) incorporate the new corrections into the MEP's own instructions, or (b) add new discrepancy entries (D43+) for each new PAD correction.

**Severity:** P1 — the MEP claims alignment that doesn't exist.

**Fix:** Update D41 to: `**RESOLVED (v1.1.0) + FURTHER UPDATED (v1.3.0):** PAD.md v1.1.0 fixed the 14 Auth.js/middleware references. PAD.md v1.3.0 additionally fixed: Stripe API version (Basil→Dahlia), pnpm (9→11), Tailwind (4.1→4.3), Zod v4 guidance, version pins, Drizzle $count floor, ADR-009 runtime, env vars. The MEP has been updated to reflect these in D43–D50 below.` Then add D43–D50 entries for each new correction.

---

#### Finding #8 — MEP Phase 12 acceptance criteria lists "Berkeley Mono"

**Location:** MEP line 3984 (Phase 12 acceptance criteria)

**MEP says:** `- [ ] Self-hosted fonts (Cormorant + DM Sans + Berkeley Mono)`

**Same issue as Findings #5 and #6.** Should reference JetBrains Mono.

**Fix:** Update to: `- [ ] Self-hosted fonts (Cormorant + DM Sans + JetBrains Mono)`

---

#### Finding #9 — MEP §3.2 Design principles references "Berkeley Mono data"

**Location:** MEP line 198 (§3.2 Design principles)

**MEP says:** `✓ Typographic hierarchy as primary structural tool (Cormorant Garamond display + DM Sans body + Berkeley Mono data)`

**Same issue.** Should reference JetBrains Mono.

**Fix:** Update to: `✓ Typographic hierarchy as primary structural tool (Cormorant Garamond display + DM Sans body + JetBrains Mono data)`

---

#### Finding #10 — MEP Open Questions §9.7 lists Berkeley Mono as unresolved

**Location:** MEP lines 4420 + 4424 (§9.7 Open Questions)

**MEP says:**
- Question 3: "Confirm self-hosting Cormorant Garamond + DM Sans + Berkeley Mono (license files must be acquired for Berkeley Mono — it's a paid font; if unavailable, fall back to JetBrains Mono)."
- Question 7: "Berkeley Mono license — Berkeley Mono is a paid font. If not acquired, fallback options: (a) JetBrains Mono, (b) IBM Plex Mono, (c) Geist Mono. Confirm preference."

**Reality:** This question has been resolved. PAD.md and SKILL.md now standardize on JetBrains Mono. The `jetbrains-mono/` font directory exists with woff2 files. The `berkeley-mono/` directory does not exist.

**Impact:** An implementing agent will see these as open questions and may delay Phase 0 awaiting project-owner sign-off on a decision that has already been made.

**Severity:** P1 — open questions that are actually resolved block implementation.

**Fix:** Mark both questions as ✅ RESOLVED:
- Question 3: "✅ RESOLVED: JetBrains Mono (Apache 2.0, open-source) chosen as the mono font. Berkeley Mono license not acquired. See PAD.md §11.2 and SKILL.md §4.4."
- Question 7: "✅ RESOLVED: JetBrains Mono selected. No license acquisition needed."

---

#### Finding #11 — MEP §7.1 claims "PAD and PLAN are now in 100% alignment" (stale)

**Location:** MEP line 4281 (§7.1 PAD section-by-section coverage)

**MEP says:** `✅ PAD Alignment Verified: PAD.md v1.1.0 has been fully remediated. All 14 previously stale references... The PLAN and PAD are now in 100% alignment. Phase 0 can proceed.`

**Reality:** PAD.md has been further remediated since v1.1.0 (see Finding #7). The "100% alignment" claim was true at v1.1.0 but is no longer true — the MEP still references Berkeley Mono, Stripe "Basil", pnpm 9, env var count 25, etc., while PAD.md has been corrected.

**Impact:** False confidence. An agent reading this will believe the MEP and PAD are aligned when they are not.

**Severity:** P1 — the alignment verification claim is the MEP's quality gate; a false "100% alignment" claim undermines the entire validation framework.

**Fix:** Update to: `⚠️ PAD Alignment Partially Verified: PAD.md v1.1.0 alignment confirmed (14 Auth.js/middleware references). PAD.md v1.3.0 introduced additional corrections (Stripe Dahlia, pnpm 11, Tailwind 4.3, env vars, ADR-009 runtime) that require MEP updates — see Findings #1–#10 in the validation report. Re-validation in progress.`

---

### P2 — Medium (documentation discrepancies; won't break code but will confuse)

#### Finding #12 — MEP Source Document Map references .md mockup, not .html mockup

**Location:** MEP lines 23 + 39 + 3975 + 4354

**MEP says:** References `static_landing_page_html_mockup.md` (3,056 lines) as the mockup source.

**User directive:** Validate against `static_landing_page_mockup.html` (2,927 lines).

**Reality:** Both files exist but are different documents:
- `static_landing_page_html_mockup.md` — a markdown design rationale document (starts with `# 🪷 Claw Code — Phase 1–4: ANALYZE → PLAN`)
- `static_landing_page_mockup.html` — the actual standalone HTML mockup file (starts with `<!DOCTYPE html>`)

The .md likely contains the HTML inline plus design rationale, while the .html is the pure visual mockup. The MEP never references the .html file.

**Impact:** An implementing agent following the MEP will read the .md (design rationale) but may not look at the .html (the actual visual reference). The .html is what should be used for side-by-side visual comparison in Phase 12.

**Severity:** P2 — the .md probably contains the same HTML, but the .html is the canonical visual reference.

**Fix:** Update the MEP Source Document Map to reference both files:
`static_landing_page_mockup.html (2,927 lines) — standalone HTML mockup for visual reference (Phase 12 side-by-side comparison). static_landing_page_html_mockup.md (3,056 lines) — design rationale + inline HTML (Phase 12 conceptual guidance).`

---

#### Finding #13 — MEP D9 resolution is stale (PAD already fixed the malformed token)

**Location:** MEP line 132 (§2.1, D9)

**MEP says:** `Canonical resolution: Fix --color-stone-200: #D4CFC9; and define --color-fog: #D4CFC9;`

**PAD.md (updated) Change Log line 82:** `v1.2.0 — fix malformed D9 color token; remove orphaned --color-fog`

**Reality:** PAD.md has already fixed this. The malformed `--color-stone-200: --color-fog: #D4CFC9;` line has been corrected, and `--color-fog` has been removed entirely (it was an orphaned token from the design.md Phase 1 proposal that was never implemented in the numbered scale).

**Impact:** An implementing agent will attempt to fix a problem that's already been fixed, and may re-introduce the orphaned `--color-fog` token.

**Severity:** P2 — the fix has already been applied; the MEP resolution is stale but harmless if the agent reads the updated PAD.md first.

**Fix:** Update D9 to: `**RESOLVED IN SOURCE (PAD v1.2.0):** Malformed token fixed; orphaned --color-fog removed entirely. No action required.`

---

#### Finding #14 — MEP D30 mockup spots math is confirmed correct

**Location:** MEP line 148 (§2.3, D30)

**MEP says:** `Mockup says: aria-label="4 of 16 spots taken" vs visible "8 spots left" (math wrong). Canonical resolution: Fix copy: visible "12 spots left", aria-label "4 of 16 spots taken"`

**Verified against `static_landing_page_mockup.html`:**
- Line 1797: `<div class="spots-bar" aria-label="4 of 16 spots taken" role="img">`
- Line 1812: `<span class="spots-label">8 spots left</span>`

**Math check:** 16 total − 4 taken = 12 left. But visible text says "8 spots left." The math IS wrong (4 taken ≠ 16 − 8 = 8 taken). The MEP's resolution ("visible '12 spots left'") is correct.

**Verdict:** ✅ The MEP D30 finding is accurate and the resolution is correct. No action needed — this is a confirmed-correct finding, not a defect.

---

#### Finding #15 — Mockup HTML uses unprefixed color tokens; MEP doesn't call this out

**Location:** `static_landing_page_mockup.html` lines 30–55

**Mockup HTML uses:** `--stone-950`, `--stone-900`, `--clay-400`, `--water-500`, `--sand`, `--sand-warm`, etc. (no `--color-` prefix)

**Production CSS (`packages/ui/src/tokens/colors.css`) uses:** `--color-stone-950`, `--color-stone-900`, `--color-clay-400`, `--color-water-500`, `--color-sand`, `--color-sand-warm`, etc. (with `--color-` prefix)

**MEP D26** covers the spacing scale naming difference (`--sp-N` vs `--space-N`) but does NOT call out the color token prefix difference (`--stone-N` vs `--color-stone-N`).

**Impact:** An implementing agent porting the mockup in Phase 12 may copy the unprefixed token names, which won't match the production CSS tokens. The Tailwind `@theme` block maps `--color-stone-*` to Tailwind's `bg-stone-*` utilities — unprefixed `--stone-*` tokens would not be picked up.

**Severity:** P2 — the MEP's D26–D28 pattern (remap mockup tokens to PAD tokens) implicitly covers this, but an explicit callout would prevent confusion.

**Fix:** Add a note to MEP D26 or D28: "Mockup also uses unprefixed color tokens (`--stone-950`, `--clay-400`) — remap to production `--color-stone-950`, `--color-clay-400` (with `--color-` prefix) during Phase 12 port."

---

### P3 — Low (cosmetic / editorial)

#### Finding #16 — MEP §9.7 Open Questions item 2 about proxy.ts is resolved

**Location:** MEP line 4419 (§9.7, Question 2)

**MEP says:** `proxy.ts rename — Confirm ADR-009 (adopt Next.js 16 rename). If your Next.js version is < 16, revert to middleware.ts.`

**Reality:** The project has committed to Next.js 16 (`^16.2.0` in `apps/web/package.json`). ADR-009 is accepted. `apps/web/proxy.ts` exists in the repo. This question is resolved.

**Severity:** P3 — cosmetic; the question is clearly resolved by the committed version pin.

**Fix:** Mark as ✅ RESOLVED: "Next.js 16.2.0 pinned; proxy.ts adopted per ADR-009. No reversion needed."

---

## Alignment Matrix

### Tech Stack Version Alignment

| Layer | MEP | PAD.md (updated) | SKILL.md v1.3.0 | Actual package.json | Aligned? |
|-------|-----|-------------------|------------------|---------------------|----------|
| Next.js | ^16.2.0 | ^16.2.0 | ^16.2.0 | ^16.2.0 | ✅ |
| React | ^19.2.3 | ^19.2.3 | ^19.2.3 | ^19.2.3 | ✅ |
| TypeScript | ^5.9.0 | ^5.9.0 | ^5.9.0 | ^5.9.0 | ✅ |
| Tailwind | (not pinned in MEP) | ^4.3.0 | ^4.3.0 | ^4.3.0 | ✅ (MEP defers to PAD) |
| Stripe | ^22.3.0 + apiVersion 'basil' ❌ | ^22.3.0 + "Dahlia" | ^22.3.0 + "Dahlia" | ^22.3.0 | ❌ MEP apiVersion is 'basil' (Finding #1) |
| Zod | ^4.4.0 | ^4.4.0 | ^4.4.0 | ^4.4.0 | ✅ |
| pnpm | (not pinned in MEP) | ^11.0.0 | ^11.0.0 | pnpm@11.0.0 | ✅ (MEP defers to PAD) |
| Better Auth | v1.6.23 | v1.6.23 | ^1.6.23 | ^1.6.23 | ✅ |
| Trigger.dev | v4 | v4 | v4 | — | ✅ |
| Drizzle | ^0.45.0 | ^0.45.0 | ^0.45.0 | ^0.45.0 | ✅ |

### Font Alignment

| Font | MEP | PAD.md (updated) | SKILL.md v1.3.0 | Actual CSS | Mockup HTML | Aligned? |
|------|-----|-------------------|------------------|------------|-------------|----------|
| Display | Cormorant Garamond | Cormorant Garamond | Cormorant Garamond | Cormorant Garamond | Cormorant Garamond | ✅ |
| Body | DM Sans | DM Sans | DM Sans | DM Sans | DM Sans | ✅ |
| Mono | Berkeley Mono ❌ | JetBrains Mono | JetBrains Mono | JetBrains Mono | (none loaded) | ❌ MEP stale (Findings #3, #5, #6, #8, #9, #10) |

### Env Var Alignment

| Metric | MEP | PAD.md (updated) | SKILL.md v1.3.0 | Actual env.ts | Aligned? |
|--------|-----|-------------------|------------------|---------------|----------|
| Total count | "25 vars" ❌ | 34 (Appendix A) | 34 (§3.3/§20.5) | 34 | ❌ MEP stale (Finding #2) |
| Cloudflare key names | (not specified) | Correct names | Correct names | Correct names | ✅ (MEP defers to scaffolding) |

### Discrepancy Table (D1–D42) Alignment

| Discrepancy | MEP Resolution | Source Doc Status | Aligned? |
|-------------|----------------|-------------------|----------|
| D1 (Auth library) | RESOLVED IN SOURCE | PAD v1.3.0 confirms Better Auth | ✅ |
| D2 (Middleware file) | RESOLVED IN SOURCE | PAD v1.3.0 confirms proxy.ts | ✅ |
| D9 (Malformed color token) | "Fix --color-fog" | PAD v1.2.0 already fixed + removed --color-fog | ❌ Stale (Finding #13) |
| D25 (Berkeley Mono font) | "Adopt PAD: self-host Berkeley Mono" | PAD now says JetBrains Mono | ❌ Stale (Finding #5) |
| D34 (Mockup Google Fonts CDN) | "Self-host Berkeley Mono" | PAD now says JetBrains Mono | ❌ Stale (Finding #6) |
| D30 (Mockup spots math) | "Fix copy: 12 spots left" | Mockup confirmed wrong | ✅ Correct |
| D36 (proxy.ts auth pattern) | "Refactor to cookie-only" | SKILL.md §5.6 confirms 2-layer pattern | ✅ |
| D41 (PAD staleness) | "RESOLVED, no action" | PAD v1.3.0 has further corrections | ❌ Stale (Finding #7) |
| D42 (Missing @dnd-kit + recharts) | "Add to apps/web/package.json" | (Not yet verified against actual package.json) | ⚠️ Needs verification |

### Mockup HTML Alignment (visual/aesthetic guidance)

| Dimension | Mockup HTML | MEP Phase 12 Plan | Production CSS | Aligned? |
|-----------|-------------|-------------------|----------------|----------|
| Color hex values | Match production | — | Match PAD §11.3 | ✅ |
| Color token prefix | `--stone-950` (unprefixed) | Not called out | `--color-stone-950` (prefixed) | ❌ MEP doesn't flag this (Finding #15) |
| Spacing tokens | `--sp-1`…`--sp-11` | D26: "Adopt PAD --space-N" | `--space-1`…`--space-13` | ✅ MEP correctly identifies |
| Motion tokens | `--dur-quick`/`std`/`slow` | D27: "Adopt PAD --duration-*" | `--duration-*` (5 stops) | ✅ MEP correctly identifies |
| Type scale | Inline `clamp()` | D28: "Adopt PAD tokens" | 9 fluid tokens | ✅ MEP correctly identifies |
| Font loading | Google Fonts CDN | D34: "Self-host" | Self-hosted via next/font/local | ✅ MEP correctly identifies |
| Mono font | None loaded | D25: "Adopt Berkeley Mono" ❌ | JetBrains Mono | ❌ MEP stale (Finding #5) |
| Section numbering | Philosophy unnumbered | D31: "Add 01" | — | ✅ MEP correctly identifies |
| Mobile nav | No hamburger | D32: "Implement Radix Dialog drawer" | — | ✅ MEP correctly identifies |
| Schedule items | 11 of 18 `onclick="return false"` | D35: "Wire all items" | — | ✅ MEP correctly identifies |
| SEO/OG | Only title + description | D33: "Implement full PAD SEO spec" | — | ✅ MEP correctly identifies |

---

## Recommendations

### Immediate (P0 — fix before any agent implements Phase 0 or Phase 7)

1. **MEP line 2732 (F7-01 Stripe singleton)** — change `apiVersion: '2025-03-31.basil'` to `apiVersion: '2026-06-24.dahlia'` (or omit apiVersion to use SDK v22 default)
2. **MEP line 503 (F0-06 env module)** — change "25 vars" to "34 vars" and ensure the checklist references the full 34-var schema from updated PAD.md Appendix A
3. **MEP lines 678–684 (F0-23)** — replace `berkeley-mono/` directory creation with `jetbrains-mono/` (which already exists in the repo); remove the "acquire license" checklist item

### Short-term (P1 — fix to prevent agent confusion)

4. **MEP line 14 (Document Control)** — update version claim to "verified against PAD v1.3.0 / SKILL v1.3.0"
5. **MEP D25 (line 154)** — update resolution to reference JetBrains Mono, not Berkeley Mono
6. **MEP D34 (line 163)** — update resolution to reference JetBrains Mono
7. **MEP D41 (line 169)** — update from "RESOLVED, no action" to acknowledge v1.3.0 corrections; add D43–D50 entries for new PAD corrections
8. **MEP line 3984 (Phase 12 acceptance criteria)** — change "Berkeley Mono" to "JetBrains Mono"
9. **MEP line 198 (§3.2 Design principles)** — change "Berkeley Mono data" to "JetBrains Mono data"
10. **MEP lines 4420 + 4424 (Open Questions §9.7)** — mark Berkeley Mono questions as ✅ RESOLVED
11. **MEP line 4281 (§7.1 alignment claim)** — update "100% alignment" to "partially verified; v1.3.0 corrections pending MEP update"

### Medium-term (P2 — documentation hygiene)

12. **MEP Source Document Map (lines 23, 39, 3975, 4354)** — add `static_landing_page_mockup.html` as the visual reference file alongside the .md design rationale
13. **MEP D9 (line 132)** — mark as RESOLVED IN SOURCE (PAD v1.2.0 already fixed)
14. **MEP D26 or D28** — add note about mockup's unprefixed color tokens (`--stone-950` → `--color-stone-950`)

### Low-priority (P3 — cosmetic)

15. **MEP §9.7 Question 2** — mark proxy.ts question as ✅ RESOLVED

---

## Conclusion

The `MASTER_EXECUTION_PLAN.md` is a **structurally excellent** document — its 13-phase breakdown, per-file instructions, TDD test contracts, and D1–D42 discrepancy table represent best-in-class execution planning. The D30 mockup spots-math finding, the D26–D28 token remapping instructions, and the D36 2-layer auth pattern are all accurate and valuable.

However, the MEP was last verified against PAD v1.1.0 / SKILL v1.2.0, and both source documents have since been remediated to v1.3.0 with 10+ factual corrections. The MEP has **not been updated to reflect these downstream changes**. This manifests as 3 P0 findings (Stripe apiVersion 'basil', env count 25, berkeley-mono/ directory creation) that will produce broken code if an implementing agent follows the MEP literally.

**Recommended action:** Apply the 3 P0 fixes immediately (they affect actual implementation code in Phase 0 and Phase 7), then apply the 7 P1 fixes to bring the discrepancy table and acceptance criteria into alignment with the updated source documents. The P2/P3 fixes can be batched into a follow-up documentation pass.

Once the P0 and P1 fixes are applied, the MEP will be fully aligned with the updated PAD.md, SKILL.md, design.md, and the mockup HTML — completing the four-document alignment hierarchy.

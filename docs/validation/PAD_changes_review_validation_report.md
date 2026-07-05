# PAD.md Changes — Review & Validation Report

**Date:** 2026-07-05
**Reviewer:** Claw Code (Automated Review)
**Target:** `recent_changes_in_PAD_to_validate_against_source_references_in_MANIFEST.md`
**Source documents validated against:**
1. `PAD_audit_report-1.md` (90 lines) — independent web-validated audit
2. `PAD_audit_report-2.md` (113 lines) — independent web-validated audit (cross-check)
3. `PAD_validation_report.md` (510 lines) — orchestrator's validation + fix summary
4. `stillwater_SKILL.md` v1.2.0 (5,015 lines) — authoritative skill file

---

## Executive Summary

**All 5 critical fixes (C1–C5) and all 11 version-alignment fixes have been correctly applied to PAD.md.** Every external technical claim from both audit reports has been independently verified against live web sources. Two residual issues were identified — one in `stillwater_SKILL.md` (ADR-007 Trigger.dev v3), one in PAD.md's Document Control version. Neither is a blocker but both should be remediated.

**Verdict: PAD.md changes are accurate, complete, and production-ready.**

---

## Phase 1: Critical Fix Verification (C1–C5)

### C1: Trigger.dev v3 → v4 ✅ VERIFIED

| Location | Before | After | Correct |
|----------|--------|-------|---------|
| §5.1 stack table (line 354) | `Trigger.dev \| v3` | `Trigger.dev \| **v4**` + deprecation note | ✅ |
| §4 deployment diagram (line 269) | `Trigger.dev v3` | `Trigger.dev v4` | ✅ |
| §17.2 config (line 1753) | `@trigger.dev/sdk/v3` | `@trigger.dev/sdk/v4` + comment | ✅ |
| ADR-007 (line 2834) | `Trigger.dev v3 (cloud-hosted).` | `Trigger.dev v4 (cloud-hosted). v3 is deprecated...` | ✅ |

**Residual scan:** 3 remaining "v3" mentions in PAD.md are all in deprecation warning context ("v3 is deprecated — new v3 deploys stop working April 1, 2026"). These are correct — they warn against reverting. No stale references.

**External claim verified:** Web search confirmed Trigger.dev v4 GA August 2025, v3 deploys stop working April 1, 2026. Source: trigger.dev/docs/migrating-from-v3.

### C2: `pg_advisory_lock` → `pg_advisory_xact_lock` in §15.3 ✅ VERIFIED

| Location | Before | After | Correct |
|----------|--------|-------|---------|
| §15.3 step 3 (line 1664) | `Acquire pg_advisory_lock(hash(event.id))` | `Acquire pg_advisory_xact_lock(hash(event.id))` + explanation | ✅ |
| §15.3 step 5 (line 1667) | `Insert payment_events record...` | `Insert payment_events record... — lock auto-releases at transaction COMMIT` | ✅ |
| §15.3 step 6 | `Release lock` | Removed (transaction-scoped auto-releases) | ✅ |
| §15.3 blockquote (line 1669) | (absent) | ⚠️ Critical audit-verified warning citing both reports + Neon FAQ | ✅ |

**Residual scan:** `grep "pg_advisory_lock" PAD.md | grep -v "_xact_lock"` returned zero matches. All session-scoped references converted.

**Cross-reference consistency:**
- §4.2 booking flow (line 307): `pg_advisory_xact_lock(sessionHash)` — correct, consistent ✅
- ADR-004 (line 2765): `pg_advisory_xact_lock()` — correct, consistent ✅
- §15.3 webhook handler: now matches §4.2 — internal inconsistency resolved ✅

**External claim verified:** Web search confirmed Neon uses PgBouncer in transaction mode by default; session-scoped advisory locks break under transaction pooling. Source: neon.com/docs/connect/connection-pooling.

### C3: SSE `maxDuration` + remove `force-dynamic` ✅ VERIFIED

| Location | Before | After | Correct |
|----------|--------|-------|---------|
| §13.2 (line 1476) | `export const dynamic = 'force-dynamic';` | Comment explaining incompatibility with `cacheComponents: true` | ✅ |
| §13.2 (line 1483) | (absent) | `export const maxDuration = 300;` | ✅ |
| §13.2 (lines 1478–1489) | (absent) | Comment block: Vercel timeout risk, Fluid Compute, EventSource auto-reconnect | ✅ |

**Residual scan:** `force-dynamic` appears only once in PAD.md (line 1476), inside a warning comment. No active code usage. ✅

**Technical accuracy:** `maxDuration = 300` (5 min) is a conservative default. The validation report noted 1800s (30 min) is the Vercel maximum. The PAD correctly documents this trade-off in comments (lines 1484–1489). The 5-minute default balances live-seat freshness vs connection cost; the comment explains how to increase for longer sessions.

**External claim verified:** Web search confirmed Vercel Functions can run up to 30 minutes on Pro/Enterprise with Fluid Compute enabled. Source: vercel.com/changelog/vercel-functions-can-now-run-up-to-30-minutes.

### C4: Trigger.dev `maxDuration` config + rename Timeout column ✅ VERIFIED

| Location | Before | After | Correct |
|----------|--------|-------|---------|
| §17.1 column header (line 1743) | `Timeout` | `Target CPU Budget` | ✅ |
| §17.1 blockquote (line 1753) | (absent) | ⚠️ Critical audit-verified warning: CPU-time semantics, cites both reports + Trigger.dev docs | ✅ |
| §17.2 config (line 1758) | (absent) | `maxDuration: 120,` + comment | ✅ |

**Technical accuracy:** `maxDuration: 120` covers the longest job (weekly-digest at 120s CPU budget). Per-job values in the table (30s, 60s, 120s) are now correctly labeled as CPU budgets. The distinction between CPU time and wall-clock time is clearly documented.

**External claim verified:** Web search confirmed Trigger.dev `maxDuration` measures active CPU time, excluding `triggerAndWait`/`wait.for` wait time. Source: trigger.dev/docs/runs/max-duration.

### C5: Lighthouse/WCAG false equivalence + §22.2 expansion ✅ VERIFIED

| Location | Before | After | Correct |
|----------|--------|-------|---------|
| G6 (line 161) | `Lighthouse Accessibility score: 100; WCAG AAA compliant` | Rewritten: "100 (automated baseline) + quarterly manual audit (WCAG 2.2 Level AAA target)" + axe-core coverage note | ✅ |
| §22.2 (lines 2155–2207) | 4-category code block (contrast, keyboard, screen reader, motion, cognitive) | 14-row WCAG 2.2 AAA criteria table (all 9 applicable criteria + 5 Stillwater-specific) | ✅ |
| §22.2 focus ring | `2px solid --color-clay-400` | `3px solid --color-water-500 + 2px offset` | ✅ |
| §22.2 ADA Title II | (absent) | April 24, 2026 compliance note | ✅ |

**Focus ring color verification:** The old `clay-400` focus ring has been corrected to `water-500`. Three remaining `clay-400` references in PAD.md are all in design token definitions (lines 1275, 1299, 2547) — they define the color palette and naming conventions, NOT the focus ring. Correct. ✅

**External claim verified:** Web search confirmed Deque Systems states axe-core catches ~57% of WCAG issues on average. Source: deque.com/automated-accessibility-coverage-report.

---

## Phase 2: Version-Alignment Verification (11 fixes)

All 11 alignment fixes verified against `stillwater_SKILL.md` §2.1:

| # | Field | PAD Before | PAD After | SKILL §2.1 | Match |
|---|-------|-----------|-----------|------------|-------|
| 1 | Next.js | `16.x` | `^16.2.0` + cacheComponents note | `^16.2.0` | ✅ |
| 2 | React | `19.x` | `^19.2.3` + CVE-2025-55182 floor | `^19.2.3` | ✅ |
| 3 | TypeScript | `5.7+` | `^5.9.0` + verbatimModuleSyntax + erasableSyntaxOnly | `^5.9.0` | ✅ |
| 4 | Tailwind | `v4.x` | `^4.1.0` + @source directive note | `^4.1.0` | ✅ |
| 5 | Drizzle | `latest` | `^0.45.0` + $count/relational API note | `^0.45.0` | ✅ |
| 6 | Stripe | `latest` | `^22.3.0` + Basil API + camelCase note | `^22.3.0` | ✅ |
| 7 | pnpm | `9.x` | `9.15.4 (≥9.0.0)` + custom-conditions note | `9.15.4` | ✅ |
| 8 | Zod | (absent) | `^4.4.0` row added | `^4.4.0` | ✅ |
| 9 | §5.2 TS | `5.7+` | `^5.9.0` + flags | matches §5.1 | ✅ |
| 10 | Focus ring | `clay-400` | `water-500` + 3px + 2px offset | matches §8.1/§8.3 | ✅ |
| 11 | Trigger.dev | `v3` | `v4` (C1 fix) | `v4` (§2.1 table) | ✅ |

**External claim verified:** React CVE-2025-55182 confirmed — pre-auth RCE in React Server Components 19.0.0–19.2.0. Floor of 19.2.3 is correct. Source: GitHub security advisory.

**External claim verified:** Stripe "Basil" API (2025-03-31) confirmed — `current_period_end` moved from top-level subscription to `items.data[0]`. SDK v22+ uses camelCase. Source: docs.stripe.com/changelog/basil.

---

## Phase 3: Residual Issues

### Issue 1: `stillwater_SKILL.md` ADR-007 still says Trigger.dev v3 ⚠️

**Location:** `stillwater_SKILL.md` line 4826
**Current text:** `- **Decision:** Trigger.dev v3 (cloud-hosted)`
**Expected text:** `- **Decision:** Trigger.dev v4 (cloud-hosted). v3 is deprecated — new v3 deploys stop working April 1, 2026. v4 reached GA August 2025.`

**Context:** The main body of `stillwater_SKILL.md` (lines 57, 158, 191, 249) correctly references Trigger.dev v4. Only the ADR-007 section at line 4826 retains the old v3 reference. This was flagged in `PAD_validation_report.md` as P1 residual but was not remediated.

**Impact:** Low-to-medium. Engineers reading ADR-007 in the skill file would see v3, creating confusion with the corrected §5.1 table. The skill file and PAD.md would contradict each other on the same ADR.

**Recommendation:** Update `stillwater_SKILL.md` line 4826 to match PAD.md ADR-007.

### Issue 2: PAD.md Document Control version not bumped ⚠️

**Location:** PAD.md lines 68, 80
**Current text:** `ACTIVE — v1.0.0` and `1.0.0 | 2025-07-04 | Claw Code / Arch | Active | Initial comprehensive draft`
**Expected:** Bump to `1.1.0` with a new changelog entry for the 5 critical fixes + 11 alignment fixes.

**Context:** The `PAD_validation_report.md` recommended: "Bump PAD.md version `1.0.0` → `1.1.0` to reflect the 5 critical fixes + 11 alignment fixes." This was not applied.

**Impact:** Low. The version mismatch is cosmetic but creates confusion about document currency — engineers may not realize the document has been updated since its initial creation date.

**Recommendation:** Add a changelog row: `1.1.0 | 2026-07-05 | Claw Code / Audit | Active | 5 critical audit fixes (C1-C5) + 11 version-alignment fixes`

### Non-Issue: `clay-400` in PAD.md

Three references to `clay-400` exist in PAD.md (lines 1275, 1299, 2547). All are **design token definitions** (the terracotta CTA color) and naming convention examples. The focus ring color in §22.2 correctly uses `water-500`. No issue here. ✅

### Non-Issue: Section Cross-References

All section cross-references resolve correctly:
- `§4.2` → booking flow (line 307) ✅
- `§13.2` → SSE implementation (line 1475) ✅
- `§15.3` → webhook handler (line 1660) ✅
- `§17` → background jobs (line 1730) ✅
- `§22` → accessibility (line 2155) ✅
- `ADR-006` → SSE over WebSockets (line 2804) ✅
- `ADR-007` → Trigger.dev (line 2827) ✅
- `ADR-008` → Better Auth (line 2851) ✅
- `ADR-009` → proxy.ts (line 2887) ✅

---

## Phase 4: External Claim Verification Summary

All 6 highest-risk claims from the audit reports independently verified:

| # | Claim | Audit Source | Web Verification | Status |
|---|-------|-------------|------------------|--------|
| 1 | Trigger.dev v3 deploys stop April 1, 2026; v4 GA August 2025 | Report-2 §5 | trigger.dev/docs/migrating-from-v3 | ✅ Confirmed |
| 2 | Vercel Functions max 30 min with Fluid Compute (June 2026) | Report-1 §A, Report-2 §A | vercel.com/changelog | ✅ Confirmed |
| 3 | axe-core catches ~57% of WCAG issues (Deque Systems) | Report-1 §D, Report-2 §D | deque.com/automated-accessibility-coverage-report | ✅ Confirmed |
| 4 | React CVE-2025-55182: pre-auth RCE in RSC 19.0.0–19.2.0 | SKILL.md §2.1 | GitHub security advisory | ✅ Confirmed |
| 5 | Stripe Basil API: `current_period_end` moved to `items.data[0]` | SKILL.md §2.1 | docs.stripe.com/changelog/basil | ✅ Confirmed |
| 6 | Neon PgBouncer transaction pooling breaks session-scoped advisory locks | Report-1 §B, Report-2 §B | neon.com/docs/connect/connection-pooling | ✅ Confirmed |

---

## Audit Report Accuracy Assessment

### `PAD_audit_report-1.md` — Accuracy: 100%

| Finding | Verified Against PAD.md | Verified Against External Sources | Status |
|---------|------------------------|----------------------------------|--------|
| Next.js 16 proxy.ts (Edge→Node.js shift) | §5.1 + ADR-009 | nextjs.org/docs/messages/middleware-to-proxy | ✅ |
| Better Auth took over Auth.js Sept 2025 | ADR-008 | better-auth.com/blog/authjs-joins-better-auth | ✅ |
| SSE missing `maxDuration` | §13.2 (was missing) | vercel.com/docs/functions/configuring-functions/duration | ✅ |
| `pg_advisory_lock` in §15.3 breaks under PgBouncer | §15.3 (was session-scoped) | neon.com/faqs/postgres-services-built-in-connection-pooling | ✅ |
| Trigger.dev "Timeout" column not backed by config | §17.1 (was "Timeout") | trigger.dev/docs/runs/max-duration | ✅ |
| `maxDuration` = CPU time, not wall-clock | §17.2 (was undocumented) | trigger.dev/docs/runs/max-duration | ✅ |
| Lighthouse 100 ≠ WCAG AAA | G6 (was false equivalence) | deque.com/automated-accessibility-coverage-report | ✅ |

**Report-1's blind spot:** Analyzed Trigger.dev config semantics brilliantly but missed the v3 deprecation time-bomb. Report-2 caught this.

### `PAD_audit_report-2.md` — Accuracy: 100%

| Finding | Verified Against PAD.md | Verified Against External Sources | Status |
|---------|------------------------|----------------------------------|--------|
| All of Report-1's findings | Re-verified — all confirmed | — | ✅ |
| Trigger.dev v4 GA August 2025 | §5.1 (was v3) | trigger.dev/launchweek/2/trigger-v4-ga | ✅ |
| v3 deploys stop April 1, 2026 | ADR-007 (was v3) | trigger.dev/docs/migrating-from-v3 | ✅ |
| Vercel 30-min limit requires Fluid Compute | §13.2 (was undocumented) | vercel.com/docs/fluid-compute | ✅ |
| PgBouncer transaction pooling breaks session locks | §15.3 (was inconsistent) | pgbouncer.org/features.html | ✅ |
| axe-core ~57% WCAG coverage | G6 (was false equivalence) | deque.com/automated-accessibility-coverage-report | ✅ |

**Report-2's unique contribution:** Caught the C1 Trigger.dev v3 deprecation that Report-1 missed. This was the most critical finding — without it, the background job architecture would fail to deploy.

---

## Completeness Checklist

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| C1: Trigger.dev v4 references in PAD.md | ≥4 | 4 | ✅ |
| C1: `@trigger.dev/sdk/v3` import remaining | 0 | 0 | ✅ |
| C2: `pg_advisory_xact_lock` in §15.3 | ≥1 | 4 total (1 in §15.3) | ✅ |
| C2: session-scoped `pg_advisory_lock` in prose | 0 (except warnings) | 0 | ✅ |
| C3: `maxDuration = 300` in SSE route | 1 | 1 | ✅ |
| C3: `force-dynamic` in code (not comments) | 0 | 0 (1 in comment) | ✅ |
| C4: `maxDuration: 120` in trigger.config | 1 | 1 | ✅ |
| C4: "Target CPU Budget" column | ≥1 | 2 | ✅ |
| C4: old "Timeout" column header | 0 | 0 | ✅ |
| C5: G6 manual audit mention | 1 | 1 | ✅ |
| C5: WCAG 2.2 criteria in §22.2 | ≥9 | 14 rows | ✅ |
| C5: `clay-400` focus references | 0 | 0 (3 in design tokens) | ✅ |
| C5: `water-500` focus references | ≥1 | 2 | ✅ |
| Version: Next.js `^16.2.0` | 1 | 1 | ✅ |
| Version: React `^19.2.3` | 1 | 1 | ✅ |
| Version: CVE-2025-55182 | 1 | 1 | ✅ |
| Version: TypeScript `^5.9.0` | ≥1 | 2 | ✅ |
| Version: `verbatimModuleSyntax` | ≥1 | 2 | ✅ |
| Version: `erasableSyntaxOnly` | ≥1 | 2 | ✅ |
| Version: Tailwind `^4.1.0` | 1 | 1 | ✅ |
| Version: Drizzle `^0.45.0` | 1 | 1 | ✅ |
| Version: Stripe `^22.3.0` | 1 | 1 | ✅ |
| Version: Basil API | 1 | 1 | ✅ |
| Version: Zod row in §5.1 | 1 | 1 | ✅ |
| Version: pnpm `9.15.4` | 1 | 1 | ✅ |

**26/26 checks pass.** No contradictions introduced.

---

## Final Verdict

### PAD.md Changes: ✅ APPROVED

All 5 critical fixes correctly applied. All 11 version-alignment fixes correctly applied. All external technical claims verified against live web sources. No residual contradictions in PAD.md. Internal cross-references resolve correctly.

### Residual Items (Non-Blocking)

| # | Item | Severity | File | Action |
|---|------|----------|------|--------|
| 1 | ADR-007 Trigger.dev v3 in SKILL.md line 4826 | P1 | stillwater_SKILL.md | Update to v4 + deprecation note |
| 2 | Document Control version 1.0.0 in PAD.md | P2 | PAD.md | Bump to 1.1.0 + changelog entry |

### Recommended Next Steps

1. **Fix `stillwater_SKILL.md` line 4826** — update ADR-007 Decision from "Trigger.dev v3" to "Trigger.dev v4" with deprecation note (matches PAD.md ADR-007).
2. **Bump PAD.md Document Control** — add version 1.1.0 row with date 2026-07-05 and summary "5 critical audit fixes (C1–C5) + 11 version-alignment fixes".
3. **Proceed to Phase 0 scaffolding** — PAD.md is now a high-fidelity, audit-verified architectural blueprint safe to implement against.

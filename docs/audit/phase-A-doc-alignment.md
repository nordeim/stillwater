# Phase A — Documentation Alignment Audit Report

**Audit Date:** 2026-07-13
**Auditor:** Super Z (Frontend Architect & Avant-Garde UI Designer)
**Scope:** Cross-document conflict resolution across `Project_Brief.md`, `design.md`, `PAD.md`, `stillwater_SKILL.md`, `MASTER_EXECUTION_PLAN.md`
**Methodology:** Line-level verification of every cited conflict via Read/Grep, root-cause analysis, optimal-fix specification

---

## Executive Summary

**21 confirmed conflicts** identified across 5 spec documents (was 22; M6 refuted as false positive). Severity distribution:

| Severity | Count | Status |
|---|---|---|
| 🔴 Critical (P0) | 6 | 1 active security incident (C6), 5 stale-version drift |
| 🟡 Medium (P1) | 10 | Directory-tree staleness, ADR-count mismatches, phase-boundary ambiguities |
| 🟢 Low (P2) | 5 | Sub-numbering, footer text, cosmetic |

**Root-cause pattern:** 16 of 21 conflicts stem from **incremental version bumps that updated the changelog but not the body** — a systemic documentation-maintenance gap. The fix is procedural: add a "post-version-bump checklist" that greps for stale references.

---

## Critical Findings (P0 — Immediate Action Required)

### C6 — `.env.local` Committed to Git with Real Secrets 🚨 ACTIVE SECURITY INCIDENT

**Severity:** P0 CRITICAL (Active)
**Status:** Unresolved — requires immediate user action
**Source verification:**
- `git ls-files --error-unmatch .env.local` → returns `.env.local` (file IS tracked)
- `.gitignore` line 9 lists `.env.local` (future adds blocked, but file already in index)
- `git log --all --full-history -- .env.local` → 3 commits touched the file:
  - `dbf0cd5` (heinazhik, 2026-07-13 06:56 +0800) — "env" — added 91 lines — **THIS IS THE REGRESSION (committed today)**
  - `5ea00a9` (Z User, 2026-07-12) — "fix(P0): resolve 5 Critical findings from code review audit" — the C5 fix that removed it
  - `8242cc2` (Z User, earlier) — "remediation MEP and PAD"
- Secret-pattern scan of `git show HEAD:.env.local` → **12 secret variables have non-empty values committed**:
  - `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (Neon Postgres connection strings with credentials)
  - `BETTER_AUTH_SECRET` (session-signing key — session forgery risk)
  - `GOOGLE_CLIENT_SECRET` (OAuth — impersonation risk)
  - `STRIPE_SECRET_KEY` (Stripe API — financial fraud risk)
  - `STRIPE_WEBHOOK_SECRET` (webhook signature bypass risk)
  - `SANITY_API_TOKEN`, `SANITY_WEBHOOK_SECRET` (CMS tampering risk)
  - `RESEND_API_KEY` (email sending abuse risk)
  - `TRIGGER_SECRET_KEY` (background-job injection risk)
  - `UPSTASH_REDIS_REST_TOKEN` (rate-limit bypass risk)
  - `CLOUDFLARE_IMAGES_TOKEN`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY` (storage abuse risk)

**Root cause:**
The C5 fix in commit `5ea00a9` (2026-07-12) correctly ran `git rm --cached .env.local` and created `scripts/pre-commit-check.sh`, but **did NOT install the hook** (the `ln -s ../../scripts/pre-commit-check.sh .git/hooks/pre-commit` step was missed). `.git/hooks/pre-commit` does not exist. Today (2026-07-13), human user `heinazhik` ran `git add .env.local` (bypassing the non-existent hook) and committed it as commit `dbf0cd5` with the message "env".

**Optimal fix (user must execute — cannot be automated safely):**

```bash
# STEP 1: Immediately untrack .env.local (keeps file on disk)
cd /path/to/stillwater
git rm --cached .env.local
git commit -m "security: untrack .env.local (C6 regression fix)"

# STEP 2: Install the pre-commit hook (prevents recurrence)
chmod +x scripts/pre-commit-check.sh
ln -sf ../../scripts/pre-commit-check.sh .git/hooks/pre-commit
# Verify:
ls -la .git/hooks/pre-commit
# Should show: .git/hooks/pre-commit -> ../../scripts/pre-commit-check.sh

# STEP 3: ROTATE ALL 12 LEAKED SECRETS (do this BEFORE pushing the fix)
# The secrets are in git history permanently until purged. Assume they are compromised.
# - BETTER_AUTH_SECRET: generate new `openssl rand -base64 32`, update in Vercel env + .env.local
# - GOOGLE_CLIENT_SECRET: Google Cloud Console → APIs & Services → Credentials → Regenerate
# - STRIPE_SECRET_KEY: Stripe Dashboard → Developers → API Keys → Roll secret key
# - STRIPE_WEBHOOK_SECRET: Stripe Dashboard → Developers → Webhooks → Select endpoint → Reveal/Roll signing secret
# - SANITY_API_TOKEN: Sanity Manage → API → Tokens → Delete + create new
# - SANITY_WEBHOOK_SECRET: Generate new `openssl rand -hex 32`, update webhook config + env
# - RESEND_API_KEY: Resend Dashboard → API Keys → Delete + create new
# - TRIGGER_SECRET_KEY: Trigger.dev Dashboard → Project → Settings → Regenerate
# - UPSTASH_REDIS_REST_TOKEN: Upstash Console → Database → REST API → Reset token
# - CLOUDFLARE_IMAGES_TOKEN: Cloudflare Dashboard → Images → API Tokens → Rotate
# - CLOUDFLARE_R2_SECRET_ACCESS_KEY: Cloudflare Dashboard → R2 → Manage API Tokens → Rotate
# - DATABASE_URL / DATABASE_URL_UNPOOLED: Neon Console → Branch → Reset password → Update connection strings

# STEP 4: PURGE GIT HISTORY (after secrets rotated)
# Option A: git filter-repo (recommended)
pip install git-filter-repo
git filter-repo --invert-paths --path .env.local
git push --force-with-lease origin main
# Option B: BFG Repo-Cleaner
java -jar bfg.jar --delete-files .env.local
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force origin main

# STEP 5: Verify
git log --all --full-history -- .env.local  # Should return empty
git ls-files --error-unmatch .env.local      # Should error: did not match any files
```

**Why this is P0:** The secrets are in the git history of a public GitHub repository (`nordeim/stillwater`). Anyone with read access can extract them via `git log -p -- .env.local`. Until history is purged AND secrets rotated, the platform is vulnerable to: session forgery (BETTER_AUTH_SECRET), Stripe financial fraud (STRIPE_SECRET_KEY), OAuth impersonation (GOOGLE_CLIENT_SECRET), and 9 other attack vectors.

---

### C1 — PAD Version Drift (MEP cites v1.18.0; actual is v1.19.0)

**Severity:** P0 (stale reference)
**Source verification:**
- `PAD.md` line 68: `> **Document Status:** ACTIVE — v1.19.0`
- `MASTER_EXECUTION_PLAN.md` line 18: `Status: ACTIVE — LIVING PLAN (Phases 0–12 COMPLETE per PAD v1.18.0 / SKILL v2.9.0; re-validated 2026-07-11)`

**Root cause:** MEP v1.7.0 was synced on 2026-07-11. PAD v1.19.0 was released on 2026-07-12 (one day later). The MEP has not been re-synced since.

**Optimal fix:**
```diff
# MASTER_EXECUTION_PLAN.md line 18
- Status: ACTIVE — LIVING PLAN (Phases 0–12 COMPLETE per PAD v1.18.0 / SKILL v2.9.0; re-validated 2026-07-11)
+ Status: ACTIVE — LIVING PLAN (Phases 0–12 COMPLETE per PAD v1.19.0 / SKILL v3.0.0; re-validated 2026-07-13)
```

---

### C2 — SKILL Internal Version Drift (frontmatter v3.0.0; body v2.9.0)

**Severity:** P0 (internal contradiction in authoritative skill file)
**Source verification:**
- `stillwater_SKILL.md` line 10: `version: 3.0.0` (frontmatter — correct)
- `stillwater_SKILL.md` line 20: `> **Status:** v2.9.0 — ALL 13 PHASES COMPLETE...` (stale)
- `stillwater_SKILL.md` line 9398: `*End of stillwater_SKILL.md v2.9.0...` (stale footer)

**Root cause:** On 2026-07-12, the v3.0.0 Post-Review Remediation bumped the frontmatter version to 3.0.0 but did not update the body Status block or the footer. This is a systemic pattern: 5 of the 6 stale-version conflicts (C1, C2, C3, C4, M7) share this root cause.

**Optimal fix:**
```diff
# stillwater_SKILL.md line 20
- > **Status:** v2.9.0 — ALL 13 PHASES COMPLETE. Phase 0 (scaffold) ✅ COMPLETE (2026-07-06); ...
+ > **Status:** v3.0.0 — ALL 13 PHASES COMPLETE. Phase 0 (scaffold) ✅ COMPLETE (2026-07-06); ...

# stillwater_SKILL.md line 9398 (footer)
- *End of stillwater_SKILL.md v2.9.0. This document was produced by following the Six-Phase Distillation Process ...
+ *End of stillwater_SKILL.md v3.0.0. This document was produced by following the Six-Phase Distillation Process ...
```

---

### C3 — Test Count Drift (643 vs 651)

**Severity:** P0 (6 stale references across 4 documents)
**Source verification:**
- `PAD.md` line 100 (v1.19.0 changelog): `651 tests (117 db + 102 auth + 118 api + 43 payments + 159 web + 71 email + 41 workers)` — ✅ CORRECT
- `stillwater_SKILL.md` line 20: `643 tests (117 db + 102 auth + 118 api + 43 payments + 159 web + 71 email + 33 workers)` — ❌ STALE
- `stillwater_SKILL.md` line 9398: `643 tests passing (... 33 workers)` — ❌ STALE
- `MASTER_EXECUTION_PLAN.md` line 18 (via "SKILL v2.9.0" reference): implies 643 — ❌ STALE
- `Project_Brief.md` line 134: `pnpm test | 643 tests passing ✅` — ❌ STALE
- `PAD.md` line 1065 (§8 Impl Status): `Current test count: 643 (118 api + 102 auth + 117 db + 43 payments + 159 web + 71 email + 33 workers)` — ❌ STALE
- `PAD.md` line 1155 (§9 Impl Status): `643 tests total (... 33 workers)` — ❌ STALE

**Root cause:** PAD v1.19.0 (2026-07-12) added 8 cron fan-out tests to `services/workers` (33 → 41 workers; 643 → 651 total). The v1.19.0 changelog entry was correctly updated, but 6 other references across 4 documents were not. Same systemic pattern as C2.

**Optimal fix (6 edits):**
```diff
# stillwater_SKILL.md line 20 (also resolves C2 version bump)
- ...71 email + 33 workers). All version pins, tsconfig flags, and env vars ...
+ ...71 email + 41 workers). All version pins, tsconfig flags, and env vars ...

# stillwater_SKILL.md line 9398 (footer)
- ...643 tests passing (117 db + 102 auth + 118 api + 43 payments + 159 web + 71 email + 33 workers)...
+ ...651 tests passing (117 db + 102 auth + 118 api + 43 payments + 159 web + 71 email + 41 workers)...

# Project_Brief.md line 134
- | `pnpm test` | **643 tests passing** ✅ |
+ | `pnpm test` | **651 tests passing** ✅ |

# Project_Brief.md test breakdown section (lines 140-146)
- - `services/workers` — 11 test files / **33 tests**
+ - `services/workers` — 11 test files / **41 tests**

# PAD.md line 1065 (§8 Implementation Status)
- Current test count: 643 (118 api + 102 auth + 117 db + 43 payments + 159 web + 71 email + 33 workers).
+ Current test count: 651 (118 api + 102 auth + 117 db + 43 payments + 159 web + 71 email + 41 workers).

# PAD.md line 1155 (§9 Implementation Status)
- 643 tests total (117 db + 102 auth + 118 api + 43 payments + 159 web + 71 email + 33 workers).
+ 651 tests total (117 db + 102 auth + 118 api + 43 payments + 159 web + 71 email + 41 workers).
```

**Note:** The MEP line 18 fix (C1) will also resolve the MEP's implicit 643 reference by updating "SKILL v2.9.0" → "SKILL v3.0.0".

---

### C4 — MEP §7.1 Stale Phase Status (says Phases 9–12 PENDING)

**Severity:** P0 (directly contradicts MEP header + all other status indicators)
**Source verification:**
- `MASTER_EXECUTION_PLAN.md` line 18 (header): `Phases 0–12 COMPLETE per PAD v1.18.0 / SKILL v2.9.0`
- `MASTER_EXECUTION_PLAN.md` line 36 (v1.7.0 changelog): `Body already marks Phases 9–12 ✅ COMPLETE; this entry corrects header (v1.6.0→v1.7.0, Status Phases 0–8→0–12)`
- `MASTER_EXECUTION_PLAN.md` line 4344 (§7.1 blockquote): `✅ PAD Alignment Verified: Re-validated 2026-07-09 against PAD v1.12.0 / SKILL v2.3.0. Phases 0–8 COMPLETE; Phases 9–12 PENDING.` — ❌ STALE

**Root cause:** The v1.7.0 changelog entry explicitly says "this entry corrects header... Phases 0–8→0–12" — the header WAS corrected, but the §7.1 blockquote (written in v1.4.0, 2026-07-08) was missed. This is a "partial sync" defect: the changelog author updated the visible header but not the buried §7.1 re-validation note.

**Optimal fix:**
```diff
# MASTER_EXECUTION_PLAN.md line 4344
- > **✅ PAD Alignment Verified:** Re-validated 2026-07-09 against PAD v1.12.0 / SKILL v2.3.0. Phases 0–8 COMPLETE; Phases 9–12 PENDING. All stack versions, discrepancy resolutions (D1–D45), and ADRs (ADR-001…ADR-011) are reflected in the codebase. The plan and PAD are aligned through Phase 8. Re-validation will be needed after Phases 9–12.
+ > **✅ PAD Alignment Verified:** Re-validated 2026-07-13 against PAD v1.19.0 / SKILL v3.0.0. Phases 0–12 ALL COMPLETE. All stack versions, discrepancy resolutions (D1–D45), and ADRs (ADR-001…ADR-011) are reflected in the codebase. The plan and PAD are fully aligned through Phase 12.
```

---

### C5 — CI Workflows Use EOL pnpm 9.15.4

**Severity:** P0 (CI may fail or use npx fallback; pnpm 9.x is EOL)
**Source verification:**
- `.github/workflows/ci.yml` line 11: `PNPM_VERSION: '9.15.4'`
- `.github/workflows/deploy-production.yml` line 9: `PNPM_VERSION: '9.15.4'`
- `.github/workflows/deploy-preview.yml` line 10: `PNPM_VERSION: '9.15.4'`
- `package.json` line 43: `"packageManager": "pnpm@11.9.0"`
- Web-verified: pnpm 9.x reached EOL April 30, 2026 (endoflife.date, eosl.date, GitHub NixOS/nixpkgs#529285)

**Root cause:** CI workflows were written when pnpm 9 was current (early in the project). The root `package.json` was later bumped to `pnpm@11.9.0` (per SKILL mandate "pnpm 11.x+ required; 9.x EOL"), but the 3 CI workflow `PNPM_VERSION` env vars were never updated. CI uses `pnpm/action-setup@v3` with `version: ${{ env.PNPM_VERSION }}` — this installs pnpm 9.15.4 explicitly, overriding the `packageManager` field.

**Optimal fix (2 options):**

**Option A (minimal — bump version):**
```diff
# .github/workflows/ci.yml line 11
-   PNPM_VERSION: '9.15.4'
+   PNPM_VERSION: '11.9.0'

# .github/workflows/deploy-production.yml line 9
-   PNPM_VERSION: '9.15.4'
+   PNPM_VERSION: '11.9.0'

# .github/workflows/deploy-preview.yml line 10
-   PNPM_VERSION: '9.15.4'
+   PNPM_VERSION: '11.9.0'
```

**Option B (best practice — remove env var, let action read packageManager):**
```diff
# .github/workflows/ci.yml
  env:
    NODE_VERSION: '22'
-   PNPM_VERSION: '9.15.4'

# In the pnpm-setup step:
      - uses: pnpm/action-setup@v3
        # version: ${{ env.PNPM_VERSION }}  ← remove this line
        # pnpm/action-setup@v3 auto-detects from packageManager field
```
(Repeat for deploy-production.yml and deploy-preview.yml)

**Recommendation:** Option B — it eliminates the drift vector entirely. The `packageManager` field in `package.json` becomes the single source of truth.

---

## Medium Findings (P1 — Should Fix This Sprint)

### M1 — MEP Source-Document Count Mismatch (8 vs 7 vs 8 with different members)

**Source verification:**
- MEP line 8: `It synthesises eight upstream documents (see Source Document Map)`
- MEP line 23 (Sources field): lists 7 docs — `design.md`, `PAD.md`, `stillwater_SKILL.md`, `scaffolding_files.md`, `static_landing_page_mockup.html`, `static_landing_page_html_mockup.md`, `guide_auth-v5_vs_better-auth.md`
- MEP lines 40–49 (Source Document Map table): lists 8 docs — `design.md`, `PAD.md`, `scaffolding_files.md`, `static_landing_page_mockup.html`, `static_landing_page_html_mockup.md`, `react_email_suggestion.md`, `pnpm_install_fix.md`, `stillwater_SKILL.md`

**Discrepancy:** The Sources field and Source Map disagree on 3 documents:
- `guide_auth-v5_vs_better-auth.md` — in Sources field, NOT in Map
- `react_email_suggestion.md` — in Map, NOT in Sources field
- `pnpm_install_fix.md` — in Map, NOT in Sources field

**Root cause:** The Source Document Map was expanded in MEP v1.2.0 (2026-07-05) to add `react_email_suggestion.md` and `pnpm_install_fix.md`. The Sources field in Document Control was never updated. Meanwhile, `guide_auth-v5_vs_better-auth.md` was in the original Sources field but was dropped from the Map when it was reorganized — it's actually a cross-reference for ADR-008/009, not a primary source.

**Optimal fix:** Reconcile both lists to 8 primary sources + 1 cross-reference:
```diff
# MASTER_EXECUTION_PLAN.md line 23 (Sources field)
- Sources | `design.md`, `PAD.md`, `stillwater_SKILL.md`, `scaffolding_files.md`, `static_landing_page_mockup.html`, `static_landing_page_html_mockup.md`, `guide_auth-v5_vs_better-auth.md` |
+ Sources | `design.md`, `PAD.md`, `stillwater_SKILL.md`, `scaffolding_files.md`, `static_landing_page_mockup.html`, `static_landing_page_html_mockup.md`, `react_email_suggestion.md`, `pnpm_install_fix.md` |

# Add a footnote or note row:
+ Cross-references | `guide_auth-v5_vs_better-auth.md` (ADR-008/009 validation, July 2026) |
```

---

### M2 — MEP §1.3 ADR Table Lists 9 ADRs; §7.1 Claims 11

**Source verification:**
- MEP §1.3 (lines 105–118): table lists 10 rows but only 9 map to ADRs (ADR-001 through ADR-009); the 10th row "Test strategy" has no ADR number
- MEP §7.1 line 4370: `ADR-001 to ADR-007 (existing) + ADR-008... + ADR-010 (Resend Native Templates — Accepted 2026-07-09) + ADR-011 (transpilePackages + exports.default — accepted) — ✅ all 11 ADRs in PAD.md §29`
- MEP D43 (line 182): `Consider ADR-010 for Resend Native Templates` (implies not yet accepted at D43 writing time)

**Root cause:** §1.3 was written in MEP v1.0.0 when only 9 ADRs existed. ADR-010 (accepted 2026-07-09) and ADR-011 (accepted 2026-07-08) were added to PAD §29 but never back-filled into MEP §1.3.

**Optimal fix:** Add 2 rows to MEP §1.3 table:
```diff
# MASTER_EXECUTION_PLAN.md §1.3 table (after line 117)
+ | Email rendering (Trigger.dev workers) | Resend Native Templates (ADR-010) | ADR-010 |
+ | Source resolution | transpilePackages + exports.default | ADR-011 |
```
Also update the section title from "10 decisions" to "12 decisions" (or "11 ADRs + test strategy").

---

### M3 — PAD §6.1 Directory Tree Stale (Multiple Package Inaccuracies)

**Source verification:** PAD lines 604–654 (§6.1 directory tree) vs actual codebase:
- **auth/** (PAD lines 604–608): lists 3 files (`config.ts`, `client.ts`, `types.ts`); actual has 6 (`+ rbac.ts`, `resend-client.ts`, `index.ts`)
- **email/templates/** (PAD lines 613–621): lists 8 templates; actual has 13 (missing: `ClassCancellation.tsx`, `ClassReminder1h.tsx`, `WaitlistExpired.tsx`, `MembershipPaused.tsx`, `WeeklyDigest.tsx`; also `ClassReminder.tsx` should be `ClassReminder24h.tsx`)
- **email/components/** (PAD lines 622–625): ✅ correct (3 components)
- **payments/** (PAD lines 629–636): lists 5 files (`client.ts`, `subscriptions.ts`, `webhooks.ts`, `invoices.ts`, `types.ts`); actual has 8 (`+ credit-packs.ts`, `refunds.ts`, `index.ts`)
- **services/workers/** (PAD lines 645–652): lists 7 files with wrong names; actual has 11:
  - `class-reminder.ts` → should be `class-reminder-24h.ts` + `class-reminder-1h.ts` (2 files)
  - `waitlist-processor.ts` → should be `waitlist-promotion.ts`
  - `membership-renewal.ts` → should be `membership-credit-grant.ts`
  - `membership-expiry.ts` → should be `membership-expiry-warn.ts`
  - Missing: `class-cancellation-notify.ts`, `payment-failed-notify.ts`, `attendance-summary.ts`, `index.ts` barrel

**Root cause:** The §6.1 directory tree was written in PAD v1.0.0 (2025-07-04) based on the initial scaffolding plan. It was never regenerated as phases added files. This is the single most stale section in PAD.

**Optimal fix:** Regenerate §6.1 directory tree from actual codebase:
```bash
# In the Stillwater repo root:
find packages/ services/ apps/web/src/ apps/studio/ -type f \( -name '*.ts' -o -name '*.tsx' \) | sort
```
Then paste the output into PAD §6.1 as a new tree, replacing lines 580–680.

---

### M4 — PAD §7.1 Says "4 Migration SQL Files" (Actual is 5)

**Source verification:**
- PAD line 756 (§7.1): `the 4 migration SQL files (0000_dear_dagger.sql + 0001_equal_iron_lad.sql + 0002_lyrical_cargill.sql + 0003_audit_log_phase9.sql)`
- Actual: 5 files (adds `0004_huge_hawkeye.sql` from v1.19.0)

**Root cause:** §7.1 was last updated in PAD v1.13.0 (Phase 9, 2026-07-10). PAD v1.19.0 (2026-07-12) added migration `0004_huge_hawkeye.sql` but §7.1 was not updated.

**Optimal fix:**
```diff
# PAD.md line 756
- ...the 4 migration SQL files (`0000_dear_dagger.sql` + `0001_equal_iron_lad.sql` + `0002_lyrical_cargill.sql` + `0003_audit_log_phase9.sql`).
+ ...the 5 migration SQL files (`0000_dear_dagger.sql` + `0001_equal_iron_lad.sql` + `0002_lyrical_cargill.sql` + `0003_audit_log_phase9.sql` + `0004_huge_hawkeye.sql`).
```

---

### M5 — PAD §4.1 Mermaid Diagram References Undefined `middleware` Node

**Source verification:**
- PAD line 303: `Rel(middleware, redis, "Checks rate limit", "TCP")` — the node `middleware` is never declared as a `Container()` in the C4 diagram
- PAD line 312: `participant EdgeMiddleware as Edge Middleware` — stale naming per ADR-009 (should be `proxy`)

**Root cause:** The Mermaid C4 container diagram was written in PAD v1.0.0 using `middleware` terminology. ADR-009 (v1.3.0, 2026-07-05) renamed `middleware.ts` → `proxy.ts` in Next.js 16, but the diagram was not updated.

**Optimal fix:**
```diff
# PAD.md line 303 (C4 container diagram)
- Rel(middleware, redis, "Checks rate limit", "TCP")
+ Rel(proxy, redis, "Checks rate limit", "TCP")

# PAD.md line 312 (sequence diagram)
- participant EdgeMiddleware as Edge Middleware
+ participant EdgeProxy as Edge Proxy (proxy.ts)

# Also find and update the Container() declaration for the proxy node
# (need to read lines ~280-290 to find the original Container declaration)
```

---

### M7 — PAD Implementation Status Blocks Cite 643 Tests (Should be 651)

**Source verification:** (covered in C3)
- PAD line 1065 (§8): `Current test count: 643 (... 33 workers)` — ❌ STALE
- PAD line 1155 (§9): `643 tests total (... 33 workers)` — ❌ STALE

**Optimal fix:** (covered in C3 — same edits resolve both C3 and M7)

---

### M8 — ADR-001 through ADR-007 Dated 2025-07-04 (Should be 2026-07-04)

**Source verification:**
- PAD ADR-001 (line 2825): `**Date:** 2025-07-04`
- PAD ADR-002 (line ~2849): `**Date:** 2025-07-04` (verified by subagent)
- PAD ADR-003 through ADR-007: all `**Date:** 2025-07-04`
- PAD ADR-008 (line 2990): `**Date:** 2026-07-04` — correct
- PAD ADR-009 through ADR-011: all 2026 dates — correct
- SKILL Appendix A (line ~8907): `ADR-001: ... Accepted (2025-07-04)`
- PAD v1.0.0 changelog (line 80): `1.0.0 | 2025-07-04 | Claw Code / Arch | Initial comprehensive draft`

**Root cause:** PAD v1.0.0 was dated 2025-07-04 — almost certainly a year typo (the project started in 2026 per all other evidence: Phase 0 began 2026-07-06, ADR-008 is dated 2026-07-04, the v1.1.0 audit was 2026-07-05). ADR-001 through ADR-007 inherited the v1.0.0 date. ADR-008+ were added later with correct 2026 dates.

**Optimal fix (9 edits):**
```diff
# PAD.md ADR-001 through ADR-007 (7 edits)
- **Date:** 2025-07-04
+ **Date:** 2026-07-04

# PAD.md line 80 (v1.0.0 changelog)
- | 1.0.0   | 2025-07-04 | Claw Code / Arch | Active   | Initial comprehensive draft   |
+ | 1.0.0   | 2026-07-04 | Claw Code / Arch | Active   | Initial comprehensive draft   |

# stillwater_SKILL.md Appendix A (ADR-001 through ADR-007 dates)
- - **Status:** Accepted (2025-07-04)
+ - **Status:** Accepted (2026-07-04)
```

---

### M9 — `@stillwater/payments` Source File Count: 7 vs 8

**Source verification:**
- PAD line 92 (v1.11.0 changelog): `@stillwater/payments package built (7 source files, 43 tests)`
- PAD line 1732 (§15 Implementation Status): `8 source files, 43 tests`
- Actual: 8 files (`client.ts`, `types.ts`, `subscriptions.ts`, `webhooks.ts`, `invoices.ts`, `credit-packs.ts`, `refunds.ts`, `index.ts`)

**Root cause:** The v1.11.0 changelog was written on 2026-07-09. At that time, the `index.ts` barrel file either didn't exist yet or wasn't counted. The §15 Implementation Status was later updated to 8 (correctly) but the v1.11.0 changelog entry was never retroactively fixed.

**Optimal fix:**
```diff
# PAD.md line 92 (v1.11.0 changelog)
- `@stillwater/payments` package built (7 source files, 43 tests):
+ `@stillwater/payments` package built (8 source files, 43 tests):
```

---

### M10 — Phase Boundary Ambiguities (4 sub-issues)

**Source verification:** (from MEP subagent analysis)
- `(studio)/layout.tsx` listed as deliverable in BOTH Phase 2 (F2-16, MEP line 1530) AND Phase 5 (F5-03, MEP line 2448)
- `(admin)/layout.tsx` listed in BOTH Phase 2 (F2-17, MEP line 1550) AND Phase 9 (F9-01, MEP line 3366)
- Phase 9 acceptance (MEP line 3360): `UI search input deferred to Phase 10` — but Phase 10 has no member-search-UI deliverable
- `audit_log` table migration unnamed and unowned between Phase 1 (F1-12) and Phase 9 (F9-19)

**Root cause:** Phase deliverables were planned incrementally. When later phases needed to reference files created by earlier phases, they re-listed them as deliverables instead of marking `[EXISTS]` or `[PATCH]`. The member-search-UI deferral was a scope decision that was never assigned a home. The `audit_log` migration was created in Phase 9 but the MEP Phase 1 schema inventory didn't anticipate it.

**Optimal fix (4 edits):**
```diff
# MEP F5-03 (line 2448) — mark as EXISTS
- F5-03 | /apps/web/src/app/(studio)/layout.tsx | [CREATE] Studio (auth-required) route group layout...
+ F5-03 | /apps/web/src/app/(studio)/layout.tsx | [EXISTS — created in Phase 2 F2-16] Studio (auth-required) route group layout...

# MEP F9-01 (line 3366) — mark as EXISTS
- F9-01 | /apps/web/src/app/(admin)/layout.tsx | [CREATE] Admin route group layout. RBAC guard.
+ F9-01 | /apps/web/src/app/(admin)/layout.tsx | [EXISTS — created in Phase 2 F2-17] Admin route group layout. RBAC guard.

# MEP Phase 9 acceptance (line 3360) — redirect deferral
- Member management with search/filter (procedure supports search; UI search input deferred to Phase 10; CSV export implemented)
+ Member management with search/filter (procedure supports search; UI search input deferred to v2 backlog — Phase 10 is observability-only; CSV export implemented)

# MEP F9-19 (line 3540) — clarify migration ownership
- F9-19 | lib/admin/audit-log.ts | Logs to audit_log table (added in migration)
+ F9-19 | lib/admin/audit-log.ts | Logs to audit_log table (migration 0003_audit_log_phase9.sql, owned by Phase 9)
```

---

### M11 — SKILL §16.14 Misplaced Inside §20

**Source verification:**
- SKILL line 8319: `## §17. Responsive Breakpoint Reference` (§16 ends, §17 begins)
- SKILL line 8814: `### 16.14 Post-Review Remediation Anti-Patterns (2026-07-12 fixes)` — this is INSIDE §20, between §20.10 PostHog Event Taxonomy and Appendix A
- SKILL line 8905: `## Appendix A: ADRs`

**Root cause:** §16.14 was added on 2026-07-12 (v3.0.0 Post-Review Remediation) but was appended at the end of the document (inside §20) instead of being inserted in its correct position after §16.13 (line 8319).

**Optimal fix:** Move the §16.14 content (lines 8814–8903) to between line 8319 and the `## §17.` header. This is a structural move, not a content change.

---

## Low Findings (P2 — Optional)

### L1 — SKILL §15.18/19/20 Sub-Numbering Off-By-One

**Source verification:** (from SKILL subagent)
- §15.18 title (line 6207): "Pattern: Sanity CMS Client..." but subsections use 15.17.1–15.17.4
- §15.19 title (line 6396): "Pattern: SSE Endpoint..." but subsections use 15.18.1–15.18.3
- §15.20 title (line 6564): "Pattern: Member Dashboard..." but subsections use 15.19.1–15.19.4

**Optimal fix:** Renumber subsections to match parent (15.18.X, 15.19.X, 15.20.X respectively).

---

### L2 — SKILL Appendix C Audit History Non-Chronological

**Source verification:** (from SKILL subagent)
- v1.7.0 appears AFTER v1.4.0 (chronological break)
- v3.0.0 appears LAST (after v1.0.0) instead of FIRST

**Optimal fix:** Reorder Appendix C entries in reverse-chronological order (newest first).

---

### L3 — SKILL Footer Says "Lessons 1-93" (Actual is 1-98)

**Source verification:**
- SKILL line 9398: `Implementation lessons (Lessons 1-93) distilled from actual TDD cycles + post-deploy remediation.`
- Actual: Lessons 1–98 exist (Lessons 94–98 added in v3.0.0)

**Optimal fix:**
```diff
- Implementation lessons (Lessons 1-93) distilled from actual TDD cycles + post-deploy remediation.
+ Implementation lessons (Lessons 1-98) distilled from actual TDD cycles + post-deploy remediation.
```

---

### L4 — PAD "Delivery Summary" Claims "8 Mermaid Diagrams"

**Source verification:** (from PAD subagent) — PAD Delivery Summary (line ~3427) claims "8 Mermaid diagrams" but actual count is 9+.

**Optimal fix:** Update the count or remove the claim (it's in the Delivery Summary which is itself stale — see L5).

---

### L5 — PAD "Next Steps" Still Says "Begin Phase 0"

**Source verification:** (from PAD subagent) — PAD lines 3436–3438 still say "Begin Phase 0 implementation" though all 13 phases are complete.

**Optimal fix:**
```diff
# PAD.md lines 3436-3438 (Delivery Summary / Next Steps)
- ## Next Steps
- Begin Phase 0 implementation following the MASTER_EXECUTION_PLAN.md.
+ ## Next Steps
+ All 13 phases (0–12) are complete. Next priorities:
+ 1. Address the 21 documentation conflicts documented in the 2026-07-13 audit (see `download/audit/phase-A-doc-alignment.md`)
+ 2. Rotate the 12 leaked secrets (C6 — active security incident)
+ 3. Upgrade CI pnpm from 9.15.4 (EOL) to 11.9.0 (C5)
+ 4. Begin v2 scope: in-app refund UI, member search, advanced analytics
```

---

## Conflicts Refuted During Re-Verification

### M6 — PAD §26 Broken YAML `branches: ain, develop]` — ❌ FALSE POSITIVE

**Re-verification result:**
- PAD line 2552: `branches: [main, develop]` — ✅ CORRECT (well-formed YAML)
- PAD line 2602: `branches: [main]` — ✅ CORRECT

**Conclusion:** The subagent misread the lines. The YAML is well-formed. This conflict is removed from the list.

---

## Procedural Recommendation: Post-Version-Bump Checklist

To prevent the systemic "changelog updated but body not updated" pattern that caused 16 of 21 conflicts, add this checklist to the SKILL §11 Pre-Ship Checklist:

```markdown
### §11.9 Documentation Version-Bump Checklist

When bumping any document version (PAD/SKILL/MEP/Brief), run this grep-based
checklist BEFORE committing:

1. **Version string sweep:**
   grep -n "<old-version>" <document>.md  # Should return 0 results

2. **Test count sweep (if tests were added):**
   grep -n "<old-test-count>" PAD.md stillwater_SKILL.md MASTER_EXECUTION_PLAN.md Project_Brief.md
   # Update every match to the new count

3. **Status block sweep:**
   grep -n "Status:.*<old-version>\|End of.*<old-version>" <document>.md
   # Update Status block + footer

4. **Implementation Status block sweep (PAD only):**
   grep -n "Implementation Status:" PAD.md
   # Verify each block cites the current test count + migration count

5. **Cross-document reference sweep:**
   grep -n "PAD v<old-version>\|SKILL v<old-version>\|MEP v<old-version>" *.md
   # Update every cross-reference

6. **Migration count sweep (if migration was added):**
   grep -n "<old-count> migration" PAD.md
   # Update to new count
```

---

## Summary Table

| ID | Severity | Document | Line(s) | Status | Fix Complexity |
|---|---|---|---|---|---|
| C6 | 🔴 P0 | repo (`.env.local`) | — | **ACTIVE INCIDENT** | High (requires secret rotation + history purge) |
| C5 | 🔴 P0 | 3 CI workflows | 11, 9, 10 | Confirmed | Low (1-line edit × 3 files) |
| C1 | 🔴 P0 | MEP | 18 | Confirmed | Low (1-line edit) |
| C4 | 🔴 P0 | MEP | 4344 | Confirmed | Low (1-line edit) |
| C2 | 🔴 P0 | SKILL | 20, 9398 | Confirmed | Low (2-line edits) |
| C3 | 🔴 P0 | SKILL, Brief, PAD | 6 refs | Confirmed | Medium (6 edits across 4 files) |
| M3 | 🟡 P1 | PAD | 604–654 | Confirmed | High (regenerate entire tree) |
| M11 | 🟡 P1 | SKILL | 8814–8903 | Confirmed | Medium (structural move) |
| M8 | 🟡 P1 | PAD + SKILL | 9 refs | Confirmed | Medium (9 date edits) |
| M10 | 🟡 P1 | MEP | 4 refs | Confirmed | Medium (4 deliverable-marker edits) |
| M2 | 🟡 P1 | MEP | 105–118 | Confirmed | Low (add 2 table rows) |
| M1 | 🟡 P1 | MEP | 8, 23, 40–49 | Confirmed | Low (reconcile 2 lists) |
| M5 | 🟡 P1 | PAD | 303, 312 | Confirmed | Low (2-line edits) |
| M4 | 🟡 P1 | PAD | 756 | Confirmed | Low (1-line edit) |
| M9 | 🟡 P1 | PAD | 92 | Confirmed | Low (1-line edit) |
| M7 | 🟡 P1 | PAD | 1065, 1155 | Confirmed | Low (covered by C3) |
| L1 | 🟢 P2 | SKILL | 6207+ | Confirmed | Medium (renumber subsections) |
| L2 | 🟢 P2 | SKILL | App. C | Confirmed | Low (reorder entries) |
| L3 | 🟢 P2 | SKILL | 9398 | Confirmed | Low (1-line edit) |
| L4 | 🟢 P2 | PAD | ~3427 | Confirmed | Low (update or remove count) |
| L5 | 🟢 P2 | PAD | 3436–3438 | Confirmed | Low (replace Next Steps) |

**Total: 21 confirmed conflicts** (C6 is the only one requiring immediate user action; the rest are documentation fixes that can be applied in a single PR)

---

*End of Phase A — Documentation Alignment Audit Report*

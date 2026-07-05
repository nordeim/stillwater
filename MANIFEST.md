# Stillwater Documentation Refresh — Archive Manifest

**Archive created:** 2026-07-05
**Archive filename:** `stillwater_docs_refresh_2026-07-05.tar.gz`
**Total files:** 9 (2 updated source files + 4 validation reports + 2 input audit reports + this manifest)
**Total size:** ~560 KB

---

## Purpose

This archive contains the updated and new documentation for the Stillwater yoga studio platform repository (`nordeim/stillwater`). Extract this archive at the repository root to refresh the following:

1. **2 updated source files** — overwrite the existing files at repo root
2. **4 validation/remediation reports** — new files, place in `docs/validation/`
3. **2 input audit reports** — for reference, place in `docs/validation/audit-inputs/`

---

## Archive Structure

```
stillwater_docs_refresh_2026-07-05/
├── MANIFEST.md                                    ← THIS FILE
├── stillwater_SKILL.md                            ← UPDATED (repo root)
├── PAD.md                                         ← UPDATED (repo root)
└── docs/
    └── validation/
        ├── stillwater_SKILL_validation_report.md  ← NEW
        ├── stillwater_SKILL_fixes_applied.md      ← NEW
        ├── stillwater_SKILL_batches_3_to_6_applied.md ← NEW
        ├── PAD_validation_report.md               ← NEW
        └── audit-inputs/
            ├── PAD_audit_report-1.md              ← NEW (reference)
            └── PAD_audit_report-2.md              ← NEW (reference)
```

---

## File Inventory

### Updated Source Files (place at repo root, overwrite existing)

| File | Version change | Lines | Checksum (MD5) | Description |
|------|----------------|-------|-----------------|-------------|
| `stillwater_SKILL.md` | 1.0.0 → 1.2.0 | 5,015 | `17f815ab7ff1448ad64bf1bf0eaf1124` | Project skill file. 40 fixes applied across 6 batches: 11 P0 defects + 27 P1 gaps + Trigger.dev v3→v4 alignment. |
| `PAD.md` | 1.0.0 (unchanged, content updated) | 3,203 | `944a1bd537b2a68c7c8c68bf740a8133` | Project Architecture Document. 5 critical audit fixes (C1–C5) + 11 version-alignment fixes. |

### Validation & Remediation Reports (new, place in `docs/validation/`)

| File | Lines | Checksum (MD5) | Description |
|------|-------|-----------------|-------------|
| `stillwater_SKILL_validation_report.md` | 510 | `1998b081919c03e8a9f13f887a42c228` | Original validation report — 33 source skills sampled, 11 P0 defects + 27 P1 gaps identified. Independent fidelity assessment: ~55% → target ≥85%. |
| `stillwater_SKILL_fixes_applied.md` | 257 | `3de4c3b3b231ec80011710b08257f8af` | Batches 1–2 summary — 11 P0 fixes + 7 high-value P1 fixes applied to stillwater_SKILL.md. Version 1.0.0 → 1.1.0. |
| `stillwater_SKILL_batches_3_to_6_applied.md` | 257 | `e931055756746a4f97ca83b9e90498d0` | Batches 3–6 summary — security, process/quality, accessibility/performance, stack-specific fixes. Version 1.1.0 → 1.2.0. |
| `PAD_validation_report.md` | 257 | `7c3d1545fce06625eaf42541688f93b3` | PAD.md validation against stillwater_SKILL.md + design.md + 2 audit reports. 5 critical fixes + 11 alignment fixes applied. |

### Input Audit Reports (reference, place in `docs/validation/audit-inputs/`)

| File | Lines | Checksum (MD5) | Description |
|------|-------|-----------------|-------------|
| `PAD_audit_report-1.md` | 90 | `71856e10e7201e4b239cb974a3707def` | Independent web-validated audit report 1. Covers Next.js 16 proxy.ts, Better Auth, SSE maxDuration, pg_advisory_lock inconsistency, Trigger.dev config semantics, Lighthouse≠WCAG. |
| `PAD_audit_report-2.md` | 113 | `aff14ecc10877bd1809c24be90f8964d` | Independent web-validated audit report 2. Catches Trigger.dev v3 deprecation time-bomb (blind spot in report-1). Cross-validates all of report-1's findings. |

---

## Checksums (MD5)

Verify file integrity after extraction:

```bash
# From the archive root after extraction, run:
md5sum -c <<EOF
stillwater_SKILL.md 17f815ab7ff1448ad64bf1bf0eaf1124
PAD.md 944a1bd537b2a68c7c8c68bf740a8133
docs/validation/stillwater_SKILL_validation_report.md 1998b081919c03e8a9f13f887a42c228
docs/validation/stillwater_SKILL_fixes_applied.md 3de4c3b3b231ec80011710b08257f8af
docs/validation/stillwater_SKILL_batches_3_to_6_applied.md e931055756746a4f97ca83b9e90498d0
docs/validation/PAD_validation_report.md 7c3d1545fce06625eaf42541688f93b3
docs/validation/audit-inputs/PAD_audit_report-1.md 71856e10e7201e4b239cb974a3707def
docs/validation/audit-inputs/PAD_audit_report-2.md aff14ecc10877bd1809c24be90f8964d
EOF
```

All 8 files should report `OK`. If any file reports `FAILED`, re-extract the archive.

---

## What Changed — Summary

### stillwater_SKILL.md (1.0.0 → 1.2.0)

**40 fixes applied across 6 batches:**

- **Batch 1 (11 P0 defects):** Stripe v17→v22.3 + Basil API; React v19.0→v19.2.3 + CVE-2025-55182 floor; `verifySession()`→`requireAuth()`; `pg_advisory_lock`→`pg_advisory_xact_lock`; "Better Auth 1.2"→"1.6.23"; 5-Layer Architecture Layer 3/4 swap; focus ring clay-400→water-500; `--font-berkeley-mono` wired into `@theme`; JetBrains Mono fabrication corrected; `force-dynamic` removed; §18.2 draft commentary removed.
- **Batch 2 (7 P1 fixes):** Next.js/TS/Tailwind/Drizzle/Zod version alignment; `@source` directive syntax; `use(promise)` React 19 pattern; `verbatimModuleSyntax` + `erasableSyntaxOnly` flags.
- **Batch 3 (6 security P1):** OWASP Top 10:2025 mapping; auth-security checklist; XSS prevention rules; security headers template; rate-limit strategy table; APIError shape.
- **Batch 4 (6 process/quality P1):** 6-step Triage Checklist; Multi-Model Review Pattern; Receiving Feedback Protocol; Code Review Hygiene; TDD Three Laws + AAA + Test Prioritization; Beyonce Rule + DAMP + Real>Fake>Stub>Mock.
- **Batch 5 (4 accessibility/performance P1):** 10-Point Anti-Generic Checklist + 24/30 scoring; Animation Performance Guardrails; all 9 WCAG 2.2 AAA criteria; Core Web Vitals targets.
- **Batch 6 (6 stack-specific P1):** `published: true` filter; honeypot field; owner-checked queries (IDOR prevention); UUID validation; Better Auth `trustHost` warning; CI/CD Practices.
- **Post-batch alignment:** Trigger.dev v3→v4 (4 references) to match corrected PAD.md.

**Cumulative diff:** +1,026 insertions, −55 deletions (net +971 lines). File grew from 4,044 → 5,015 lines.

### PAD.md (content updated, 5 critical fixes + 11 alignment fixes)

**5 critical audit fixes (C1–C5):**
- **C1:** Trigger.dev v3 → v4 (4 locations: §5.1, §4 diagram, §17.2, ADR-007) — v3 deploys stop working April 1, 2026
- **C2:** `pg_advisory_lock` → `pg_advisory_xact_lock` in §15.3 webhook handler — session-scoped breaks under Neon PgBouncer
- **C3:** SSE `maxDuration = 300` added + `force-dynamic` removed in §13.2 — Vercel default timeout would kill the stream
- **C4:** Trigger.dev `maxDuration: 120` added to config + "Timeout" column renamed to "Target CPU Budget" in §17 — was never set, tasks would run indefinitely
- **C5:** G6 Lighthouse/WCAG false equivalence fixed + §22.2 expanded to all 9 WCAG 2.2 AAA criteria + focus ring color corrected (clay-400 → water-500)

**11 version-alignment fixes** brought PAD.md §5.1 in sync with stillwater_SKILL.md §2.1.

**Cumulative diff:** +90 insertions, −58 deletions (net +32 lines). File grew from 3,171 → 3,203 lines.

---

## Extraction & Installation Instructions

### Option A: Extract directly at repo root (recommended)

```bash
# Navigate to your local clone of nordeim/stillwater
cd path/to/your/stillwater

# Copy the archive here, then extract
tar -xzf stillwater_docs_refresh_2026-07-05.tar.gz

# This will:
#   - Overwrite stillwater_SKILL.md (at repo root)
#   - Overwrite PAD.md (at repo root)
#   - Create docs/validation/ with 4 report files
#   - Create docs/validation/audit-inputs/ with 2 audit reports
#   - Create MANIFEST.md (at repo root — you may delete this after review)

# Verify the changes
git diff --stat
git status
```

### Option B: Extract to a staging location, review, then copy

```bash
# Extract to a temp location
mkdir -p /tmp/stillwater_refresh
tar -xzf stillwater_docs_refresh_2026-07-05.tar.gz -C /tmp/stillwater_refresh

# Review the files
diff your-repo/stillwater_SKILL.md /tmp/stillwater_refresh/stillwater_SKILL.md
diff your-repo/PAD.md /tmp/stillwater_refresh/PAD.md

# Once satisfied, copy to your repo
cp /tmp/stillwater_refresh/stillwater_SKILL.md your-repo/
cp /tmp/stillwater_refresh/PAD.md your-repo/
cp -r /tmp/stillwater_refresh/docs your-repo/
```

### Post-extraction verification

```bash
# Verify stillwater_SKILL.md fixes
grep "^version:" stillwater_SKILL.md                    # should show 1.2.0
grep "CVE-2025-55182" stillwater_SKILL.md | wc -l       # should be 1
grep "Trigger\.dev.*v4" stillwater_SKILL.md | wc -l     # should be 4
grep "@trigger\.dev/sdk/v3" stillwater_SKILL.md | wc -l # should be 0
grep "pg_advisory_xact_lock" stillwater_SKILL.md | wc -l # should be 14

# Verify PAD.md fixes
grep "Trigger\.dev.*v4" PAD.md | wc -l                  # should be 4
grep "@trigger\.dev/sdk/v3" PAD.md | wc -l              # should be 0
grep "pg_advisory_xact_lock" PAD.md | wc -l             # should be 4
grep "maxDuration = 300" PAD.md | wc -l                 # should be 1
grep "Target CPU Budget" PAD.md | wc -l                 # should be 2
grep "quarterly manual screen-reader" PAD.md | wc -l    # should be 1
```

### Commit message suggestion

```
docs: refresh stillwater_SKILL.md (v1.2.0) + PAD.md with audit-validated fixes

stillwater_SKILL.md (1.0.0 → 1.2.0):
- 11 P0 defect fixes (Stripe v22.3, React 19.2.3 + CVE-2025-55182,
  verifySession→requireAuth, pg_advisory_xact_lock, 5-Layer inversion,
  focus ring, font variable, JetBrains Mono fabrication, force-dynamic,
  Better Auth version typo, draft commentary)
- 27 P1 gap fixes across security (OWASP, XSS, headers, rate-limit,
  APIError), process (Triage, Multi-Model Review, Receiving Feedback,
  TDD laws, Beyonce Rule), accessibility (9 WCAG 2.2 AAA criteria,
  Core Web Vitals, anti-generic checklist), and stack-specific
  (published:true, honeypot, owner-checked queries, UUID validation,
  trustHost, CI/CD)
- Trigger.dev v3→v4 alignment with PAD.md

PAD.md:
- 5 critical audit fixes (C1: Trigger.dev v4, C2: pg_advisory_xact_lock,
  C3: SSE maxDuration, C4: Trigger.dev maxDuration config, C5: WCAG/Lighthouse)
- 11 version-alignment fixes with stillwater_SKILL.md §2.1

Validation reports in docs/validation/ document the full audit trail.
Input audit reports preserved in docs/validation/audit-inputs/.

Sources: 2 independent web-validated audit reports + line-level
verification against 33 source skills.
```

---

## Files NOT Included (intentional exclusions)

| File | Why excluded |
|------|--------------|
| `design.md` | Upstream/legacy architectural critique (specifies Next.js 15, Auth.js v5, `middleware.ts`, Trigger.dev v3). Historical artifact — NOT edited. Editing it would falsify the evolution record. Already in the repo unchanged. |
| `skills/` directory | 142 source skills — unchanged, already in repo. |
| `CLAUDE.md`, `MASTER_EXECUTION_PLAN.md`, `README.md`, etc. | Unchanged repo files. |
| `worklog.md` | Multi-agent worklog — internal process artifact, not for repo. |
| `scripts/` (coverage_scan.py, source_index.txt, etc.) | Internal analysis scripts — not for repo. |

---

## Audit Trail

The full audit trail is preserved in `docs/validation/`:

1. **`stillwater_SKILL_validation_report.md`** — the original audit (33 source skills sampled, 11 P0 + 27 P1 findings)
2. **`stillwater_SKILL_fixes_applied.md`** — Batches 1–2 (P0 + high-value P1)
3. **`stillwater_SKILL_batches_3_to_6_applied.md`** — Batches 3–6 (security, process, a11y, stack-specific)
4. **`PAD_validation_report.md`** — PAD.md validation + 5 critical fixes + 11 alignment fixes
5. **`audit-inputs/PAD_audit_report-1.md`** — independent web-validated audit (input)
6. **`audit-inputs/PAD_audit_report-2.md`** — independent web-validated audit (input, caught Trigger.dev v3 deprecation)

Together these documents provide complete traceability from source skills → findings → fixes → verification.

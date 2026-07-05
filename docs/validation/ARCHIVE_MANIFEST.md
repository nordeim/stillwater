# Archive Manifest — MASTER_EXECUTION_PLAN.md Alignment

**Archive created:** 2026-07-05
**Archive file:** `stillwater_mep_alignment_v1.2.0.tar.gz`
**Purpose:** Refresh the `nordeim/stillwater` GitHub repo with the updated `MASTER_EXECUTION_PLAN.md` (v1.1.0 → v1.2.0) and all validation/remediation reports from the full 4-document alignment session.

---

## What This Archive Contains

This archive contains the updated MASTER_EXECUTION_PLAN.md plus every report produced during the full alignment session (SKILL.md → PAD.md/design.md → MEP). All paths are relative to the repo root.

### Updated Document (1 file)

| Path | Change Summary |
|------|----------------|
| `MASTER_EXECUTION_PLAN.md` | v1.1.0 → v1.2.0: 3 P0 fixes (Stripe apiVersion Basil→Dahlia, env count 25→34, F0-23 berkeley-mono→jetbrains-mono), 7 P1 fixes (D25/D34/D41 resolutions, Phase 12 acceptance, §3.2, Open Questions §9.7, §7.1 alignment claim), 3 P2 fixes (Source Document Map adds .html mockup, D9 marked resolved, color token prefix criterion), 1 P3 fix (proxy.ts question resolved). All Berkeley Mono references updated to JetBrains Mono (free Google Font already in repo). |

### Reports (8 files in `docs/validation/`)

| Path | Description |
|------|-------------|
| `docs/validation/MEP_vs_source_docs_alignment_report.md` | MEP alignment validation report (16 findings: 3 P0 + 7 P1 + 4 P2 + 1 P3) |
| `docs/validation/MEP_remediation_report.md` | MEP remediation report documenting every change with before/after + rationale |
| `docs/validation/PAD_vs_design_vs_SKILL_alignment_report.md` | PAD/design/SKILL alignment validation (19 findings — prior pass) |
| `docs/validation/PAD_design_SKILL_remediation_report.md` | PAD/design/SKILL remediation report (prior pass) |
| `docs/validation/stillwater_SKILL_validation_report.md` | Initial SKILL.md validation (78/100, 4 P0 findings — first pass) |
| `docs/validation/stillwater_SKILL_remediation_report.md` | SKILL.md remediation report (first pass) |
| `docs/validation/stillwater_SKILL_post_fix_audit_report.md` | SKILL.md post-fix audit (34 checks, all pass — first pass) |
| `docs/validation/ARCHIVE_MANIFEST.md` | This manifest |

### Helper Scripts (3 files in `scripts/`)

| Path | Description |
|------|-------------|
| `scripts/verify_mep_alignment.py` | MEP alignment verification (26 checks, all pass) |
| `scripts/verify_pad_alignment.py` | PAD/design/SKILL alignment verification (34 checks, all pass — prior pass) |
| `scripts/verify_alignment.py` | SKILL.md vs package.json alignment verification (34 checks, all pass — first pass) |

---

## Extraction Instructions

### Option A: Extract over an existing repo checkout (recommended)

```bash
cd /path/to/your/stillwater

# Extract the archive (overwrites existing files)
tar -xzf /path/to/stillwater_mep_alignment_v1.2.0.tar.gz

# Verify the changes
git status
git diff --stat

# Run the MEP verification script
python3 scripts/verify_mep_alignment.py

# (Optional) Run the prior verification scripts to confirm full alignment
python3 scripts/verify_pad_alignment.py
python3 scripts/verify_alignment.py

# If all checks pass, commit
git add -A
git commit -m "fix: align MASTER_EXECUTION_PLAN.md with updated source docs (v1.1.0 → v1.2.0)

P0 fixes (implementation code):
- Phase 7 F7-01: Stripe apiVersion '2025-03-31.basil' → '2026-06-24.dahlia'
- Phase 0 F0-06: env var count '25 vars' → '34 vars'
- Phase 0 F0-23: berkeley-mono/ → jetbrains-mono/ (free Google Font, no license needed)

P1 fixes (stale discrepancy resolutions):
- D25/D34: Berkeley Mono → JetBrains Mono (free Google Font already in repo)
- D41: acknowledges PAD v1.3.0 corrections (Stripe, pnpm, Tailwind, env vars, etc.)
- Phase 12 acceptance: Berkeley Mono → JetBrains Mono
- §3.2 design principles: Berkeley Mono → JetBrains Mono
- Open Questions §9.7: Q2 (proxy.ts), Q3 (fonts), Q7 (Berkeley Mono) all ✅ RESOLVED
- §7.1: '100% alignment' → 'partially verified, now in alignment'

P2 fixes (documentation hygiene):
- Source Document Map: added static_landing_page_mockup.html as visual reference
- D9: marked RESOLVED IN SOURCE (PAD v1.2.0 already fixed malformed --color-fog)
- Phase 12 acceptance: added color token prefix remapping criterion

P3 fix:
- Open Question §9.7 Q2 (proxy.ts): marked ✅ RESOLVED

Verified via 26 automated checks (scripts/verify_mep_alignment.py).

Refs: docs/validation/MEP_vs_source_docs_alignment_report.md
       docs/validation/MEP_remediation_report.md"

git push origin main
```

### Option B: Inspect before extracting

```bash
tar -tzf /path/to/stillwater_mep_alignment_v1.2.0.tar.gz | sort
```

---

## Post-Extraction Steps

After extracting and committing, no further action is required. The five-document hierarchy is now fully aligned:

```
design.md (historical intent, with superseded banners)
    ↓
PAD.md (authoritative architecture, v1.3.0-equivalent)
    ↓
stillwater_SKILL.md (agent-facing distillation, v1.3.0)
    ↓
MASTER_EXECUTION_PLAN.md (execution plan, v1.2.0 — now aligned with all three)
    ↓
static_landing_page_mockup.html (visual/aesthetic reference for Phase 12)
```

---

## Verification

To confirm the archive is complete and uncorrupted:

```bash
sha256sum /path/to/stillwater_mep_alignment_v1.2.0.tar.gz
```

The archive contains **12 files** total. List them with:

```bash
tar -tzf /path/to/stillwater_mep_alignment_v1.2.0.tar.gz | sort
```

---

## Font Note (User Caveat)

Per the user's directive: "use the actual installed Google fonts under the `packages/ui/src/fonts/` folder, these are free fonts that I can download."

Verified font directories in the repo:
- `packages/ui/src/fonts/cormorant/` — 25 woff2 files (Cormorant Garamond, Google Font, OFL)
- `packages/ui/src/fonts/dm-sans/` — 8 woff2 files (DM Sans, Google Font, OFL)
- `packages/ui/src/fonts/jetbrains-mono/` — 18 woff2 files (JetBrains Mono, Google Font, Apache 2.0)

All three are **free Google Fonts** — no license acquisition needed. Berkeley Mono (paid commercial, NOT a Google Font) was the Phase 1 design.md proposal but was never acquired. JetBrains Mono is the chosen free alternative. The MEP now instructs agents to use the actual installed free fonts.

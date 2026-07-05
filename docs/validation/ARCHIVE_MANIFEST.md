# Archive Manifest — PAD.md / design.md / SKILL.md Alignment

**Archive created:** 2026-07-05
**Archive file:** `stillwater_pad_design_skill_alignment_v1.tar.gz`
**Purpose:** Refresh the `nordeim/stillwater` GitHub repo with the aligned PAD.md, design.md, stillwater_SKILL.md, and corrected CSS token files, plus all validation/remediation reports.

---

## What This Archive Contains

This archive contains every file modified or created during the PAD.md ↔ design.md ↔ SKILL.md alignment remediation. All paths are relative to the repo root.

### Updated Documents (3 files)

| Path | Change Summary |
|------|----------------|
| `PAD.md` | §5.1: 9 rows corrected (Next.js, Tailwind, Drizzle, pnpm, Stripe, Zod, Turborepo, React Email, Resend). §5.2: pnpm 11.0.0. ADR-009: proxy.ts runtime corrected to Edge. Appendix A: Cloudflare env var names fixed + 3 missing vars added. |
| `design.md` | LAYER 2: "Partially Superseded" banner added. LAYER 6: renamed to "Better Auth + proxy.ts", superseded banner + `<details>` collapse for Auth.js v5 code. Phase 3: Trigger.dev v3 → v4. |
| `stillwater_SKILL.md` | §1.4 item 8: "JetBrains/Berkeley Mono" → "JetBrains Mono". §4.1: `--font-mono` Berkeley Mono reference removed. §4.4: `berkeleyMono` → `jetbrainsMono` localFont; licensing warning replaced with concise provenance note. |

### Updated CSS Token Files (4 files)

| Path | Change Summary |
|------|----------------|
| `packages/ui/src/tokens/colors.css` | Header: PAD §11.4 → §11.3 (off-by-one fix) |
| `packages/ui/src/tokens/typography.css` | Header: PAD §11.3 → §11.2 (off-by-one fix) |
| `packages/ui/src/tokens/spacing.css` | Header: PAD §11.5 → §11.4 (off-by-one fix) |
| `packages/ui/src/tokens/motion.css` | Header: PAD §11.6 → §11.5 (off-by-one fix) |

### Reports (4 files in `docs/validation/`)

| Path | Description |
|------|-------------|
| `docs/validation/PAD_vs_design_vs_SKILL_alignment_report.md` | Initial alignment validation report (19 findings: 4 P0 + 5 P1 + 6 P2 + 4 P3) |
| `docs/validation/PAD_design_SKILL_remediation_report.md` | Remediation report documenting every change with before/after + rationale |
| `docs/validation/ARCHIVE_MANIFEST.md` | This manifest |
| `docs/validation/stillwater_SKILL_validation_report.md` | Prior SKILL.md validation (from the first remediation pass — included for context) |
| `docs/validation/stillwater_SKILL_remediation_report.md` | Prior SKILL.md remediation report (from the first pass — included for context) |
| `docs/validation/stillwater_SKILL_post_fix_audit_report.md` | Prior SKILL.md post-fix audit (from the first pass — included for context) |

### Helper Script (1 file)

| Path | Description |
|------|-------------|
| `scripts/verify_pad_alignment.py` | Re-runnable verification script for PAD/design/SKILL alignment; 34 checks, all pass |

---

## Extraction Instructions

### Option A: Extract over an existing repo checkout (recommended)

```bash
# From your local stillwater repo root
cd /path/to/your/stillwater

# Extract the archive (overwrites existing files)
tar -xzf /path/to/stillwater_pad_design_skill_alignment_v1.tar.gz

# Verify the changes
git status
git diff --stat

# Run the verification script
python3 scripts/verify_pad_alignment.py

# If all 34 checks pass, commit
git add -A
git commit -m "fix: align PAD.md + design.md with SKILL.md v1.3.0 + source skills

PAD.md §5.1 (Tech Stack):
- Stripe: 'Basil' API → 'Dahlia' API (2026-06-24); camelCase → snake_case
- pnpm: 9.15.4 → ^11.0.0 (pnpm 9.x is EOL)
- Tailwind: ^4.1.0 → ^4.3.0
- Zod: added z.url({ protocol }) v4-native guidance + { error } param
- Turborepo: 'latest' → ^2.10.0
- React Email: 'latest' → ^0.0.36
- Resend: 'latest' → ^4.1.2
- Drizzle: $count floor ≥0.30 → ≥0.34
- Next.js: proxy.ts runtime corrected to Edge; React Compiler opt-in;
  serverExternalPackages attributed to Next.js 15

PAD.md ADR-009: proxy.ts runtime corrected from 'Node.js' to 'Edge'
PAD.md Appendix A: Cloudflare env var names fixed + 3 missing vars added

design.md LAYER 2: 'Partially Superseded' banner (color/spacing/font tokens)
design.md LAYER 6: renamed to 'Better Auth + proxy.ts'; Auth.js v5 code
  collapsed with superseded banner citing ADR-008/009
design.md Phase 3: Trigger.dev v3 → v4

SKILL.md §4.4: Berkeley Mono → JetBrains Mono (font dir doesn't exist)

CSS token files: off-by-one PAD section refs fixed (colors/typography/
spacing/motion .css)

Verified via 34 automated checks (scripts/verify_pad_alignment.py).

Refs: docs/validation/PAD_vs_design_vs_SKILL_alignment_report.md
       docs/validation/PAD_design_SKILL_remediation_report.md"

# Push to GitHub
git push origin main
```

### Option B: Inspect before extracting

```bash
tar -tzf /path/to/stillwater_pad_design_skill_alignment_v1.tar.gz
```

---

## Post-Extraction Steps

After extracting and committing, no further action is required. The three documents are now mutually aligned and consistent with the codebase.

If you also want to re-verify the prior SKILL.md alignment (from the first remediation pass), you can run:

```bash
python3 scripts/verify_alignment.py
```

(This script was included in the prior `stillwater_alignment_v1.3.0.tar.gz` archive. If you don't have it, the checks it performs are documented in `docs/validation/stillwater_SKILL_post_fix_audit_report.md`.)

---

## Verification

To confirm the archive is complete and uncorrupted:

```bash
sha256sum /path/to/stillwater_pad_design_skill_alignment_v1.tar.gz
```

The archive contains **13 files** total. List them with:

```bash
tar -tzf /path/to/stillwater_pad_design_skill_alignment_v1.tar.gz | sort
```

---

## Reports Summary

### 1. Alignment Validation Report (`PAD_vs_design_vs_SKILL_alignment_report.md`)
The initial validation identifying 19 findings across the three documents:
- 4 P0 Critical (PAD.md stale Stripe/pnpm/Tailwind/env vars)
- 5 P1 High (design.md stale Auth.js/middleware/Trigger.dev v3 + token naming + font-mono)
- 6 P2 Medium (Zod guidance, version pins, CSS header refs, Drizzle floor)
- 4 P3 Low (missing tokens, ADR-009 runtime claim)

### 2. Remediation Report (`PAD_design_SKILL_remediation_report.md`)
Documents every change made, with before/after for each finding. All P0, P1, and in-scope P2 findings resolved. P3 deferred items documented with rationale.

### 3. Prior SKILL.md Reports (3 files)
Included for context — these document the first remediation pass that aligned SKILL.md with the source skills and the codebase.

---

## Questions?

Refer to:
- `docs/validation/PAD_design_SKILL_remediation_report.md` for the "why" behind each change
- `scripts/verify_pad_alignment.py` for the deterministic check logic (34 checks, all pass)

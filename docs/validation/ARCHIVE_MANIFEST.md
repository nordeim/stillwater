# Archive Manifest — Stillwater SKILL.md Alignment

**Archive created:** 2026-07-05
**Archive file:** `stillwater_alignment_v1.3.0.tar.gz`
**Purpose:** Refresh the `nordeim/stillwater` GitHub repo with the corrected SKILL.md, bumped `package.json` files, updated `tsconfig.json`, migrated `env.ts`, and all validation/audit/remediation reports.

---

## What This Archive Contains

This archive contains every file modified or created during the SKILL.md alignment session. All paths are relative to the repo root, so you can extract this archive directly over your local repo checkout.

### Updated Source Files (7 files)

| Path | Change Summary |
|------|----------------|
| `stillwater_SKILL.md` | v1.2.0 → v1.3.0; 14 factual corrections (Stripe API version, Zod v4 API, env count, source-skill count, Better Auth `trustHost`, React Compiler, pnpm/Turbo versions, Tailwind version, tsconfig flag provenance, `serverExternalPackages` move) |
| `package.json` | root: `turbo ^2.3.3 → ^2.10.0`, `typescript ^5.7.3 → ^5.9.0`, `packageManager pnpm@9.15.4 → pnpm@11.0.0` |
| `apps/web/package.json` | `next ^16.0.0 → ^16.2.0`, `react/react-dom ^19.0.0 → ^19.2.3`, `stripe ^17.6.0 → ^22.3.0`, `zod ^3.24.1 → ^4.4.0`, `tailwindcss ^4.0.6 → ^4.3.0`, `@tailwindcss/postcss ^4.0.6 → ^4.3.0` |
| `packages/db/package.json` | `drizzle-orm ^0.40.1 → ^0.45.0`, `drizzle-kit ^0.30.1 → ^0.31.0`, `zod ^3.24.1 → ^4.4.0`, `typescript ^5.7.3 → ^5.9.0` |
| `packages/auth/package.json` | `zod ^3.24.1 → ^4.4.0`, `typescript ^5.7.3 → ^5.9.0` |
| `tooling/typescript/base.json` | Added `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true` to `compilerOptions` |
| `packages/config/src/env.ts` | Line 70: `code: z.ZodIssueCode.custom` → `code: 'custom'` (Zod v3 → v4 API migration) |

### Reports (4 files in `docs/validation/`)

| Path | Description |
|------|-------------|
| `docs/validation/stillwater_SKILL_validation_report.md` | Initial independent validation report (78/100, identified 4 P0 + 2 P1 + 3 P2 + 3 P3 findings) |
| `docs/validation/stillwater_SKILL_remediation_report.md` | Remediation report documenting every change, before/after, and rationale |
| `docs/validation/stillwater_SKILL_post_fix_audit_report.md` | Post-fix audit report with 34 automated verification checks (all pass) |
| `docs/validation/ARCHIVE_MANIFEST.md` | This manifest |

### Helper Script (1 file in `scripts/`)

| Path | Description |
|------|-------------|
| `scripts/verify_alignment.py` | Re-runnable verification script; cross-checks SKILL.md §2.1 against `package.json` files, tsconfig flags, and env.ts Zod API. Exits 0 on pass, non-zero on failure. Safe for CI. |

---

## Extraction Instructions

### Option A: Extract over an existing repo checkout (recommended)

```bash
# From your local stillwater repo root
cd /path/to/your/stillwater

# Extract the archive (overwrites existing files)
tar -xzf /path/to/stillwater_alignment_v1.3.0.tar.gz

# Verify the changes
git status
git diff --stat

# Run the verification script
python3 scripts/verify_alignment.py

# If all checks pass, commit
git add -A
git commit -m "fix: align SKILL.md with source skills + bump deps to verified versions

- SKILL.md v1.2.0 → v1.3.0: 14 factual corrections (Stripe Dahlia not Basil,
  Zod v4 { error } not { message }, 34 env vars not 25, 21 source skills not 12,
  Better Auth has no trustHost, React Compiler opt-in, pnpm 11, Turbo 2.10,
  Tailwind 4.3, tsconfig flag provenance, serverExternalPackages moved in Next 15)
- Bump next ^16.2.0, react ^19.2.3, stripe ^22.3.0, zod ^4.4.0, tailwindcss ^4.3.0
- Bump typescript ^5.9.0, turbo ^2.10.0, drizzle-orm ^0.45.0, pnpm 11.0.0
- Add verbatimModuleSyntax + erasableSyntaxOnly to tsconfig
- Migrate env.ts from Zod v3 ZodIssueCode.custom to v4 'custom' literal
- Add docs/validation/ reports + scripts/verify_alignment.py

Verified via 34 automated checks (scripts/verify_alignment.py).

Refs: docs/validation/stillwater_SKILL_validation_report.md
       docs/validation/stillwater_SKILL_remediation_report.md
       docs/validation/stillwater_SKILL_post_fix_audit_report.md"

# Push to GitHub
git push origin main
```

### Option B: Inspect before extracting

```bash
# List archive contents without extracting
tar -tzf /path/to/stillwater_alignment_v1.3.0.tar.gz

# Extract to a temp directory for review
mkdir -p /tmp/stillwater_review
tar -xzf /path/to/stillwater_alignment_v1.3.0.tar.gz -C /tmp/stillwater_review
diff -ru /path/to/your/stillwater /tmp/stillwater_review
```

---

## Post-Extraction Steps

After extracting the archive and committing the changes, run the following to complete the alignment:

```bash
# 1. Regenerate the lockfile with bumped versions
pnpm install

# 2. Check for breaking API changes (Zod v3→v4, Stripe v17→v22 are major upgrades)
pnpm check-types

# 3. If @t3-oss/env-core has Zod v4 peer-dependency issues, bump it:
#    Check packages/config/package.json for @t3-oss/env-core version
#    pnpm --filter @stillwater/config add @t3-oss/env-core@latest

# 4. Re-run the verification script to confirm everything still aligns
python3 scripts/verify_alignment.py

# 5. Run the full test suite
pnpm test
```

---

## Verification

To confirm the archive is complete and uncorrupted, check the SHA256 checksum:

```bash
sha256sum /path/to/stillwater_alignment_v1.3.0.tar.gz
# Should match the checksum reported by the assistant
```

The archive contains **12 files** total (7 source files + 4 reports + 1 manifest + 1 script = 13, but the manifest is this file so it's 12 + this manifest = 13 files). List them with:

```bash
tar -tzf /path/to/stillwater_alignment_v1.3.0.tar.gz | sort
```

Expected output:
```
ARCHIVE_MANIFEST.md
apps/web/package.json
docs/validation/ARCHIVE_MANIFEST.md
docs/validation/stillwater_SKILL_post_fix_audit_report.md
docs/validation/stillwater_SKILL_remediation_report.md
docs/validation/stillwater_SKILL_validation_report.md
package.json
packages/auth/package.json
packages/config/src/env.ts
packages/db/package.json
scripts/verify_alignment.py
stillwater_SKILL.md
tooling/typescript/base.json
```

---

## Reports Summary

### 1. Validation Report (`stillwater_SKILL_validation_report.md`)
The initial independent validation. Scored the document 78/100 and identified:
- 4 P0 Critical (Zod v3/v4, Stripe v17/v22, env count 25/34, tsconfig flags)
- 2 P1 High (source-skill count contradiction, "forward-looking" framing)
- 3 P2 Medium (version drift, line citation, DATABASE_URL validation cell)
- 3 P3 Low (editorialization, catalog reference)

### 2. Remediation Report (`stillwater_SKILL_remediation_report.md`)
Documents every change made, with before/after for each finding. Includes:
- P0-1 through P0-4 (all resolved)
- P1-5 and P1-6 (all resolved)
- P2-7 (resolved), P2-8 and P2-9 (deferred as P3 cosmetic)
- P3-10 (deferred), P3-11 (resolved)
- 4 additional web-research-resolved corrections (Better Auth `trustHost`, React Compiler, `serverExternalPackages` move, pnpm/Turbo staleness)

### 3. Post-Fix Audit Report (`stillwater_SKILL_post_fix_audit_report.md`)
Verifies every remediation claim via 34 automated checks. All pass. Includes the full check matrix and re-run instructions.

---

## Questions?

If anything in this archive is unclear, refer to:
- `docs/validation/stillwater_SKILL_remediation_report.md` for the "why" behind each change
- `docs/validation/stillwater_SKILL_post_fix_audit_report.md` for the verification evidence
- `scripts/verify_alignment.py` for the deterministic check logic

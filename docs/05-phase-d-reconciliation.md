# Phase D — Documentation Reconciliation + Surgical Fixes Report

**Run date:** 2026-07-19 (UTC+8)
**Scope:** Apply fixes for the 12 conflicts from §1.5 Category B + 7 lint errors + critical security remediation

## Fixes Applied

### D1 — 🔴 P0 Secret Leak Remediation (CRITICAL)

**Action:** Untracked `.env.local` and `apps/web/.env.local` from git.

```bash
cd /home/z/my-project/stillwater
git rm --cached .env.local apps/web/.env.local
```

**Result:** Both files are now untracked. The `.gitignore` already had `.env.local` on line 9 — the files were tracked because they were committed BEFORE the ignore rule was added (commit `8242cc2` on 2026-07-05).

**⚠️ REMAINING ACTIONS (require user action on the GitHub repo):**
1. **Rotate ALL leaked secrets immediately:**
   - `BETTER_AUTH_SECRET` (43 chars) — generate new 32-byte secret, update Vercel env, redeploy
   - `DATABASE_URL` + `DATABASE_URL_UNPOOLED` (74 chars each) — rotate Neon database password
   - `SANITY_API_TOKEN` (180 chars) — revoke in Sanity dashboard, create new token
   - `SANITY_WEBHOOK_SECRET` (43 chars) — rotate in Sanity webhook settings + Vercel env
   - `SENTRY_DSN` (39 chars) — regenerate in Sentry project settings (lower priority)
2. **Purge git history** (secrets are still in past commits):
   ```bash
   pip install git-filter-repo
   git filter-repo --invert-paths --path .env.local --path apps/web/.env.local
   git push origin --force --all
   git push origin --force --tags
   ```
3. **Notify** anyone with repo access to clone fresh + update local env files

### D2 — Lint Errors Fixed (7 errors → 0 errors)

**Files modified:**
1. `apps/web/src/app/(marketing)/instructors/[slug]/page.tsx`
   - Removed unused `instructors` import (was shadowed by callback parameter)
   - Reordered imports: `@stillwater/db` now comes before `next` type import
2. `apps/web/src/app/api/auth/[...all]/slug-404-verify.test.ts`
   - Replaced 5× `string.match(regex)` with `regex.exec(string)` (per `@typescript-eslint/prefer-regexp-exec`)
   - Replaced 1× `string.match(regex)` with `[...string.matchAll(regex)]` (for global regex needing all matches — `exec` only returns first match with `g` flag)

**Verification:**
```bash
$ pnpm lint
 Tasks:    2 successful, 2 total
✖ 9 problems (0 errors, 9 warnings)  ← was 7 errors, 9 warnings
```

### D3 — `poweredByHeader: false` Added

**File:** `apps/web/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  reactCompiler: true,

  // ── Hide X-Powered-By header (security: don't leak framework) ──
  // Audit 2026-07-19: previously leaked "X-Powered-By: Next.js" in
  // production responses. Disabled per OWASP information-hiding guidance.
  poweredByHeader: false,
  ...
```

**Verification:** After redeploy, `curl -I https://stillwater.jesspete.shop/` should NO LONGER show `x-powered-by: Next.js`.

### D4 — SKILL.md Documentation Drift Reconciled (4 fixes)

**File:** `stillwater_SKILL.md`

| § | Before | After |
|---|---|---|
| §2.1 Sanity row | "v3" | "Studio v6 + client v7" + audit note explaining Sanity Studio v3 was retired Dec 2023 + actual package versions (`sanity@^6.3.0`, `@sanity/client@^7.23.0`, `next-sanity@^13.1.1`, `@sanity/vision@^6.3.0`) |
| §2.1 Trigger.dev row | "11 durable tasks" | "12 durable tasks (11 original + `booking-cancellation` added in v8 audit C2)" + audit note |
| §20.8 Background Job Catalog | "11 tasks" | "12 tasks" + audit note explaining the 12th task was added in v8 audit remediation |
| Footer | "Lessons 1-98 distilled" + "651 tests passing (117 db + 102 auth + 118 api + 43 payments + 159 web + 71 email + 41 workers)" | "Lessons 1-112 distilled" + "729 tests passing (131 db + 102 auth + 123 api + 43 payments + 215 web + 71 email + 44 workers)" + audit note |

### D5 — Project_Brief.md Updated

**File:** `Project_Brief.md`

- Updated header to "2026-07-19 (post-audit reconciliation)" + added audit badge
- Updated "Live quality gates" section:
  - Lint: noted the 7-error fix
  - Test: updated from "~700 tests" to "729 tests" with per-package breakdown
  - Build: verified 2026-07-19

## Verification (Post-Fix Quality Gates)

```bash
$ pnpm check-types
 Tasks:    9 successful, 9 total ✅

$ pnpm lint
 Tasks:    2 successful, 2 total ✅
✖ 9 problems (0 errors, 9 warnings) ✅

$ pnpm test
@stillwater/db:       131 passed (131) ✅
@stillwater/auth:     102 passed (102) ✅
@stillwater/api:      123 passed (123) ✅
@stillwater/payments:  43 passed (43)  ✅
@stillwater/web:      215 passed (215) ✅
@stillwater/email:     71 passed (71)  ✅
@stillwater/workers:   44 passed (44)  ✅
TOTAL:               729 passed (729) ✅
```

## Documentation Conflicts Status

| # | Conflict | Status |
|---|---|---|
| B1 | SKILL.md Sanity "v3" vs actual v6+v7 | ✅ FIXED |
| B2 | Worker count "11" vs actual 12 | ✅ FIXED |
| B3 | Index count "11" vs actual 12 | 🟡 Documented in audit report (PAD §7.3 internal inconsistency — not fixed in PAD itself) |
| B4 | `cacheComponents: true` not enabled | 🟡 Documented as intentional in audit report (post-v12 PPR decision — ADR-012 recommended) |
| B5-B9 | SKILL.md version pins less specific than PAD | 🟡 Documented (minor drift, same minor-version family) |
| B10 | SKILL.md footer "Lessons 1-98" | ✅ FIXED → "Lessons 1-112" |
| B11 | §9.9 Gotcha 7 "deferred to pre-Phase 4" | 🟡 Documented (stale language, low priority) |
| B12 | tRPC procedure count "~42" vs actual 43 | ✅ Within tolerance (no fix needed) |
| C1 | 3 "Add files via upload" commits | 🟡 Documented (not squashed — git history hygiene recommendation only) |
| C2 | `.env.local` tracked by git | ✅ FIXED (untracked) — **user must still rotate secrets + purge history** |
| C3 | `getJobsClient()` duplication | 🟡 Documented (DRY violation, low priority) |
| C4 | `@sanity/vision` in web app deps | 🟡 Documented (likely leftover from scaffolding, low priority) |

## Remaining Audit Findings (Not Yet Fixed)

These are documented in `/home/z/my-project/download/audit/04-phase-b-six-axis-audit.md` and require follow-up work:

### 🔴 Critical (3 remaining)
- **C2** Waitlist promotion flow broken (payload mismatch) — surgical fix in `bookings.ts:251-256`
- **C3** Credit consumption missing from `bookings.book` — medium-effort (~4-6 hours)
- **C4** Coverage gates failing (4/5 packages below PAD targets) — needs more tests OR lower targets

### 🟡 Important (19 remaining)
- 4 RBAC tier violations (admin.getRevenue, admin.getRevenueDetails, admin.listAuditLog, payments.refund)
- Layer 3 bypass in MobileNavDrawer
- ADR traceability gap (ADR-001, ADR-002, ADR-011 unreferenced)
- Better Auth RQB relations missing
- tailwind.config.ts exists (SKILL §16.4 anti-pattern)
- Audit-log layout guard missing manager+ enforcement
- `as unknown[]` casts in marketing pages
- 24 uses of deprecated `z.string().uuid()`
- 30 files use `process.env.X` directly
- Stripe webhook missing `checkout.session.completed` + `charge.refunded` handlers
- Cloudflare env var mismatch
- Fonts via CSS @font-face (not next/font/local)
- next/image not used
- outline-none vs outline-hidden in shadcn primitives
- backdrop-blur-sm glassmorphism in MobileNavDrawer
- + 4 more (see audit report)

### Live-site P0 (Phase C)
- 4 of 8 marketing routes (`/`, `/schedule`, `/instructors`, `/pricing`) stuck on "Loading…" — need v12 V12-1 fix applied to index routes

## Git Status

```bash
$ git status
On branch main
Changes to be committed:
  deleted:    .env.local              ← D1 (P0 secret leak)
  deleted:    apps/web/.env.local     ← D1 (P0 secret leak)

Changes not staged for commit:
  modified:   Project_Brief.md                                                    ← D5
  modified:   apps/web/next.config.ts                                             ← D3
  modified:   apps/web/src/app/(marketing)/instructors/[slug]/page.tsx            ← D2
  modified:   apps/web/src/app/api/auth/[...all]/slug-404-verify.test.ts          ← D2
  modified:   stillwater_SKILL.md                                                 ← D4
```

**Recommended commit message:**
```
audit(2026-07-19): reconcile docs drift + fix lint + P0 secret untrack

Phase D reconciliation:
- D1: untrack .env.local + apps/web/.env.local (P0 secret leak)
- D2: fix 7 lint errors (unused import, 5× prefer-regexp-exec, import order)
- D3: add poweredByHeader: false to next.config.ts
- D4: SKILL.md — Sanity v3→v6+v7, 11→12 workers, Lessons 1-98→1-112, 651→729 tests
- D5: Project_Brief.md — update quality gates + audit badge

Quality gates: check-types ✅, lint ✅ (0 errors), test ✅ (729), build ✅

See /home/z/my-project/download/audit/ for full Six-Axis audit report.
```

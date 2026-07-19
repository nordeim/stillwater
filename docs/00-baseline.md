# Phase A — Baseline Verification Report

**Run date:** 2026-07-19 (UTC+8)
**Environment:** Node v24.18.0, pnpm 11.9.0, no Docker (sandbox)
**Repo state:** `main` branch, clean working tree, `d3740b5` HEAD

## Quality Gates

| Gate | Result | Docs claim | Drift |
|---|---|---|---|
| `pnpm check-types` | ✅ 9/9 green (45.5s) | 9/9 ✅ | None |
| `pnpm lint` (parallel) | 🔴 **FAILED** — 7 errors, 9 warnings | "0 errors, 9 intentional warnings" | **🔴 7 undocumented errors** |
| `pnpm turbo run lint --concurrency=1` (serial) | 🔴 **FAILED** — same 7 errors, 9 warnings | "2/2 green when run serially" | **🔴 Docs claim serial pass; reality is serial FAIL** |
| `pnpm test` | ✅ 729 tests / 104 files (1m3s) | "~651 tests" | +78 tests (positive drift; docs stale) |
| `pnpm build` | ✅ 9/9 packages, 16 static pages (1m30s) | "9/9 packages, 16 static pages" | None |

## Test Count Breakdown (actual vs documented)

| Package | Actual files | Actual tests | Docs claim (files / tests) | Drift |
|---|---|---|---|---|
| @stillwater/db | 18 | 131 | 19 / 117 | -1 file, +14 tests |
| @stillwater/auth | 4 | 102 | 4 / 102 | None |
| @stillwater/api | 13 | 123 | 14 / 118-119 | -1 file, +4-5 tests |
| @stillwater/payments | 7 | 43 | 7 / 43 | None |
| @stillwater/web | 33 | 215 | 31 / 159 | +2 files, +56 tests |
| @stillwater/email | 17 | 71 | 17 / 71 | None |
| @stillwater/workers | 12 | 44 | 12 / 41-44 | None |
| **Total** | **104** | **729** | **~104 / ~651** | **+78 tests** |

## 🔴 Lint Errors (7 — undocumented)

### Error Group 1: `apps/web/src/app/(marketing)/instructors/[slug]/page.tsx` (2 errors)

```
5:1   error  `@stillwater/db` import should occur before type import of `next`              import/order
5:14  error  'instructors' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
```

**Root cause:** Line 5 imports `{ db, instructors }` from `@stillwater/db`, but the imported `instructors` symbol is shadowed by the callback parameter `instructors` in `where: (instructors, { eq, and }) => ...`. The imported symbol is genuinely unused.

**Fix:** Remove `instructors` from the import (keep `db` only); reorder imports so `@stillwater/db` comes before the `next` type import.

### Error Group 2: `apps/web/src/app/api/auth/[...all]/slug-404-verify.test.ts` (5 errors)

```
51:60  error  Use the `RegExp#exec()` method instead  @typescript-eslint/prefer-regexp-exec
63:60  error  Use the `RegExp#exec()` method instead  @typescript-eslint/prefer-regexp-exec
74:60  error  Use the `RegExp#exec()` method instead  @typescript-eslint/prefer-regexp-exec
115:48 error  Use the `RegExp#exec()` method instead  @typescript-eslint/prefer-regexp-exec
127:48 error  Use the `RegExp#exec()` method instead  @typescript-eslint/prefer-regexp-exec
```

**Root cause:** The v10 V10-1 regression test uses `string.match(regex)` to extract code blocks; `@typescript-eslint/prefer-regexp-exec` requires `regex.exec(string)` instead for clarity and slight performance gain.

**Fix:** Rewrite each `instructorSlugPage.match(/.../)` to `/.../.exec(instructorSlugPage)`.

## 9 Warnings (documented as intentional — verified)

| File:Line | Rule | Intentional? |
|---|---|---|
| `ClassForm.tsx:86` | `react-hooks/incompatible-library` (React Hook Form `watch()`) | ✅ Yes — RHF is incompatible with React Compiler memoization by design |
| `SessionForm.tsx:77` | `react-hooks/incompatible-library` (React Hook Form `watch()`) | ✅ Yes — same |
| `logger.ts:52,55` | `no-console` (2×) | ✅ Yes — structured JSON logger falls back to `console.log/info` when Axiom unset |
| `logger.test.ts:28,29,68,69,85` | `no-console` (5×) | ✅ Yes — tests assert the console fallback behavior |

## Build Warnings (1 — benign)

```
⚠ Using edge runtime on a page currently disables static generation for that page
```

**Cause:** The Better Auth catch-all route at `/api/auth/[...all]/route.ts` runs on Edge runtime per Better Auth's recommendation. Next.js correctly notes this disables static optimization for that route.

**Action:** None — expected and benign.

## Build Resilience Validation

The build succeeded WITHOUT a running Postgres (sandbox has no Docker). This validates the v10-v12 resilience pattern:

```
[generateStaticParams instructors] DB unreachable: Error: Failed query: ...
  code: 'ECONNREFUSED'
```

- v10 V10-1: `generateStaticParams` returns `[]` when DB unreachable → build does not fail
- v11 V11-1: `console.error` makes the issue debuggable in build logs (visible above)
- v12 V12-1: `dynamicParams = false` then 404s all slugs at runtime (correct behavior when no DB)

✅ **The 12-version post-deploy soft-404 saga's resilience pattern is working as designed.**

## Phase A Conclusion

**Baseline is GREEN with one exception:** `pnpm lint` fails with 7 undocumented errors. The docs' claim of "0 errors, 9 intentional warnings" is incorrect — the actual state is "7 errors, 9 warnings".

The 7 lint errors are real code defects (not the documented "typescript-eslint projectService concurrency collision" flake). They break down as:
- 1 unused import (shadowed by callback parameter) in `instructors/[slug]/page.tsx`
- 1 import ordering violation in same file
- 5 `prefer-regexp-exec` violations in `slug-404-verify.test.ts`

These are surgical fixes (≤20 LOC changed) and will be addressed in Phase D — Documentation Reconciliation.

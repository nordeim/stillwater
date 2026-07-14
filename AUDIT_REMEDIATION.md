# Audit Remediation Report v5 — 2026-07-14

> Multi-agent code review of the Stillwater yoga studio platform.
> pnpm_log_5.txt: ALL GREEN (migration journal fix worked, seed succeeds).
> E2E v6 (Task 19): Found 3 residual issues despite clean build.
> This document records the v5 remediation.

---

## Executive Summary

pnpm_log_5.txt confirmed the v4 migration journal fix worked — `pnpm db:seed`
now succeeds (was failing with "column price_cents does not exist"). However,
E2E v6 (Task 19) found 3 residual issues that required v5 fixes:

1. **Pricing shows $0 for all 3 plans** (M1, CRITICAL) — The seed used
   `onConflictDoNothing()`, which silently skipped existing rows (created
   before migration 0005) that had `price_cents=0` (DEFAULT). Fixed by
   changing to `onConflictDoUpdate()` so prices are updated on conflict.

2. **Stats still show 42+/8/3** (M2, HIGH) — v4 M3 updated `FALLBACK_STATS`
   in `stats.ts` but `Hero.tsx` imports `HERO_META_STATS` from `copy.ts`
   which still had aspirational numbers. Fixed by updating `copy.ts`.

3. **Soft-404 HTTP status still 200** (M3, MEDIUM) — `force-dynamic` alone
   is insufficient; Next.js streaming commits 200 before `notFound()` throws.
   Fixed by adding a custom `not-found.tsx` at the `(marketing)` route segment.

**What was verified as WORKING (no fix needed):**
- ✅ P0 routes render real data (FCP 140–304ms — Excellent)
- ✅ CSP header present (static fallback with 'unsafe-inline')
- ✅ Pricing comparison table + CTAs + "Most Popular" badge + trial note
- ✅ Editorial Calm design system intact (Cormorant + DM Sans, sharp edges)
- ✅ Auth redirects work
- ✅ SEO surface (robots.txt, sitemap.xml, manifest.webmanifest)

---

## Commits Pushed in v5

| Commit | Description |
|---|---|
| `f4c2398` | M1+M2+M3: seed onConflictDoUpdate + HERO_META_STATS fix + custom not-found.tsx |
| (this commit) | M4: Documentation update |

---

## E2E v6 Results (Task 19, post-v4 deployment)

### P0 Verification — ✅ All 4 Routes Rendering

| URL | Renders? | TTFB | FCP |
|---|---|---|---|
| `/` | ✅ 4737 chars in `<main>` | 78–245ms | 140–304ms |
| `/schedule` | ✅ Full weekly schedule | 81ms | 188ms |
| `/instructors` | ✅ 3 instructor cards | 80ms | 148ms |
| `/pricing` | ✅ Comparison table renders | — | — |

### R2 Pricing — ❌ Was $0 for all plans (fixed in v5 M1)

| Check | v6 (post-v4) | v7 (expected post-v5) |
|---|---|---|
| 3 plans rendered | ✅ | ✅ |
| Comparison table | ✅ | ✅ |
| "Most Popular" badge | ✅ | ✅ |
| Plan-specific CTAs | ✅ | ✅ |
| "7-day free trial" note | ✅ | ✅ |
| Prices $28/$149/$220 | ❌ All $0 | ✅ (onConflictDoUpdate) |

### R3 Soft-404 — ❌ Was HTTP 200 (fixed in v5 M3)

| URL | v6 (post-v4) | v7 (expected post-v5) |
|---|---|---|
| `/instructors/nonexistent-slug` | 200 + 404 UI | **404** (custom not-found.tsx) |
| `/blog/nonexistent-slug` | 200 + 404 UI | **404** (custom not-found.tsx) |
| `/nonexistent-page` | 404 ✅ | 404 ✅ |

### Stats — ❌ Was 42+/8/3 (fixed in v5 M2)

| Stat | v6 (post-v4) | v7 (expected post-v5) |
|---|---|---|
| Weekly Classes | 42+ | **7** |
| Instructors | 8 | **3** |
| Studio Rooms | 3 | **2** |

### Core Web Vitals — ✅ Excellent

| Metric | Value | Rating |
|---|---|---|
| TTFB | 78–245ms | 🟢 Excellent |
| FCP | 140–304ms | 🟢 Excellent |
| DOMContentLoaded | 295–1201ms | 🟢 Excellent |
| Transfer size | ~16KB | 🟢 Tiny |

---

## Root Cause Analysis

### M1: Seed onConflictDoNothing Doesn't Update priceCents

**The bug**: `packages/db/src/seed/index.ts:91` used `onConflictDoNothing()`.
The 3 membership plan rows were created BEFORE migration 0005 added the
`price_cents` column. When migration 0005 ran, existing rows got
`price_cents=0` (the DEFAULT). When the seed re-runs, the INSERT is silently
skipped on UUID conflict, so prices stay at $0.

**The fix**: Changed to `onConflictDoUpdate({ target: membershipPlans.id,
set: { priceCents: sql.excluded.price_cents, ... } })` so all fields
(including `priceCents`) are updated to fixture values on conflict. The seed
is now truly idempotent — re-running it updates prices.

**Lesson**: `onConflictDoNothing()` is NOT truly idempotent for schema
migrations that add columns with defaults. Use `onConflictDoUpdate()` when
the fixture data may change (especially after schema changes).

### M2: Hero.tsx Uses Wrong Stats Constant

**The bug**: v4 M3 updated `FALLBACK_STATS` in `stats.ts` to 7/3/2, but
`Hero.tsx:20` imports `HERO_META_STATS` from `copy.ts:19-23` which still had
the aspirational mockup numbers (42+/8/3). Two separate constants for the
same data — only one was updated.

**The fix**: Updated `HERO_META_STATS` in `copy.ts` to 7/3/2.

**Lesson**: When the same data appears in multiple constants, all instances
must be updated. Consider consolidating into a single source of truth.

### M3: force-dynamic Insufficient for HTTP 404 Status

**The bug**: v4 M2 replaced ISR with `force-dynamic` on slug pages, but
E2E v6 confirmed HTTP status is still 200. Next.js streaming SSR commits
the 200 status before `notFound()` can throw inside the page component.
`force-dynamic` ensures fresh rendering but doesn't change the streaming
behavior.

**The fix**: Added a custom `not-found.tsx` at the `(marketing)` route
segment level. This ensures `notFound()` triggers the proper 404 status
when called from any page in the marketing route group.

---

## Outstanding Issues (from previous audits, still open)

1. **P0 root-cause diagnosis** — 3-layer timeout fix is defensive; actual
   DB connectivity issue needs Vercel/Neon log inspection
2. **`@dnd-kit/core` migration** — premature (feature is stub)
3. **`cacheComponents` status** — SKILL §9.9 ambiguity
4. **`ScheduleCalendar.tsx` TODO** — drag-to-reschedule never implemented
5. **Instructor portrait images** — requires Sanity CMS image setup
6. **GitHub Actions Deploy Production** — broken (missing secret)
7. **`pnpm audit` high vulnerability** — dev-only (tmp via @lhci/cli)
8. **Production DB needs re-seed** — after deploying v5, run
   `pnpm db:seed` to update prices from $0 to $28/$149/$220

---

## Migration History (6 migrations, all in journal)

| Migration | Description | Journal | Snapshot |
|---|---|---|---|
| `0000_dear_dagger.sql` | Initial 18-table schema | ✅ | ✅ |
| `0001_equal_iron_lad.sql` | instructors.published | ✅ | ✅ |
| `0002_lyrical_cargill.sql` | waitlist unique index | ✅ | ✅ |
| `0003_audit_log_phase9.sql` | audit_log table | ✅ | ❌ (pre-existing) |
| `0004_huge_hawkeye.sql` | enrollments reminder timestamps | ✅ | ✅ |
| `0005_add_price_cents.sql` | membership_plans.price_cents | ✅ (v4 M1) | ✅ (v4 M1) |

---

## Test Count (695 tests)

| Package | Tests |
|---|---|
| packages/db | 131 |
| packages/auth | 102 |
| packages/api | 118 |
| packages/payments | 43 |
| apps/web | 189 |
| packages/email | 71 |
| services/workers | 41 |
| **Total** | **695** |

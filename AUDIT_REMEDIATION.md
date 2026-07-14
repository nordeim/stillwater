# Audit Remediation Report v4 — 2026-07-14

> Multi-agent code review of the Stillwater yoga studio platform.
> E2E v5 (Task 17) verified the live site post-v3 deployment.
> pnpm_log_4.txt revealed a CRITICAL migration journal desync.
> This document records the v4 remediation.

---

## Executive Summary

pnpm_log_4.txt analysis revealed a **CRITICAL migration journal desync**:
the `0005_add_price_cents.sql` migration (created in v3 Milestone 2) was
NOT registered in Drizzle's `_journal.json`, so `pnpm db:migrate` silently
skipped it. This caused:
1. `pnpm db:seed` to fail: `column "price_cents" of relation "membership_plans" does not exist`
2. `/pricing` page to show empty state: "No plans available yet."
3. The mockup comparison table (Milestone 4) couldn't render (empty plans array)

E2E v5 (Task 17) confirmed: CSP fix working ✅, P0 routes still rendering ✅,
but `/pricing` broken ❌ and soft-404 HTTP status still 200 ⚠️.

**What was fixed in v4:**

1. **Migration journal desync** (M1, CRITICAL) — Added `0005_add_price_cents`
   entry to `_journal.json` + created `0005_snapshot.json` with the
   `price_cents` column. `pnpm db:migrate` will now apply the migration,
   `pnpm db:seed` will succeed, and `/pricing` will render with real data.

2. **Soft-404 HTTP status** (M2, MEDIUM) — Replaced ISR (`revalidate=86400/3600`)
   with `dynamic = 'force-dynamic'` on both slug pages. ISR streams the
   response with HTTP 200 before `notFound()` can throw; force-dynamic
   ensures full server-rendering so `notFound()` sets the correct 404 status.

3. **Home page stats inconsistency** (M3, LOW) — Updated `FALLBACK_STATS`
   from aspirational mockup numbers (42+/8/3) to match seed data (7/3/2).

**What was verified as WORKING (no fix needed):**
- ✅ CSP header present on all responses (static fallback from v3 M1)
- ✅ P0 routes still render real data (LCP 724ms — Good range)
- ✅ Auth redirects work (/dashboard, /admin → /auth/sign-in)
- ✅ Sign-in page: Google OAuth + magic-link form
- ✅ SEO surface: robots.txt, sitemap.xml, manifest.webmanifest all 200
- ✅ Editorial Calm design system: warm mineral palette, Cormorant + DM Sans,
  sharp edges, no shadows, no gradients, generous whitespace

---

## Commits Pushed in v4 (4 milestones)

| Commit | Milestone | Description |
|---|---|---|
| `5aa7082` | M1 (CRITICAL) | Register migration 0005 in Drizzle journal + create 0005_snapshot.json |
| `7ab1309` | M2 (MEDIUM) | force-dynamic for slug pages → correct HTTP 404 status |
| `0962155` | M3 (LOW) | Align home page stats with seed data (7/3/2 not 42+/8/3) |
| (this commit) | M4 (Docs) | Documentation update (this file) |

**Total v4 changes:** 4 commits, ~1950 insertions, ~25 deletions.

---

## E2E v5 Results (Task 17, post-v3 deployment)

### P0 Verification — 3/4 Routes Working

| URL | Status | LCP | Notes |
|---|---|---|---|
| `/` | ✅ Renders | 724ms | Hero, schedule, instructors, membership section |
| `/schedule` | ✅ Renders | — | Multi-day schedule with Book CTAs |
| `/instructors` | ✅ Renders | — | 3 instructor cards |
| `/pricing` | ❌ Empty state | — | "No plans available yet." — **fixed in v4 M1** |

### CSP Header Verification — ✅ FIXED (v3 M1 confirmed)

```
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://js.stripe.com;
  style-src 'self' 'unsafe-inline'; ...
```

### Soft-404 Verification — ⚠️ PARTIAL (fixed in v4 M2)

| URL | Pre-v4 | Post-v4 (expected) |
|---|---|---|
| `/instructors/nonexistent-slug` | 200 + 404 UI + noindex | **404** (force-dynamic) |
| `/blog/nonexistent-slug` | 200 + 404 UI + noindex | **404** (force-dynamic) |
| `/nonexistent-page` | 404 ✅ | 404 ✅ |

### Core Web Vitals (Home Page)

| Metric | Value | Rating |
|---|---|---|
| TTFB | 164.3 ms | 🟢 Excellent |
| FCP | 724 ms | 🟢 Good |
| LCP | 724 ms | 🟢 Good |
| DOMContentLoaded | 821 ms | 🟢 Good |
| Transfer size | 16.6 KB | 🟢 Tiny |

### Visual/Aesthetic Observations — ✅ Matches Editorial Calm

- ✅ Warm mineral palette (stone/clay/water/sand)
- ✅ Cormorant Garamond display + DM Sans body + JetBrains Mono for numbers
- ✅ Sharp edges (no rounded corners)
- ✅ No drop shadows, no gradients
- ✅ Generous whitespace
- ⚠️ Instructor portraits show "PORTRAIT" placeholder (requires Sanity CMS)
- ⚠️ Stats showed "8 INSTRUCTORS" vs 3 listed — **fixed in v4 M3**

---

## Root Cause Analysis: Migration Journal Desync

**The bug**: In v3 Milestone 2 (commit `006c557`), I created
`0005_add_price_cents.sql` manually but did NOT update Drizzle Kit's
migration journal (`meta/_journal.json`). Drizzle Kit only applies
migrations listed in the journal — the SQL file alone is not enough.

**Evidence** (pnpm_log_4.txt line 152):
```
cause: error: column "price_cents" of relation "membership_plans" does not exist
code: '42703' (undefined_column)
```

**The fix** (v4 M1, commit `5aa7082`):
1. Added `0005_add_price_cents` entry to `meta/_journal.json` (idx=5)
2. Created `meta/0005_snapshot.json` — copy of 0004 snapshot with
   `price_cents` column added to `membership_plans`

**Lesson learned**: When creating Drizzle migrations manually, always:
1. Create the SQL file: `0005_<name>.sql`
2. Add an entry to `meta/_journal.json` with the correct idx + tag
3. Create a `meta/0005_snapshot.json` reflecting the post-migration schema
4. OR simply run `pnpm drizzle-kit generate` which does all 3 automatically

---

## Outstanding Issues (from previous audits, still open)

1. **P0 root-cause diagnosis** — the 3-layer timeout fix (commits 9ee1e10,
   361166f) is defensive resilience. The actual DB connectivity issue needs
   Vercel function log + Neon query log inspection.

2. **`@dnd-kit/core` → `@dnd-kit/react` migration** — current package is
   unmaintained Legacy. The drag-to-reschedule feature is a non-functional
   stub. Migration is premature — feature needs design first.

3. **`cacheComponents` status** — SKILL §9.9 Gotcha 7 ambiguity.

4. **`ScheduleCalendar.tsx` TODO** — drag-to-reschedule never implemented.

5. **Instructor portrait images** — requires Sanity CMS image setup.

6. **GitHub Actions Deploy Production workflow broken** — missing
   `PROD_DATABASE_URL_UNPOOLED` secret. All recent deploys failed.

7. **`pnpm audit` high vulnerability** — `tmp` package via `@lhci/cli`.

8. **Database migration on production** — after deploying v4 M1, the
   production database needs `pnpm db:migrate` run to apply migration 0005.
   Then `pnpm db:seed` to populate the 3 plans with prices.

---

## Migration History (6 migrations, all now in journal)

| Migration | Description | Journal Entry | Snapshot |
|---|---|---|---|
| `0000_dear_dagger.sql` | Initial 18-table schema | ✅ idx=0 | ✅ |
| `0001_equal_iron_lad.sql` | instructors.published column | ✅ idx=1 | ✅ |
| `0002_lyrical_cargill.sql` | waitlist unique index | ✅ idx=2 | ✅ |
| `0003_audit_log_phase9.sql` | audit_log table + 3 indexes | ✅ idx=3 | ❌ (pre-existing) |
| `0004_huge_hawkeye.sql` | enrollments reminder timestamps | ✅ idx=4 | ✅ |
| **`0005_add_price_cents.sql`** | **membership_plans.price_cents** | **✅ idx=5 (v4 M1)** | **✅ (v4 M1)** |

---

## Test Count (189+ tests)

| Package | Tests | Change in v4 |
|---|---|---|
| packages/db | 131 | — |
| packages/auth | 102 | — |
| packages/api | 118 | — |
| packages/payments | 43 | — |
| **apps/web** | **189** | — (no new tests in v4; fixes are config/schema) |
| packages/email | 71 | — |
| services/workers | 41 | — |
| **Total** | **695** | — |

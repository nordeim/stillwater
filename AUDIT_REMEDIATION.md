# Audit Remediation Report v7 — 2026-07-15

> Multi-agent code review of the Stillwater yoga studio platform.
> pnpm_log_6.txt: DB rebuilt from scratch, ALL GREEN.
> E2E v8 (Task 23): PASS — all P0 routes render real data, pricing shows
> $28/$149/$220, stats 7/3/2, CWV excellent.
> This document records the v7 remediation (2 minor polish fixes).

---

## Executive Summary

The DB server was rebuilt from scratch (Docker volume destroyed + recreated,
migrations applied, seed re-run). pnpm_log_6.txt confirms ALL GREEN — fresh
DB with 3 membership plans (with prices), 3 instructors, 7 sessions.

E2E v8 (Task 23) verdict: **PASS** — all 4 previously-stuck P0 routes now
render real content. The critical pricing page shows $28/$149/$220 with the
full comparison table, "Most Popular" badge, plan-specific CTAs, and trial
note. Core Web Vitals are excellent (TTFB 82ms, FCP 160ms, LCP 160ms, CLS 0).

Two minor polish issues addressed in v7:
1. **Soft-404 HTTP status** (M1) — `notFound()` in `generateMetadata` still
   returned 200 due to PPR streaming. Fixed by disabling PPR for slug routes.
2. **`/about` placeholder text** (M2) — Dev-facing "Full content will appear
   here once Sanity CMS is configured" replaced with customer-facing copy.

**What's now FULLY WORKING (verified by E2E v8):**
- ✅ `/` — hero stats 7/3/2, schedule preview, 3 instructors, membership preview
- ✅ `/schedule` — 20 real class cards across 5 days with instructors + rooms
- ✅ `/instructors` — 3 instructor cards (Mei Tanaka, James Harlow, Aiko Mori)
- ✅ `/pricing` — $28/$149/$220, comparison table, CTAs, badge, trial note
- ✅ "View all 3 instructors" link (was "8")
- ✅ CSP header present
- ✅ Core Web Vitals — TTFB 82ms, FCP 160ms, LCP 160ms, CLS 0.000
- ✅ Editorial Calm design — Cormorant + DM Sans, sharp edges, no shadows
- ✅ Auth redirects — /dashboard, /admin → /auth/sign-in
- ✅ Top-level 404 — HTTP 404

---

## Commits Pushed in v7

| Commit | Description |
|---|---|
| `4d50c4b` | M1+M2: disable PPR for 404 status + customer-facing about copy |
| (this commit) | M3: Documentation update |

---

## E2E v8 Results (Task 23, post-v6 + DB rebuild)

### P0 Routes — ✅ ALL PASS

| Route | Status | Evidence |
|---|---|---|
| `/` | ✅ PASS | Hero stats 7/3/2, schedule preview, 3 instructors, membership |
| `/schedule` | ✅ PASS | 20 class cards across 5 days, real instructors + rooms |
| `/instructors` | ✅ PASS | 3 instructor cards (Mei, James, Aiko) |
| `/pricing` | ✅ PASS | $28/$149/$220, comparison table, CTAs, badge, trial note |

### Pricing Deep Verification — ✅ ALL PASS

- Pay As You Go: **$28** / per class
- Unlimited: **$149** / per month (MOST POPULAR badge ✅)
- 10 Classes: **$220** / use within 90 days
- 7-row comparison table ✅
- Plan-specific CTAs ✅
- 7-day free trial note ✅

### Core Web Vitals — ✅ Excellent

| Metric | Home | Pricing |
|---|---|---|
| TTFB | 82 ms | 86 ms |
| FCP | 160 ms | 200 ms |
| LCP | 160 ms | — |
| DOMContentLoaded | 248 ms | 115 ms |
| CLS | 0.000 | 0.000 |
| Protocol | h3 (HTTP/3) | h3 |

### Visual/Design — ✅ Editorial Calm Confirmed

- `body.fontFamily`: "DM Sans" ✅
- `h1.fontFamily`: "Cormorant Garamond", weight 300 ✅
- `body.color`: rgb(28, 25, 21) warm mineral dark ✅
- `body.backgroundColor`: rgb(245, 240, 232) warm mineral sand ✅
- `borderRadius`: 0px (sharp edges) ✅
- `boxShadow`: none ✅
- No gradients ✅

---

## v7 Fixes

### M1: Soft-404 HTTP Status (PPR Fix)

**The bug**: v6 moved `notFound()` to `generateMetadata`, but E2E v8
confirmed HTTP status was still 200. Root cause: Next.js PPR (Partial
Prerendering) streams a 200 shell before `notFound()` fires.

**The fix**: Added `export const experimental_ppr = false` to both
`/instructors/[slug]` and `/blog/[slug]` routes. This disables PPR for
those segments, ensuring the full response is generated server-side before
being sent, so `notFound()` correctly sets HTTP 404.

### M2: /about Placeholder Text

**The bug**: `/about` page had dev-facing text: "Full content will appear
here once Sanity CMS is configured."

**The fix**: Replaced with customer-facing copy: "Whether you're new to
yoga or deepening an established practice, we offer a space to slow down,
breathe, and return to yourself. Explore our class schedule or meet our
instructors to find the practice that meets you where you are."

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
8. **`/blog` empty state** — no blog posts seeded (expected — no Sanity CMS)

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

---

## Audit Journey Summary (v1 → v7)

| Version | Key Finding | Key Fix |
|---|---|---|
| v1 | P0: 4 routes stuck on "Loading…" | `withTimeout` utility |
| v2 | CSP blocking RSC streaming | Per-request nonce in proxy.ts |
| v3 | Pricing bug: no `priceCents` column | Migration 0005 + seed update |
| v4 | Migration journal desync | Registered 0005 in `_journal.json` |
| v5 | Seed `onConflictDoNothing` → $0 prices | Changed to `onConflictDoUpdate` |
| v6 | `/pricing` empty when DB down | Added `FALLBACK_PLANS` |
| v7 | Soft-404 HTTP 200 (PPR) + /about placeholder | `experimental_ppr = false` + customer copy |

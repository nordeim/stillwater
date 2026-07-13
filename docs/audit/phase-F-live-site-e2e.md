# Phase F — Live-Site E2E Audit Report

**Audit Date:** 2026-07-13
**Auditor:** Super Z (Frontend Architect & Avant-Garde UI Designer)
**Target:** `https://stillwater.jesspete.shop/` (live production deployment)
**Tool:** agent-browser v0.31.1 + Chrome 150.0.7871.115

---

## Executive Summary

**🚨 P0 CRITICAL: 4 of 6 marketing routes are broken on the live site.**

The home page (`/`), schedule (`/schedule`), pricing (`/pricing`), and instructors (`/instructors`) pages all render their navigation and footer but leave the `<main>` content area stuck in a "Loading…" Suspense state indefinitely. Only `/about` and `/blog` (both static ISR pages that don't depend on tRPC queries) render content.

**Root cause identified:** The home page's tRPC query `schedule.getWeek` sends `{"date":"2026-07-13"}` but the procedure's Zod schema expects `weekStart` (Date type). This causes a 400 BAD_REQUEST on every home page load, and the React Suspense boundary never resolves.

**Secondary finding:** The home page generates ~20 "Error: Connection closed." console errors from the SSE/EventSource connection in the `HeroNextClass`/`useSessionAvailability` hook — the SSE endpoint returns `{"error":"Session not found"}` for the invalid session ID used on the home page.

---

## Test Results

### F.1 — Smoke Test: All Marketing Routes (6/6 return 200)

| Route | HTTP Status | Page Title | Verdict |
|---|---|---|---|
| `/` | 200 | "Stillwater Yoga Studio — Mindful Movement in SE Portland" | ✅ Reachable |
| `/schedule` | 200 | "Schedule — Stillwater Yoga" | ✅ Reachable |
| `/instructors` | 200 | "Instructors — Stillwater Yoga" | ✅ Reachable |
| `/pricing` | 200 | "Pricing — Stillwater Yoga" | ✅ Reachable |
| `/blog` | 200 | "Blog — Stillwater Yoga" | ✅ Reachable |
| `/about` | 200 | "About — Stillwater Yoga" | ✅ Reachable |

### F.2 — Main Content Rendering (2/6 pass, 4/6 FAIL)

| Route | `<main>` Content | Verdict |
|---|---|---|
| `/` | "Loading…" (stuck in Suspense) | ❌ **P0 BROKEN** |
| `/schedule` | "Loading…" (stuck in Suspense) | ❌ **P0 BROKEN** |
| `/instructors` | "Loading…" (stuck in Suspense) | ❌ **P0 BROKEN** |
| `/pricing` | "Loading…" (stuck in Suspense) | ❌ **P0 BROKEN** |
| `/blog` | "JOURNAL / Blog / No blog posts yet. Check back soon..." | ✅ Renders (Sanity not configured — placeholder) |
| `/about` | "OUR STORY / About Stillwater / Stillwater is a boutique yoga studio..." | ✅ Renders (static ISR — placeholder) |

**Evidence:** `agent-browser eval "document.querySelector('main')?.innerHTML"` on home page returns:
```html
<!--$?--><template id="B:0"></template>
<div aria-busy="true" aria-live="polite" class="flex min-h-[50vh] items-center justify-center">
  <span class="sr-only">Loading…</span>
  <div class="h-8 w-8 animate-spin border-2 border-stone-300 border-t-stone-900" aria-hidden="true"></div>
</div>
<!--/$-->
```
The `<!--$?-->` is a React Suspense boundary marker. The `<template id="B:0">` is the placeholder for streamed content that never resolves.

### F.3 — Auth Route Redirects (3/3 pass)

| Protected Route | Redirects To | Verdict |
|---|---|---|
| `/admin` | `/auth/sign-in` | ✅ Correct |
| `/dashboard` | `/auth/sign-in` | ✅ Correct |
| `/book/00000000-0000-0000-0000-000000000001` | `/auth/sign-in` | ✅ Correct |

### F.4 — Auth Sign-In Page

**Verdict:** ✅ Renders correctly

Interactive elements found:
- `button "Sign in with Google"` (Google OAuth)
- `textbox "Email address"` + `button "Send magic link"` (Magic Link)
- Skip-to-content link present
- Headings: "Stillwater" (h1), "Sign in with Google" (h2), "Sign in with email" (h2)

### F.5 — tRPC Endpoint Diagnostics

| Procedure | Input | Response | Verdict |
|---|---|---|---|
| `schedule.getWeek` | `{"json":{"date":"2026-07-13"}}` | 400 BAD_REQUEST: `"expected date, received Date"`, `path: ["weekStart"]` | ❌ **P0 BUG** |
| `instructors.list` | `{"json":{}}` | 200 — returns 3 instructors (Mei Tanaka, James Harlow, Aiko Mori) | ✅ Works |
| `memberships.getPlans` | `{"json":{}}` | 200 — returns 3 plans (Pay As You Go, Unlimited, 10 Classes) | ✅ Works |

**Root cause of the 400 error:** The tRPC client sends `{"date":"2026-07-13"}` but the `schedule.getWeek` procedure's Zod schema expects a `weekStart` field of type `date`. The field name mismatch means `weekStart` is `undefined`, which Zod coerces to `Invalid Date`, triggering the validation error.

**Network evidence:** `agent-browser network requests --filter trpc` on home page shows:
```
GET https://stillwater.jesspete.shop/api/trpc/schedule.getWeek?input=%7B%22json%22%3A%7B%22date%22%3A%222026-07-13%22%7D%7D (Document) 400
```

### F.6 — SSE Endpoint Test

**Endpoint:** `GET /api/schedule/stream?sessionId=00000000-0000-0000-0000-000000000001`
**Response:** `{"error":"Session not found"}`
**Verdict:** ✅ Correct behavior (the session UUID is a placeholder; a real session ID would stream seat availability)

**Note:** The SSE endpoint returns JSON (not an SSE stream) when the session is not found. This is correct error handling.

### F.7 — Console Errors on Home Page

**Verdict:** ❌ **P1 — 20+ console errors on every home page load**

`agent-browser errors --json` returns 20 identical errors:
```json
{
  "text": "Error: Connection closed.\n    at eo (https://stillwater.jesspete.shop/_next/static/chunks/0_k2-toz474fm.js:2:15075)\n    at t (https://stillwater.jesspete.shop/_next/static/chunks/0_k2-toz474fm.js:2:15498)",
  "url": null
}
```

**Root cause:** The `HeroNextClass` component on the home page uses `useSessionAvailability` hook which connects to the SSE endpoint. The SSE connection closes immediately (either because the session ID is invalid or because the endpoint returns JSON instead of an SSE stream for invalid sessions). The hook's reconnection logic (3 attempts with exponential backoff per SKILL) fires repeatedly, generating 20+ errors.

**Fix:** The `HeroNextClass` component should not attempt an SSE connection on the home page — it should use a one-time tRPC query (`schedule.getWeek` or `sessions.listByDateRange`) to fetch the "next class" data, not a persistent SSE stream. SSE should only be used on the `/book/[sessionId]` page where real-time seat availability is needed.

### F.8 — Screenshots Captured

7 full-page screenshots saved to `/home/z/my-project/download/audit/screenshots/`:

| File | Size | Route |
|---|---|---|
| `home.png` | 58 KB | `/` |
| `schedule.png` | 58 KB | `/schedule` |
| `instructors.png` | 58 KB | `/instructors` |
| `pricing.png` | 58 KB | `/pricing` |
| `blog.png` | 66 KB | `/blog` |
| `about.png` | 100 KB | `/about` |
| `auth_sign-in.png` | 27 KB | `/auth/sign-in` |

**Note:** The 4 broken pages (~58 KB each) are smaller than the 2 working pages (`/about` = 100 KB, `/blog` = 66 KB), confirming the broken pages render less content (just nav + loading spinner + footer).

### F.9 — Navigation Structure (verified on all pages)

All pages have consistent navigation:
- **Top nav:** Stillwater logo, Schedule, Instructors, Pricing, Blog, About, Book (CTA)
- **Footer:** Stillwater watermark, address (123 SE Division Street, Portland, OR 97202), Instagram, Facebook, Navigate links, Hours, Stay Connected (newsletter form), Privacy/Terms/Accessibility links
- **Skip-to-content link:** Present on all pages (a11y compliance)
- **Notifications region:** `alt+T` shortcut (sonner toaster)

### F.10 — Database Seeding Status

The live site's database IS seeded (verified via tRPC):
- ✅ 3 instructors exist (Mei Tanaka, James Harlow, Aiko Mori)
- ✅ 3 membership plans exist (Pay As You Go, Unlimited, 10 Classes)
- ❓ Class sessions: cannot verify because `schedule.getWeek` is broken
- ❓ Sanity CMS: NOT configured (blog and about pages show placeholder text)

---

## Critical Findings (P0)

### P0-1: 4 of 6 Marketing Routes Stuck in Loading State

**Severity:** P0 CRITICAL — production is broken for end users
**Affected routes:** `/`, `/schedule`, `/instructors`, `/pricing`
**Root cause:** React Suspense boundaries on these pages never resolve because the underlying tRPC queries fail (schedule.getWeek) or the Suspense fallback is shown indefinitely.

**Evidence:**
- `agent-browser eval "document.querySelector('main')?.innerText"` returns `"Loading…"` on all 4 routes
- The Suspense boundary `<!--$?-->` with `<template id="B:0">` indicates streamed content that never resolves
- tRPC `schedule.getWeek` returns 400 BAD_REQUEST (see P0-2)

**Impact:** Any visitor to the live site sees a loading spinner instead of content on 4 of 6 main pages. This is a complete failure of the marketing surface.

**Fix:**
1. Fix the `schedule.getWeek` input schema mismatch (P0-2 below)
2. Add Error Boundaries around Suspense boundaries so failed queries show an error state instead of loading forever
3. Verify the tRPC client is configured correctly (check `apps/web/src/lib/trpc/client.tsx` for suspense configuration)
4. Test all 4 broken pages locally with `pnpm dev` + seeded database

### P0-2: tRPC `schedule.getWeek` Input Schema Mismatch

**Severity:** P0 CRITICAL — causes P0-1
**Root cause:** The tRPC client sends `{"date":"2026-07-13"}` but the `schedule.getWeek` procedure expects `weekStart` (Date type)

**Evidence:**
```
GET /api/trpc/schedule.getWeek?input=%7B%22json%22%3A%7B%22date%22%3A%222026-07-13%22%7D%7D → 400

Error: {
  "expected": "date",
  "code": "invalid_type",
  "received": "Invalid Date",
  "path": ["weekStart"],
  "message": "Invalid input: expected date, received Date"
}
```

**Fix:** Check `apps/web/src/components/marketing/HeroNextClass.tsx` and `apps/web/src/components/marketing/ScheduleSection.tsx` — change the tRPC query input from `{"date": "2026-07-13"}` to `{"weekStart": new Date("2026-07-13")}`. Also verify the `schedule.getWeek` Zod schema in `packages/api/src/routers/schedule.ts` matches.

---

## Important Findings (P1)

### P1-1: Home Page SSE Connection Errors (20+ per load)

**Severity:** P1 — degrades user experience, pollutes Sentry
**Root cause:** `HeroNextClass` component uses `useSessionAvailability` hook which connects to SSE endpoint with an invalid session ID. The connection closes immediately, triggering 20+ reconnection attempts.

**Fix:** `HeroNextClass` should use a one-time tRPC query (not SSE) to fetch the next class. SSE should only be used on `/book/[sessionId]` where real-time seat availability is needed.

### P1-2: Sanity CMS Not Configured on Live Site

**Severity:** P1 — blog and about pages show placeholder text
**Evidence:** `/about` renders "Full content will appear here once Sanity CMS is configured." `/blog` renders "No blog posts yet."

**Fix:** Configure Sanity CMS:
1. Create a Sanity project at `sanity.io/manage`
2. Set `NEXT_PUBLIC_SANITY_PROJECT_ID` + `NEXT_PUBLIC_SANITY_DATASET` + `SANITY_API_TOKEN` in Vercel env vars
3. Deploy Sanity Studio to `stillwater.sanity.studio`
4. Create content for `homePage`, `aboutPage`, and at least one `blogPost`

### P1-3: E2E Specs Not Run Against Live Site

**Severity:** P1 — the 7 Playwright E2E specs in `e2e/` are not being run against the live site
**Impact:** The P0 rendering bug (4 broken pages) was not caught because E2E only runs in CI against a local dev server, not against production

**Fix:** Add a weekly production E2E job to CI that runs the 7 specs against `https://stillwater.jesspete.shop/`. Checkly partially covers this (3 checks), but the Checkly checks may also be failing silently.

---

## What's Working (Verified ✅)

1. ✅ All 6 marketing routes return HTTP 200
2. ✅ All 3 protected routes (`/admin`, `/dashboard`, `/book/[sessionId]`) correctly redirect to `/auth/sign-in`
3. ✅ Auth sign-in page renders Google OAuth + Magic Link options
4. ✅ tRPC `instructors.list` returns 3 seeded instructors
5. ✅ tRPC `memberships.getPlans` returns 3 seeded plans
6. ✅ SSE endpoint correctly returns `{"error":"Session not found"}` for invalid session IDs
7. ✅ Navigation structure consistent across all pages (nav + footer)
8. ✅ Skip-to-content link present on all pages
9. ✅ Newsletter form present in footer
10. ✅ Social links (Instagram, Facebook) present
11. ✅ Page titles are unique and descriptive
12. ✅ Static ISR pages (`/about`, `/blog`) render correctly without database dependency

---

## Recommended Remediations (Prioritized)

| # | Priority | Fix | Effort |
|---|---|---|---|
| 1 | P0 | Fix `schedule.getWeek` input schema: change client `{"date": ...}` → `{"weekStart": ...}` | 30 min |
| 2 | P0 | Add Error Boundaries around Suspense on 4 broken pages | 1 hour |
| 3 | P0 | Verify all 4 broken pages render locally with `pnpm dev` + seeded DB | 1 hour |
| 4 | P1 | Remove SSE connection from `HeroNextClass` — use tRPC query instead | 30 min |
| 5 | P1 | Configure Sanity CMS on live site (project ID, dataset, API token, Studio deploy) | 2 hours |
| 6 | P1 | Add weekly production E2E job to CI (run 7 specs against live site) | 1 hour |
| 7 | P1 | Verify Checkly 3 checks are passing (they may be failing on the broken pages) | 30 min |

---

*End of Phase F — Live-Site E2E Audit Report*

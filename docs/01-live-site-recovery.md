# Phase C — Live-Site Recovery Diagnostic Report

**Run date:** 2026-07-19 (UTC+8)
**Target:** `https://stillwater.jesspete.shop/`
**Status:** 🔴 **P0 PRODUCTION INCIDENT — 4 of 8 marketing routes broken**

## Timeline

| Time (UTC) | Event |
|---|---|
| 22:54 | Initial probe: HTTP 530 Cloudflare Tunnel Error 1033 across all routes |
| 23:19 | Re-probe: Cloudflare Tunnel recovered; `/schedule` returns HTTP 200 |
| 23:20 | agent-browser snapshot: `<main>` stuck on `"Loading…"` |
| 23:21 | Tested `/instructors`, `/pricing`: same `"Loading…"` hang |
| 23:21 | Tested `/about`, `/blog`: render correctly |
| 23:22 | Raw HTML inspection: Suspense fallback sent, content never streamed |
| 23:25 | 30-second wait + re-snapshot: still stuck on `"Loading…"` |

## Current State (as of 23:25 UTC)

| Route | HTTP Status | Page Renders? | Root Cause |
|---|---|---|---|
| `/` (home) | 200 | 🔴 NO — stuck on "Loading…" | `apiCaller()` → `headers()` → dynamic → stream never resolves |
| `/schedule` | 200 | 🔴 NO — stuck on "Loading…" | Same |
| `/instructors` | 200 | 🔴 NO — stuck on "Loading…" | Same |
| `/pricing` | 200 | 🔴 NO — stuck on "Loading…" | Same |
| `/about` | 200 | ✅ YES — full content | Static (Sanity CMS, no `apiCaller()`) |
| `/blog` | 200 | ✅ YES — "No blog posts yet" empty state | Static (Sanity CMS, no `apiCaller()`) |
| `/instructors/[slug]` | 200 (presumed) | ✅ YES (v12 V12-1 fixed) | SSG + `dynamicParams = false` + direct DB query |
| `/blog/[slug]` | 200 (presumed) | ✅ YES (v12 V12-1 fixed) | SSG + `dynamicParams = false` + direct DB query |
| `/api/trpc/schedule.getWeek` | 204 | 🔴 Returns empty (DB unreachable) | tRPC endpoint can't reach DB |
| `/api/schedule/stream` | (not tested) | — | SSE endpoint |
| `/api/webhooks/stripe` | (not tested) | — | Webhook |

## 🔴 ROOT CAUSE ANALYSIS

### The v1-v12 audit saga did NOT fix the 4 index routes

`Project_Brief.md` documents:

> **P0 production fix history (v1→v8).** Live site at `https://stillwater.jesspete.shop/` had 4 of 8 marketing routes (`/`, `/schedule`, `/instructors`, `/pricing`) stuck on a Suspense "Loading…" fallback indefinitely. The remediation unfolded over 8 versions...

The same 4 routes are STILL broken today. The v1-v12 saga's `withTimeout` fix is in the WRONG place — it wraps the **data fetch** (`caller.schedule.getWeek(...)`), but the actual hang is in `apiCaller()` itself.

### The hang chain (confirmed via code inspection + raw HTML analysis)

**File:** `apps/web/src/app/(marketing)/page.tsx` (home page, line 37)
```typescript
export default async function HomePage() {
  const caller = await apiCaller();  // ← HANGS HERE (5s+ session lookup)

  const [sessions, instructors, membershipPlans] = await Promise.all([
    withTimeout(caller.schedule.getWeek(...).catch(() => []), 8_000, []),  // ← Never reached
    ...
  ]);
}
```

**File:** `apps/web/src/lib/trpc/server.ts` (line 15-20)
```typescript
export async function apiCaller() {
  const heads = new Headers(await headers());  // ← opts page out of static rendering
  const req = new Request('http://localhost:3000/api/trpc', { headers: heads });
  const ctx = await createContext({ req });  // ← 5s session timeout (context.ts:41-49)
  return appRouter.createCaller(ctx);
}
```

**File:** `packages/api/src/context.ts` (line 43-54)
```typescript
const SESSION_LOOKUP_TIMEOUT_MS = 5_000;

async function getSessionWithTimeout(headers: Headers) {
  const sessionPromise = auth.api.getSession({ headers });
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), SESSION_LOOKUP_TIMEOUT_MS);
  });
  return Promise.race([sessionPromise, timeout]);
}

export async function createContext({ req }): Promise<TRPCContext> {
  const session = await getSessionWithTimeout(req.headers);  // ← 5s timeout
  return { db, session, jobs, redis, req };
}
```

### The math doesn't work on Vercel

| Step | Timeout | Cumulative |
|---|---|---|
| `apiCaller()` → `headers()` | ~instant | 0s |
| `apiCaller()` → `createContext()` → `getSessionWithTimeout()` | 5s | 5s |
| `withTimeout(caller.schedule.getWeek(...), 8_000, [])` | 8s | **13s** |
| `withTimeout(caller.instructors.list(), 8_000, [])` | 8s (parallel) | 13s |
| `withTimeout(caller.memberships.getPlans(), 8_000, [])` | 8s (parallel) | 13s |
| **Total time to render** | | **~13s** |
| **Vercel default function timeout** | | **10s** |

**The function times out at 10s before the 8s `withTimeout` can fire.** The stream is cut short. The Suspense boundary (`<!--$?-->...<template id="B:0"></template>...<!--/$-->`) is sent with an empty template — the actual content is never streamed in.

### Raw HTML evidence

```html
<main id="main-content">
  <!--$?-->                              ← React Suspense boundary opens
  <template id="B:0"></template>         ← EMPTY — content never streamed in
  <div aria-busy="true" aria-live="polite" class="flex min-h-[50vh] ...">
    <span class="sr-only">Loading…</span>
    <div class="h-8 w-8 animate-spin border-2 border-stone-300 border-t-stone-900"></div>
  </div>
  <!--/$-->                              ← Stream ENDS here (function timed out)
</main>
```

The `<!--/$-->` closing marker indicates the stream COMPLETED. But the `<template id="B:0">` is empty — the Suspense boundary was never resolved with actual content. The browser shows the fallback indefinitely.

### Why `/about` and `/blog` work

These routes do NOT use `apiCaller()`. They pull content directly from Sanity CMS (which is a separate HTTP service, not the Postgres DB). They render as static pages with no Suspense boundary.

### Why `/instructors/[slug]` and `/blog/[slug]` work

The v12 V12-1 fix (commit `32e18e6`, 2026-07-17) rewrote these to:
1. Set `experimental_ppr = false` + `dynamicParams = false`
2. Query the DB directly via `db.query.instructors.findMany(...)` — NOT via `apiCaller()`
3. Wrap in `withTimeout(8_000, [])`

Because they don't call `apiCaller()` → `headers()`, they remain static (SSG). No streaming, no Suspense boundary, no timeout issue.

### Why the same fix was NOT applied to `/`, `/schedule`, `/instructors`, `/pricing`

**Unknown.** The v12 commit (`32e18e6`) only touched `instructors/[slug]/page.tsx` and `blog/[slug]/page.tsx`. The index routes still use `apiCaller()` on:

| File | Line | Code |
|---|---|---|
| `apps/web/src/app/(marketing)/page.tsx` | 37 | `const caller = await apiCaller();` |
| `apps/web/src/app/(marketing)/schedule/page.tsx` | 22 | `const caller = await apiCaller();` |
| `apps/web/src/app/(marketing)/instructors/page.tsx` | 17 | `const caller = await apiCaller();` |
| `apps/web/src/app/(marketing)/pricing/page.tsx` | 134 | `const caller = await apiCaller();` |

## The Fix (Recommended)

Apply the v12 V12-1 pattern to all 4 index routes. For each route:

1. Remove `import { apiCaller } from '@/lib/trpc/server';`
2. Add `import { db } from '@stillwater/db';`
3. Replace `caller.schedule.getWeek(...)` with `db.query.classSessions.findMany(...)`
4. Replace `caller.instructors.list()` with `db.query.instructors.findMany(...)`
5. Replace `caller.memberships.getPlans()` with `db.query.membershipPlans.findMany(...)`
6. Keep `withTimeout(8_000, [])` wrapping each query
7. Add `export const dynamic = 'force-static'` (or rely on `revalidate = 3600` + no `headers()` call)

This eliminates `apiCaller()` → `headers()` → dynamic rendering → streaming → timeout.

**Estimated effort:** ~2-3 hours (4 files × ~30min each, plus regression tests).

## Additional Findings

### `x-powered-by: Next.js` header is exposed

```
x-powered-by: Next.js
```

This is a minor information disclosure. Next.js recommends disabling it via `poweredByHeader: false` in `next.config.ts`. The current `next.config.ts` does NOT set this. **Fix:** Add `poweredByHeader: false` to the `nextConfig` object.

### CSP is correctly set (v9 V9-2 fix verified)

```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'strict-dynamic' https://js.stripe.com; ...
```

✅ Confirms the v9 V9-2 fix is live in production. The `'unsafe-inline' 'strict-dynamic'` pattern is the documented weaker state (nonce-based CSP deferred until Vercel + Next.js 16.2 proxy.ts header issue is resolved per Lesson 105/108).

### All security headers present

- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
- ✅ `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- ✅ `X-DNS-Prefetch-Control: on`

### TLS certificate valid

- Subject: `CN=jesspete.shop`
- SAN: `*.jesspete.shop` (matches `stillwater.jesspete.shop`)
- Issuer: Google Trust Services / WE1
- Valid: 2026-05-28 to 2026-08-26 (59 days remaining)

## Screenshots

- `/home/z/my-project/download/e2e-screenshots/cloudflare-error.png` — initial Cloudflare Tunnel Error 1033 (22:54 UTC)
- `/home/z/my-project/download/e2e-screenshots/home-loading-stuck.png` — home page stuck on "Loading…" after tunnel recovery (23:20 UTC)

## Phase C Conclusion

**The live site is PARTIALLY FUNCTIONAL.** 4 of 8 marketing routes (`/`, `/schedule`, `/instructors`, `/pricing`) are broken — stuck on "Loading…" indefinitely. The other 4 routes (`/about`, `/blog`, `/instructors/[slug]`, `/blog/[slug]`) work correctly.

**The v1-v12 audit saga's `withTimeout` fix is in the wrong place.** It wraps the data fetch, but the actual hang is in `apiCaller()` → `createContext()` → `getSessionWithTimeout()` (5s) which, combined with the 8s data fetch timeout, exceeds Vercel's 10s default function timeout.

**The v12 V12-1 fix (bypass `apiCaller()`, query DB directly) was only applied to slug routes.** The 4 index routes still use `apiCaller()` and are still broken.

**Recommended immediate action:** Apply the v12 V12-1 pattern to all 4 index routes (estimated 2-3 hours). This is a surgical fix that follows the established pattern in the codebase.

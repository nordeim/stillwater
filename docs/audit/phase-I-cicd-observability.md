# Phase I — CI/CD + Observability Audit

**Repo:** `/home/z/my-project/stillwater/`
**Auditor:** Explore (CI/CD & Observability Auditor)
**Date:** 2026-07-13
**Scope:** 3 GitHub workflows, pnpm version mismatch, Sentry / PostHog / Axiom / Checkly configs, bundle budgets, Lighthouse, rollback plan, environment management, feature flags, Build Cop role.
**Source docs:** `stillwater_SKILL.md` §11.8 / §14.6.3 / Appendix D; `CLAUDE.md`; `PAD.md` §18–§20.

---

## Executive Summary

**Verdict: YELLOW — Solid scaffolding with several critical gaps between documented intent and actual implementation.**

The repo ships a comprehensive observability surface — Sentry (client + server + edge + instrumentation), PostHog (18 events + reverse proxy + correct singular `capture_pageview`), structured logger, request-id propagation, 3 Checkly checks, bundle-size budgets, Lighthouse thresholds, and 3 GitHub workflows. Documentation in `stillwater_SKILL.md` is thorough.

However, the implementation has **1 P0** and **10 P1** findings:

1. **P0-1** — pnpm 9.15.4 (EOL 2026-04-30) pinned in all 3 workflows while `package.json` declares `pnpm@11.9.0`. The `pnpm-workspace.yaml` uses pnpm 11+ features (`allowBuilds`, `minimumReleaseAge`) that pnpm 9.x silently ignores — supply-chain guardrails are **not enforced in CI**.
2. **P1-1** — CI runs only **6 of 8** quality gates. Lighthouse (Gate 6) and bundle-size (Gate 7) configs exist but are not invoked in `ci.yml`.
3. **P1-2** — No `concurrency:` blocks in any workflow.
4. **P1-3** — No path filters — docs-only PRs trigger full CI.
5. **P1-4** — `logger.ts` does **not** send to Axiom. `AXIOM_TOKEN`/`AXIOM_DATASET` declared in `.env.example` but never consumed.
6. **P1-5** — No `checkly.config.ts` — 60s cadence, Slack/PagerDuty routing, and severity levels are documented but unenforced.
7. **P1-6** — No `.github/dependabot.yml` despite SKILL §11.8.4 mandate.
8. **P1-7** — No feature flag code in `apps/` or `packages/` despite SKILL §11.8.2 mandate and Decision D10.
9. **P1-8** — No automatic `vercel rollback` on production smoke-test failure.
10. **P1-9** — No Build Cop Slack mention; ci.yml has no Slack notification at all.
11. **P1-10** — Production smoke test only checks `https://stillwater.studio` HTTP 200 — no /schedule, /api/trpc, /api/schedule/stream coverage.

Lockfile is up-to-date (`pnpm install --frozen-lockfile --dry-run` exits 0). Sentry + PostHog configs are correct in shape. Bundle budgets match the spec (80/200/400 kb). Lighthouse thresholds (Perf 95 warn, A11y/SEO/BP 100 error) are correctly configured.

---

## Per-Workflow Analysis

### 1. `.github/workflows/ci.yml` (115 lines)

**Trigger** (lines 3–7):
- `pull_request` on `develop`, `main`
- `push` on `develop`

**Services** (lines 18–41):
| Service | Image | Healthcheck | Interval | Timeout | Retries |
|---------|-------|-------------|----------|---------|---------|
| Postgres | `postgres:17-alpine` | `pg_isready` | 5s | 5s | 10 |
| Redis | `redis:7-alpine` | `redis-cli ping` | 5s | 3s | 5 |

**Steps (in order):**
1. Checkout — `actions/checkout@v4` (line 45)
2. Setup pnpm — `pnpm/action-setup@v4` with `version: ${{ env.PNPM_VERSION }}` (lines 47–50) ← **P0-1**
3. Setup Node 22 — `actions/setup-node@v4` with `cache: 'pnpm'` (lines 52–56) ✅
4. Install deps — `pnpm install --frozen-lockfile` (line 59) ✅
5. Run migrations — `DATABASE_URL_UNPOOLED` env (lines 61–64)
6. Seed DB — same env (lines 66–69)
7. **Gate 1** Type check — `pnpm check-types` (line 73)
8. **Gate 2** Lint — `pnpm lint` (line 77)
9. **Gate 3** Test w/ coverage — env: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (lines 80–86)
10. **Gate 4** Build — `pnpm build` (line 90)
11. **Gate 5** E2E tests — `pnpm test:e2e` (line 94)
12. **Gate 8** Security audit — `pnpm audit --audit-level=high` (line 98)
13. Upload coverage — `actions/upload-artifact@v4`, `if: always()`, 7-day retention (lines 100–106)
14. Upload Playwright report — `if: failure()`, 7-day retention (lines 108–114)

**Caching:** ✅ pnpm cache via `actions/setup-node` with `cache: 'pnpm'`.

**Environment variables:**
- `NODE_VERSION: '22'` (line 10)
- `PNPM_VERSION: '9.15.4'` (line 11) ← **P0-1** — EOL + mismatch with `package.json:43` (`pnpm@11.9.0`)

**Concurrency controls:** ❌ None. Rapid PR pushes stack workflow runs.

**Artifact uploads:** `coverage-report` (always), `playwright-report` (on failure).

**Issues found:**
- **P0-1** pnpm version mismatch.
- **P1-1** Only 6 of 8 quality gates run. Missing: Gate 6 (Lighthouse) + Gate 7 (bundle-size). `lighthouserc.js` and `scripts/check-bundle-size.js` exist but are not invoked.
- **P1-2** No `concurrency:` block.
- **P1-3** No path filters — `*.md` changes trigger full CI.
- **P2** Playwright `webServer.command: 'pnpm dev'` (`playwright.config.ts:41`) — E2E runs against dev server, not production build. Also flag order (`--filter` should precede script name).

---

### 2. `.github/workflows/deploy-preview.yml` (60 lines)

**Trigger** (lines 3–6):
- `pull_request` types `opened`, `synchronize`, `reopened` on `develop`, `main`

**Restriction** (line 16): `if: github.event.pull_request.head.repo.full_name == github.repository` — skips fork PRs. ✅

**Steps:**
1. Checkout (line 19–20)
2. Setup pnpm — `version: ${{ env.PNPM_VERSION }}` ← **P0-1**
3. Setup Node 22 with `cache: 'pnpm'` (lines 27–31) ✅
4. Install deps — `--frozen-lockfile` (line 34)
5. Build with `NEXT_PUBLIC_APP_URL: https://stillwater-pr-${{ github.event.pull_request.number }}.vercel.app` (lines 36–39)
6. Deploy to Vercel — `amondnet/vercel-action@v25`, `vercel-args: '--prod=false'` (lines 41–48)
7. Comment PR with preview URL — `actions/github-script@v7` (lines 50–59)

**Caching:** ✅ pnpm cache.

**Environment variables:**
- `NODE_VERSION: '22'` (line 9)
- `PNPM_VERSION: '9.15.4'` (line 10) ← **P0-1**
- Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

**Concurrency controls:** ❌ None.

**Artifact uploads:** None.

**Issues found:**
- **P0-1** pnpm version mismatch.
- **P1-2** No `concurrency:` block — rapid pushes stack preview deploys.
- **P2-10** PR comment URL is hardcoded as `stillwater-pr-<n>.vercel.app` (line 58) — Vercel preview URLs typically include a random hash suffix (`stillwater-pr-123-abc123.vercel.app`); the comment may post a 404 link. Should extract actual URL from `amondnet/vercel-action` step output (`steps.<id>.outputs.previewUrl`).
- **P2** No environment secret protection — any collaborator can trigger preview deploy.

---

### 3. `.github/workflows/deploy-production.yml` (72 lines)

**Trigger** (lines 3–5):
- `push` on `main`

**Environment** (line 15): `environment: production` — enables GitHub environment protection rules (manual approval, branch restrict). ✅

**Steps:**
1. Checkout (line 18–19)
2. Setup pnpm — `version: ${{ env.PNPM_VERSION }}` ← **P0-1**
3. Setup Node 22 with `cache: 'pnpm'` (lines 26–30) ✅
4. Install deps — `--frozen-lockfile` (line 33)
5. **Run DB migrations** — `DATABASE_URL_UNPOOLED: ${{ secrets.PROD_DATABASE_URL_UNPOOLED }}` (lines 36–39) — migrations run BEFORE deploy ✅ (correct ordering for zero-downtime)
6. **Deploy to Vercel** — `amondnet/vercel-action@v25`, `vercel-args: '--prod'` (lines 42–49)
7. **Smoke test** — `curl -s -o /dev/null -w "%{http_code}" https://stillwater.studio`, expect 200, exit 1 on failure (lines 52–59)
8. **Notify Slack** — `if: always()`, `slackapi/slack-github-action@v1.26.0`, posts success/failure with commit message (lines 62–71)

**Caching:** ✅ pnpm cache.

**Environment variables:**
- `NODE_VERSION: '22'` (line 8)
- `PNPM_VERSION: '9.15.4'` (line 9) ← **P0-1**
- Secrets: `PROD_DATABASE_URL_UNPOOLED`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `SLACK_WEBHOOK_URL`

**Concurrency controls:** ❌ None — two pushes to main can race migrations (one applies, second fails or double-applies).

**Artifact uploads:** None.

**Issues found:**
- **P0-1** pnpm version mismatch.
- **P1-2** No `concurrency:` block — `concurrency: { group: deploy-production, cancel-in-progress: false }` should be set (do NOT cancel mid-migration).
- **P1-8** No automatic `vercel rollback` step when smoke test fails. The job exits 1 but production stays on the broken deployment. Migrations already applied; no DB rollback path either.
- **P1-10** Smoke test only checks homepage HTTP 200. Does NOT test: `/schedule`, `/api/trpc/schedule.getWeek`, `/api/schedule/stream` (SSE), auth flow.
- **P2-11** `slackapi/slack-github-action@v1.26.0` — v1.x is in maintenance; v2.x is current. Payload format differs.
- **P2** Slack message uses `${{ github.event.head_commit.message }}` (line 68) — multi-line commit messages break Slack formatting; should truncate or use first line only.

---

## pnpm Version Mismatch (P0-1)

### Evidence

| Location | Declared version |
|----------|------------------|
| `.github/workflows/ci.yml:11` | `PNPM_VERSION: '9.15.4'` |
| `.github/workflows/deploy-production.yml:9` | `PNPM_VERSION: '9.15.4'` |
| `.github/workflows/deploy-preview.yml:10` | `PNPM_VERSION: '9.15.4'` |
| `package.json:43` | `"packageManager": "pnpm@11.9.0"` |
| `pnpm-lock.yaml:1` | `lockfileVersion: '9.0'` (compatible across pnpm 9/10/11) |
| Local install (verified) | `pnpm --version` → `11.9.0` |

### Why this is P0

1. **EOL:** pnpm 9.x reached End-of-Life on 2026-04-30. No security patches.
2. **Feature gap:** `pnpm-workspace.yaml` (lines 39–57) uses pnpm v11+ settings:
   - `allowBuilds:` (line 39) — replaces deprecated `onlyBuiltDependencies` from v9/v10
   - `minimumReleaseAge: 1440` (line 51) — supply-chain guardrail (24h delay on new releases)
   - `minimumReleaseAgeStrict: true` (line 52)
   - `minimumReleaseAgeExclude:` (lines 56–57)
   
   pnpm 9.x silently ignores these — **supply-chain guardrails are NOT enforced in CI** even though they're configured.
3. **Reproducibility risk:** Local devs on pnpm 11.9.0 see different install behavior than CI on pnpm 9.15.4. `pnpm install --frozen-lockfile` may succeed on both, but the resulting `node_modules` layout differs (esp. for native modules in `allowBuilds`).
4. **SKILL §2.2 line 176** explicitly states "pnpm 9.x is EOL" as the rationale for the `>=11.0.0` engines requirement.

### Optimal Fix (RECOMMENDED)

Remove the `PNPM_VERSION` env var AND the `version:` input from all 3 workflows. `pnpm/action-setup@v4` auto-reads the `packageManager` field from `package.json` when `version` is omitted — this is the canonical single-source-of-truth pattern.

```yaml
# Before (3 places):
env:
  NODE_VERSION: '22'
  PNPM_VERSION: '9.15.4'
# ...
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: ${{ env.PNPM_VERSION }}

# After:
env:
  NODE_VERSION: '22'
# ...
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  # version omitted — reads packageManager from package.json
```

### Alternative Fix

Bump `PNPM_VERSION: '9.15.4'` → `PNPM_VERSION: '11.9.0'` in all 3 workflows. Less ideal because it duplicates the version in 4 places (3 workflows + package.json).

### Verification

After fix, run `pnpm install --frozen-lockfile` in CI — should succeed with no warnings about unknown settings in `pnpm-workspace.yaml`. Local install already verified up-to-date:

```
$ pnpm install --frozen-lockfile --dry-run
✓ Lockfile passes supply-chain policies (verified 23m ago)
EXIT: 0
```

---

## `pnpm-lock.yaml` Verification

| Check | Result |
|-------|--------|
| Lockfile exists at repo root | ✅ `/home/z/my-project/stillwater/pnpm-lock.yaml` (20,475 lines) |
| CI uses `--frozen-lockfile` | ✅ `ci.yml:59`, `deploy-preview.yml:34`, `deploy-production.yml:33` |
| Lockfile up-to-date | ✅ `pnpm install --frozen-lockfile --dry-run` exits 0 (verified locally on pnpm 11.9.0) |
| `lockfileVersion` | `'9.0'` — compatible across pnpm 9/10/11 |

No action needed on the lockfile itself.

---

## Sentry Config Audit

### `apps/web/sentry.client.config.ts` (38 lines)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| 10% traces | ✅ | `tracesSampleRate: 0.1` (line 20) |
| 5% replay | ✅ | `replaysSessionSampleRate: 0.05` (line 21) |
| 100% error replay | ✅ | `replaysOnErrorSampleRate: 1.0` (line 22) |
| PII-aware mask for `/api/trpc/bookings` | ⚠️ PARTIAL | `beforeBreadcrumb` filters breadcrumbs (lines 30–36) but does NOT mask request bodies in error events or transaction payloads |
| Skip on missing/placeholder DSN | ✅ | line 17 — `!dsn.includes('your-key') && !dsn.includes('your-project')` |
| `replayIntegration` configured | ✅ | lines 23–28 with `maskAllText: false`, `blockAllMedia: false` |

**P2-1:** PII masking is breadcrumb-only. Sentry's `beforeSend` hook should also redact `event.request.body` for booking endpoints. The current `maskAllText: false` is permissive — booking form fields (member name, email) could appear in session replays.

### `apps/web/sentry.server.config.ts` (25 lines)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Server-side init | ✅ | line 16 |
| 10% traces | ✅ | `tracesSampleRate: 0.1` (line 18) |
| Skip on missing/placeholder DSN | ✅ | line 15 |
| Expected-error filtering | ✅ | `ignoreErrors: ['NEXT_REDIRECT', 'NEXT_NOT_FOUND']` (lines 20–23) |

**Minor:** No `beforeSend` hook for server-side PII redaction on booking endpoints.

### `apps/web/sentry.edge.config.ts` (20 lines)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Edge runtime init | ✅ | line 16 |
| Minimal config | ✅ | `tracesSampleRate: 0.1` only (line 18) |
| Skip on missing/placeholder DSN | ✅ | line 15 |

### `apps/web/instrumentation.ts` (15 lines)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Loads Sentry per runtime | ✅ | `NEXT_RUNTIME === 'nodejs'` → `sentry.server.config` (lines 9–11); `NEXT_RUNTIME === 'edge'` → `sentry.edge.config` (lines 12–14) |
| Client config auto-loaded | ✅ | Sentry Next.js SDK auto-discovers `sentry.client.config.ts` |

### `apps/web/next.config.ts` — `withSentryConfig` (lines 184–204)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `withSentryConfig` wraps `nextConfig` | ✅ | line 204 — `withBundleAnalyzer(withSentryConfig(nextConfig, sentryConfig))` |
| Source map upload in CI | ✅ | lines 194–196 — conditional spread: `...(process.env.SENTRY_AUTH_TOKEN ? { authToken: ... } : {})` |
| No-op when `SENTRY_AUTH_TOKEN` unset | ✅ | Same conditional — `authToken` property absent when env var unset |
| `silent: true` | ✅ | line 192 — suppresses noisy build logs |
| Tree-shake Sentry logger | ✅ | `widenClientFileUpload: true` (line 201) |
| Disable webpack plugin in dev | ✅ | `disableServerWebpackPlugin` + `disableClientWebpackPlugin` when `NODE_ENV === 'development'` (lines 198–199) |
| `exactOptionalPropertyTypes` compliance | ✅ | Conditional spread documented in comment (lines 188–189) |

---

## PostHog Config Audit

### `apps/web/src/lib/analytics/posthog.ts` (82 lines)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `capture_pageview` (SINGULAR) | ✅ | line 20 — `capture_pageview: true` (NOT `capture_pageviews` per SKILL Gotcha 86 / Lesson 92) |
| `api_host: '/_analytics'` reverse proxy | ✅ | line 19 |
| `capture_exceptions: true` | ✅ | line 21 |
| `persistence: 'localStorage+cookie'` | ✅ | line 22 |
| Dev-only opt-in capturing | ✅ | lines 23–27 |
| 18 events exported | ✅ | Counted: `pageViewed`, `scheduleBrowsed`, `classDetailViewed`, `pricingViewed`, `signupStarted`, `signupCompleted`, `firstClassBooked`, `classBooked`, `classCancelled`, `waitlistJoined`, `waitlistSpotClaimed`, `checkInCompleted`, `membershipStarted`, `membershipUpgraded`, `membershipPaused`, `membershipCancelled`, `paymentFailed`, `paymentRecovered` = **18** |
| `ANALYTICS_EVENT_COUNT = 18` invariant | ✅ | line 81 — self-documenting constant |

Event name taxonomy: snake_case, past tense ✅ (matches PAD §18.2).

### `apps/web/src/components/analytics/PostHogProvider.tsx` (27 lines)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Client component | ✅ | `'use client'` (line 10) |
| `useEffect` calls `initPostHog` | ✅ | lines 21–23 |
| Empty deps array (init once) | ✅ | line 23 |

### Reverse proxy verification

`apps/web/next.config.ts` rewrites (lines 149–161):
- `/_analytics/static/:path*` → `https://app.posthog.com/static/:path*` ✅
- `/_analytics/:path*` → `https://app.posthog.com/:path*` ✅

### "Hedgehog mode" (toolbar) auto-disable

| Requirement | Status | Evidence |
|-------------|--------|----------|
| CSP ships NO `'unsafe-eval'` in `script-src` | ✅ | `next.config.ts:107` — `"script-src 'self' https://js.stripe.com"` |
| Toolbar auto-disables when `'unsafe-eval'` absent | ✅ | Documented in SKILL §14.6.3 (line 4892): "PostHog's 'hedgehog mode' (toolbar) auto-disables when 'unsafe-eval' is absent, which is acceptable." |

---

## Axiom Config Audit — P1-4

### `apps/web/src/lib/observability/logger.ts` (83 lines)

**P1 FINDING — Axiom integration NOT implemented.**

The doc comment (line 6) claims: *"Sends structured JSON logs to console (and optionally Axiom via HTTP)."*

The implementation:
- Writes to `console.debug/info/warn/error` only (lines 50–63)
- **0 occurrences** of `AXIOM_TOKEN` in `apps/web/src/` (verified via grep)
- **0 occurrences** of `AXIOM_DATASET` in `apps/web/src/` (verified via grep)
- **0 occurrences** of `axiom` (case-insensitive) in `apps/web/src/` (verified via grep)
- No HTTP client to Axiom's ingestion API (`https://api.axiom.co/v1/datasets/_ingest`)
- No null-fallback conditional — there is ONLY console output, no Axiom path at all

`.env.example` declares both vars (lines 73–74):
```
AXIOM_TOKEN=xaat-...
AXIOM_DATASET=stillwater-logs
```

But the logger never reads them.

**Impact:** Structured logs go to Vercel stdout only (captured by Vercel's log drain). No Axiom APL query capability, no log-based alerts, no correlation with Sentry errors via `requestId`.

**Severity:** P1 — observability is half-baked. The structured JSON shape is correct (timestamp/level/message/context) and would be Axiom-compatible if actually shipped.

**Recommended fix:** Add a batched HTTP ingestion step to `output()`:

```typescript
import { createHash } from 'crypto';

const AXIOM_URL = `https://api.axiom.co/v1/datasets/${process.env.AXIOM_DATASET}/_ingest`;
const AXIOM_TOKEN = process.env.AXIOM_TOKEN;

let buffer: LogEntry[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function flushBuffer() {
  if (buffer.length === 0 || !AXIOM_TOKEN) return;
  const payload = buffer.splice(0);
  fetch(AXIOM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AXIOM_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch(() => { /* silent fail — console already has the log */ });
}

function output(level: LogLevel, entry: LogEntry): void {
  const json = JSON.stringify(entry);
  // Console fallback (always — Vercel log drain + local dev)
  console[level === 'debug' ? 'debug' : level === 'info' ? 'info' : level === 'warn' ? 'warn' : 'error'](json);
  // Axiom (only if configured)
  if (AXIOM_TOKEN) {
    buffer.push(entry);
    if (!flushTimer) flushTimer = setTimeout(flushBuffer, 1000);
    if (buffer.length >= 100) flushBuffer();
  }
}
```

### `apps/web/src/lib/observability/request-id.ts` (31 lines)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Reads `x-request-id` header | ✅ | lines 23–25 — `headers().get('x-request-id')` |
| Falls back to `randomUUID()` | ✅ | line 29 |
| `server-only` guard | ✅ | line 14 |
| Async function (Next.js 16 `headers()` API) | ✅ | line 23 |

### `apps/web/src/lib/observability/error-boundary.tsx` (97 lines)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Class component | ✅ | line 29 |
| `getDerivedStateFromError` + `componentDidCatch` | ✅ | lines 35–39 |
| `Sentry.captureException` with `componentStack` | ✅ | line 41 |
| Structured JSON log to console | ✅ | lines 44–56 |
| Fallback UI with "Try again" button | ✅ | lines 69–92 |

---

## Checkly Config Audit — P1-5

### Existing check files (3)

| File | What it checks | Threshold |
|------|----------------|-----------|
| `checkly/checks/api-health.check.ts` | `GET /api/trpc/schedule.getWeek` | HTTP 200 + response time < 500ms |
| `checkly/checks/booking-flow.check.ts` | Navigate `/schedule`, click first class, verify booking button visible | Visual assertion |
| `checkly/checks/sse-endpoint.check.ts` | `EventSource` on `/api/schedule/stream?sessionId=<test-id>` | Event received within 5s |

### **P1 FINDING — Missing `checkly.config.ts`**

Verified: `ls checkly/` returns only `checks/` subdirectory — **no `checkly.config.ts` or `checkly.config.js`** at repo root or in `checkly/`.

**Impact:**
1. **60s cadence NOT enforced.** Check files declare no `frequency` — they rely on Checkly's default (usually 5 minutes). SKILL §D.2 (line 9363) and the task spec require 60s.
2. **Alert channels NOT configured.** No `alertChannels` declaration. SKILL §D.2 specifies Slack `#alerts` (all check failures), PagerDuty (Stripe webhook Critical). Without code config, these must be set manually in Checkly dashboard — drift risk.
3. **Severity levels NOT attached.** SKILL §D.2 specifies:
   - SSE-down → **Warning**
   - Booking failure rate >5% → **Critical**
   - Stripe webhook failures >5min → **PagerDuty Critical**
   
   None of these are in the check files. The checks themselves don't even monitor "booking failure rate" or "Stripe webhook processing latency" — those would need separate checks querying the DB or a metrics endpoint.
4. **`checkly deploy` cannot run** without a config file.

### Required fix

Create `checkly/checkly.config.ts`:

```typescript
import { defineConfig } from 'checkly';

export default defineConfig({
  projectName: 'stillwater',
  checks: {
    frequency: 60,           // 60s cadence
    retryStrategy: { type: 'FIXED', count: 1, interval: 1000 },
    alertChannels: {
      slack: [{ type: 'SLACK', url: process.env.SLACK_ALERTS_WEBHOOK_URL }],
      pagerduty: [{ type: 'PAGERDUTY', integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY }],
    },
  },
  defaults: {
    tags: ['production', 'stillwater'],
  },
});
```

And add per-check severity tags:
- `sse-endpoint.check.ts` → `tags: ['warning']`
- `booking-flow.check.ts` → `tags: ['critical']`

Plus add 2 missing checks:
- `checkly/checks/booking-failure-rate.check.ts` — query `/api/health/booking-failure-rate` (needs a metrics endpoint)
- `checkly/checks/stripe-webhook-health.check.ts` — query `/api/health/webhook-lag` (needs a metrics endpoint)

---

## Bundle Size + Lighthouse Audit

### `scripts/check-bundle-size.js` (103 lines)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Reads `.bundle-stats.json` | ✅ | line 18 — `apps/web/.bundle-stats.json` |
| Reads build manifest | ✅ | lines 19–20, 36–38 |
| Per-route budget comparison | ✅ | lines 47–89 |
| Warning at 90% of budget | ✅ | line 49 — `budget * budgets.global.warning` |
| Error at 100% of budget | ✅ | line 76 |
| Exit 1 on any route exceeding budget | ✅ | lines 93–95 |
| Marketing < 80kb | ✅ | `/` budget = 80 (`apps/web/.bundle-stats.json:3`) |
| Booking < 200kb | ✅ | `/book/[sessionId]` budget = 200 (`.bundle-stats.json:5`) |
| Admin < 400kb | ✅ | `/admin` budget = 400 (`.bundle-stats.json:7`) |

**Issues:**
- **P1-1** Script is NOT wired into CI — verified via grep, no `check-bundle-size` invocation in `.github/workflows/ci.yml`.
- **P2-4** Gzipped size estimated as 30% of raw (line 72 — `Math.round((totalSize * 0.3) / 1024)`). Actual gzip ratio varies (25–40%). Should use `zlib.gzipSync(fileBuffer).length`.
- **P2** Script path is hardcoded to `apps/web/.next/...` — fails if run from a non-root cwd. Should use `process.cwd()` + relative path resolution (already does, but `cd apps/web && node scripts/check-bundle-size.js` would break).

### `apps/web/.bundle-stats.json` (16 lines)

All 7 routes have budgets:
- `/` → 80kb (marketing)
- `/schedule` → 90kb
- `/book/[sessionId]` → 200kb (booking)
- `/dashboard` → 150kb
- `/admin` → 400kb
- `/admin/revenue` → 400kb
- `/admin/schedule` → 400kb

Global: `warning: 0.9`, `error: 1.0` (lines 12–15). ✅

### `lighthouserc.js` (49 lines)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Performance 95+ (warn) | ✅ | line 32 — `['warn', { minScore: 0.95 }]` |
| Accessibility 100 (error) | ✅ | line 33 — `['error', { minScore: 1.0 }]` |
| SEO 100 (error) | ✅ | line 34 |
| Best Practices 100 (error) | ✅ | line 35 |
| LCP < 1500ms (warn) | ✅ | line 37 |
| CLS < 0.05 (error) | ✅ | line 38 |
| FCP < 1000ms (warn) | ✅ | line 39 |
| Routes audited | ✅ | 5 routes: `/`, `/schedule`, `/pricing`, `/instructors`, `/about` (lines 15–20) |
| `numberOfRuns: 3` | ✅ | line 24 — statistical median |
| `preset: 'desktop'` | ✅ | line 26 |
| Upload target: filesystem | ✅ | line 43 |

**Issues:**
- **P1-1** Lighthouse is NOT wired into CI — verified via grep, no `lighthouse` invocation in `ci.yml`.
- **P2-5** `startServerCommand: 'pnpm start --filter=@stillwater/web'` (line 22) — pnpm filter flag should come BEFORE the script name: `pnpm --filter=@stillwater/web start`. Current syntax may not filter correctly.
- **P2-6** Only `preset: 'desktop'` configured — mobile Core Web Vitals (Google ranking factor) not measured.

---

## Dependabot / CODEOWNERS / PR Template Audit

### `.github/dependabot.yml` — MISSING (P1-6)

Verified: `ls .github/dependabot.yml` → No such file or directory.

**SKILL §11.8.4** (lines 2800–2822) mandates:
- Weekly schedule
- Grouped updates for Next.js/React, Drizzle, Tailwind
- GitHub Actions ecosystem

**SKILL OWASP A03 row** (line 4830) lists "Dependabot/Renovate weekly (recommended)" as a supply-chain guardrail — unimplemented.

**Recommended fix:** Create `.github/dependabot.yml` using the SKILL §11.8.4 template verbatim (lines 2802–2822):

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      nextjs:
        patterns: ['next', 'react', 'react-dom', '@types/react', '@types/react-dom']
      drizzle:
        patterns: ['drizzle-orm', 'drizzle-kit', '@auth/drizzle-adapter']
      tailwind:
        patterns: ['tailwindcss', '@tailwindcss/postcss', 'prettier-plugin-tailwindcss']
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

### `.github/CODEOWNERS` (33 lines)

| Path | Owner | Status |
|------|-------|--------|
| `*` (default) | `@nordeim` (line 2) | ✅ |
| `/packages/db/` | `@nordeim` (line 5) | ✅ |
| `/packages/api/`, `/packages/payments/`, `/services/workers/` | `@nordeim` (lines 8–10) | ✅ |
| `/packages/ui/`, `/apps/web/src/components/`, `/apps/web/src/app/` | `@nordeim` (lines 13–15) | ✅ |
| `/packages/auth/`, `/apps/web/proxy.ts` | `@nordeim` (lines 18–19) | ✅ |
| `/tooling/`, `/.github/`, `/docker-compose.yml`, `/infrastructure/` | `@nordeim` (lines 22–25) | ✅ |
| Docs (`PAD.md`, `MASTER_EXECUTION_PLAN.md`, `stillwater_SKILL.md`, `CLAUDE.md`, `README.md`) | `@nordeim` (lines 28–32) | ✅ |

**Issues:**
- **P2-3** Single owner (`@nordeim`) — single point of failure. No team-based ownership (e.g., `@stillwater/backend`, `@stillwater/frontend`).
- **P2-3** Missing entries: `/packages/email/`, `/packages/config/`, `/checkly/`, `/e2e/`, `/scripts/` — fall through to default `* @nordeim`.

### `.github/PULL_REQUEST_TEMPLATE.md` (76 lines)

| Section | Status | Evidence |
|---------|--------|----------|
| Summary | ✅ | lines 1–3 |
| Related Issue | ✅ | lines 5–7 |
| Type of Change | ✅ | lines 9–15 |
| Architecture Validation Checklist | ✅ | lines 17–51 — Security, Data, Performance, Reliability, A11y, Documentation |
| Migration Rollback Script | ✅ | lines 53–61 — SQL placeholder block |
| Screenshots | ✅ | lines 63–65 |
| Test Evidence | ⚠️ PARTIAL | lines 67–75 |

**P2-2 — Test Evidence section needs stricter raw-output requirement.**

Current template (lines 67–75):
```bash
<!-- Paste the raw output of the quality gate commands -->
pnpm check-types  # exit 0
pnpm lint         # exit 0
pnpm test         # 0 failures
pnpm build        # exit 0
```

Per SKILL §11.3, the template should require **actual terminal output** with explicit exit codes, not commented summaries. The placeholder text `# exit 0` invites authors to leave it as-is rather than pasting real output.

**Recommended fix:**
```markdown
## Test Evidence

Paste the RAW terminal output of each command (including `$?` exit code). Do NOT summarize.

\`\`\`bash
$ pnpm check-types
<raw output>
$ echo $?
0

$ pnpm lint
<raw output>
$ echo $?
0

$ pnpm test:coverage
<raw output including coverage %>
$ echo $?
0

$ pnpm build
<raw output>
$ echo $?
0
\`\`\`

Coverage must be ≥ 90% on `packages/api/routers/*` (PAD §4 TDD mandate).
```

---

## Rollback Plan Audit

### Documentation status — PARTIAL

| Source | Mentions rollback? | Detail |
|--------|-------------------|--------|
| `stillwater_SKILL.md` §11.8.3 (lines 2785–2798) | ✅ | Full 3-step procedure: Vercel instant rollback, Drizzle forward-only (write down-migration manually), Stripe retries 3 days |
| `stillwater_SKILL.md` Decision D10 (line 3122) | ✅ | "instant rollback without redeploy" via feature flags |
| `CLAUDE.md` line 63 | ✅ | "Include rollback script as PR comment for any migration" |
| `CLAUDE.md` line 458 | ✅ | PR checklist: "reversible migration with rollback script" |
| `CLAUDE.md` line 612 | ✅ | "every migration PR requires rollback script" |
| `.github/PULL_REQUEST_TEMPLATE.md` lines 53–61 | ✅ | SQL rollback script placeholder |
| `AGENTS.md` | ❌ | 0 matches for "rollback" |
| `ROLLBACK.md` (ops runbook) | ❌ | Does not exist |

### Implementation status — P1-8

- ❌ `deploy-production.yml` smoke-test failure (lines 52–59) does NOT trigger `vercel rollback`. The job exits 1 but production stays on the broken deployment.
- ❌ No `vercel rollback` step anywhere in any workflow.
- ❌ No DB down-migration template beyond the PR placeholder.
- ❌ No Stripe webhook "check for failed webhooks" step after rollback.

**Recommended fix:** Add to `deploy-production.yml` after smoke test:

```yaml
- name: Rollback on smoke test failure
  if: failure()
  run: |
    # Get the previous production deployment URL
    PREV_DEPLOY=$(vercel ls --prod --json | jq -r '.deployments[1].url')
    echo "Rolling back to $PREV_DEPLOY"
    vercel rollback "$PREV_DEPLOY" --yes --token ${{ secrets.VERCEL_TOKEN }}
- name: Notify Slack of rollback
  if: failure()
  uses: slackapi/slack-github-action@v2
  with:
    slack-message: "🚨 Production deploy rolled back due to smoke test failure. Commit: ${{ github.sha }}"
```

Also create `ROLLBACK.md` at repo root as an ops runbook.

---

## Environment Management Audit

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `.env.example` committed | ✅ | 93 lines, comprehensive (Stripe, Sanity, Resend, Upstash, Sentry, PostHog, Axiom, Cloudflare, Vercel, Neon) |
| `.env` NOT committed | ✅ | `.gitignore:8` — `.env` |
| `.env.local` ignored | ✅ | `.gitignore:9` |
| `.env.*.local` ignored | ✅ | `.gitignore:10–12` |
| `.env.example` explicitly NOT ignored | ✅ | `.gitignore:13` — comment: "NOTE: .env.example is COMMITTED intentionally" |
| `.env.test` committed (no real secrets) | ❌ | **Does not exist** — task spec mandates this |
| CI secrets in GitHub Secrets | ✅ | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `PROD_DATABASE_URL_UNPOOLED`, `SLACK_WEBHOOK_URL` |
| Production secrets in Vercel env vars | ⚠️ | Cannot verify from repo; assumed based on Vercel deploy config |
| No env var validation on startup | ❌ | Env vars read via `process.env` with null fallbacks; no Zod `parse()` at startup |

**P2-8:** `.env.test` not committed. CI uses inline env vars in `ci.yml:82–85` (DATABASE_URL, UPSTASH_REDIS_REST_URL, etc.) — works but not DRY. Committing `.env.test` with test-only values would centralize test config.

**P2-12:** No env var validation on startup. A typo in `BETTER_AUTH_SECRET` would silently fall back to undefined. SKILL pattern: use Zod env schema with `parse()` at startup. The `packages/config/src/env.ts` and `packages/auth/src/config.ts` files exist but use `process.env` directly with null fallbacks (per SKILL §15.21 — infrastructure clients bypass Zod env module, but app-level env vars should still be validated).

---

## Feature Flags Audit — P1-7

**SKILL §11.8.2** (lines 2767–2783) mandates:
- Use Upstash Redis for flag storage
- Pattern: `redis.get(`flag:new-booking-flow:${userId}`)`
- Lifecycle: Create → Enable for testing → Canary (1% → 10% → 100%) → Full rollout → Remove

**SKILL Decision D10** (line 3122): "Production cutover → Feature-flag-gated progressive rollout (5% → 25% → 100%) — PostHog feature flags already in stack; instant rollback without redeploy; each stage requires 48h green metrics."

### **P1 FINDING — No feature flag code in codebase.**

Verified via grep across `apps/` and `packages/`:
- 0 matches for `featureFlag`
- 0 matches for `feature-flag`
- 0 matches for `isFeatureEnabled`
- 0 matches for `enableFeature`
- 0 matches for `flag:` prefix in Redis calls
- 0 matches for `@upstash/feature-flags`

The `posthog-js@^1.396.6` package (apps/web/package.json:61) supports `posthog.getFeatureFlag('flag-key')` but this API is never invoked.

**Recommended fix options (pick one):**

1. **PostHog feature flags** (already in stack, lower implementation cost):
   ```typescript
   const flag = posthog.getFeatureFlag('new-booking-flow');
   if (flag === 'enabled') renderNewFlow();
   else renderLegacyFlow();
   ```

2. **Upstash Redis pattern** (per SKILL §11.8.2):
   ```typescript
   const enabled = await redis.get(`flag:new-booking-flow:${userId}`);
   if (enabled === 'true') renderNewFlow();
   ```

3. **Defer to v2** — update SKILL to mark feature flags as "v2 scope" to align docs with code.

---

## Build Cop Role Audit — P1-9

**SKILL §11.8.5** (lines 2826–2830) mandates:
- Designate someone as Build Cop
- CI failures ping the Build Cop directly (not the whole team)
- Build Cop rotates weekly in solo/small-team context
- Current Build Cop documented in team Slack channel

### **P1 FINDING — Not implemented.**

- `ci.yml` has **NO Slack notification on failure** — only artifact uploads (lines 100–114).
- `deploy-production.yml` Slack notification (lines 62–71) sends to a webhook — pings the whole team, NOT a specific Build Cop user/group.
- No `BUILD_COP_SLACK_USER_ID` secret or env var in any workflow.
- No `BUILD_COP.md` runbook at repo root documenting rotation.
- 0 matches for "Build Cop" in `CLAUDE.md` or `AGENTS.md`.

**Recommended fix:**

1. Add Slack notification step to `ci.yml` on failure:
   ```yaml
   - name: Notify Build Cop on failure
     if: failure()
     uses: slackapi/slack-github-action@v2
     with:
       webhook-url: ${{ secrets.SLACK_BUILD_COP_WEBHOOK_URL }}
       slack-message: |
         🚨 CI failed on ${{ github.ref_name }}
         Build Cop: <@${{ secrets.BUILD_COP_SLACK_USER_ID }}>
         Commit: ${{ github.event.head_commit.message }}
         Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
   ```

2. Create `BUILD_COP.md` at repo root documenting the rotation schedule and on-call expectations.

3. Add `BUILD_COP_SLACK_USER_ID` to GitHub Secrets; rotate when Build Cop rotates.

---

## CI Optimization Audit (SKILL §11.8.6)

| Strategy | Implemented? | Evidence |
|----------|--------------|----------|
| Cache deps (pnpm cache via `actions/setup-node`) | ✅ | `ci.yml:56`, `deploy-preview.yml:31`, `deploy-production.yml:30` — all use `cache: 'pnpm'` |
| Parallel jobs | ❌ | All 8 gates run sequentially in single `quality-gates` job (`ci.yml:14`). Total runtime = sum of all gate durations. |
| Path filters (only run affected package tests) | ❌ | No `paths:` or `paths-ignore:` in any workflow trigger |
| Matrix builds (shard test suites) | ❌ | No `strategy: matrix:` in any workflow |

### Recommended parallelization

Split `quality-gates` job into 4 parallel jobs:

```yaml
jobs:
  lint-types:
    runs-on: ubuntu-latest
    steps: [checkout, setup, install, pnpm lint, pnpm check-types]

  test:
    runs-on: ubuntu-latest
    services: [postgres, redis]
    steps: [checkout, setup, install, migrate, seed, pnpm test:coverage, upload coverage]

  build-e2e:
    runs-on: ubuntu-latest
    needs: [lint-types]  # don't waste cycles on broken code
    steps: [checkout, setup, install, pnpm build, pnpm test:e2e, upload playwright report]

  audit:
    runs-on: ubuntu-latest
    steps: [checkout, setup, install, pnpm audit --audit-level=high]
```

Estimated speedup: ~40% (lint-types + audit run in parallel with test + build-e2e).

### Recommended path filters

```yaml
on:
  pull_request:
    branches: [develop, main]
    paths-ignore:
      - '**/*.md'
      - 'docs/**'
      - 'LICENSE'
      - '.gitignore'
```

### Recommended concurrency controls

```yaml
# ci.yml
concurrency:
  group: ci-${{ github.ref }}-${{ github.event.pull_request.number }}
  cancel-in-progress: true

# deploy-preview.yml
concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true

# deploy-production.yml
concurrency:
  group: deploy-production
  cancel-in-progress: false  # NEVER cancel mid-migration
```

---

## Critical Findings (P0)

### P0-1: pnpm version mismatch (EOL pnpm 9.15.4 vs 11.9.0)

- **Files:** `.github/workflows/ci.yml:11`, `.github/workflows/deploy-production.yml:9`, `.github/workflows/deploy-preview.yml:10`, `package.json:43`
- **Impact:** CI runs on EOL pnpm 9.x (no security patches since 2026-04-30). `pnpm-workspace.yaml` uses pnpm 11+ features (`allowBuilds`, `minimumReleaseAge`, `minimumReleaseAgeStrict`) which pnpm 9.x silently ignores — supply-chain guardrails are NOT enforced in CI even though configured. Local devs on pnpm 11.9.0 see different install behavior than CI.
- **Fix:** Remove `PNPM_VERSION` env var AND `version: ${{ env.PNPM_VERSION }}` input from all 3 workflows. Let `pnpm/action-setup@v4` auto-read from `packageManager` field in `package.json`. This is the canonical single-source-of-truth pattern.

---

## Important Findings (P1)

### P1-1: CI runs only 6 of 8 quality gates
- **File:** `.github/workflows/ci.yml:43–114`
- **Impact:** Lighthouse (Gate 6) and bundle-size (Gate 7) configs exist (`lighthouserc.js`, `scripts/check-bundle-size.js`, `apps/web/.bundle-stats.json`) but are NOT invoked in CI. Bundle size regressions and Lighthouse regressions ship to production undetected.
- **Fix:** Add steps after `pnpm build`:
  ```yaml
  - name: Gate 6: Lighthouse CI
    run: pnpm lighthouse ci
  - name: Gate 7: Bundle size check
    run: node scripts/check-bundle-size.js
  ```

### P1-2: No concurrency controls in any workflow
- **Files:** `.github/workflows/ci.yml`, `deploy-preview.yml`, `deploy-production.yml`
- **Impact:** Rapid PR pushes stack workflow runs, wasting GitHub Actions minutes. Two pushes to main can race DB migrations.
- **Fix:** Add `concurrency:` block. `cancel-in-progress: true` for PR workflows; `cancel-in-progress: false` for production deploy.

### P1-3: No path filters — docs-only PRs trigger full CI
- **Files:** All 3 workflows
- **Impact:** A 1-line README change triggers full CI (~10 min) including E2E tests against Postgres+Redis service containers.
- **Fix:** Add `paths-ignore: ['**/*.md', 'docs/**']` to PR triggers.

### P1-4: Axiom integration not implemented in logger.ts
- **File:** `apps/web/src/lib/observability/logger.ts:1–83`
- **Impact:** `AXIOM_TOKEN` and `AXIOM_DATASET` declared in `.env.example:73–74` but never consumed. Structured logs go to Vercel stdout only — no Axiom query/alert capability. The doc comment claims "optionally Axiom via HTTP" but the code path doesn't exist.
- **Fix:** Add batched HTTP ingestion to `https://api.axiom.co/v1/datasets/${AXIOM_DATASET}/_ingest` with `Authorization: Bearer ${AXIOM_TOKEN}`. Wrap in try/catch with console fallback when env vars missing. See code snippet in Axiom section above.

### P1-5: Checkly config (`checkly.config.ts`) missing
- **Files:** `checkly/` directory — only `checks/` subdirectory exists
- **Impact:** 3 check files exist but their schedule (60s), alert channels (Slack `#alerts`, PagerDuty), and severity routing (Warning vs Critical) are not declared in code. `checkly deploy` cannot run. SKILL §D.2 documents intended behavior but unimplemented.
- **Fix:** Add `checkly/checkly.config.ts` with frequency, alert channels, per-check criticality. Add 2 missing checks (booking failure rate, Stripe webhook health).

### P1-6: Dependabot config missing
- **File:** `.github/dependabot.yml` (does not exist)
- **Impact:** SKILL §11.8.4 mandates weekly Dependabot. Supply-chain updates are manual-only. SKILL OWASP A03 lists Dependabot as a guardrail — unimplemented.
- **Fix:** Create `.github/dependabot.yml` using SKILL §11.8.4 template (lines 2802–2822 of `stillwater_SKILL.md`).

### P1-7: Feature flags not implemented
- **Files:** 0 occurrences of `featureFlag`/`feature-flag`/`flag:` in `apps/` or `packages/`
- **Impact:** SKILL §11.8.2 mandates feature flag pattern using Upstash Redis. SKILL Decision D10 mandates "Feature-flag-gated progressive rollout (5% → 25% → 100%)" for production cutover. No code exists to support this.
- **Fix:** Use PostHog feature flags (already in stack) — `posthog.getFeatureFlag('flag-key')` — or Upstash Redis pattern from SKILL §11.8.2.

### P1-8: No automatic rollback on production deploy failure
- **File:** `.github/workflows/deploy-production.yml:52–59`
- **Impact:** Smoke test failure exits 1 but doesn't roll back. Production stays on the new (broken) deployment. Migrations already applied before deploy — no DB rollback path either.
- **Fix:** Add `vercel rollback` step after smoke test failure, before Slack notify. See code snippet in Rollback Plan section above.

### P1-9: No Build Cop role implementation
- **Files:** No Slack ping to a Build Cop in any workflow; no `BUILD_COP.md` runbook
- **Impact:** SKILL §11.8.5 mandates CI failures ping Build Cop directly. Current behavior: `ci.yml` has no Slack notification at all; `deploy-production.yml` pings whole team via webhook.
- **Fix:** Add Slack mention step with `<@${{ secrets.BUILD_COP_SLACK_USER_ID }}>` on `ci.yml` failures. Create `BUILD_COP.md` runbook.

### P1-10: Production smoke test too narrow
- **File:** `.github/workflows/deploy-production.yml:53–58`
- **Impact:** Smoke test only checks `https://stillwater.studio` returns HTTP 200. Does NOT test `/schedule`, `/api/trpc/schedule.getWeek`, `/api/schedule/stream` (SSE — critical for real-time seat availability), or auth flow.
- **Fix:** Add multiple curl checks + a tRPC API call + an SSE connection test:
  ```yaml
  - name: Smoke test
    run: |
      check() {
        local url="$1"; local expected="$2"
        local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
        if [ "$status" != "$expected" ]; then
          echo "❌ $url returned $status (expected $expected)"
          exit 1
        fi
        echo "✅ $url → $status"
      }
      check "https://stillwater.studio" "200"
      check "https://stillwater.studio/schedule" "200"
      check "https://stillwater.studio/api/trpc/schedule.getWeek?input=%7B%22json%22%3A%7B%7D%7D" "200"
      # SSE check (timeout 6s, expect event)
      timeout 6 curl -sN "https://stillwater.studio/api/schedule/stream?sessionId=test" | head -1 | grep -q "data:" || exit 1
  ```

---

## Nits (P2)

### P2-1: Sentry PII masking is breadcrumb-only
- **File:** `apps/web/sentry.client.config.ts:30–36`
- **Impact:** `beforeBreadcrumb` filters `/api/trpc/bookings` URLs but does NOT mask request bodies in error events or transaction payloads. Booking form data (member name, email) could leak into Sentry.
- **Fix:** Add `beforeSend` hook that redacts `event.request.body` for booking endpoints. Consider `maskAllText: true` for replay or `block: ['.booking-form']` selectors.

### P2-2: PR template doesn't enforce raw command output
- **File:** `.github/PULL_REQUEST_TEMPLATE.md:67–75`
- **Impact:** Template shows placeholder text `# exit 0` rather than requiring actual terminal output with `$?` exit codes per SKILL §11.3.
- **Fix:** Replace placeholder with explicit instructions to paste raw terminal output including `echo $?` after each command.

### P2-3: CODEOWNERS missing entries for several packages
- **File:** `.github/CODEOWNERS`
- **Impact:** `/packages/email/`, `/packages/config/`, `/checkly/`, `/e2e/`, `/scripts/`, `/tooling/` fall through to default owner. Less precise review routing.
- **Fix:** Add explicit entries for these paths.

### P2-4: Bundle size script estimates gzip as 30% of raw
- **File:** `scripts/check-bundle-size.js:72`
- **Impact:** `sizeKB = Math.round((totalSize * 0.3) / 1024)` — gzip ratio varies (25–40%). Budgets may be over- or under-enforced.
- **Fix:** Use `zlib.gzipSync(fileBuffer).length` for actual gzipped size.

### P2-5: Lighthouse `startServerCommand` flag order
- **File:** `lighthouserc.js:22`
- **Impact:** `pnpm start --filter=@stillwater/web` — pnpm filter flag should come BEFORE the script name: `pnpm --filter=@stillwater/web start`. Current syntax may not filter correctly.
- **Fix:** Reorder to `pnpm --filter=@stillwater/web start`.

### P2-6: Lighthouse mobile preset missing
- **File:** `lighthouserc.js:26`
- **Impact:** Only `preset: 'desktop'` configured. Mobile Core Web Vitals (a Google ranking factor) are not measured.
- **Fix:** Add a second collect block with `preset: 'mobile'` or use LHCI's `emulatedFormFactor` setting.

### P2-7: Playwright webServer runs dev mode for E2E
- **File:** `playwright.config.ts:41`
- **Impact:** `command: 'pnpm dev --filter=@stillwater/web'` — E2E tests run against dev server (hot reload, source maps, no minification), not production build. Also flag order issue.
- **Fix:** Use `pnpm --filter=@stillwater/web build && pnpm --filter=@stillwater/web start` or add a `preview` script.

### P2-8: `.env.test` not committed
- **File:** Missing
- **Impact:** Per task spec, `.env.test` should be committed with non-real secrets for CI/test runs. CI currently uses inline env vars in `ci.yml:82–85` — works but not DRY.
- **Fix:** Commit `.env.test` with test-only values (already declared safe in `ci.yml`).

### P2-9: No `ROLLBACK.md` runbook
- **File:** Missing
- **Impact:** Rollback plan documented in SKILL §11.8.3 but not in an ops-friendly runbook. `AGENTS.md` has 0 matches for "rollback". On-call engineer must grep SKILL.md.
- **Fix:** Create `ROLLBACK.md` at repo root with the 3-step procedure (Vercel rollback → DB down-migration → Stripe webhook check).

### P2-10: `deploy-preview.yml` PR comment URL is hardcoded
- **File:** `.github/workflows/deploy-preview.yml:58`
- **Impact:** Comment body uses `'https://stillwater-pr-' + context.issue.number + '.vercel.app'` — but Vercel preview URLs typically include a random hash suffix (`stillwater-pr-123-abc123.vercel.app`). The hardcoded URL may 404.
- **Fix:** Extract actual preview URL from `amondnet/vercel-action` step output using `steps.<id>.outputs.previewUrl`.

### P2-11: Slack action version deprecated
- **File:** `.github/workflows/deploy-production.yml:64`
- **Impact:** `slackapi/slack-github-action@v1.26.0` — v1.x is in maintenance; v2.x is current. Payload format differs.
- **Fix:** Bump to `slackapi/slack-github-action@v2` and update payload format.

### P2-12: No env var validation on startup
- **Files:** `packages/config/src/env.ts`, `packages/auth/src/config.ts`
- **Impact:** Env vars read via `process.env` with null fallbacks. A typo in `BETTER_AUTH_SECRET` would silently fall back to undefined, not fail-fast.
- **Fix:** Use Zod env schema (already a SKILL pattern) with `parse()` at startup for app-level env vars (not infrastructure clients per SKILL §15.21).

---

## Recommended Remediations (Priority Order)

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| P0 | **P0-1** — Fix pnpm version mismatch (remove `PNPM_VERSION` env var from all 3 workflows) | 5 min | Restores supply-chain guardrails in CI |
| P1 | **P1-1** — Wire Lighthouse + bundle-size into CI | 15 min | Catches perf + bundle regressions |
| P1 | **P1-2** — Add concurrency controls to all 3 workflows | 10 min | Saves CI minutes, prevents migration races |
| P1 | **P1-6** — Create `.github/dependabot.yml` | 5 min | Auto security updates |
| P1 | **P1-4** — Implement Axiom HTTP ingestion in `logger.ts` | 1–2 hrs | Enables log queries + alerts |
| P1 | **P1-5** — Create `checkly/checkly.config.ts` + 2 missing checks | 2–4 hrs | Enforces 60s cadence + alert routing |
| P1 | **P1-8** — Add automatic `vercel rollback` on smoke-test failure | 30 min | Limits production downtime |
| P1 | **P1-9** — Add Build Cop Slack mention to `ci.yml` + `BUILD_COP.md` | 30 min | Faster incident response |
| P1 | **P1-10** — Expand production smoke test | 30 min | Catches more deploy failures |
| P1 | **P1-3** — Add path filters for docs-only PRs | 10 min | Saves CI minutes |
| P1 | **P1-7** — Implement feature flags (PostHog) | 4–8 hrs | Enables progressive rollout per Decision D10 |
| P2 | **P2-1 through P2-12** | 1–2 hrs each | Quality-of-life improvements |

---

## Summary Scorecard

| Area | Score | Notes |
|------|-------|-------|
| Workflow structure | 🟡 6/10 | 3 workflows exist, correct triggers, but missing concurrency + path filters + parallel jobs |
| pnpm hygiene | 🔴 0/10 | P0 version mismatch; EOL pnpm in CI |
| Quality gates | 🟡 6/8 | 6 of 8 gates actually run in CI |
| Sentry config | 🟢 9/10 | All 3 runtimes + instrumentation + source maps; minor PII gap |
| PostHog config | 🟢 10/10 | Correct singular `capture_pageview`, 18 events, reverse proxy, hedgehog auto-disable |
| Axiom config | 🔴 2/10 | Logger shape correct but no Axiom integration; env vars declared but unused |
| Checkly config | 🟡 3/10 | 3 checks exist but no config file — schedule, alerts, severity all unconfigured |
| Bundle size | 🟡 5/10 | Budgets + script correct but NOT wired into CI |
| Lighthouse | 🟡 5/10 | Config correct but NOT wired into CI; mobile preset missing |
| Dependabot | 🔴 0/10 | Missing entirely |
| CODEOWNERS | 🟢 8/10 | Comprehensive; minor path gaps |
| PR template | 🟡 7/10 | Good checklist; Test Evidence section too permissive |
| Rollback plan | 🟡 5/10 | Documented in SKILL but not implemented in CI; no runbook |
| Environment mgmt | 🟢 8/10 | `.env.example` comprehensive; `.env.test` missing; no startup validation |
| Feature flags | 🔴 0/10 | Documented in SKILL §11.8.2 + Decision D10 but zero implementation |
| Build Cop role | 🔴 0/10 | Documented in SKILL §11.8.5 but no CI integration |
| CI optimization | 🟡 4/10 | Deps cache ✅; no parallel jobs / path filters / matrix / concurrency |

**Overall CI/CD + Observability Health: YELLOW** — Solid foundation with critical gaps between documented intent and implementation. P0 fix is 5 minutes; P1 fixes total ~1–2 engineering days.

---

*End of Phase I CI/CD + Observability Audit report.*

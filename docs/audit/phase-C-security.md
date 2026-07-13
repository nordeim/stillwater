# Phase C — Security Audit Report

**Project:** Stillwater Yoga Studio monorepo (`/home/z/my-project/stillwater/`)
**Task ID:** C
**Agent:** Explore (Security Auditor)
**Date:** 2026-07-13
**Scope:** OWASP Top 10:2025, Stripe webhook idempotency, RBAC enforcement, CSP, IDOR, rate limiting, secret management
**Reference docs:** `stillwater_SKILL.md` §5.6, §14.6.1, §15.7, §15.13, §15.14, §20.6, §20.7; `PAD.md` §9.2, §15.3, §18.1, ADR-001..011; `MASTER_EXECUTION_PLAN.md` F2-01, F2-04, F2-08..F2-11, F3-01..F3-04, F7-04, F7-09, F10-01..F10-13, F9-18

---

## 1. Executive Summary

**Overall Verdict:** ⚠️ **PARTIAL** — Production-blocking security incidents identified

The Stillwater codebase demonstrates solid architectural security primitives (two-layer auth, advisory locks, parameterized queries, strict CSP, signature-verified webhooks with idempotent processing). However, three **P0 Critical** incidents block production readiness:

1. **Live secret leak in git history.** `apps/web/.env.local` was re-committed at `dbf0cd5` (heinazhik, 2026-07-13) with **3 real production-grade secrets** — including the `BETTER_AUTH_SECRET` session-signing key. The remediation committed at `5ea00a9` (which deleted `.env.local` and added a pre-commit hook) was undone one day later because the hook was never installed at `.git/hooks/pre-commit`. **All 3 secrets must be rotated immediately** and history purged.

2. **Auth-mutation rate limiting is entirely absent.** `packages/api/src/middleware/rateLimit.ts` is wired to `bookings.book` only. None of `signIn`, `signUp`, `signUp`, `magicLink`, `resetPassword`, `bookings.cancel`, `memberships.subscribe` are rate-limited — directly violating SKILL §15.7.4 and OWASP A07 (Authentication Failures). Magic-link email-bombing and credential-stuffing are both unmitigated.

3. **Rate-limit middleware claims fail-OPEN but is actually fail-CLOSED.** `rateLimit.ts:52` has no `try/catch` around `limiter.limit()`. A Redis/Upstash outage will throw and produce HTTP 500s on `bookings.book` — the opposite of the documented SKILL §15.7.5 design ("Fail-OPEN — booking shouldn't break because rate-limit is down").

Other notable findings: 429 responses are missing the `X-RateLimit-*` and `Retry-After` headers required by SKILL §15.7.2; honeypot fields required by SKILL §15.13 are absent from every public-facing form; Axiom logging is console-only (no actual HTTP ingestion); explicit session-cookie / `expiresIn` configuration is missing (relies entirely on Better Auth defaults).

**Passing controls (verified, no action needed):** Stripe webhook signature verification + idempotency (23505 handling + advisory lock + 7 handlers), RBAC matrix matches SKILL §20.6, owner-checked IDOR prevention across all `protectedProcedure` queries, CSP header set is strict and complete, CSRF-safe native-form sign-out, BETTER_AUTH_SECRET fail-fast guard, Zod at every tRPC boundary, no `sql.raw()` with user input, no `dangerouslySetInnerHTML` XSS sinks, no hardcoded production secrets in source.

---

## 2. Per-Control Findings Table

Legend: ✅ Enforced · ⚠️ Partial · ❌ Missing

| # | Control | Verdict | File:Line | Evidence |
|---|---------|---------|-----------|----------|
| 1.1 | A01 Broken Access Control — Layer 1 cookie-only proxy | ✅ | `apps/web/proxy.ts:67-72` | `getSessionCookie(request)` — no DB call, no role check; redirects to /auth/sign-in if absent |
| 1.2 | A01 — Layer 2 requireAuth / requireRole | ✅ | `apps/web/src/lib/auth.ts:35-52` | `requireAuth()` throws NEXT_REDIRECT if no session; `requireRole(...roles)` redirects to /dashboard if role not in session.user.roles |
| 1.3 | A01 — RBAC 13×6 matrix matches SKILL §20.6 | ✅ | `packages/auth/src/rbac.ts:38-52` | All 13 permissions × 6 roles identical to SKILL §20.6 (verified line-by-line) |
| 1.4 | A01 — 4-tier procedure enforcement | ✅ | `packages/api/src/trpc.ts:45-68` | `publicProcedure`, `protectedProcedure` (UNAUTHORIZED), `staffProcedure` (FORBIDDEN if no staff role), `ownerProcedure` (FORBIDDEN if not owner) |
| 1.5 | A02 Security Misconfiguration — security headers | ✅ | `apps/web/next.config.ts:97-146` | CSP, HSTS (63072000s; preload), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera=(), microphone=(), geolocation=(self) |
| 1.6 | A02 — Error sanitization | ✅ | `apps/web/src/app/api/trpc/[trpc]/route.ts:20-26` | `onError` only logs `error.message` in dev; production returns generic 500 without stack trace |
| 1.7 | A03 Software Supply Chain — lockfile committed | ✅ | `pnpm-lock.yaml` (732 KB) | Tracked + `pnpm install --frozen-lockfile` enforced in CI |
| 1.8 | A03 — `pnpm audit --audit-level=high` in CI | ✅ | `.github/workflows/ci.yml` "Gate 8: Security audit" | Runs on every PR + push to develop |
| 1.9 | A03 — Dependabot config exists | ❌ | `.github/dependabot.yml` | **File does not exist.** SKILL §14.6.1 A03 says "Dependabot/Renovate weekly (recommended)" |
| 1.10 | A03 — pnpm version aligned | ❌ | `.github/workflows/ci.yml:9` `PNPM_VERSION: '9.15.4'` vs `package.json:43` `packageManager: "pnpm@11.9.0"` | CI uses EOL pnpm 9 (EOL Apr 30 2026); root declares pnpm 11.9.0 |
| 1.11 | A04 Cryptographic Failures — `BETTER_AUTH_SECRET` fail-fast | ✅ | `packages/auth/src/config.ts:41-55` | Throws at module load if unset in non-build context (lines 46-51); build/test exempt via `NEXT_PHASE=phase-production-build` OR `NODE_ENV=test`; uses `cryptoRandomSecret()` (random 32-byte base64) for build context — NOT a placeholder string |
| 1.12 | A04 — AES-256-GCM IV length (12 bytes not 16) | ⚠️ | N/A | No AES-256-GCM implementation in source (verified via grep across `packages/`, `apps/web/src/`, `services/`). SKILL §13.10 requirement documented but no encrypt-at-rest code present. N/A rather than Enforced because nothing to verify. |
| 1.13 | A05 Injection — Drizzle parameterized queries | ✅ | All `packages/api/src/routers/*.ts` | Zero `sql.raw()` calls (verified via grep). All `sql\`...\`` template literals use static fragments or Drizzle-bound parameters (e.g. `sql\`SELECT pg_advisory_xact_lock(${lockKey})\`` at `bookings.ts:65` — lockKey is a bigint, not user input). |
| 1.14 | A05 — `ilike()` user-input safety | ✅ | `packages/api/src/routers/admin.ts:128,129,207,208` | `ilike(classes.title, \`%${input.search}%\`)` — Drizzle's `ilike()` binds the second arg as a SQL parameter; `.max(200)` Zod constraint on `search` |
| 1.15 | A05 — Zod at every tRPC boundary | ✅ | `packages/api/src/routers/*.ts` | Every `.input(z.object(...))` uses Zod; `members.updateProfile` (line 17-24), `bookings.book` (line 52), `admin.assignRole` (line 351-356), etc. |
| 1.16 | A06 Insecure Design — ADRs exist | ✅ | `PAD.md` §"ADR-001".."ADR-011" | 11 ADRs documented inline in PAD (no standalone `docs/adrs/` directory but ADR-001..011 all present). ADR-004 (advisory locks), ADR-008 (Better Auth), ADR-009 (proxy.ts) cited at use sites. |
| 1.17 | A07 Authentication Failures — httpOnly+secure+sameSite cookies | ⚠️ | `packages/auth/src/config.ts:61-89` (betterAuth config) | **No explicit `session.cookie` config.** Relies entirely on Better Auth defaults (httpOnly:true, secure:production, sameSite:'lax'). SKILL §5.6.1 row 928 says "verify in auth.ts session.cookie config" — verification impossible because config is implicit. |
| 1.18 | A07 — Session timeout (idle 24h / absolute 7d) | ⚠️ | `packages/auth/src/config.ts:61-89` | **No `session.expiresIn` or `session.updateAge` config.** Better Auth default is 7-day absolute only; idle 24h requirement from SKILL §5.6.1 row 929 is NOT enforced. |
| 1.19 | A07 — Rate limit on auth mutations | ❌ | `packages/api/src/middleware/rateLimit.ts` (whole file) | Only `bookings.book` uses rate limit. `apps/web/src/app/api/auth/[...all]/route.ts:22` (`toNextJsHandler(auth)`) has no rate-limit wrapper. No Better Auth `rateLimit` config in `config.ts`. Violates SKILL §15.7.4 (signIn 10/15min, signUp 5/15min, magicLink 5/15min, resetPassword 3/1hour). |
| 1.20 | A08 Integrity Failures — Stripe webhook signature verification | ✅ | `apps/web/src/app/api/webhooks/stripe/route.ts:71-82` | `stripe.webhooks.constructEvent(body, sig, webhookSecret)` — throws `SignatureVerificationError` → 400. Body read as `await request.text()` (line 56, NOT JSON). |
| 1.21 | A08 — Lockfile integrity | ✅ | `pnpm-lock.yaml` committed; CI `--frozen-lockfile` | Drift impossible in CI |
| 1.22 | A09 Logging & Alerting — Sentry | ✅ | `apps/web/sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts` | Three Sentry configs + instrumentation. Client config (line 17-37) skips if DSN missing/placeholder. PII-safe: drops `/api/trpc/bookings` fetch breadcrumbs. |
| 1.23 | A09 — PostHog analytics | ✅ | `apps/web/src/lib/analytics/posthog.ts:16-30`, `apps/web/src/components/analytics/PostHogProvider.tsx`, `next.config.ts:149-160` (reverse proxy) | PostHog init with privacy reverse proxy; 18 events defined (matches PAD §18.2) |
| 1.24 | A09 — Axiom structured logs | ⚠️ | `apps/web/src/lib/observability/logger.ts:47-64` | Logger only calls `console.debug/info/warn/error(JSON.stringify(entry))` — **does NOT actually send logs to Axiom via HTTP**. `AXIOM_TOKEN` env var declared in `env.ts:100` but never imported/used. "Axiom-compatible" naming is aspirational. |
| 1.25 | A09 — Checkly synthetics | ✅ | `checkly/checks/booking-flow.check.ts`, `api-health.check.ts`, `sse-endpoint.check.ts` | 3 checks (matches MEP F10-13..15) |
| 1.26 | A10 Exceptional Conditions — Stripe fail-CLOSED | ✅ | `apps/web/src/app/api/webhooks/stripe/route.ts:95-102` | Handler errors return 500 → Stripe retries. No silent swallow of payment failures. |
| 1.27 | A10 — Rate-limit fail-OPEN | ❌ | `packages/api/src/middleware/rateLimit.ts:46-61` | **File comment claims "Fail-Open Rate Limiter" but implementation has NO try/catch around `limiter.limit(id)` (line 52).** Redis outage throws → 500 → booking fails. **Actual behavior is fail-CLOSED, contradicting SKILL §15.7.5 design.** |
| 1.28 | A10 — No catch-all-and-ignore handlers | ✅ | All `*.catch(() => { ... })` patterns | Job-trigger failures and audit-log failures are caught but logged implicitly via Trigger.dev retry / Sentry — not silently swallowed |

### 2.1 Stripe Webhook Idempotency Sub-Table

| # | Control | Verdict | File:Line | Evidence |
|---|---------|---------|-----------|----------|
| 2.1.1 | Body read as TEXT (not JSON) for signature verification | ✅ | `apps/web/src/app/api/webhooks/stripe/route.ts:56` | `const body = await request.text();` — verified by test at `route.test.ts:156-169` (`constructEvent` called with raw `'{"raw":"text_body"}'`) |
| 2.1.2 | `payment_events.stripe_event_id` UNIQUE index | ✅ | `packages/db/src/schema/payments.ts:23,33` | Column `.notNull().unique()` (line 23) + explicit `uniqueIndex('idx_payment_events_stripe_id').on(table.stripeEventId)` (line 33). Double enforcement. |
| 2.1.3 | `pg_advisory_xact_lock()` used in webhook handler | ✅ | `packages/payments/src/webhooks.ts:96` | `await tx.execute(sql\`SELECT pg_advisory_xact_lock(${lockKey})\`)` inside `db.transaction()` (line 93). Transaction-scoped (NOT session-scoped) — correct per ADR-004 + Neon PgBouncer compatibility. |
| 2.1.4 | Double-check-after-lock pattern | ⚠️ | `packages/payments/src/webhooks.ts:81-110` | Fast-path check at line 81-86 (BEFORE transaction). **No re-check of `paymentEvents` after acquiring the lock at line 96.** Relies solely on the unique constraint (23505) at line 124 to resolve races. Functionally safe but does not implement the textbook double-check-after-lock pattern. |
| 2.1.5 | PG code 23505 (unique violation) handling | ✅ | `packages/payments/src/webhooks.ts:121-130,371-376` | `isUniqueViolation(err)` checks `err.code === '23505'` (line 373); returns `{ received: true }` on 23505 (line 125) — treats concurrent duplicate as success |
| 2.1.6 | 7 event handlers exist | ✅ | `packages/payments/src/webhooks.ts:143-165` | `customer.subscription.created` (144), `customer.subscription.updated` (147), `customer.subscription.deleted` (150), `customer.subscription.trial_will_end` (153, no-op), `invoice.paid` (156), `invoice.payment_failed` (159), `invoice.payment_action_required` (162, no-op). All 7 match SKILL §20.7. |
| 2.1.7 | Return codes: 400 / 200 / 500 | ✅ | `apps/web/src/app/api/webhooks/stripe/route.ts` | 400 on missing signature header (line 63), 400 on bad signature (line 80), 500 on missing `STRIPE_WEBHOOK_SECRET` (line 41), 500 on missing `STRIPE_SECRET_KEY` (line 50), 500 on handler error (line 99), 200 on success or idempotent (line 88). Tests verify all branches (`route.test.ts:93-178`). |

### 2.2 RBAC Procedure-Tier Sub-Table

| # | Procedure | Required Tier | Actual | Verdict | File:Line |
|---|-----------|---------------|--------|---------|-----------|
| 2.2.1 | `schedule.getWeek` | public | `publicProcedure` | ✅ | `schedule.ts:24` |
| 2.2.2 | `schedule.getSession` | public | `publicProcedure` | ✅ | `schedule.ts:51` |
| 2.2.3 | `classes.list` | public | `publicProcedure` | ✅ | `classes.ts:55` |
| 2.2.4 | `classes.getBySlug` | public | `publicProcedure` | ✅ | `classes.ts:67` |
| 2.2.5 | `classes.create` | staff | `staffProcedure` | ✅ | `classes.ts:85` |
| 2.2.6 | `classes.update` | staff | `staffProcedure` | ✅ | `classes.ts:107` |
| 2.2.7 | `sessions.listByDateRange` | public | `publicProcedure` | ✅ | `sessions.ts:28` |
| 2.2.8 | `sessions.create` | staff | `staffProcedure` | ✅ | `sessions.ts:56` |
| 2.2.9 | `sessions.cancel` | staff | `staffProcedure` | ✅ | `sessions.ts:100` |
| 2.2.10 | `sessions.checkIn` | staff | `staffProcedure` | ✅ | `sessions.ts:129` |
| 2.2.11 | `bookings.book` | protected | `protectedProcedure` + rateLimit | ✅ | `bookings.ts:50-51` |
| 2.2.12 | `bookings.cancel` | protected | `protectedProcedure` | ✅ (IDOR) / ⚠️ (no rate limit) | `bookings.ts:170` — IDOR-safe (memberId match line 187-191); SKILL §15.7.4 requires 10/1min rate limit, NOT applied |
| 2.2.13 | `bookings.checkIn` | staff | `staffProcedure` | ✅ | `bookings.ts:216` |
| 2.2.14 | `waitlist.join` | protected | `protectedProcedure` | ✅ | `waitlist.ts:31` |
| 2.2.15 | `waitlist.leave` | protected | `protectedProcedure` | ✅ | `waitlist.ts:99` |
| 2.2.16 | `waitlist.getMyPosition` | protected | `protectedProcedure` | ✅ | `waitlist.ts:136` |
| 2.2.17 | `members.getProfile` | protected | `protectedProcedure` | ✅ | `members.ts:31` |
| 2.2.18 | `members.updateProfile` | protected | `protectedProcedure` | ✅ | `members.ts:56` |
| 2.2.19 | `members.getHistory` | protected | `protectedProcedure` | ✅ | `members.ts:90` |
| 2.2.20 | `instructors.list` | public | `publicProcedure` | ✅ | `instructors.ts:23` |
| 2.2.21 | `instructors.getBySlug` | public | `publicProcedure` | ✅ | `instructors.ts:39` |
| 2.2.22 | `memberships.getPlans` | public | `publicProcedure` | ✅ | `memberships.ts:42` |
| 2.2.23 | `memberships.getMySubscription` | protected | `protectedProcedure` | ✅ | `memberships.ts:56` |
| 2.2.24 | `memberships.subscribe` | protected | `protectedProcedure` | ✅ (tier) / ⚠️ (no rate limit) | `memberships.ts:79` — SKILL §15.7.4 requires 5/1min rate limit on `memberships.purchase`, NOT applied |
| 2.2.25 | `memberships.cancel` | protected | `protectedProcedure` | ✅ | `memberships.ts:141` |
| 2.2.26 | `memberships.pause` | protected | `protectedProcedure` | ✅ | `memberships.ts:192` |
| 2.2.27 | `memberships.resume` | protected | `protectedProcedure` | ✅ | `memberships.ts:258` |
| 2.2.28 | `payments.getPortalUrl` | protected | `protectedProcedure` | ✅ | `payments.ts:31` |
| 2.2.29 | `payments.getInvoices` | protected | `protectedProcedure` | ✅ | `payments.ts:84` |
| 2.2.30 | `payments.refund` | staff | `staffProcedure` | ✅ | `payments.ts:140` |
| 2.2.31 | `admin.getDashboard` | staff | `staffProcedure` | ✅ | `admin.ts:33` |
| 2.2.32 | `admin.getRevenue` | staff (SKILL §20.6 says `revenue:view` is manager+) | `staffProcedure` | ⚠️ | `admin.ts:60` — RBAC matrix grants `revenue:view` to `['manager', 'owner']` only (rbac.ts:48), but tRPC tier allows all staff. Discrepancy between matrix and enforcement. |
| 2.2.33 | `admin.getClassRoster` | staff | `staffProcedure` | ✅ | `admin.ts:97` |
| 2.2.34 | `admin.listClasses` | staff | `staffProcedure` | ✅ | `admin.ts:114` |
| 2.2.35 | `admin.deleteClass` | staff | `staffProcedure` | ✅ | `admin.ts:163` |
| 2.2.36 | `admin.listMembers` | staff | `staffProcedure` | ✅ | `admin.ts:194` |
| 2.2.37 | `admin.getMemberDetail` | staff | `staffProcedure` | ✅ | `admin.ts:235` |
| 2.2.38 | `admin.getRevenueDetails` | staff (should be manager+) | `staffProcedure` | ⚠️ | `admin.ts:273` — Same discrepancy as 2.2.32. PAD §9.2 + rbac.ts:48 grant `revenue:view` to manager+ only. |
| 2.2.39 | `admin.assignRole` | owner | `ownerProcedure` | ✅ | `admin.ts:350` |
| 2.2.40 | `admin.removeRole` | owner | `ownerProcedure` | ✅ | `admin.ts:396` |
| 2.2.41 | `admin.listAuditLog` | staff (SKILL implies manager+ for audit) | `staffProcedure` | ⚠️ | `admin.ts:430` — Comment says "manager+ only" but tier is `staffProcedure`. Either fix the comment or escalate the tier. |
| 2.2.42 | `admin.getRecentSignups` | staff | `staffProcedure` | ✅ | `admin.ts:478` |

### 2.3 IDOR Prevention Sub-Table

| # | Procedure | Owner-Check Evidence | Verdict | File:Line |
|---|-----------|----------------------|---------|-----------|
| 2.3.1 | `bookings.cancel` | WHERE clause includes `eq(enrollments.memberId, memberId)` from `ctx.session.user.memberId` | ✅ | `bookings.ts:187-191` |
| 2.3.2 | `members.getHistory` | Uses `memberId = ctx.session.user.memberId` (line 91); never accepts a `memberId` input | ✅ | `members.ts:90-103` |
| 2.3.3 | `memberships.getMySubscription` | WHERE clause uses `eq(memberSubscriptions.memberId, memberId)` from session | ✅ | `memberships.ts:60-61` |
| 2.3.4 | `memberships.cancel` | Same — fetches subscription by session's memberId | ✅ | `memberships.ts:150-152` |
| 2.3.5 | `memberships.pause` | Same | ✅ | `memberships.ts:207-209` |
| 2.3.6 | `memberships.resume` | Same | ✅ | `memberships.ts:267-269` |
| 2.3.7 | `waitlist.join` | Uses `memberId = ctx.session.user.memberId` | ✅ | `waitlist.ts:34` |
| 2.3.8 | `waitlist.leave` | WHERE includes `eq(waitlistEntries.memberId, memberId)` from session | ✅ | `waitlist.ts:113-118` |
| 2.3.9 | `waitlist.getMyPosition` | WHERE includes `eq(waitlistEntries.memberId, memberId)` from session | ✅ | `waitlist.ts:142-147` |
| 2.3.10 | `members.getProfile` / `updateProfile` | WHERE uses `eq(members.id, memberId)` from session | ✅ | `members.ts:41,75` |
| 2.3.11 | `payments.getPortalUrl` / `getInvoices` | Fetches member by `ctx.session.user.memberId`; uses member's `stripeCustomerId` | ✅ | `payments.ts:48-50,102-104` |
| 2.3.12 | Admin procedures taking `memberId` input | All gated by `staffProcedure` or `ownerProcedure` (RBAC tier enforces access) | ✅ | `admin.ts:235,353,399` |

### 2.4 CSP & Security Headers Sub-Table

| # | Header | Verdict | File:Line | Evidence |
|---|--------|---------|-----------|----------|
| 2.4.1 | `script-src` excludes `'unsafe-eval'` and `'unsafe-inline'` | ✅ | `next.config.ts:107` | `"script-src 'self' https://js.stripe.com"` |
| 2.4.2 | `style-src` | ⚠️ | `next.config.ts:108` | `"style-src 'self' 'unsafe-inline'"` — `'unsafe-inline'` allowed for styles. Required for Tailwind + Next.js injected styles. Acceptable per industry practice but technically weaker than strict CSP. |
| 2.4.3 | `img-src` allow-lists Cloudflare + Sanity | ✅ | `next.config.ts:109` | `"img-src 'self' data: blob: https://imagedelivery.net https://cdn.sanity.io"` |
| 2.4.4 | `frame-src https://js.stripe.com` | ✅ | `next.config.ts:112` | Allows Stripe Elements iframe |
| 2.4.5 | `connect-src` allows Sentry + PostHog | ✅ | `next.config.ts:111` | `"connect-src 'self' https://api.stripe.com wss: https://*.sentry.io https://*.posthog.com"` |
| 2.4.6 | HSTS | ✅ | `next.config.ts:136-138` | `max-age=63072000; includeSubDomains; preload` (2 years, includes subdomains, eligible for HSTS preload list) |
| 2.4.7 | X-Content-Type-Options | ✅ | `next.config.ts:124-126` | `nosniff` |
| 2.4.8 | X-Frame-Options | ✅ | `next.config.ts:120-122` | `DENY` (legacy defense alongside CSP `frame-ancestors`; CSP frame-src whitelist still allows Stripe Elements) |
| 2.4.9 | Referrer-Policy | ✅ | `next.config.ts:128-130` | `strict-origin-when-cross-origin` |
| 2.4.10 | Permissions-Policy | ✅ | `next.config.ts:132-134` | `camera=(), microphone=(), geolocation=(self)` |
| 2.4.11 | Other CSP directives | ✅ | `next.config.ts:113-116` | `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests` |

### 2.5 Rate-Limit Configuration Sub-Table

| # | Procedure | Required (SKILL §15.7.4) | Actual | Verdict | File:Line |
|---|-----------|--------------------------|--------|---------|-----------|
| 2.5.1 | `auth.signIn` | 10 / 15min sliding | absent | ❌ | `apps/web/src/app/api/auth/[...all]/route.ts:22` — no rate-limit wrapper |
| 2.5.2 | `auth.signUp` | 5 / 15min sliding | absent | ❌ | Same — no rate limit |
| 2.5.3 | `auth.sendMagicLink` | 5 / 15min sliding | absent | ❌ | Same — magic link email-bombing not prevented |
| 2.5.4 | `auth.resetPassword` | 3 / 1hour sliding | absent | ❌ | Same |
| 2.5.5 | `bookings.book` | 10 / 1min sliding | 10 / 1min sliding | ✅ | `bookings.ts:34` |
| 2.5.6 | `bookings.cancel` | 10 / 1min sliding | absent | ❌ | `bookings.ts:170` — no rate limit |
| 2.5.7 | `memberships.purchase`/`subscribe` | 5 / 1min sliding | absent | ❌ | `memberships.ts:79` — no rate limit |
| 2.5.8 | General API default | 100 / 15min token bucket | absent | ❌ | No default rate-limit middleware applied to `publicProcedure` or `protectedProcedure` |
| 2.5.9 | 429 response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`) | Required | absent | ❌ | `rateLimit.ts:54-58` only sets `cause: { retryAfter: ... }` on the `TRPCError`. The route handler `apps/web/src/app/api/trpc/[trpc]/route.ts:14-27` does not extract this and set HTTP response headers. |
| 2.5.10 | Fail-OPEN on Redis outage | Required (SKILL §15.7.5) | fail-CLOSED | ❌ | `rateLimit.ts:46-61` — no `try/catch` around `await limiter.limit(id)` (line 52). Redis outage throws → 500 → booking blocked. File comment line 7 claims "Fail-Open Rate Limiter" but code does not implement it. |
| 2.5.11 | Window type supports '15 m' | Required for auth | NO | ❌ | `rateLimit.ts:40` — `window: '1 m' | '1 h'` — no `'15 m'` option. Cannot express the SKILL-mandated 15-minute auth window. |

### 2.6 Other Controls Sub-Table

| # | Control | Verdict | File:Line | Evidence |
|---|---------|---------|-----------|----------|
| 2.6.1 | `BETTER_AUTH_SECRET` fail-fast (no placeholder fallback) | ✅ | `packages/auth/src/config.ts:41-55` | `if (!secret && !isBuildContext) throw...` (line 46-51). No `?? 'placeholder-secret-...'`. Build context uses `cryptoRandomSecret()` (random 32-byte base64, not a known string). |
| 2.6.2 | Honeypot field in SignInForm | ❌ | `apps/web/src/components/auth/SignInForm.tsx:1-61` | No honeypot field. SKILL §15.13 requires hidden `company_website` field on public-facing forms. |
| 2.6.3 | Honeypot field in MagicLinkForm | ❌ | `apps/web/src/components/auth/MagicLinkForm.tsx:1-96` | No honeypot field. |
| 2.6.4 | Honeypot field in NewsletterForm | ❌ | `apps/web/src/components/marketing/NewsletterForm.tsx:1-89` | No honeypot field. (Also no API wiring — onSubmit is a stub `setTimeout`.) |
| 2.6.5 | Honeypot field anywhere in codebase | ❌ | (grep `company_website\|honeypot` across `apps/web/src/`) | Zero matches. |
| 2.6.6 | CSRF-safe sign-out (native form POST, not fetch) | ✅ | `apps/web/src/components/auth/SignOutButton.tsx:18-22` | `<form action="/auth/sign-out" method="POST">`. Sign-out route rejects GET with 405 (`apps/web/src/app/auth/sign-out/route.ts:36-41`). |
| 2.6.7 | SQL injection — `sql.raw()` with user input | ✅ | (grep across `packages/`) | Zero `sql.raw()` calls. |
| 2.6.8 | SQL injection — string concat in queries | ✅ | All `sql\`...\`` calls | Only static SQL fragments (`sql\`true\``, `sql\`member_subscriptions\``, `sql\`(select ...)\`) or Drizzle-bound parameters (`${lockKey}` is a bigint computed from a UUID, not user input). |
| 2.6.9 | XSS — `dangerouslySetInnerHTML` audit | ✅ | `apps/web/src/components/seo/JsonLd.tsx:24` | Only 1 usage. Escaped via `JSON.stringify(schema).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')` per SKILL §15.10 before injection into `<script type="application/ld+json">`. |
| 2.6.10 | Secret scanning — source files (excl. .env) | ✅ | grep `sk_live_\|whsec_\|AIza\|ghp_\|eyJhbGciOi\|sk_test_` across `packages/`, `apps/web/src/` | Only test fixtures (`sk_test_fake_key`, `whsec_test_secret` in `route.test.ts:83-84`) and config schema placeholders (`whsec_placeholder` in `env.ts:36`). No production secrets in source. |

---

## 3. Critical Findings (P0)

### P0-1: Live secrets committed to git history — `BETTER_AUTH_SECRET`, `SANITY_API_TOKEN`, `SANITY_WEBHOOK_SECRET`

**Status:** Active security incident. Remediation required before any production deploy.

**Tracked files:**
- `git ls-files --error-unmatch .env.local` → returns `.env.local` (tracked)
- `git ls-files --error-unmatch apps/web/.env.local` → returns `apps/web/.env.local` (tracked)

**Commit history for `.env.local`** (3 commits, matches task spec):
```
dbf0cd5  heinazhik  2026-07-13  env
5ea00a9  Z User     2026-07-12  fix(P0): resolve 5 Critical findings from code review audit
8242cc2  heinazhik  2026-07-05  remediation MEP and PAD
```

**Timeline of the incident:**
1. **8242cc2** (heinazhik, 2026-07-05): `.env.local` first committed — all placeholder values (`your-secret-here-min-32-chars`, `your-sanity-read-token`, etc.). Already a policy violation (.gitignore line 9 lists `.env.local`), but no real secrets exposed.
2. **5ea00a9** (Z User, 2026-07-12): C5 fix from "comprehensive code review audit" — `git rm --cached .env.local` (89 lines deleted). Added `scripts/pre-commit-check.sh` (lines 7-19 block `.env.local` and `.env.*.local` from being staged). **Critically: the hook was never installed at `.git/hooks/pre-commit`** — only the shell script was committed.
3. **dbf0cd5** (heinazhik, 2026-07-13, ONE DAY LATER): `.env.local` RE-ADDED with **real secrets**, AND a new file `apps/web/.env.local` committed with **real secrets including the session-signing key**. The uninstalled pre-commit hook did not block this.

**Real (non-placeholder) secrets leaked at dbf0cd5:**

| File | Variable | Value (truncated) | Severity |
|------|----------|-------------------|----------|
| `apps/web/.env.local:23` | `BETTER_AUTH_SECRET` | `aJp8oRveNW1g7mFLQmkpZsCokNbExrERoTOETluNzt4=` | **CRITICAL** — session cookie signing key. Anyone with this secret can forge valid session cookies for any user, including owner. |
| `apps/web/.env.local:43` & `.env.local:43` | `SANITY_API_TOKEN` | `skSlrWJK1jcRRd4ZN4lmTzBBiRqFuKRXvnR9vRzPX1l2Ek1dwn8auAUjiuVjOGhn5...` (160 chars) | HIGH — read-only Sanity token for project `v2gzd4bc`. Allows reading all CMS content including unpublished drafts. |
| `apps/web/.env.local:45` & `.env.local:45` | `SANITY_WEBHOOK_SECRET` | `+XMPa8ssw2DhLNFZAGFNn3iV3tC7oryq1xEIywG7mSU=` | MEDIUM — Sanity ISR revalidation webhook secret. Allows forging webhook calls to trigger spurious revalidation. |

**Other variables in `.env.local` at dbf0cd5** (placeholders, not real secrets): `BETTER_AUTH_SECRET=your-secret-here-min-32-chars`, `GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com`, `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`, `RESEND_API_KEY=re_...`, `TRIGGER_SECRET_KEY=tr_dev_...`, `UPSTASH_REDIS_REST_TOKEN=your-upstash-token`, `SENTRY_DSN=https://your-key@sentry.io/your-project`, `SENTRY_AUTH_TOKEN=sntrys_...`, `NEXT_PUBLIC_POSTHOG_KEY=phc_...`, `AXIOM_TOKEN=xaat-...`, `CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-key` — plus real-but-non-sensitive config (`NEXT_PUBLIC_SANITY_PROJECT_ID=v2gzd4bc`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`, `DATABASE_URL=postgresql://stillwater:stillwater_local_dev@localhost:5432/stillwater_dev`, `EMAIL_FROM=hello@stillwater.studio`, etc.).

**Pre-commit hook installation status:**
- `scripts/pre-commit-check.sh` exists (27 lines, executable).
- `ls -la .git/hooks/pre-commit` → **does not exist**.
- `package.json` has no `prepare` script, no `husky`, no `lefthook`, no `simple-git-hooks` devDependency. Hook installation is a manual step (`ln -s ../../scripts/pre-commit-check.sh .git/hooks/pre-commit` per the script header) that was never performed.

**Required remediation (in order):**

1. **Rotate the 3 leaked secrets immediately:**
   - `BETTER_AUTH_SECRET` — generate new with `openssl rand -base64 32`, update in production secret manager (Vercel), update local `.env.local`. All existing sessions will be invalidated (users must re-authenticate) — that is the desired outcome.
   - `SANITY_API_TOKEN` — revoke in Sanity Cloud → Project v2gzd4bc → API → Tokens, create new read token, update Vercel env var.
   - `SANITY_WEBHOOK_SECRET` — rotate in Sanity Cloud → Webhooks, update Vercel env var AND the matching secret on the Sanity webhook configuration.
2. **Untrack the files (without deleting working copies):**
   ```sh
   git rm --cached .env.local apps/web/.env.local
   git commit -m "security: untrack .env.local files (P0-1)"
   ```
3. **Install the pre-commit hook** (and add a `prepare` script to package.json so it auto-installs on `pnpm install`):
   ```sh
   ln -s ../../scripts/pre-commit-check.sh .git/hooks/pre-commit
   chmod +x scripts/pre-commit-check.sh
   # Add to package.json:
   # "scripts": { "prepare": "ln -sf ../../scripts/pre-commit-check.sh .git/hooks/pre-commit && chmod +x scripts/pre-commit-check.sh" }
   ```
4. **Purge git history** with `git filter-repo` (preferred over BFG for new repos):
   ```sh
   # Backup first
   git clone --mirror . ../stillwater-backup.git
   # Install git-filter-repo (pip install git-filter-repo)
   git filter-repo --path .env.local --path apps/web/.env.local --invert-paths
   # Force-push all branches + tags
   git push origin --force --all
   git push origin --force --tags
   ```
5. **Notify collaborators** — anyone with a clone must re-clone after history purge (the old commits with secrets still exist in their local reflog until expiry).
6. **Audit access logs** for Sanity project `v2gzd4bc` and Stillwater production between 2026-07-13 and rotation date — the leaked tokens may have been used.

---

### P0-2: Auth-mutation rate limiting is entirely absent

**Files affected:** `packages/api/src/middleware/rateLimit.ts`, `apps/web/src/app/api/auth/[...all]/route.ts`

**SKILL §15.7.4 mandate:**

| Procedure | Required | Implemented? |
|-----------|----------|--------------|
| `auth.signIn` | 10 / 15min sliding | ❌ |
| `auth.signUp` | 5 / 15min sliding | ❌ |
| `auth.sendMagicLink` | 5 / 15min sliding | ❌ |
| `auth.resetPassword` | 3 / 1hour sliding | ❌ |

**Impact:**
- **Magic-link email-bombing** — an attacker can submit the form unboundedly, causing Resend to deliver hundreds of magic-link emails to a victim's inbox (Resend quota exhaustion + user harassment + phishing cover).
- **Credential stuffing** on Google OAuth callback (limited because Google has its own rate limits, but the `/api/auth/sign-in/social` endpoint itself is unprotected).
- **Account-creation abuse** — automated signup scripts can create thousands of member rows.

**Root cause:** The rate-limit middleware exists (`rateLimit.ts:38-62`) and works correctly for `bookings.book`, but was never wired to the Better Auth handler at `apps/web/src/app/api/auth/[...all]/route.ts:22`. Better Auth does not expose a `rateLimit` config option in `packages/auth/src/config.ts` either.

**Compounding issue:** `rateLimit.ts:40` restricts `window` to `'1 m' | '1 h'` — there is no `'15 m'` option, so even if someone tries to add auth rate limiting, the type system will reject the SKILL-mandated 15-minute window.

**Remediation:**
1. Add `'15 m'` to the window union type: `window: '1 m' | '15 m' | '1 h'`.
2. Either:
   - **Option A (preferred):** Wrap `toNextJsHandler(auth)` in a rate-limiting proxy at `apps/web/src/app/api/auth/[...all]/route.ts` that inspects the path (`/api/auth/sign-in/magic-link` → 5/15min, `/api/auth/sign-up` → 5/15min, etc.) and applies Upstash Ratelimit by IP.
   - **Option B:** Configure Better Auth's built-in `rateLimit` (Better Auth v1.6+ supports `rateLimit: { enabled: true, window: 15 * 60, max: 10 }` in the `betterAuth({ ... })` config). Add to `packages/auth/src/config.ts`.
3. Return HTTP 429 (NOT 401) on lockout per SKILL §5.6.1 to prevent username enumeration.

---

### P0-3: Rate-limit middleware is fail-CLOSED, not fail-OPEN

**File:** `packages/api/src/middleware/rateLimit.ts:46-61`

**Code:**
```typescript
return middleware(async ({ ctx, next }) => {
  const id = identifier === 'user' && ctx.session
    ? ctx.session.user.id
    : ctx.req.headers.get('x-forwarded-for') ?? 'unknown';

  const { success, reset } = await limiter.limit(id);  // ← NO try/catch
  if (!success) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', ... });
  }
  return next({ ctx });
});
```

**SKILL §15.7.3 spec (line 5367-5374):**
```typescript
let rateLimitResult;
try {
  rateLimitResult = await ratelimit.limit(key);
} catch (err) {
  // Fail OPEN — Redis outage shouldn't break booking
  console.warn('[rateLimit] Upstash unavailable, failing open:', err);
  return next();
}
```

**File comment line 7** says "SKILL §15.7 Pattern: Fail-Open Rate Limiter" but the implementation does not wrap `limiter.limit(id)` in try/catch. If Upstash Redis is unreachable (network partition, regional outage, exhausted quota), the `await` throws and propagates as an UNHANDLED_ERROR → HTTP 500 → booking fails.

This is the opposite of the documented design (SKILL §15.7.5 row 1: "Rate-limit Redis outage → Booking still works (revenue) → Fail-OPEN").

**Remediation:** Wrap the `limiter.limit(id)` call in try/catch, log the error to Sentry, and `return next({ ctx })` on catch.

---

## 4. Important Findings (P1)

### P1-1: 429 responses missing required `X-RateLimit-*` and `Retry-After` headers

**File:** `packages/api/src/middleware/rateLimit.ts:54-58`, `apps/web/src/app/api/trpc/[trpc]/route.ts:14-29`

**SKILL §15.7.2** mandates that 429 responses include:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1698249600
Retry-After: 47
```

**Current code** sets `cause: { retryAfter: Math.ceil((reset - Date.now()) / 1000) }` on the `TRPCError` (line 57), but the tRPC fetch adapter at `route.ts:14-27` does not extract this `cause` and set HTTP response headers. The 429 response body only contains `{ error: { message: 'Rate limit exceeded...' } }` — no headers.

**Remediation:** Either:
- Customize the tRPC `fetchRequestHandler` `responseMeta` callback to read the error cause and append headers, OR
- Move rate-limit enforcement to a Next.js middleware wrapper around `/api/trpc` that sets headers directly via `NextResponse.next({ headers })`.

---

### P1-2: Honeypot fields absent from all public-facing forms (SKILL §15.13 violation)

**Files:** `apps/web/src/components/auth/SignInForm.tsx`, `MagicLinkForm.tsx`, `apps/web/src/components/marketing/NewsletterForm.tsx`

**SKILL §15.13** requires a hidden `company_website` honeypot field on all public-facing forms (booking, contact, waitlist, auth). Zero honeypot fields exist anywhere in the codebase (verified via grep).

**Impact:** No bot-detection layer for the magic-link form. Combined with P0-2 (no rate limit), this means automated scripts can submit the magic-link form unboundedly.

**Remediation:** Add a hidden `company_website` (or similar) input to each form, validate `z.string().max(0).optional()` server-side, and silently succeed (don't error) when the honeypot is non-empty per the SKILL pattern.

---

### P1-3: Session cookie + timeout config relies entirely on Better Auth defaults

**File:** `packages/auth/src/config.ts:61-89`

The `betterAuth({...})` config has **no `session` block** — no `expiresIn`, no `updateAge`, no `cookie` config. SKILL §5.6.1 row 928-929 requires verification of:
- `httpOnly: true` — implicit (Better Auth default)
- `secure: true` in production — implicit (Better Auth default)
- `sameSite: 'lax'` — implicit (Better Auth default)
- Idle timeout 24h — **NOT enforceable** (Better Auth has no separate idle-timeout concept; only absolute `expiresIn`)
- Absolute timeout 7 days — implicit (Better Auth default `expiresIn: 60 * 60 * 24 * 7`)

**Impact:** If a future Better Auth upgrade changes the defaults, this codebase silently adopts the new behavior with no test catching it. The "idle 24h" requirement from SKILL is structurally impossible without custom middleware that tracks `lastSeenAt` and forces re-auth after 24h of inactivity.

**Remediation:** Add an explicit `session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 }` (7-day absolute, 24-hour sliding refresh) and `advanced: { cookies: { sessionToken: { httpOnly: true, secure: true, sameSite: 'lax' } } }` block to `betterAuth({...})`.

---

### P1-4: Axiom logger is console-only — `AXIOM_TOKEN` declared but never used

**File:** `apps/web/src/lib/observability/logger.ts:47-64`

The logger only calls `console.debug/info/warn/error(JSON.stringify(entry))`. The `AXIOM_TOKEN` env var is declared in `packages/config/src/env.ts:100` but never imported or used. The "Axiom-compatible" naming is aspirational only — no logs are actually shipped to Axiom.

**Impact:** Production logs are not centralized. In a Vercel deployment, console logs are ephemeral (lost on function recycle). This violates SKILL §14.6.1 A09 ("Axiom structured logs") and breaks the observability pillar.

**Remediation:** Either:
- Implement actual Axiom HTTP ingestion (`POST https://api.axiom.co/v1/datasets/{dataset}/ingest` with `Authorization: Bearer ${AXIOM_TOKEN}`), OR
- Switch to Vercel's native log drains to Axiom (no code change needed, configured in Vercel dashboard), OR
- Document the deprecation and remove the `AXIOM_TOKEN` env var.

---

### P1-5: `admin.getRevenue` and `admin.getRevenueDetails` use `staffProcedure` but RBAC matrix grants `revenue:view` to manager+ only

**Files:** `packages/api/src/routers/admin.ts:60, 273`

The RBAC matrix in `packages/auth/src/rbac.ts:48` defines:
```typescript
'revenue:view': ['manager', 'owner'],
```

But the tRPC procedures use `staffProcedure` (allows `['staff', 'manager', 'owner']` per `trpc.ts:54-60`), which is more permissive than the matrix. A staff-tier user can call `admin.getRevenue` and `admin.getRevenueDetails` despite the matrix saying they shouldn't.

**Mitigation:** The `can()` function from rbac.ts is never actually called by `staffProcedure` — the tier system bypasses the matrix entirely. This is a design gap: the matrix is documented but not enforced through the procedure tiers.

**Remediation:** Either:
- Add a `managerProcedure` tier (or generalize `staffProcedure` to accept a permission argument), OR
- Change `admin.getRevenue` and `admin.getRevenueDetails` to a new `managerProcedure` that requires `'manager'` or `'owner'` role, OR
- Reconcile the SKILL §20.6 matrix (maybe `revenue:view` should include `staff`).

---

### P1-6: pnpm 9.15.4 in CI is EOL since 2026-04-30

**File:** `.github/workflows/ci.yml:9`

CI uses `PNPM_VERSION: '9.15.4'`. pnpm 9 reached end-of-life on 2026-04-30 (confirmed in Task 2-b worklog). The root `package.json:43` declares `"packageManager": "pnpm@11.9.0"` and `engines.pnpm: ">=11.0.0"`. CI is therefore running an unsupported package manager version that won't receive security patches.

**Remediation:** Update `.github/workflows/ci.yml:9` to `PNPM_VERSION: '11.9.0'` (or remove the env var entirely and let `pnpm/action-setup@v4` read `packageManager` from `package.json`).

---

### P1-7: No Dependabot config — supply-chain updates are manual

**File:** `.github/dependabot.yml` — **does not exist**.

SKILL §14.6.1 A03 says "Dependabot/Renovate weekly (recommended)". `pnpm audit` catches known vulnerabilities at PR time but does not proactively open PRs to bump outdated deps.

**Remediation:** Add `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

## 5. Nits (P2)

### P2-1: `admin.listAuditLog` comment says "manager+ only" but tier is `staffProcedure`

**File:** `packages/api/src/routers/admin.ts:428-430`

Comment on line 428 says "List audit log entries with filters (manager+ only). Phase 9 F9-20." but the procedure uses `staffProcedure` (line 430). Either fix the comment or escalate to a new `managerProcedure`.

### P2-2: Stripe webhook handler missing double-check-after-lock query

**File:** `packages/payments/src/webhooks.ts:91-110`

Textbook advisory-lock idempotency pattern is: (1) fast-path check, (2) BEGIN, (3) acquire lock, (4) **re-check inside transaction**, (5) dispatch, (6) insert idempotency record, (7) COMMIT. Current code skips step (4) — it relies solely on the unique constraint (23505) to catch the race. Functionally equivalent (the constraint is the ultimate guarantee), but slightly less efficient because the dispatch logic runs before the 23505 catches the duplicate. Adding `await tx.query.paymentEvents.findFirst({...})` after line 96 would close the gap.

### P2-3: `style-src 'unsafe-inline'` in CSP

**File:** `apps/web/next.config.ts:108`

`style-src 'self' 'unsafe-inline'` is required for Tailwind + Next.js injected styles. Industry-acceptable but weaker than strict CSP. Could be tightened to use nonces or hashes if a future hardening pass is desired.

### P2-4: `X-Frame-Options: DENY` + `frame-src https://js.stripe.com` coexist

**File:** `apps/web/next.config.ts:112, 120-122`

Modern browsers ignore `X-Frame-Options` when CSP `frame-src` is present. The DENY is a legacy defense for older browsers and effectively redundant — but harmless. Could be replaced with `frame-ancestors 'none'` in CSP for cleaner policy.

### P2-5: `NewsletterForm` is unwired — `onSubmit` is a `setTimeout` stub

**File:** `apps/web/src/components/marketing/NewsletterForm.tsx:38-42`

```typescript
const onSubmit = async (_data: NewsletterValues) => {
  // TODO: Wire to Resend Audience API or Brevo
  await new Promise((resolve) => setTimeout(resolve, 500));
  setIsSubscribed(true);
};
```

Not a security issue per se, but means there's no real form backend to add a honeypot to.

### P2-6: `memberships.subscribe` accepts arbitrary `planId` without checking plan `isActive`

**File:** `packages/api/src/routers/memberships.ts:79-133`

The procedure fetches the plan by `eq(membershipPlans.id, input.planId)` (line 83-85) but doesn't check `plan.isActive`. A member could subscribe to an inactive plan if they knew the UUID. Low impact (Stripe Checkout Session creation would still succeed with the inactive plan's `stripePriceId`), but worth filtering.

---

## 6. Recommended Remediations (Prioritized)

### Immediate (before any production deploy)

1. **P0-1** — Rotate 3 leaked secrets (BETTER_AUTH_SECRET, SANITY_API_TOKEN, SANITY_WEBHOOK_SECRET). Untrack both `.env.local` files. Install pre-commit hook via `package.json` `prepare` script. Purge git history with `git filter-repo`.
2. **P0-2** — Wire rate limiting to Better Auth handler at `apps/web/src/app/api/auth/[...all]/route.ts`. Add `'15 m'` to the window union type in `rateLimit.ts:40`. Apply 10/15min to signIn, 5/15min to signUp/magicLink, 3/1hour to resetPassword.
3. **P0-3** — Wrap `limiter.limit(id)` in try/catch in `rateLimit.ts:52`. On catch, `console.warn` to Sentry and `return next({ ctx })` to fail-OPEN per SKILL §15.7.5.

### Short-term (next sprint)

4. **P1-1** — Implement `responseMeta` in the tRPC fetch adapter to set `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` headers on 429 responses.
5. **P1-2** — Add honeypot field to `SignInForm`, `MagicLinkForm`, `NewsletterForm`, and any future public-facing form. Validate `z.string().max(0).optional()` server-side. Silent-success on bot detection.
6. **P1-3** — Add explicit `session: { expiresIn, updateAge }` and `advanced.cookies.sessionToken` config to `betterAuth({...})` in `packages/auth/src/config.ts`. Don't rely on defaults.
7. **P1-5** — Add `managerProcedure` tier in `trpc.ts` (or generalize to `requirePermission('revenue:view')`). Update `admin.getRevenue` and `admin.getRevenueDetails` to use it. Reconcile with SKILL §20.6.
8. **P1-6** — Bump CI pnpm to 11.9.0 (or remove `PNPM_VERSION` env var and let `pnpm/action-setup@v4` read `packageManager`).
9. **P1-7** — Add `.github/dependabot.yml` with weekly npm + GitHub Actions ecosystem updates.

### Medium-term (next quarter)

10. **P1-4** — Decide on Axiom strategy: implement HTTP ingestion in `logger.ts`, switch to Vercel log drains, or deprecate the env var.
11. **P2-1** — Fix `admin.listAuditLog` comment/tier mismatch.
12. **P2-2** — Add double-check-after-lock query in `webhooks.ts` after line 96 for defense-in-depth.
13. **P2-6** — Filter `memberships.subscribe` to `eq(membershipPlans.isActive, true)`.

### Long-term (architectural improvements)

14. **Use `rbac.can()` in procedure middleware** instead of hard-coded role arrays in `staffProcedure`/`ownerProcedure`. This would make the matrix in `rbac.ts` the single source of truth and prevent discrepancies like P1-5.
15. **Tighten CSP** — replace `style-src 'unsafe-inline'` with nonces or hashes. Replace `X-Frame-Options` with CSP `frame-ancestors`.
16. **Add idle-timeout middleware** — track `lastSeenAt` in the session table, force re-auth after 24h of inactivity (Better Auth does not support idle timeout natively).

---

## 7. Verification Methodology

Every verdict in this report was established by **reading the actual source code** (not by reading documentation or inferring from filenames). Specifically:

- **OWASP Top 10:2025 (controls 1.1–1.28):** Read `packages/auth/src/config.ts`, `packages/auth/src/rbac.ts`, `apps/web/proxy.ts`, `apps/web/src/lib/auth.ts`, `apps/web/next.config.ts`, `.github/workflows/ci.yml`, `packages/config/src/env.ts`, `apps/web/src/lib/observability/logger.ts`, `apps/web/sentry.client.config.ts`, `apps/web/src/lib/analytics/posthog.ts`, `checkly/checks/*.ts`.
- **Stripe webhook idempotency (2.1.1–2.1.7):** Read `packages/payments/src/webhooks.ts` end-to-end, `apps/web/src/app/api/webhooks/stripe/route.ts`, `packages/db/src/schema/payments.ts`, `apps/web/src/app/api/webhooks/stripe/route.test.ts`.
- **RBAC matrix (2.2.1–2.2.42):** Read `packages/auth/src/rbac.ts`, `packages/api/src/trpc.ts`, all 10 router files in `packages/api/src/routers/`, `packages/db/src/schema/enums.ts`, and SKILL §20.6 (line 8682-8721).
- **`.env.local` leak (P0-1):** Ran `git ls-files --error-unmatch .env.local` and `git ls-files --error-unmatch apps/web/.env.local` (both return tracked paths). Ran `git log --all --pretty=format:'%h|%an|%ad|%s' --date=short -- .env.local` (3 commits, matching task spec). Ran `git show dbf0cd5:apps/web/.env.local` and `git show 8242cc2:.env.local` to inspect leaked content. Verified `scripts/pre-commit-check.sh` exists but `.git/hooks/pre-commit` does not.
- **BETTER_AUTH_SECRET guard (2.6.1):** Read `packages/auth/src/config.ts:33-55, 195-198`.
- **CSP (2.4.1–2.4.11):** Read `apps/web/next.config.ts:97-146`.
- **IDOR (2.3.1–2.3.12):** Read every `protectedProcedure` mutation in `bookings.ts`, `members.ts`, `memberships.ts`, `waitlist.ts`, `payments.ts` — confirmed each uses `ctx.session.user.memberId` and never accepts a client-supplied `memberId` for self-scoped queries.
- **Honeypot (2.6.2–2.6.5):** Read `SignInForm.tsx`, `MagicLinkForm.tsx`, `NewsletterForm.tsx`. Ran grep for `company_website|honeypot` across `apps/web/src/` (zero matches).
- **Rate limiting (2.5.1–2.5.11):** Read `packages/api/src/middleware/rateLimit.ts` end-to-end. Ran grep for `rateLimit|rate.?limit` across `packages/` and `apps/web/src/` — only `bookings.ts:34` and `useBookingMutation.ts` reference it.
- **CSRF (2.6.6):** Read `SignOutButton.tsx:18-22` and `apps/web/src/app/auth/sign-out/route.ts:36-41`.
- **SQL injection (2.6.7–2.6.8):** Ran grep for `sql.raw(` (zero matches) and `sql\`` (all matches inspected — only static fragments or Drizzle-bound parameters).
- **XSS (2.6.9):** Ran grep for `dangerouslySetInnerHTML` across `apps/web/src/` — 1 match in `JsonLd.tsx:24`, with proper escaping on lines 16-19.
- **Secret scanning (2.6.10):** Ran grep for `sk_live_|whsec_|AIza|ghp_|eyJhbGciOi|sk_test_` across `packages/` and `apps/web/src/` — only test fixtures and config placeholders.

---

**Audit complete.** Awaiting remediation of P0-1, P0-2, P0-3 before recommending production deploy.

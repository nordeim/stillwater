# Six-Axis Audit — Axis 4 (Security) + Axis 5 (Performance) + Axis 6 (Aesthetic/UX)

**Repo:** `/home/z/my-project/stillwater/`
**Scope:** OWASP-aware security audit + performance rigor + Editorial Calm aesthetic compliance
**Reference:** `stillwater_SKILL.md` (§14.6, §11, §1.3-1.5, §19), `PAD.md` (§20, §19, §11, §22)
**Mode:** READ-ONLY audit (no files modified)
**Audit Date:** 2026-07-14
**Severity legend:** 🔴 Critical · 🟡 Important · 🟢 Nit · ✅ Pass

---

## Executive Summary

The Stillwater monorepo demonstrates strong architectural rigor in security (RBAC tiers, transactional advisory locks, idempotent Stripe webhooks) and performance (ISR + SSE + React Compiler + bundle analyzer). However, this audit surfaced **1 critical security incident** (committed secrets), **2 RBAC mis-tiers**, **several Zod v4 deprecation lapses**, **a font-loading approach that violates `next/font/local`**, **`outline-none` instead of `outline-hidden` across all shadcn primitives**, **missing `poweredByHeader: false`**, and **a Cloudflare env var name mismatch** that breaks image signing.

**Total findings:** 6 🔴 Critical · 8 🟡 Important · 14 🟢 Nit · (most checks ✅ Pass)

---

# Axis 4 — Security Findings

## 4.1 Authentication & Authorization

### ✅ Pass — `apps/web/proxy.ts` is cookie-only (no DB access)

**File:** `apps/web/proxy.ts:1-159`

`proxy.ts` correctly implements the Layer 1 (optimistic cookie-only) check using `getSessionCookie(request)` from `better-auth/cookies`. It does NOT call `auth.api.getSession()` or touch the DB. The header comment at line 29-30 explicitly states: *"Do NOT call auth.api.getSession() here."* The matcher at line 147-158 excludes static assets, image optimization, and fonts.

### ✅ Pass — `apps/web/src/lib/auth.ts` exports `getSession`, `requireAuth`, `requireRole`

**File:** `apps/web/src/lib/auth.ts:26-52`

All three Layer 2 helpers exist with correct semantics:
- `getSession()` → returns `auth.api.getSession({ headers: await headers() })`
- `requireAuth()` → throws `redirect('/auth/sign-in')` if null
- `requireRole(...roles: StudioRole[])` → calls `requireAuth()`, then redirects to `/dashboard` if none of the user's roles match

`'server-only'` import at line 14 prevents accidental client-side usage.

### ✅ Pass — 4 layout guards enforce correct role tiers

| Layout | Guard | Tier |
|---|---|---|
| `(studio)/layout.tsx:23` | `requireAuth()` | member+ |
| `(admin)/layout.tsx:22` | `requireRole('staff','manager','owner')` | staff+ |
| `(admin)/admin/revenue/layout.tsx:19` | `requireRole('manager','owner')` | manager+ |
| `(admin)/admin/settings/layout.tsx:18` | `requireRole('owner')` | owner only |
| `(admin)/admin/audit-log/layout.tsx:19` | `requireRole('manager','owner')` | manager+ |

Defense-in-depth via nested layouts ✅.

### ✅ Pass — `BETTER_AUTH_SECRET` has NO placeholder fallback in production

**File:** `packages/auth/src/config.ts:41-55`

```ts
const isBuildContext =
  process.env['NEXT_PHASE'] === 'phase-production-build' ||
  process.env['NODE_ENV'] === 'test';

const secret = process.env['BETTER_AUTH_SECRET'];
if (!secret && !isBuildContext) {
  throw new Error('BETTER_AUTH_SECRET is not set. ...');
}
const effectiveSecret = secret ?? cryptoRandomSecret();
```

Production contexts throw fast at module load if the secret is missing. Build/test contexts use `cryptoRandomSecret()` (line 210-213) which generates a fresh 32-byte random base64 string — explicitly NOT a known-default string.

### ✅ Pass — Session cookie is encrypted (Better Auth default)

Better Auth signs and encrypts the session cookie using AES-256-GCM with the configured `secret`. The Better Auth Drizzle adapter stores session records in the `session` table (`config.ts:69-73`) with hashed tokens — the cookie payload itself is encrypted + signed with `effectiveSecret`.

### ✅ Pass — Google OAuth + Magic Link + customSession plugin wired

**File:** `packages/auth/src/config.ts:98-199`

- `socialProviders.google` at line 98-104 (scope: `['email', 'profile']` — OAuth scope minimization per SKILL §5.6.1)
- `magicLink` plugin at line 106-133 (`expiresIn: 10 * 60` = 10 minutes)
- `customSession` plugin at line 135-199 — enriches session with `memberId`, `roles`, `activeSubscription`

### ✅ Pass — Better Auth rate limiting matches SKILL §15.7.4

**File:** `packages/auth/src/config.ts:88-97`

```ts
rateLimit: {
  window: 15 * 60,            // 15 minutes
  max: 10,                    // 10 sign-ins per window per IP
  customRules: {
    '/api/auth/sign-in/social': { window: 15 * 60, max: 10 },
    '/api/auth/magic-link':    { window: 15 * 60, max: 5  },
    '/api/auth/callback/*':    { window: 15 * 60, max: 15 },
  },
},
```

All four limits (10 global, 10 sign-in, 5 magic-link, 15 callback) match the audit checklist.

---

## 4.2 RBAC Matrix Enforcement

### ✅ Pass — 13 permissions × 6 roles matrix

**File:** `packages/auth/src/rbac.ts:21-52`

13 `Permission` literals:
`schedule:view`, `class:book`, `class:cancel:own`, `history:view:own`, `schedule:view:own`, `checkin:member`, `members:view:all`, `schedule:manage`, `class:cancel:any`, `revenue:view`, `memberships:manage`, `roles:assign`, `settings:studio`.

6 roles: `guest`, `member`, `instructor`, `staff`, `manager`, `owner`. Matrix mirrors PAD §9.2 exactly.

### 🟡 Important — `admin.getRevenueDetails` uses `staffProcedure` but RBAC requires `manager+`

**File:** `packages/api/src/routers/admin.ts:273`
```ts
getRevenueDetails: staffProcedure
  .input(z.object({ start: z.coerce.date().optional(), end: z.coerce.date().optional() }))
  .query(async ({ ctx, input }) => { ... })
```

**What's wrong:** PAD §9.2 maps `revenue:view` → `[manager, owner]` only. The procedure returns MRR, churn, payment counts — financial data that staff should not see. The `/admin/revenue` page is gated by `requireRole('manager','owner')` at the layout level (`(admin)/admin/revenue/layout.tsx:19`), so the **UI defense-in-depth holds** — but the **API boundary is too permissive**: a staff user could call `trpc.admin.getRevenueDetails.query()` directly via the tRPC endpoint and bypass the layout guard.

**Recommended fix:**
```ts
getRevenueDetails: managerProcedure  // new procedure tier OR ownerProcedure
```
Either introduce a `managerProcedure` tier (matches PAD §8.3's missing tier) or compose `staffProcedure` with an inline role check:
```ts
staffProcedure.use(async ({ ctx, next }) => {
  const ok = ctx.session.user.roles.some(r => ['manager','owner'].includes(r));
  if (!ok) throw new TRPCError({ code: 'FORBIDDEN' });
  return next();
})
```

### 🟡 Important — `admin.listAuditLog` uses `staffProcedure` but doc says "manager+ only"

**File:** `packages/api/src/routers/admin.ts:428-472`
```ts
/**
 * List audit log entries with filters (manager+ only). Phase 9 F9-20.
 */
listAuditLog: staffProcedure
  .input(z.object({ staffMemberId: z.string().uuid().optional(), ... }))
  .query(async ({ ctx, input }) => { ... })
```

**What's wrong:** The JSDoc comment at line 428 says "manager+ only" and the layout at `(admin)/admin/audit-log/layout.tsx:19` enforces `requireRole('manager','owner')` — but the tRPC procedure itself only requires `staffProcedure`. Same IDOR-style defense-in-depth gap as above: a staff user calling the tRPC endpoint directly bypasses the layout.

**Recommended fix:** introduce `managerProcedure` or add inline role check.

### 🟢 Nit — `admin.assignRole` / `admin.removeRole` correctly use `ownerProcedure` ✅

**File:** `packages/api/src/routers/admin.ts:350, 396` — both correctly gated to owner only.

### 🟢 Nit — `admin.getClassRoster` uses `staffProcedure` (correct — front-desk workflow)

The front-desk check-in workflow is staff+ per RBAC `checkin:member` permission.

---

## 4.3 Stripe Webhook Security

### ✅ Pass — Body read as TEXT (not JSON)

**File:** `apps/web/src/app/api/webhooks/stripe/route.ts:55-56`
```ts
// 3. Read the raw body as TEXT (NOT JSON — required for signature verification)
const body = await request.text();
```

### ✅ Pass — HMAC-SHA256 signature verification

**File:** `apps/web/src/app/api/webhooks/stripe/route.ts:68-82`

Uses `stripe.webhooks.constructEvent(body, signature, webhookSecret)` which performs HMAC-SHA256 verification and throws `SignatureVerificationError` on bad signature. Wrapped in try/catch returning HTTP 400.

### ✅ Pass — Idempotency via UNIQUE INDEX + `pg_advisory_xact_lock`

**File:** `packages/payments/src/webhooks.ts:81-131`

Two-layer idempotency:
1. **Fast path** (line 81-86): `db.query.paymentEvents.findFirst({ where: eq(paymentEvents.stripeEventId, event.id) })` returns immediately if already processed.
2. **Race protection** (line 93-110): `pg_advisory_xact_lock` acquired INSIDE the transaction; subsequent `INSERT payment_events` is the ultimate guarantee — the `uniqueIndex('idx_payment_events_stripe_id')` (`packages/db/src/schema/payments.ts:33`) catches any concurrent insert, returning `{ received: true }` via the `isUniqueViolation(err)` check at line 124.

### 🟢 Nit — Webhook handles 7 events but missing `checkout.session.completed` + `charge.refunded`

**File:** `packages/payments/src/webhooks.ts:143-166`

The 7 events handled:
1. `customer.subscription.created`
2. `customer.subscription.updated`
3. `customer.subscription.deleted`
4. `customer.subscription.trial_will_end` (no-op)
5. `invoice.paid`
6. `invoice.payment_failed`
7. `invoice.payment_action_required` (no-op)

**What's missing per audit checklist:** `checkout.session.completed` and `charge.refunded`. The PAD §15.3 spec lists the 7 events above (subscription lifecycle + invoice events) — so the implementation **matches PAD** — but the audit checklist explicitly requires `checkout.session.completed` (for credit-pack purchases via `packages/payments/src/credit-packs.ts`) and `charge.refunded` (per `D12 stub` note in `payments.refund`).

The `credit-packs.ts` module is fully implemented (`packages/payments/src/credit-packs.ts`) but has no webhook handler — credit-pack purchases will succeed at Stripe but won't be reconciled in `payment_events`. This is a latent gap if/when credit packs ship.

**Recommended fix:** Add `case 'checkout.session.completed': await handleCheckoutCompleted(event, tx); break;` and `case 'charge.refunded': await handleChargeRefunded(event, tx); break;` handlers (or document explicitly that credit packs are out-of-scope for v1).

### ✅ Pass — HTTP status codes: 200/400/500

**File:** `apps/web/src/app/api/webhooks/stripe/route.ts:39-103`
- 400 for missing signature (line 60-65) or invalid signature (line 76-82)
- 500 for Stripe client unavailable (line 47-53) or handler exception (line 95-102)
- 200 for valid + idempotent events (line 87-89)

`runtime = 'nodejs'` and `dynamic = 'force-dynamic'` correctly set (lines 34, 37).

---

## 4.4 Booking Concurrency

### ✅ Pass — `pg_advisory_xact_lock` (transaction-scoped, NOT session-scoped)

**File:** `packages/api/src/routers/bookings.ts:62-65`
```ts
const created = await ctx.db.transaction(async (tx) => {
  const lockKey = sessionUuidToLockKey(input.sessionId);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);
```

Uses `pg_advisory_xact_lock` (transaction-scoped, auto-releases at COMMIT/ROLLBACK) per ADR-004. NOT the broken `pg_advisory_lock` (session-scoped, breaks under Neon PgBouncer transaction pooling).

### ✅ Pass — Lock key derived deterministically from sessionId

**File:** `packages/api/src/routers/bookings.ts:41-43`
```ts
function sessionUuidToLockKey(sessionId: string): bigint {
  return BigInt('0x' + sessionId.replace(/-/g, '').slice(0, 16));
}
```

Same sessionId → same lock key (deterministic). Uses first 16 hex chars (64 bits) of the UUID — sufficient entropy.

### ✅ Pass — Lock acquired INSIDE the transaction

Lines 62-65 confirm: `await tx.execute(sql\`SELECT pg_advisory_xact_lock(${lockKey})\`)` runs inside the `ctx.db.transaction(async (tx) => { ... })` callback. ✅

### ✅ Pass — `bookings.cancel` ALSO uses advisory lock (C1 fix)

**File:** `packages/api/src/routers/bookings.ts:196-220` — Cancel flow fetches the enrollment first (line 203-209), acquires the lock on its sessionId (line 220), then performs the status update. Matches ADR-004.

---

## 4.5 Input Validation

### 🟡 Important — Zod v4 deprecation: `z.string().uuid()` used in 24 places (should be `z.uuid()`)

**Files:**
- `packages/api/src/routers/admin.ts:98, 164, 236, 353, 399, 433`
- `packages/api/src/routers/bookings.ts:52, 186, 275, 276`
- `packages/api/src/routers/sessions.ts:59, 60, 61, 103, 132, 133, 175`
- `packages/api/src/routers/classes.ts:27, 37, 41`
- `packages/api/src/routers/schedule.ts:63`
- `packages/api/src/routers/memberships.ts:80`
- `packages/api/src/routers/waitlist.ts:32, 100, 137`

**Example** (`packages/api/src/routers/bookings.ts:52`):
```ts
.input(z.object({ sessionId: z.string().uuid() }))
```

**What's wrong:** Zod v4 deprecated `z.string().uuid()` in favor of the top-level `z.uuid()`. The SSE route at `apps/web/src/app/api/schedule/stream/route.ts:41` already uses the correct `z.uuid()` form — so the codebase is inconsistent. The `MagicLinkForm.tsx:19` correctly uses `z.email()` (Zod v4 form), proving the team knows the new API.

**Recommended fix:** Find-and-replace `z.string().uuid()` → `z.uuid()` across `packages/api/src/routers/`.

### 🟡 Important — Zod v4 deprecation: `z.string().email()` and `z.string().url()` in env schema

**File:** `packages/config/src/env.ts:74, 88, 94, 98, 109, 118, 123, 124, 125`

```ts
BETTER_AUTH_URL: z.string().url(),         // line 74 — should be z.url()
EMAIL_FROM: z.string().email(),            // line 88 — should be z.email()
UPSTASH_REDIS_REST_URL: z.string().url(),  // line 94
SENTRY_DSN: z.string().url().optional(),   // line 98
CLOUDFLARE_R2_ENDPOINT: z.string().url(),  // line 109
NEXT_PUBLIC_APP_URL: z.string().url(),     // line 118
NEXT_PUBLIC_POSTHOG_HOST: z.string().url(),// line 123
NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),         // line 124
NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL: z.string().url(),         // line 125
```

Also affects `packages/api/src/routers/sessions.ts:66` (`streamUrl: z.string().url().optional()`) and `packages/api/src/routers/payments.ts:35` (`returnUrl: z.string().url().optional()`).

**Recommended fix:** Replace with `z.url({ protocol: /^https:$/ })` and `z.email()` per Zod v4 + PAD §5.1 guidance (Zod v4 `z.string().url()` accepts any scheme — use protocol refine).

### ✅ Pass — Every tRPC procedure with input has a Zod schema

Audit of all 30 procedures in `packages/api/src/routers/*.ts`:
- All 24 input-accepting procedures use `.input(z.object({ ... }))` ✅
- 6 procedures have no input (`members.getProfile`, `members.getHistory`, `memberships.getPlans`, `memberships.getMySubscription`, `memberships.cancel`, `memberships.resume`, `admin.getDashboard`) — these operate purely on `ctx.session` and need no input ✅

### ✅ Pass — No `as any` casts in production code

`rg "as any\b"` against `packages/` and `apps/web/src/` returns zero matches. The `services/workers/` package has a scoped ESLint override for 9 Drizzle 0.45 type-inference workarounds (documented in `status_4.md:26`) but those are `as unknown as` casts (see `packages/api/src/routers/bookings.ts:102-106`, `packages/payments/src/webhooks.ts:106`) — not `as any`.

---

## 4.6 Security Headers

### ✅ Pass — All required security headers present

**File:** `apps/web/next.config.ts:120-168`

| Header | Value | Status |
|---|---|---|
| `Content-Security-Policy` | Full CSP with `default-src 'self'` | ✅ |
| `X-Frame-Options` | `DENY` | ✅ |
| `X-Content-Type-Options` | `nosniff` | ✅ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` | ✅ |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | ✅ |
| `X-DNS-Prefetch-Control` | `on` | ✅ |

### ✅ Pass — CSP contains `'unsafe-inline' 'strict-dynamic'` (documented v9 V9-2 state)

**File:** `apps/web/next.config.ts:127-139`
```ts
"script-src 'self' 'unsafe-inline' 'strict-dynamic' https://js.stripe.com",
```

The header comment at lines 97-119 explicitly documents the v9 V9-2 fix: the nonce-based CSP in `proxy.ts` doesn't reach production on Vercel + Next.js 16.2.10 (GitHub #85711, #86303), so a static `'unsafe-inline' 'strict-dynamic'` CSP is the documented weaker state. The `proxy.ts` per-request nonce CSP at lines 73-95 is retained for future use once the Vercel/Next.js issue is resolved.

### 🟡 Important — `poweredByHeader: false` is NOT set

**File:** `apps/web/next.config.ts:12-204`

The `nextConfig` object does NOT include `poweredByHeader: false`. This means production responses include `x-powered-by: Next.js`, leaking the framework version and enabling attacker fingerprinting. PAD §20 A02 (Security Misconfiguration) and the canonical SKILL template at `skills/nextjs16-react19-next-auth5-drizzle-orm/SKILL.md:280` both include `poweredByHeader: false`.

**Recommended fix:** Add `poweredByHeader: false,` to the `nextConfig` object at line 12.

---

## 4.7 Secret Management

### 🔴 Critical — `.env.local` and `apps/web/.env.local` ARE tracked by git AND contain real secrets

**Verification:**
```bash
$ git ls-files | grep -E "\.env"
.env.example
.env.local
apps/web/.env.local
```

**Real secret exposed in `apps/web/.env.local:23`:**
```
BETTER_AUTH_SECRET=aJp8oRveNW1g7mFLQmkpZsCokNbExrERoTOETluNzt4=
```

**Other secrets with placeholder values committed to history:**
- `GOOGLE_CLIENT_SECRET=your-google-client-secret`
- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`

**What's wrong:**
1. `.gitignore` at root DOES include `.env.local` (line 8) — but the files were committed BEFORE the gitignore rule was added (or with `git add --force`).
2. `apps/web/.env.local` contains a real, non-placeholder `BETTER_AUTH_SECRET` (44-char base64 string ending in `=`). Anyone with read access to the repo can forge session cookies for any user.
3. v1.19.0 of `PAD.md` (line 1.19.0 changelog at line ~82) claims this was fixed: *"`git rm --cached .env.local` + pre-commit hook at `scripts/pre-commit-check.sh`"*. Either the remediation was never actually executed, or the files were re-committed in the most recent commit `d3740b5 "Add files via upload"`.
4. The docs already call this out as a C6 P0 incident at `docs/session_zaih_remediation_2.md:389`.

**Recommended remediation (must be coordinated with repo owner — read-only audit cannot modify):**
1. **IMMEDIATELY rotate `BETTER_AUTH_SECRET`** — the leaked value is compromised. Generate a new one: `openssl rand -base64 32`.
2. Rotate all secrets that may have been in the file at any point: `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SANITY_API_TOKEN`, `RESEND_API_KEY`, `TRIGGER_SECRET_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `CLOUDFLARE_*`, `DATABASE_URL`.
3. Remove files from git tracking: `git rm --cached .env.local apps/web/.env.local && git commit -m "security: untrack .env.local files (C5/C6 remediation)"`.
4. Purge git history with `git filter-repo` or BFG Repo-Cleaner (the secret is in `d3740b5` and earlier commits — `git rm --cached` alone leaves it in history).
5. Install the pre-commit hook: `scripts/pre-commit-check.sh` (referenced in v1.19.0 changelog but apparently never wired into `.git/hooks/pre-commit`).
6. Force-push the rewritten history and have all collaborators re-clone.

### ✅ Pass — `.gitignore` includes `.env.local`

**File:** `.gitignore:8`
```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
# NOTE: .env.example is COMMITTED intentionally — never add secrets to it
```

The rule exists; the problem is that the files were committed despite the rule.

### ✅ Pass — t3-env Zod validation for all 34 env vars

**File:** `packages/config/src/env.ts:52-126`

- **26 server vars:** DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET (with weak-secret rejection superRefine at lines 62-73), BETTER_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SANITY_API_TOKEN, SANITY_WEBHOOK_SECRET, RESEND_API_KEY, EMAIL_FROM, TRIGGER_SECRET_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, SENTRY_DSN, SENTRY_AUTH_TOKEN, AXIOM_TOKEN, AXIOM_DATASET, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_IMAGES_TOKEN, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_ENDPOINT, NODE_ENV = **26** ✅
- **8 client vars:** NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST, NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL = **8** ✅
- **Total: 34** ✅

`BETTER_AUTH_SECRET` has additional hardening via `.superRefine()` at lines 65-73 that rejects known-weak strings (`dev-secret`, `test-secret`, `ci-dummy`, `change-me`, `placeholder-secret`).

### 🟡 Important — `process.env.X` direct access in production code (SKILL Lesson 103)

**Files using `process.env.X` instead of `env.X` in production code:**

| File | Line | Var | Justification |
|---|---|---|---|
| `packages/payments/src/client.ts` | 37 | `STRIPE_SECRET_KEY` | None — should use `env.STRIPE_SECRET_KEY` |
| `packages/payments/src/webhooks.ts` | 327 | `NEXT_PUBLIC_APP_URL` | None — should use `env.NEXT_PUBLIC_APP_URL` |
| `packages/api/src/routers/payments.ts` | 62 | `NEXT_PUBLIC_APP_URL` | None |
| `packages/api/src/routers/memberships.ts` | 116 | `NEXT_PUBLIC_APP_URL` | None |
| `packages/email/src/send.ts` | 37, 63, 96 | `RESEND_API_KEY`, `EMAIL_FROM` | None |
| `packages/config/src/jobs-client.ts` | 39, 45 | `TRIGGER_SECRET_KEY`, `NODE_ENV` | None |
| `packages/api/src/lib/jobs-client.ts` | 40, 46, 64 | `TRIGGER_SECRET_KEY`, `NODE_ENV` | None |
| `apps/web/src/lib/seo/schemas.ts` | 10 | `NEXT_PUBLIC_APP_URL` | None |
| `apps/web/src/lib/sanity/client.ts` | 26-28 | `NEXT_PUBLIC_SANITY_*`, `SANITY_API_TOKEN` | None |
| `apps/web/src/lib/cloudflare/images.ts` | 37-38 | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_IMAGES_KEY` | None |
| `apps/web/src/lib/analytics/posthog.ts` | 18, 24 | `NEXT_PUBLIC_POSTHOG_KEY`, `NODE_ENV` | None |
| `apps/web/src/app/api/sanity/webhook/route.ts` | 58 | `SANITY_WEBHOOK_SECRET` | None |
| `apps/web/src/app/sitemap.ts` | 16 | `NEXT_PUBLIC_APP_URL` | None |
| `apps/web/src/app/robots.ts` | 13 | `NEXT_PUBLIC_APP_URL` | None |
| `apps/web/src/app/layout.tsx` | 11 | `NEXT_PUBLIC_APP_URL` | None |
| `packages/auth/src/config.ts` | 41-59 | multiple | **EXEMPT** — documented at line 33 per SKILL §3.4 |
| `packages/db/src/index.ts` | 29 | `DATABASE_URL` | **EXEMPT** — documented at line 11 per SKILL §3.4 |

**What's wrong:** SKILL §3.4 exempts `packages/auth/src/config.ts` and `packages/db/src/index.ts` (infrastructure clients that must work in build context before env validation runs). All other files should import `env` from `@stillwater/config`. Direct `process.env.X` reads bypass Zod validation — typos like `process.env.GOOGLE_CLIENTID` (missing underscore) silently return `undefined`.

**Recommended fix:** Replace `process.env.X` with `env.X` (imported from `@stillwater/config`) in the 13 non-exempt files listed above.

---

## 4.8 SQL Injection

### ✅ Pass — No raw SQL string concatenation

All SQL across `packages/api/src/routers/*.ts` and `packages/payments/src/webhooks.ts` uses Drizzle's query builder or `sql\`...\`` tagged template literals:

- `packages/api/src/routers/bookings.ts:65, 220` — `sql\`SELECT pg_advisory_xact_lock(${lockKey})\`` (parameterized)
- `packages/api/src/routers/admin.ts:151, 226, 310, 324, 326, 468` — `sql\`true\``, `sql\`member_subscriptions\``, `sql\`(select ...)\``, `sql\`enrollments\`` (all identifier-only, no user input interpolation)
- `packages/api/src/routers/schedule.ts:82` — `sql<number>\`count(*)::int\``
- `packages/api/src/routers/admin.ts:288, 307, 308, 319, 320, 321` — `sql<number>\`coalesce(sum(...), 0)::int\`` with `${paymentEvents.payload}` column ref (not user input)

`rg "execute\(|query\(\`"` returns only the 3 `pg_advisory_xact_lock` calls — all parameterized. ✅

---

## 4.9 XSS

### ✅ Pass — `dangerouslySetInnerHTML` used in exactly ONE place (JSON-LD), with proper escaping

**File:** `apps/web/src/components/seo/JsonLd.tsx:24`

```tsx
return (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: json }}
  />
);
```

The `json` value at line 16-19 is `JSON.stringify(schema)` with three `.replace()` calls escaping `<`, `>`, `&`.

### 🟢 Nit — `escapeForScriptContext` is missing `\u2028` and `\u2029` escapes

**File:** `apps/web/src/components/seo/JsonLd.tsx:16-19`
```ts
const json = JSON.stringify(schema)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026');
```

**What's wrong:** SKILL §15.10 `escapeForScriptContext` canonical implementation also escapes U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR):
```ts
.replace(/\u2028/g, '\\u2028')
.replace(/\u2029/g, '\\u2029');
```

These characters are valid JSON but terminate JavaScript string literals in some browsers — a malicious `name` field containing U+2028 could break out of the `<script>` context. Low practical risk because the JSON-LD schemas come from server-side builders (`schemas.ts`) with no direct user input — but the canonical pattern is documented and should be followed.

**Recommended fix:** Add the two `.replace()` calls, or extract to `apps/web/src/lib/seo/escape.ts` per the SKILL §15.10 pattern.

---

## 4.10 Rate Limiting

### ✅ Pass — `bookings.book` is rate-limited at 10/min

**File:** `packages/api/src/routers/bookings.ts:33-34, 50-51`
```ts
const bookingRateLimit = rateLimit({ limit: 10, window: '1 m' });
...
book: protectedProcedure
  .use(bookingRateLimit)
  .input(z.object({ sessionId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => { ... })
```

### ✅ Pass — Auth mutations rate-limited in Better Auth config

See §4.1 above — 10/15min global, 5/15min magic-link, 15/15min callback.

### ✅ Pass — Rate limiter is fail-OPEN (Upstash failure allows request)

**File:** `packages/api/src/middleware/rateLimit.ts:54-65`
```ts
// Fail-OPEN: if Redis is unreachable, allow the request through.
let success = true;
let reset = Date.now() + 60_000;
try {
  const result = await limiter.limit(id);
  success = result.success;
  reset = result.reset;
} catch {
  // Redis down — log and allow (fail-open)
  console.error('[rateLimit] Redis unreachable, failing OPEN for', id);
  return next({ ctx });
}
```

Matches SKILL §15.7 fail-open policy. (Stripe webhooks remain fail-CLOSED via signature verification — that's separate from rate limiting.)

---

# Axis 5 — Performance Findings

## 5.1 Bundle Size

### ✅ Pass — `@next/bundle-analyzer` in devDependencies

**File:** `apps/web/package.json:75`
```json
"@next/bundle-analyzer": "^16.2.0",
```

### ✅ Pass — `withBundleAnalyzer` wrapper in `next.config.ts`

**File:** `apps/web/next.config.ts:1-10, 226`
```ts
import bundleAnalyzer from "@next/bundle-analyzer";
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });
...
export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryConfig));
```

`ANALYZE=true pnpm build` would work.

### 🟢 Nit — Heavy dependencies statically imported (could be lazy-loaded)

**Files:**
- `apps/web/src/components/admin/RevenueChart.tsx:13-21` — statically imports `recharts` (`ResponsiveContainer`, `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`). Recharts is ~400KB minified (~120KB gzipped). Used only on `/admin/revenue`.
- `apps/web/src/components/admin/ScheduleCalendar.tsx:19-26` — statically imports `@dnd-kit/core` (5 exports). Used only on `/admin/schedule`.
- `apps/web/src/components/ui/command.tsx:6` — statically imports `cmdk`. Used only by admin Command Palette (not yet wired).
- `apps/web/src/components/ui/calendar.tsx:6` — statically imports `react-day-picker` (v10). Used only by admin forms.

**What's wrong:** All four admin-only dependencies ship in the admin route bundle, but Next.js's automatic code-splitting per-route means they don't bloat the marketing bundle. Still, a dynamic `next/dynamic(() => import('recharts'), { ssr: false })` would cut first-load JS on `/admin/revenue` by ~120KB gzipped.

**Recommended fix:** Convert `RevenueChart` to a dynamic import:
```ts
const RevenueChart = dynamic(() => import('./RevenueChart').then(m => m.RevenueChart), {
  ssr: false,
  loading: () => <div className="h-64 border border-stone-200 bg-sand-50 animate-pulse" />,
});
```

### ✅ Pass — Stripe.js NOT loaded client-side

The `CheckoutButton` (`apps/web/src/components/membership/CheckoutButton.tsx:38-43`) redirects the browser to Stripe-hosted checkout (`window.location.href = data.checkoutUrl`) — it does NOT load `@stripe/stripe-js` or `https://js.stripe.com/v3` client-side. The CSP `script-src https://js.stripe.com` and `frame-src https://js.stripe.com` allowlist entries are retained for future Stripe Elements usage but currently unused.

### 🟢 Nit — `babel-plugin-react-compiler` in `dependencies` (should be `devDependencies`)

**File:** `apps/web/package.json:49`
```json
"babel-plugin-react-compiler": "^1.0.0",
```

SKILL §9.9 Gotcha 11 documents `pnpm add -F @stillwater/web babel-plugin-react-compiler` which defaults to devDependencies. Functionally equivalent either way (Next.js only invokes it at build time), but the convention is devDependencies. Minor.

---

## 5.2 Rendering Strategy

### ✅ Pass — Marketing routes have correct `revalidate` / `dynamic` exports

| Route | Export | Value | Per PAD §12 |
|---|---|---|---|
| `(marketing)/page.tsx:34` | `revalidate` | `3600` (1h) | ✅ ISR hourly |
| `(marketing)/pricing/page.tsx:12` | `revalidate` | `3600` | ✅ ISR hourly |
| `(marketing)/instructors/page.tsx:14` | `revalidate` | `86400` (24h) | ✅ ISR daily |
| `(marketing)/about/page.tsx:13` | `revalidate` | `86400` | ✅ ISR daily |
| `(marketing)/blog/page.tsx:15` | `revalidate` | `3600` | ✅ ISR hourly |
| `(marketing)/schedule/page.tsx:13` | `dynamic` | `force-dynamic` | ✅ Live data |

### ✅ Pass — `/dashboard`, `/admin/*` are SSR (`force-dynamic`)

All admin routes export `dynamic = 'force-dynamic'` (verified in `apps/web/src/app/(admin)/admin/*/page.tsx` — 9 files). Same for `/dashboard`, `/profile`, `/membership`, `/history`, `/book/[sessionId]` in the `(studio)` group.

### ✅ Pass — `/book/[sessionId]` uses SSR with `dynamic = 'force-dynamic'`

**File:** `apps/web/src/app/(studio)/book/[sessionId]/page.tsx:9`
```ts
export const dynamic = 'force-dynamic';
```

Real-time SSE is consumed client-side by `<BookingFlow>` — the page itself is server-rendered per-request (auth-gated, session-data-dependent). Correct hybrid: SSR shell + CSR SSE.

### ✅ Pass — Slug routes have `experimental_ppr = false` + `dynamicParams = false`

**Files:**
- `apps/web/src/app/(marketing)/instructors/[slug]/page.tsx:28-29`
- `apps/web/src/app/(marketing)/blog/[slug]/page.tsx:26-27`

Both export:
```ts
export const experimental_ppr = false;
export const dynamicParams = false;
```

Verified by tests at `apps/web/src/app/api/auth/[...all]/slug-404-verify.test.ts:89, 98, 141, 149`.

---

## 5.3 Image Optimization

### ✅ Pass — `images` config has Cloudflare + Sanity CDN hostnames

**File:** `apps/web/next.config.ts:67-94`
```ts
images: {
  formats: ["image/avif", "image/webp"],
  remotePatterns: [
    { protocol: "https", hostname: "imagedelivery.net", pathname: "/**" },           // Cloudflare Images
    { protocol: "https", hostname: "*.r2.cloudflarestorage.com", pathname: "/**" },   // Cloudflare R2
    { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },         // Sanity CDN
  ],
  dangerouslyAllowSVG: false,
  contentDispositionType: "attachment",
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
},
```

### ✅ Pass — `dangerouslyAllowSVG: false`

Confirmed at line 91.

### ✅ Pass — `formats: ['image/avif', 'image/webp']`

Confirmed at line 69.

### 🟡 Important — `next/image` is NOT used anywhere in marketing components

**Verification:**
```bash
$ rg "next/image|Image from" apps/web/src/components/
# Only matches: avatar.tsx (Radix Avatar, not next/image)
```

**What's wrong:** The codebase has zero `next/image` imports. All visual marketing components (`Hero.tsx`, `InstructorRow.tsx`, `StudioSpaceSection.tsx`, `Footer.tsx`, `BlogCard`, etc.) either use:
1. **Placeholder `<div>` blocks** with `bg-sand-warm` (e.g., `InstructorRow.tsx:36-47` — `aspect-[3/4] bg-sand-warm` with a numeric `01` `02` `03` placeholder)
2. **Inline SVG** (`StudioSpaceSVG.tsx`)

This means instructor portraits, blog post hero images, and class thumbnails — all of which have Cloudflare Images CDN URLs configured — are not actually rendered anywhere. The CDN allowlist in `next.config.ts:70-89` is unused.

**Recommended fix:** When real images are wired, use `<Image>` from `next/image` (not raw `<img>`) to get automatic format negotiation, lazy-loading, and CLS prevention.

---

## 5.4 Font Loading

### 🔴 Critical — Fonts loaded via CSS `@font-face`, NOT `next/font/local`

**Verification:**
```bash
$ rg "next/font" apps/web/src/app/layout.tsx
# No matches
```

**File:** `apps/web/src/app/layout.tsx:1-59`

The root layout imports `Toaster`, `Metadata`, `globals.css`, `SkipLink`, `PostHogProvider`, `TRPCProvider` — but NO `next/font/local` import. Fonts are loaded via static `@font-face` declarations in:
- `packages/ui/src/fonts/cormorant/cormorant.css` (18 `@font-face` blocks)
- `packages/ui/src/fonts/dm-sans/dm-sans.css` (6 `@font-face` blocks)
- `packages/ui/src/fonts/jetbrains-mono/jetbrains-mono.css` (12 `@font-face` blocks)

These are imported via `packages/ui/src/fonts/index.css` → `packages/ui/src/globals.css` → `apps/web/src/app/globals.css:10`.

**What's wrong:** SKILL §1.2 + §4.1 explicitly require `next/font/local`. The project's own audit report at `docs/audit/phase-D-frontend-aesthetic.md:19, 50, 125-131, 439, 530, 605` and `docs/audit/STILLWATER_AUDIT_REPORT.md:203, 329` already documents this as a P0-3 finding:

> "P0-3. Fonts not loaded via next/font/local. SKILL §1.2 requires next/font/local for Cormorant Garamond, DM Sans, and JetBrains Mono. Current implementation uses CSS @font-face in packages/ui/src/fonts/*.css. apps/web/src/app/layout.tsx does not import next/font/local. Loses: automatic font preloading, size-adjust fallback (causes CLS), display: swap metrics."

**Consequences:**
1. No automatic font preloading (Next.js injects `<link rel="preload">` for `next/font/local` fonts)
2. No `size-adjust` font-fallback metrics → FOUT/FOIT causes layout shift on first paint
3. No automatic `display: swap` metrics optimization (the `@font-face` blocks DO set `font-display: swap` at line 8 of cormorant.css etc., but without Next.js's font-fallback machinery the swap metrics aren't calibrated)

**Recommended fix:** Convert to `next/font/local` loader in `apps/web/src/app/layout.tsx`:
```ts
import localFont from 'next/font/local';

const cormorant = localFont({
  src: '../../packages/ui/src/fonts/cormorant/cormorant-garamond-regular-normal-latin.woff2',
  variable: '--font-display',
  display: 'swap',
  weight: '400',
});
// ... repeat for dm-sans, jetbrains-mono
```

Then add `${cormorant.variable} ${dmSans.variable} ${jetbrainsMono.variable}` to `<html>` className.

---

## 5.5 Database Performance

### ✅ Pass — Critical indexes exist

| Index | File:Line | Purpose |
|---|---|---|
| `idx_enrollments_session_status` | `packages/db/src/schema/enrollments.ts:47-49` | Partial index WHERE status='confirmed' for fast seat counts |
| `idx_enrollments_session_member` | `packages/db/src/schema/enrollments.ts:44-45` | Unique constraint prevents double-booking |
| `idx_sessions_starts_at_status` | `packages/db/src/schema/sessions.ts:43-45` | Partial index WHERE status='scheduled' for schedule queries |
| `idx_waitlist_session_position` | `packages/db/src/schema/waitlist.ts:38-40` | Partial index WHERE status='waiting' for "next in line" queries |
| `idx_waitlist_session_member` | `packages/db/src/schema/waitlist.ts:43-44` | Unique constraint prevents duplicate waitlist entries |
| `idx_payment_events_stripe_id` | `packages/db/src/schema/payments.ts:33` | Unique index for webhook idempotency |
| `idx_members_stripe_customer_id` | `packages/db/src/schema/members.ts:33` | Lookup by Stripe customer ID (webhook handlers) |
| `idx_subscriptions_member_status` | `packages/db/src/schema/memberships.ts:61` | Member subscription queries |
| `idx_role_assignments_member_role` | `packages/db/src/schema/role-assignments.ts:26` | Unique constraint on (memberId, role) |
| `idx_audit_log_staff_created` | `packages/db/src/schema/audit-log.ts:37` | Audit log filter by staff + date |
| `idx_audit_log_action` | `packages/db/src/schema/audit-log.ts:39` | Audit log filter by action |
| `idx_audit_log_entity` | `packages/db/src/schema/audit-log.ts:41` | Audit log filter by entity |

### ✅ Pass — `pg` driver in `dependencies` (not `devDependencies`)

**File:** `packages/db/package.json:36`
```json
"dependencies": {
  "@neondatabase/serverless": "^1.1.0",
  "drizzle-orm": "^0.45.2",
  "pg": "^8.13.1",
  "zod": "^4.4.3"
},
```

### ✅ Pass — `DATABASE_URL_UNPOOLED` used for migrations

**File:** `packages/db/drizzle.config.ts:22`
```ts
const connectionString = process.env["DATABASE_URL_UNPOOLED"];
if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED is not defined. ...");
}
```

Comment at lines 10-12 explains: *"The pooled URL (PgBouncer) breaks prepared statements in migration scripts."* ✅

---

## 5.6 SSE Performance

### ✅ Pass — `maxDuration = 300` (5 min Vercel ceiling)

**File:** `apps/web/src/app/api/schedule/stream/route.ts:23`
```ts
export const maxDuration = 300;
```

### ✅ Pass — `ReadableStream` + 10s `setInterval` polling

**File:** `apps/web/src/app/api/schedule/stream/route.ts:123-147`
```ts
const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(encoder.encode(formatSSEEvent(initialData)));
    const interval = setInterval(() => {
      void getSeatAvailability(sessionId).then((data) => {
        if (!data) { controller.close(); clearInterval(interval); return; }
        controller.enqueue(encoder.encode(formatSSEEvent(data)));
      });
    }, 10_000);
    request.signal.addEventListener('abort', () => {
      clearInterval(interval);
      controller.close();
    });
  },
});
```

10s polling per SKILL §15.3 + PAD §13.2. ✅

### ✅ Pass — NO `force-dynamic` export

**File:** `apps/web/src/app/api/schedule/stream/route.ts:28`
```ts
// Do NOT add: export const dynamic = 'force-dynamic' (SKILL §9.1 Gotcha 7)
```

Comment explicitly cites the gotcha. ✅

---

## 5.7 React Compiler

### ✅ Pass — `reactCompiler: true` in `next.config.ts`

**File:** `apps/web/next.config.ts:17`
```ts
reactCompiler: true,
```

### 🟢 Nit — `babel-plugin-react-compiler` in `dependencies` (not `devDependencies`)

See §5.1 above. SKILL §9.9 Gotcha 11 documents `pnpm add -F @stillwater/web babel-plugin-react-compiler` which defaults to devDependencies. Functionally equivalent.

---

# Axis 6 — Aesthetic/UX Findings

## 6.1 Anti-Generic Enforcement

### ✅ Pass — No purple-to-pink gradients

`rg "from-purple-|from-violet-|from-fuchsia-|bg-gradient-to-"` returns zero matches in `apps/web/src/`.

### ✅ Pass — No Inter/Roboto as primary typeface

`--font-display: 'Cormorant Garamond'`, `--font-body: 'DM Sans'`, `--font-mono: 'JetBrains Mono'` per `packages/ui/src/tokens/typography.css:5-7`. ✅

### ✅ Pass — No drop shadows in shadcn primitives

```bash
$ rg "shadow-sm|shadow-md|shadow-lg|shadow-xl" apps/web/src/components/ui/
# No matches
```

The shadcn primitives use `shadow-none` (e.g., `checkbox.tsx:17`, `input.tsx:12`, `textarea.tsx:12`) to explicitly opt out of shadows. ✅

### ✅ Pass — No "Book a Free Trial" pill CTAs

`rg "Book a Free Trial|free trial"` finds only:
- `apps/web/src/lib/marketing/copy.ts:99` — `'7-day free trial on all memberships. Cancel anytime.'` (descriptive copy, not a CTA label)
- `apps/web/src/app/(marketing)/pricing/page.tsx:269` — `'All memberships include a 7-day free trial for new members.'` (descriptive copy)

All CTAs use sharp rectangles (`rounded-none`) per `button.tsx:9`. The MarketingNav CTA at `MarketingNav.tsx:65` uses `bg-clay-500 px-6 py-2 text-sm` — sharp corners ✅.

### ✅ Pass — No Tailwind default colors (`bg-amber-*`, `bg-red-*`, `bg-blue-*`, etc.)

`rg "bg-amber-|bg-red-|bg-blue-|bg-green-|bg-yellow-"` returns zero matches. All colors use the Warm Mineral palette (`bg-stone-*`, `bg-clay-*`, `bg-water-*`, `bg-sand-*`).

### 🟡 Important — Glassmorphism / blur backdrop in MobileNavDrawer

**File:** `apps/web/src/components/marketing/MobileNavDrawer.tsx:46`
```tsx
<Dialog.Overlay
  className="fixed inset-0 z-40 bg-stone-900/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out"
/>
```

**What's wrong:** `backdrop-blur-sm` is a glassmorphism pattern. The audit checklist bans "❌ Glassmorphism / blur backdrops".

**Mitigating context:** This is a modal scrim (Radix Dialog Overlay), not a card surface. A blurred scrim is the standard accessibility pattern for focus-stealing modals — it visually communicates "the background is non-interactive". The ban is intended for card backgrounds, hero overlays texts, and nav bars (the typical "frosted glass" aesthetic), not modal scrims.

**Recommended fix (optional, low priority):** Replace `backdrop-blur-sm` with a darker solid scrim: `bg-stone-900/80` (no blur). Eliminates the only `backdrop-blur-*` usage in the codebase.

### ✅ Pass — No mesh/aurora gradient backgrounds

`rg "mesh-gradient|aurora|radial-gradient"` returns zero matches in `apps/web/src/`.

### ✅ Pass — Hero is asymmetric (NOT left/right symmetric split)

**File:** `apps/web/src/components/marketing/Hero.tsx:27`
```tsx
<section
  className="grid grid-cols-1 gap-0 px-0 md:grid-cols-[1fr_1px_minmax(280px,38%)]"
  aria-label="Welcome"
>
```

The grid is `1fr 1px minmax(280px, 38%)` — asymmetric (right column capped at 38% with a 1px vertical divider). NOT a symmetric 50/50 split. ✅

### ✅ Pass — No lotus/mandala decorative icons

`rg "lotus|mandala"` returns zero matches in `apps/web/src/`.

### 🟢 Nit — MarketingNav uses logo-left/links-center/CTA-right layout

**File:** `apps/web/src/components/marketing/MarketingNav.tsx:12-72`

```tsx
<nav className="flex items-center justify-between ...">
  <Link href="/" ...>Stillwater</Link>           {/* wordmark flush left */}
  <div className="hidden items-center gap-8 md:flex">  {/* links center */}
    <Link href="/schedule">Schedule</Link>
    ...
  </div>
  <Link href="/schedule" className="... bg-clay-500 ...">Book</Link>  {/* CTA flush right */}
  <MobileNavDrawer />
</nav>
```

**What's wrong:** The audit checklist bans "❌ Sticky nav with logo-left/links-center/CTA-right". The MarketingNav is NOT sticky (no `sticky top-0` class — verified by `rg "sticky"` returning only the JSDoc comment at line 7). So technically it satisfies the literal ban (the keyword "Sticky" is what triggers the anti-pattern).

However, the layout itself IS the canonical logo-left/links-center/CTA-right three-column pattern. The Editorial Calm aesthetic typically uses a single-line rule nav (wordmark + horizontal links + CTA on one baseline) which is what's implemented here. The anti-pattern ban is targeting the SaaS-landing-page sticky-nav-with-blur-backdrop aesthetic, not the simple static nav. Passing this as a nit.

### ✅ Pass — No predictable 3-column feature card grids

The marketing components use alternating rows (`InstructorRow.tsx:23-79` alternates `order-1`/`order-2`), asymmetric grids (`Hero.tsx:27` `1fr 1px minmax(280px,38%)`), and editorial sections (`Philosophy.tsx`, `CtaBand.tsx`). No generic 3-up feature card grid found.

### ✅ Pass — No stock photography of people meditating

No `<img>` or `<Image>` tags in marketing components. All visual placeholders are numeric (`01`, `02`, `03` — see `InstructorRow.tsx:39-44`) or geometric (`StudioSpaceSVG.tsx`).

### ✅ Pass — Pre-commit grep checks (SKILL §5.5) all return clean

```bash
$ rg "shadow-sm|shadow-md|shadow-lg|shadow-xl" apps/web/src/components/ui/
# No matches — PASS

$ rg "bg-gradient-" apps/web/src/components/ui/
# No matches — PASS

$ rg "rounded-lg|rounded-xl|rounded-2xl" apps/web/src/components/ui/ | rg -v "rounded-full"
# No matches — PASS
```

`rounded-sm` is used in `tabs.tsx:33, 48`, `select.tsx:122`, `dropdown-menu.tsx:31, 87, 103, 127`, `command.tsx:118`, `dialog.tsx:42, 48` — but `--radius-sm: 0` is set globally in `globals.css:92`, so `rounded-sm` resolves to `border-radius: 0` (sharp). Functionally equivalent to `rounded-none`. ✅

---

## 6.2 Design Token Compliance

### ✅ Pass — `--radius: 0` set globally (sharp edges)

**File:** `apps/web/src/app/globals.css:91-97`
```css
--radius: 0;
--radius-sm: 0;
--radius-md: 0;
--radius-lg: 0;
--radius-xl: 0;
--radius-2xl: 0;
--radius-full: 9999px; /* ONLY for avatars and status dots */
```

Also set in `packages/ui/src/tokens/colors.css:80`: `--radius: 0;`.

### ✅ Pass — Color tokens use numbered scale

**File:** `packages/ui/src/tokens/colors.css:4-46`

- Stone: `--color-stone-950` (#0F0D0B) through `--color-stone-50` (#F5F0E8) — 11 steps ✅
- Clay: `--color-clay-600` (#8A4030) through `--color-clay-100` (#F7EDE8) — 6 steps ✅
- Water: `--color-water-700` (#4A7280) through `--color-water-100` (#E8F0F3) — 6 steps ✅
- Sand: `--color-sand`, `--color-sand-warm`, `--color-sand-deep` — 3 tokens (single-tone semantic, not numbered) ✅

### ✅ Pass — No old named tokens (`--color-stone-deep`, `--color-clay`, `--color-fog`)

`rg "color-stone-deep|color-clay:|color-fog"` returns zero matches in `packages/ui/src/tokens/colors.css`. The D9 cleanup is complete.

### ✅ Pass — Spacing uses `--space-N`

**File:** `packages/ui/src/tokens/spacing.css:5-19`
```css
--space-px: 1px;
--space-0-5: 2px;
--space-1: 4px;
...
--space-13: 256px;
```

No `--sp-N` mockup tokens found. ✅

### ✅ Pass — Motion uses `--duration-*`

**File:** `packages/ui/src/tokens/motion.css:10-14`
```css
--duration-instant: 100ms;
--duration-quick: 150ms;
--duration-standard: 300ms;
--duration-slow: 600ms;
--duration-crawl: 900ms;
```

No `--dur-*` mockup tokens found. ✅

---

## 6.3 Typography

### ✅ Pass — `--font-display: 'Cormorant Garamond'`

**File:** `packages/ui/src/tokens/typography.css:5`
```css
--font-display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
```

### ✅ Pass — `--font-body: 'DM Sans'`

**File:** `packages/ui/src/tokens/typography.css:6`
```css
--font-body: 'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

### ✅ Pass — `--font-mono: 'JetBrains Mono'` (NOT Berkeley Mono per D25)

**File:** `packages/ui/src/tokens/typography.css:7`
```css
--font-mono: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Courier New', monospace;
```

`rg "font-berkeley|Berkeley Mono"` returns zero matches in `apps/web/src/`. D25 fix applied. ✅

### ✅ Pass — Fluid type scale uses `clamp()`

**File:** `packages/ui/src/tokens/typography.css:10-18`
```css
--text-display-2xl: clamp(3.5rem, 8vw, 7rem);
--text-display-xl: clamp(2.5rem, 5vw, 4.5rem);
--text-display-lg: clamp(2rem, 4vw, 3.25rem);
--text-heading-lg: clamp(1.5rem, 3vw, 2rem);
--text-heading-md: 1.25rem;
--text-body-lg: 1.125rem;
--text-body-md: 1rem;
--text-body-sm: 0.875rem;
--text-caption: 0.75rem;
```

Top 4 tokens are fluid (`clamp()`); bottom 5 are fixed (caption/body sizes shouldn't scale). ✅

---

## 6.4 WCAG AAA Accessibility

### ✅ Pass — Color contrast 7:1 (WCAG 2.2 Level AAA target)

**File:** `packages/ui/src/tokens/colors.css:39-45`
```css
/* Status colors — darkened for WCAG 2.2 AAA contrast on sand (#F5F0E8) */
/* Previous: success #4A7C59 (4.29:1 FAIL AA), warning #C4913A (2.48:1 FAIL), error #B85450 (4.19:1 FAIL) */
/* New: success #2D5A3A (7.8:1 PASS AAA), warning #7A5C1E (6.9:1 PASS AA), error #8A3530 (7.1:1 PASS AAA) */
--color-success: #2D5A3A;
--color-warning: #7A5C1E;
--color-error: #8A3530;
```

Status colors explicitly darkened to meet AAA (success 7.8:1, error 7.1:1). Warning is AA (6.9:1) — documented in the comment.

### 🟡 Important — All shadcn primitives use `outline-none` (should be `outline-hidden` per Tailwind v4)

**Files:** Every component in `apps/web/src/components/ui/`:

| File | Line | Pattern |
|---|---|---|
| `button.tsx` | 9 | `focus-visible:outline-none` |
| `checkbox.tsx` | 17 | `focus-visible:outline-none` |
| `input.tsx` | 12 | `focus-visible:outline-none` |
| `textarea.tsx` | 12 | `focus-visible:outline-none` |
| `tabs.tsx` | 33, 48 | `focus-visible:outline-none` |
| `select.tsx` | 23, 122 | `focus:outline-none` / `outline-none` |
| `dialog.tsx` | 48 | `focus:outline-none` |
| `dropdown-menu.tsx` | 31, 87, 103, 127 | `outline-none` |
| `popover.tsx` | 23 | `outline-none` |
| `command.tsx` | 51, 118 | `outline-none` |
| `MarketingNav` NewsletterForm | `apps/web/src/components/marketing/NewsletterForm.tsx:75` | `focus:outline-none` |

**What's wrong:** Tailwind v4 changed `outline-none` semantics. In v3, `outline-none` set `outline: none`. In v4, `outline-none` sets `outline-style: none` which **removes the focus ring entirely** in Windows High Contrast / forced-colors mode (an accessibility regression). The correct Tailwind v4 utility is `outline-hidden` which sets `outline: 2px solid transparent` (preserves the ring in forced-colors mode but hides it visually in normal mode).

SKILL §2.1 (Tailwind CSS row) documents this: *"`outline-hidden` replaces v3 `outline-none` (v4 `outline-none` now sets `outline-style: none` — different semantics)"*.

**Recommended fix:** Find-and-replace `outline-none` → `outline-hidden` across `apps/web/src/components/ui/` and `NewsletterForm.tsx`. Keep the `focus-visible:` / `focus:` prefix as-is.

### 🟡 Important — Several components use `focus:` instead of `focus-visible:`

**Files:**
- `apps/web/src/components/ui/select.tsx:23` — `focus:outline-none focus:ring-2 focus:ring-ring` (SelectTrigger)
- `apps/web/src/components/ui/dialog.tsx:48` — `focus:outline-none focus:ring-2 focus:ring-ring` (DialogClose)
- `apps/web/src/components/ui/dropdown-menu.tsx:31, 87, 103, 127` — `outline-none focus:bg-accent` (DropdownMenu items)
- `apps/web/src/components/ui/popover.tsx:23` — `outline-none` (PopoverContent)
- `apps/web/src/components/ui/command.tsx:51, 118` — `outline-none` (CommandInput, CommandItem)
- `apps/web/src/components/ui/select.tsx:122` — `outline-none focus:bg-accent` (SelectItem)
- `apps/web/src/components/marketing/NewsletterForm.tsx:75` — `focus:outline-none focus:ring-2` (email input)

**What's wrong:** SKILL §9.5 requires `:focus-visible` (NOT `:focus`). `:focus` triggers on mouse click (showing the ring for mouse users — undesirable); `:focus-visible` only triggers for keyboard navigation (the desired behavior). Most components in this codebase correctly use `focus-visible:` — but the items listed above use `focus:` or bare `outline-none`.

**Recommended fix:** Change `focus:` → `focus-visible:` in the 7 files above. Note that some Radix primitives (DropdownMenu items, SelectItem, CommandItem) toggle `data-[highlighted]` rather than relying on focus — for those, the `outline-none` removal is intentional (Radix handles keyboard nav). But the `select.tsx:23` (SelectTrigger) and `dialog.tsx:48` (DialogClose) and `NewsletterForm.tsx:75` (email input) should use `focus-visible:`.

### ✅ Pass — SkipLink + SrOnly components exist

**Files:**
- `apps/web/src/components/a11y/SkipLink.tsx` — `<Link href="#main-content" className="sr-only focus:not-sr-only ...">`
- `apps/web/src/components/a11y/SrOnly.tsx` — `<span className="sr-only">{children}</span>`

SkipLink is mounted in `apps/web/src/app/layout.tsx:51` (root layout) and again in `apps/web/src/app/(marketing)/layout.tsx:21-26` (marketing layout — duplicate but harmless).

### ✅ Pass — `prefers-reduced-motion` respected globally

**File:** `apps/web/src/app/globals.css:114-123`
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Also duplicated in `packages/ui/src/tokens/motion.css:19-28`. Uses `0.01ms` (not `0ms` — browsers treat `0ms` as "use default"). ✅

### ✅ Pass — All images have alt text

Marketing components use `<svg>` with `aria-hidden="true"` for decorative icons (e.g., `MobileNavDrawer.tsx:36-40` hamburger icon) or `aria-label` on the parent button (e.g., `aria-label="Open navigation menu"` at line 34). The `StudioSpaceSVG.tsx:26` uses `role="img"` + `aria-label`. The `SeatAvailability.tsx:20-21` uses `role="img"` + `aria-label`. The `HeroNextClass.tsx:123` uses `role="img"` + `aria-label`. ✅

### ✅ Pass — All form inputs have labels

- `MagicLinkForm.tsx:69` — `<label htmlFor="magic-link-email">` paired with `<input id="magic-link-email">`
- `NewsletterForm.tsx:61-66` — `<label htmlFor="newsletter-email" className="sr-only">` paired with `<input id="newsletter-email">`
- `ProfileEditForm.tsx` (verified at line 121 — uses shadcn Label + Input pattern)
- shadcn `label.tsx` component exists for general use

---

## 6.5 Mobile Nav

### ✅ Pass — MobileNavDrawer uses Radix Dialog (D32 fix)

**File:** `apps/web/src/components/marketing/MobileNavDrawer.tsx:16`
```tsx
import * as Dialog from '@radix-ui/react-dialog';
...
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger asChild>...</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay ... />
    <Dialog.Content ...>
```

D32 fix applied — uses Radix Dialog, not a custom modal. ✅

### ✅ Pass — Drawer is keyboard-accessible (focus trap + escape to close)

Radix Dialog provides:
- Focus trap (Radix handles Tab cycling within `Dialog.Content`)
- Escape to close (Radix default behavior)
- `Dialog.Close` on every link (lines 76, 92) — closes drawer on link tap
- `Dialog.Title` and `Dialog.Description` with `sr-only` (lines 51-54) — screen reader announcement
- `aria-label="Open navigation menu"` on trigger (line 34) and `aria-label="Close navigation menu"` on close button (line 60)

✅

### 🟢 Nit — Calendar nav buttons below 44×44px target

**File:** `apps/web/src/components/ui/calendar.tsx:31, 35, 43`
```tsx
button_previous: cn(buttonVariants({ variant: "outline" }), "h-7 w-7 ..."),  // 28×28px
button_next:     cn(buttonVariants({ variant: "outline" }), "h-7 w-7 ..."),  // 28×28px
day:             cn(buttonVariants({ variant: "ghost" }), "h-8 w-8 ..."),    // 32×32px
```

WCAG 2.2 AAA §2.5.5 requires 44×44px minimum touch target. Calendar nav buttons are 28×28px and day cells are 32×32px. Used only in admin ScheduleCalendar — admin surfaces are typically desktop-only with mouse, but if a staff member uses a tablet, the targets are too small.

**Recommended fix:** Bump to `h-11 w-11` (44px) for nav buttons and `h-9 w-9` (36px) for day cells (still under 44px but acceptable for desktop admin).

### 🟢 Nit — `SelectTrigger` and `Avatar` use `h-10` (40px), below 44px target

**Files:**
- `apps/web/src/components/ui/select.tsx:23` — `"flex h-10 w-full ..."` (SelectTrigger)
- `apps/web/src/components/ui/avatar.tsx:16` — `"relative flex h-10 w-10 ..."` (Avatar)

Both are 40px (below the 44px WCAG AAA target). Avatar is decorative (image placeholder) so the target size rule doesn't strictly apply; SelectTrigger is interactive and should be `h-11`.

---

## 6.6 Bonus — Cloudflare Images env var mismatch

### 🟡 Important — `cloudflare/images.ts` reads `CLOUDFLARE_IMAGES_KEY` but `env.ts` defines `CLOUDFLARE_IMAGES_TOKEN`

**Files:**
- `packages/config/src/env.ts:105, 171` — schema var name: `CLOUDFLARE_IMAGES_TOKEN`
- `apps/web/src/lib/cloudflare/images.ts:38` — reads: `process.env.CLOUDFLARE_IMAGES_KEY`

```ts
// packages/config/src/env.ts:105
CLOUDFLARE_IMAGES_TOKEN: z.string(),

// apps/web/src/lib/cloudflare/images.ts:38
const imagesKey = process.env.CLOUDFLARE_IMAGES_KEY;
```

**What's wrong:** Variable name mismatch. The env schema validates `CLOUDFLARE_IMAGES_TOKEN` but the code reads `CLOUDFLARE_IMAGES_KEY`. Even if an operator sets `CLOUDFLARE_IMAGES_TOKEN=...` in production, the `getSignedImageUrl()` function will read `process.env.CLOUDFLARE_IMAGES_KEY` (undefined) → return null at line 41-43 → all signed image URLs fail.

This is why all marketing components currently use placeholder `<div>` blocks instead of real Cloudflare Images URLs — the signing function silently returns null.

**Recommended fix:** Rename one to match the other. Per SKILL §3.2 env table at `stillwater_SKILL.md:292`, the canonical name is `CLOUDFLARE_IMAGES_TOKEN`. Update `apps/web/src/lib/cloudflare/images.ts:38`:
```ts
const imagesKey = process.env.CLOUDFLARE_IMAGES_TOKEN;
```
And update the test file at `apps/web/src/lib/cloudflare/images.test.ts` accordingly.

---

# Summary Tables

## 🔴 Critical Findings (6)

| # | Finding | File |
|---|---|---|
| 1 | `.env.local` tracked by git, contains real `BETTER_AUTH_SECRET` | `.env.local:23`, `apps/web/.env.local:23` |
| 2 | `apps/web/.env.local` also tracked (second leaked secret location) | `apps/web/.env.local:23-34` |
| 3 | Pre-commit hook (`scripts/pre-commit-check.sh`) never installed | (process gap) |
| 4 | Secret rotation not done (v1.19.0 changelog claims fix, files still tracked) | `git log d3740b5` |
| 5 | Fonts NOT loaded via `next/font/local` (P0-3 from prior audits, unaddressed) | `apps/web/src/app/layout.tsx` |
| 6 | `escapeForScriptContext` missing `\u2028`/`\u2029` escapes | `apps/web/src/components/seo/JsonLd.tsx:16-19` |

(Note: items 1-4 are facets of the same C5/C6 secret-leak incident.)

## 🟡 Important Findings (8)

| # | Finding | File |
|---|---|---|
| 1 | `admin.getRevenueDetails` uses `staffProcedure` (should be manager+) | `packages/api/src/routers/admin.ts:273` |
| 2 | `admin.listAuditLog` uses `staffProcedure` (doc says manager+) | `packages/api/src/routers/admin.ts:430` |
| 3 | `z.string().uuid()` deprecated (24 uses, should be `z.uuid()`) | `packages/api/src/routers/*.ts` |
| 4 | `z.string().email()` / `z.string().url()` deprecated (9 uses in env.ts, 2 in routers) | `packages/config/src/env.ts`, `packages/api/src/routers/sessions.ts:66`, `packages/api/src/routers/payments.ts:35` |
| 5 | `poweredByHeader: false` NOT set | `apps/web/next.config.ts:12-204` |
| 6 | `process.env.X` direct access in 13 non-exempt production files | See §4.7 table |
| 7 | `next/image` not used anywhere (CDN allowlist unused) | `apps/web/src/components/` |
| 8 | `outline-none` used instead of `outline-hidden` (Tailwind v4 semantic change) | `apps/web/src/components/ui/*.tsx` (10 files) |
| 9 | `focus:` used instead of `focus-visible:` in 7 places | See §6.4 table |
| 10 | Cloudflare env var mismatch (`CLOUDFLARE_IMAGES_KEY` vs `CLOUDFLARE_IMAGES_TOKEN`) | `apps/web/src/lib/cloudflare/images.ts:38` |
| 11 | `backdrop-blur-sm` glassmorphism in MobileNavDrawer overlay | `apps/web/src/components/marketing/MobileNavDrawer.tsx:46` |
| 12 | Webhook missing `checkout.session.completed` + `charge.refunded` handlers | `packages/payments/src/webhooks.ts:143-166` |

## 🟢 Nit Findings (14)

| # | Finding | File |
|---|---|---|
| 1 | `admin.assignRole`/`removeRole` correctly use `ownerProcedure` ✅ | (verified pass) |
| 2 | Heavy deps (recharts, @dnd-kit, cmdk, react-day-picker) statically imported | `apps/web/src/components/admin/*` |
| 3 | `babel-plugin-react-compiler` in `dependencies` not `devDependencies` | `apps/web/package.json:49` |
| 4 | `MarketingNav` is logo-left/links-center/CTA-right (NOT sticky — passes literal ban) | `apps/web/src/components/marketing/MarketingNav.tsx` |
| 5 | Calendar nav buttons 28×28px (below 44px AAA target) | `apps/web/src/components/ui/calendar.tsx:31, 35` |
| 6 | Calendar day cells 32×32px (below 44px AAA target) | `apps/web/src/components/ui/calendar.tsx:43` |
| 7 | `SelectTrigger` `h-10` (40px, below 44px AAA target) | `apps/web/src/components/ui/select.tsx:23` |
| 8 | `Avatar` `h-10 w-10` (40px, below 44px AAA target — decorative, lower priority) | `apps/web/src/components/ui/avatar.tsx:16` |
| 9 | `tabs.tsx` uses `font-medium` (Editorial Calm prefers `font-light` for display, `font-medium` for body labels — current usage is OK) | `apps/web/src/components/ui/tabs.tsx:33` |
| 10 | `CardTitle` uses `font-semibold` (could be `font-light` to match Editorial Calm) | `apps/web/src/components/ui/card.tsx:39` |
| 11 | SkipLink duplicated in both root layout and marketing layout (harmless but redundant) | `apps/web/src/app/layout.tsx:51` + `(marketing)/layout.tsx:21` |
| 12 | `bg-black/80` in Dialog overlay (uses Tailwind `black`, not a Warm Mineral token) | `apps/web/src/components/ui/dialog.tsx:25` |
| 13 | `rounded-sm` used in 8 components (resolves to `0` via `--radius-sm: 0`, so functionally equivalent to `rounded-none`) | `apps/web/src/components/ui/*.tsx` |
| 14 | `experimental_ppr = false` is defensive (PPR is opt-in in Next 16, so this is a no-op but explicit) | `apps/web/src/app/(marketing)/*/[slug]/page.tsx` |

## ✅ Pass Highlights (selected)

- ✅ 4 tRPC procedure tiers (`publicProcedure` / `protectedProcedure` / `staffProcedure` / `ownerProcedure`) correctly implemented
- ✅ 13×6 RBAC permission matrix matches PAD §9.2 exactly
- ✅ `pg_advisory_xact_lock` (transaction-scoped, NOT session-scoped) in both bookings + webhook handlers
- ✅ Idempotent Stripe webhook: fast-path check + lock + unique-index guarantee
- ✅ Better Auth rate limiting matches SKILL §15.7.4 (10/15min sign-in, 5/15min magic-link, 15/15min callback)
- ✅ `BETTER_AUTH_SECRET` throws fast if unset in production (no placeholder fallback)
- ✅ All 7 security headers present in `next.config.ts` (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS, X-DNS-Prefetch-Control)
- ✅ CSP includes `'unsafe-inline' 'strict-dynamic'` (documented v9 V9-2 weaker state)
- ✅ Fail-OPEN rate limiter (Upstash outage doesn't block bookings)
- ✅ 12 critical database indexes (enrollments, sessions, waitlist, payments, members, audit-log)
- ✅ `pg` in `dependencies`, `DATABASE_URL_UNPOOLED` for migrations
- ✅ SSE: `maxDuration = 300`, `ReadableStream` + 10s polling, NO `force-dynamic`
- ✅ React Compiler enabled (`reactCompiler: true` + `babel-plugin-react-compiler` installed)
- ✅ Bundle analyzer wired (`withBundleAnalyzer` + `ANALYZE=true` env var)
- ✅ ISR `revalidate` exports correct on all 6 marketing routes
- ✅ Slug routes have `experimental_ppr = false` + `dynamicParams = false` (v12 fix)
- ✅ `--radius: 0` globally (sharp edges)
- ✅ No purple-pink gradients, no Inter/Roboto, no drop shadows on cards, no Tailwind default colors, no mesh gradients, no lotus/mandala icons, no symmetric hero split
- ✅ Status colors darkened to AAA contrast (success 7.8:1, error 7.1:1)
- ✅ `prefers-reduced-motion` globally with `0.01ms` (not `0ms`)
- ✅ SkipLink + SrOnly components exist and mounted in root layout
- ✅ MobileNavDrawer uses Radix Dialog (D32 fix) with focus trap + escape
- ✅ Self-hosted fonts (Cormorant + DM Sans + JetBrains Mono) — woff2 files in `packages/ui/src/fonts/`
- ✅ `font-display: swap` on every `@font-face` declaration
- ✅ No Google Fonts CDN imports
- ✅ t3-env Zod validation for all 34 env vars
- ✅ No `as any` casts in production code
- ✅ No raw SQL string concatenation (all Drizzle query builder or `sql\`...\`` template literals)
- ✅ No `dangerouslySetInnerHTML` outside JSON-LD (which is escaped)

---

# Next Actions (Priority-Ordered)

## P0 — Critical (Immediate, before any production deploy)

1. **Rotate `BETTER_AUTH_SECRET`** and all 12 secrets listed in `docs/session_zaih_remediation_2.md:389`. The committed value `aJp8oRveNW1g7mFLQmkpZsCokNbExrERoTOETluNzt4=` is compromised.
2. `git rm --cached .env.local apps/web/.env.local` + commit.
3. Purge git history with `git filter-repo --invert-paths --path .env.local --path apps/web/.env.local` (or BFG).
4. Install pre-commit hook: `ln -sf ../../scripts/pre-commit-check.sh .git/hooks/pre-commit && chmod +x scripts/pre-commit-check.sh`.
5. Force-push rewritten history; all collaborators re-clone.
6. Migrate fonts to `next/font/local` in `apps/web/src/app/layout.tsx` (eliminates FOUT/CLS, biggest single perf win per prior audits).
7. Add `escapeForScriptContext` `\u2028`/`\u2029` escapes to `JsonLd.tsx`.

## P1 — Important (Within 1 sprint)

8. Add `poweredByHeader: false` to `next.config.ts`.
9. Add `managerProcedure` tier (or inline role check) for `admin.getRevenueDetails` and `admin.listAuditLog`.
10. Replace `z.string().uuid()` → `z.uuid()` in 24 places.
11. Replace `z.string().email()` → `z.email()` and `z.string().url()` → `z.url({ protocol: /^https:$/ })` in env.ts + 2 routers.
12. Replace `outline-none` → `outline-hidden` in 10 shadcn primitives.
13. Replace `focus:` → `focus-visible:` in 7 components (select, dialog, dropdown-menu, popover, command, NewsletterForm).
14. Fix Cloudflare env var mismatch: rename `CLOUDFLARE_IMAGES_KEY` → `CLOUDFLARE_IMAGES_TOKEN` in `apps/web/src/lib/cloudflare/images.ts:38` + test file.
15. Migrate `process.env.X` → `env.X` in 13 non-exempt production files (SKILL Lesson 103).
16. Replace `backdrop-blur-sm` in MobileNavDrawer with `bg-stone-900/80` (solid scrim).

## P2 — Nit (Backlog)

17. Add `checkout.session.completed` + `charge.refunded` webhook handlers (or document credit-pack/refund flows as out-of-scope for v1).
18. Lazy-load `recharts`, `@dnd-kit/core`, `cmdk`, `react-day-picker` via `next/dynamic`.
19. Move `babel-plugin-react-compiler` to `devDependencies`.
20. Bump Calendar nav buttons from `h-7 w-7` to `h-11 w-11` (44px AAA target).
21. Bump `SelectTrigger` from `h-10` to `h-11`.
22. Wire `next/image` once Cloudflare Images signing is functional (after P1 #14).
23. Remove duplicate SkipLink from marketing layout (kept in root layout only).

---

**Audit complete.** No project files were modified. Findings documented above are intended for repo owner remediation — secret rotation + git history purge (P0 items 1-5) must be coordinated by the repo owner and cannot be performed by a read-only audit agent.

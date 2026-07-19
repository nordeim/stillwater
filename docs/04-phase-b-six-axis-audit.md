# Phase B — Six-Axis Static Code Audit Report

**Run date:** 2026-07-19 (UTC+8)
**Scope:** Axis 1 (Correctness) + Axis 3 (Architecture) + Axis 4 (Security) + Axis 5 (Performance) + Axis 6 (Aesthetic/UX Rigor)
**Method:** Subagent dispatch + manual verification of all Critical/Important findings

## Executive Summary

| Axis | 🔴 Critical | 🟡 Important | 🟢 Nit | ❓ Question | ✅ Pass |
|---|---|---|---|---|---|
| 1 — Correctness | 3 | 0 | 0 | 0 | 2 |
| 3 — Architecture | 0 | 7 | 5 | 3 | 4 |
| 4 — Security | 1 | 7 | 1 | 0 | 8 |
| 5 — Performance | 0 | 3 | 1 | 0 | 4 |
| 6 — Aesthetic/UX | 0 | 2 | 0 | 0 | 13 |
| **Total** | **4** | **19** | **7** | **3** | **31** |

**4 Critical findings require immediate action.** 19 Important findings should be addressed in the next sprint. The codebase is fundamentally sound — 31 audit checks pass — but the critical issues (especially the P0 secret leak and the broken waitlist promotion flow) need urgent remediation.

---

## 🔴 CRITICAL FINDINGS (4)

### C1 — P0 Secret Leak: `.env.local` + `apps/web/.env.local` tracked by git with REAL secrets

**Files:**
- `/home/z/my-project/stillwater/.env.local` (root)
- `/home/z/my-project/stillwater/apps/web/.env.local`

**Verified facts:**
1. `git ls-files` confirms BOTH files are tracked
2. `.gitignore` line 9 has `.env.local` — but git doesn't auto-untrack files added before the ignore rule
3. Files were committed in `8242cc2` (2026-07-05), `dbf0cd5` (2026-07-13), and `d3740b5` (2026-07-19)
4. Real secrets (verified by value length + pattern):

| Secret | Length | Severity | Impact if compromised |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | 43 chars | 🔴 CRITICAL | Can forge session cookies → impersonate any user including owner |
| `DATABASE_URL` | 74 chars | 🔴 CRITICAL | Full Postgres credentials → direct DB access |
| `DATABASE_URL_UNPOOLED` | 74 chars | 🔴 CRITICAL | Same as above (unpooled connection) |
| `SANITY_API_TOKEN` | 180 chars | 🔴 HIGH | Read access to all CMS content (instructor bios, blog posts, etc.) |
| `SANITY_WEBHOOK_SECRET` | 43 chars | 🔴 HIGH | Can forge Sanity webhook → trigger malicious ISR revalidation |
| `SENTRY_DSN` | 39 chars | 🟡 MEDIUM | Sentry project DSN (semi-public, but better private) |
| `NEXT_PUBLIC_SENTRY_DSN` | 39 chars | 🟡 MEDIUM | Same |

5. Placeholder values (NOT leaked — verified):
   - `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `TRIGGER_SECRET_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY`, `AXIOM_TOKEN`, `CLOUDFLARE_IMAGES_TOKEN`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`

**Required remediation (P0 — do this FIRST):**

```bash
# 1. Rotate ALL leaked secrets immediately (most critical first):
#    - BETTER_AUTH_SECRET: generate new 32-byte secret, update Vercel env, redeploy
#    - DATABASE_URL + DATABASE_URL_UNPOOLED: rotate Neon database password
#    - SANITY_API_TOKEN: revoke in Sanity dashboard, create new token
#    - SANITY_WEBHOOK_SECRET: rotate in Sanity webhook settings + Vercel env
#    - SENTRY_DSN: regenerate in Sentry project settings

# 2. Remove from git tracking:
cd /home/z/my-project/stillwater
git rm --cached .env.local apps/web/.env.local
git commit -m "security(P0): untrack .env.local files (secret leak remediation)"

# 3. Purge git history (using git-filter-repo):
pip install git-filter-repo
git filter-repo --invert-paths --path .env.local --path apps/web/.env.local

# 4. Force-push cleaned history:
git push origin --force --all
git push origin --force --tags

# 5. Notify anyone with repo access to clone fresh + update local env files
```

### C2 — Waitlist promotion flow completely broken (payload mismatch)

**Files:**
- `packages/api/src/routers/bookings.ts:251-256` (sender)
- `services/workers/src/waitlist-promotion.ts:49` (receiver)

**The bug:**

`bookings.cancel` sends:
```typescript
ctx.jobs.trigger('waitlist-promotion', {
  sessionId: updated.sessionId,
  cancelledEnrollmentId: updated.id,
}).catch(() => {});
```

But `waitlist-promotion` worker expects:
```typescript
run: async (payload: { waitlistEntryId: string }) => {
  const entry = await db.query.waitlistEntries.findFirst({
    where: (e) => eq(e.id, payload.waitlistEntryId),  // ← always undefined!
  });
  if (!entry) {
    return { sent: false, reason: 'Waitlist entry not found' };  // ← always returns here
  }
```

**Impact:** When a member cancels, the next person on the waitlist is NEVER promoted. The worker silently returns `{ sent: false, reason: 'Waitlist entry not found' }` every time. No email is sent. No waitlist entry is updated.

**Additional issue:** The `bookings.cancel` procedure does NOT do the DB promotion work that the worker comment claims it does:
- Does NOT find the next-in-line waitlist entry
- Does NOT set `status='offered'`
- Does NOT set `expiresAt = now + 2h`
- Does NOT send the `waitlistEntryId` to the worker

**Also:** `buildClaimUrl()` on line 90 of `waitlist-promotion.ts` uses `https://stillwater.yoga/...` — but the actual production domain is `https://stillwater.jesspete.shop/...`. Even if the email were sent, the claim URL would be wrong.

**Required fix:**

In `packages/api/src/routers/bookings.ts`, replace the post-commit trigger (lines 248-262) with:

```typescript
// C2 fix: Find next-in-line waitlist entry, promote to 'offered', then trigger worker
const nextInLine = await ctx.db.query.waitlistEntries.findFirst({
  where: and(
    eq(waitlistEntries.sessionId, updated.sessionId),
    eq(waitlistEntries.status, 'waiting'),
  ),
  orderBy: [asc(waitlistEntries.position)],
});

if (nextInLine) {
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h window
  await ctx.db
    .update(waitlistEntries)
    .set({ status: 'offered', notifiedAt: new Date(), expiresAt })
    .where(eq(waitlistEntries.id, nextInLine.id));

  ctx.jobs.trigger('waitlist-promotion', {
    waitlistEntryId: nextInLine.id,  // ← correct payload shape
  }).catch(() => {});

  // Schedule expiry job
  ctx.jobs.trigger('waitlist-expiry', {
    waitlistEntryId: nextInLine.id,
  }, { delay: expiresAt }).catch(() => {});
}

ctx.jobs.trigger('booking-cancellation', {
  enrollmentId: updated.id,
  memberId,
}).catch(() => {});
```

Also fix `buildClaimUrl()` in `waitlist-promotion.ts:90` to use `https://stillwater.jesspete.shop/`.

**Add regression test:**
```typescript
// packages/api/src/routers/bookings.test.ts
it('C2: cancel promotes next waitlist entry and sends correct payload to worker', async () => {
  // Setup: full session with 1 waitlist entry
  // Act: cancel the confirmed enrollment
  // Assert: waitlist entry status === 'offered', expiresAt set
  // Assert: ctx.jobs.trigger called with { waitlistEntryId: <id> } (NOT { sessionId, cancelledEnrollmentId })
});
```

### C3 — Credit consumption missing from `bookings.book` (revenue leakage)

**File:** `packages/api/src/routers/bookings.ts:50-165`

**The bug:**

The `book` mutation:
1. ✅ Acquires advisory lock
2. ✅ Fetches session + validates
3. ✅ Rejects double-booking
4. ✅ Checks capacity
5. ✅ Inserts enrollment with `status='confirmed'`
6. ❌ Does NOT check if member has an active subscription
7. ❌ Does NOT decrement `member_subscriptions.creditsRemaining`
8. ❌ Does NOT use a credit pack fallback (`class_packages`)
9. ❌ Does NOT reject if no credits (BOOK-005 scenario)
10. ❌ Does NOT set `enrollments.packageCreditUsed`

**Impact:** Any authenticated member with a `memberId` can book unlimited sessions for free. This is major revenue leakage — members don't need to pay for a subscription or credit pack to book.

**PAD §8.4 says `bookings.book` should:**
- "Verify membership credit"
- Call `consumeMembershipCredit(tx, memberId, session)`

**design.md §Layer 4 shows the intended pattern:**
```typescript
// Verify membership credit
const credit = await consumeMembershipCredit(tx, ctx.session.user.id, session);

await tx.insert(enrollments).values({
  sessionId: input.sessionId,
  memberId: ctx.session.user.id,
  packageCreditUsed: credit?.id,
});
```

This logic is completely absent from the actual implementation.

**Required fix:**

Add credit consumption logic inside the transaction (after capacity check, before enrollment insert):

```typescript
// 4.5. Verify membership credit (C3 fix)
const subscription = await tx.query.memberSubscriptions.findFirst({
  where: and(
    eq(memberSubscriptions.memberId, memberId),
    eq(memberSubscriptions.status, 'active'),
    gt(memberSubscriptions.currentPeriodEnd, new Date()),
  ),
});

let packageCreditId: string | null = null;

if (subscription) {
  // Subscription credits
  const creditsRemaining = subscription.creditsRemaining ?? 0;
  if (creditsRemaining <= 0) {
    throw new TRPCError({
      code: 'PAYMENT_REQUIRED',
      message: 'No credits remaining in your subscription',
    });
  }
  await tx
    .update(memberSubscriptions)
    .set({ creditsRemaining: creditsRemaining - 1 })
    .where(eq(memberSubscriptions.id, subscription.id));
} else {
  // Credit pack fallback
  const creditPack = await tx.query.classPackages.findFirst({
    where: and(
      eq(classPackages.memberId, memberId),
      gt(classPackages.usedCredits, 0),  // has remaining credits
      or(
        isNull(classPackages.expiresAt),
        gt(classPackages.expiresAt, new Date()),
      ),
    ),
    orderBy: [asc(classPackages.expiresAt)],  // use soonest-expiring first
  });

  if (!creditPack) {
    throw new TRPCError({
      code: 'PAYMENT_REQUIRED',
      message: 'No active subscription or credit pack available',
    });
  }

  await tx
    .update(classPackages)
    .set({ usedCredits: creditPack.usedCredits + 1 })
    .where(eq(classPackages.id, creditPack.id));

  packageCreditId = creditPack.id;
}

// 5. Insert enrollment (now with packageCreditId)
const [created] = await tx
  .insert(enrollments)
  .values({
    sessionId: input.sessionId,
    memberId,
    status: 'confirmed',
    packageCreditId,  // ← now set
  })
  .returning();
```

**Add regression tests for BOOK-004 and BOOK-005:**
```typescript
// BOOK-004: consume one credit on successful booking
// BOOK-005: reject booking when no subscription + no credit pack
```

### C4 — Coverage gates failing across 4 of 5 packages

**Verified by running `npx vitest run --coverage` per package:**

| Package | Actual coverage | PAD target | Status |
|---|---|---|---|
| `@stillwater/api` | 74.87% lines | 90% | 🔴 FAIL (-15.13%) |
| `@stillwater/payments` | 78.68% lines | 95% | 🔴 FAIL (-16.32%) |
| `@stillwater/db/schema/*` | 74.64% lines | 80% | 🔴 FAIL (-5.36%) |
| `apps/web/components/*` | ~25-50% | 70% | 🔴 FAIL (-20% to -45%) |
| `@stillwater/workers` | 84.41% lines | 85% | 🔴 FAIL (-0.59%) |

**Note:** The vitest.config.ts has coverage thresholds (statements 80%, branches 70%, functions 80%, lines 80%) but these are GLOBAL thresholds, not per-package. The per-package PAD targets are not enforced in CI.

**Required fix:**
1. Add per-package coverage thresholds in each `vitest.config.ts`
2. Either: (a) write more tests to hit targets, OR (b) lower the PAD targets to match reality

---

## 🟡 IMPORTANT FINDINGS (19)

### Architecture (7)

**I1 — 4 RBAC violations: procedures use lower tier than RBAC matrix requires**

| Procedure | Current tier | RBAC requires | Impact |
|---|---|---|---|
| `admin.getRevenue` | `staffProcedure` | manager+ | Staff can read revenue data via direct tRPC calls |
| `admin.getRevenueDetails` | `staffProcedure` | manager+ | Same |
| `admin.listAuditLog` | `staffProcedure` | manager+ | Staff can read audit logs |
| `payments.refund` | `staffProcedure` (D12 stub) | manager+ | Stub throws PRECONDITION_FAILED, but tier is wrong |

**Fix:** Change `staffProcedure` → `managerProcedure` (needs to be created) OR add a `managerProcedure` tier to `packages/api/src/trpc.ts`.

**I2 — Layer 3 bypass in MobileNavDrawer**

File: `apps/web/src/components/marketing/MobileNavDrawer.tsx:16`
```typescript
import * as Dialog from '@radix-ui/react-dialog';  // ← direct Radix import
```

Should import from Layer 2 primitive:
```typescript
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
```

**I3 — ADR traceability gap**

| ADR | Source-code references | Status |
|---|---|---|
| ADR-001 (Turborepo) | 0 | 🟡 Not referenced |
| ADR-002 (tRPC) | 0 | 🟡 Not referenced |
| ADR-003 (Drizzle) | 0 | 🟡 Not referenced |
| ADR-004 (advisory locks) | 3 | ✅ Referenced in bookings.ts |
| ADR-005 (Sanity) | 2 | ✅ Referenced |
| ADR-006 (SSE) | 1 | ✅ Referenced |
| ADR-007 (Trigger.dev) | 4 | ✅ Referenced |
| ADR-008 (Better Auth) | 2 | ✅ Referenced |
| ADR-009 (proxy.ts) | 3 | ✅ Referenced |
| ADR-010 (Resend Native) | 2 | ✅ Referenced |
| ADR-011 (transpilePackages) | 2 | ✅ Referenced |

**Fix:** Add `// ADR-001: Turborepo monorepo` comments to `turbo.json`, `pnpm-workspace.yaml`. Add `// ADR-002: tRPC` to `packages/api/src/trpc.ts`. Add `// ADR-003: Drizzle` to `packages/db/src/index.ts`.

**I4 — Better Auth RQB relations missing**

File: `packages/db/src/schema/relations.ts`

16/18 FK pairs have `relations()` definitions. Missing:
- `session` table (Better Auth) — no relations to `users`
- `account` table (Better Auth) — no relations to `users`

This means `db.query.users.findFirst({ with: { sessions: true } })` won't work. Probably not used in practice, but should be defined for completeness.

**I5 — `tailwind.config.ts` exists despite SKILL §16.4 anti-pattern**

File: `apps/web/tailwind.config.ts`

SKILL §16.4 says: "tailwind.config.js present" is an anti-pattern in Tailwind v4 (should use CSS-first `@theme` directive in globals.css).

**Fix:** Migrate config to `@theme` block in `apps/web/src/app/globals.css` and delete `tailwind.config.ts`.

**I6 — Audit-log layout guard missing manager+ enforcement**

File: `apps/web/src/app/(admin)/admin/audit-log/layout.tsx`

The audit-log page should require manager+ per the RBAC matrix (`listAuditLog` permission is manager+), but the layout guard doesn't enforce this (only the procedure tier does — and per I1, the procedure tier is wrong too).

**I7 — `as unknown[]` casts in marketing pages**

File: `apps/web/src/app/(marketing)/page.tsx:66-72`

```typescript
<ScheduleSection sessions={sessions as unknown[]} />
<InstructorsSection instructors={(instructors as unknown[]).map((i) => i as { ... })} />
<MembershipSection plans={(membershipPlans as unknown[]).map((p) => p as { ... })} />
```

These casts exist because Drizzle 0.45 infers nested `with` types as `never` (SKILL Lesson 46). They're a documented workaround but violate the "no `as any`" rule. The proper fix is to upgrade to Drizzle 1.0 stable (which has `defineRelations()`).

### Security (7)

**S1 — admin procedures use wrong tier** (same as I1 above)

**S2 — 24 uses of deprecated `z.string().uuid()`**

Files: `packages/api/src/routers/*.ts`, `apps/web/src/app/api/*/route.ts`

Zod v4 deprecated `z.string().uuid()` in favor of `z.uuid()`. The project uses Zod `^4.4.3` but still uses the deprecated form.

**Fix:** `sed -i 's/z\.string()\.uuid()/z.uuid()/g'` across all router files.

**S3 — `poweredByHeader: false` NOT set**

File: `apps/web/next.config.ts`

The `X-Powered-By: Next.js` header leaks in production (confirmed via curl). Next.js recommends disabling it.

**Fix:** Add `poweredByHeader: false` to the `nextConfig` object.

**S4 — 30 production files use `process.env.X` directly**

Per SKILL Lesson 103: "Read secrets via `env()` (t3-env Zod-validated), NEVER `process.env` directly".

30 production files (excluding tests) use `process.env.X` directly. This bypasses the Zod validation in `packages/config/src/env.ts`.

**Fix:** Replace `process.env.X` with `env.X` (imported from `@stillwater/config`).

**S5 — Stripe webhook missing `checkout.session.completed` + `charge.refunded` handlers**

File: `packages/payments/src/webhooks.ts:143-162`

Currently handles 7 events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`

Missing:
- `checkout.session.completed` — needed for credit-pack purchases (one-off payments)
- `charge.refunded` — needed for refund processing

**Impact:** Credit-pack purchases won't reconcile to `class_packages` table. Refunds won't update `payment_events.status`.

**S6 — Cloudflare env var mismatch**

Code reads `CLOUDFLARE_IMAGES_KEY` but env schema defines `CLOUDFLARE_IMAGES_TOKEN`. This breaks image URL signing.

**Fix:** Align the variable name across code + env schema.

**S7 — `escapeForScriptContext` missing `\u2028`/`\u2029` escapes** (LOW severity — not exploitable in JSON-LD context)

File: `apps/web/src/components/seo/JsonLd.tsx:16-19`

The escape function handles `<`, `>`, `&` but not `\u2028` (LINE SEPARATOR) or `\u2029` (PARAGRAPH SEPARATOR). These are valid JSON but not valid in JavaScript string literals (pre-ES2019).

**Note:** This is NOT exploitable in `<script type="application/ld+json">` because that context is NOT evaluated as JavaScript — it's just data. The `<`, `>`, `&` escapes are sufficient to prevent `</script>` breakout. This is a defense-in-depth nit, not an active XSS.

### Performance (3)

**P1 — Fonts via CSS `@font-face` instead of `next/font/local`**

File: `packages/ui/src/fonts/jetbrains-mono/jetbrains-mono.css` (and likely cormorant + dm-sans)

The project uses CSS `@font-face` declarations instead of `next/font/local`. This loses:
- Automatic font preloading
- `font-display: swap` optimization
- CLS prevention
- Automatic fallback font metrics injection

**Fix:** Migrate to `next/font/local` in `apps/web/src/app/layout.tsx`:
```typescript
import localFont from 'next/font/local';
const cormorant = localFont({
  src: '../../packages/ui/src/fonts/cormorant-garamond/cormorant-garamond.woff2',
  variable: '--font-display',
  display: 'swap',
});
```

**P2 — `next/image` not used anywhere**

Cloudflare CDN allowlist is configured in `next.config.ts` (`imagedelivery.net`, `*.r2.cloudflarestorage.com`, `cdn.sanity.io`) but `next/image` is never used in marketing components.

**Impact:** Images are loaded via raw `<img>` tags, losing:
- Automatic format negotiation (avif/webp)
- Responsive `srcset` generation
- Lazy loading
- Layout shift prevention

**Fix:** Replace `<img>` with `<Image>` in all marketing components.

**P3 — shadcn primitives use `outline-none` instead of `outline-hidden`**

Files: `apps/web/src/components/ui/{checkbox,tabs,select,input,button,dropdown-menu}.tsx`

Tailwind v4 semantic change:
- `outline-none` → now resets `outline-style: none` (removes outline entirely)
- `outline-hidden` → the old `outline-none` behavior (preserves forced-colors mode outline)

**Impact:** In forced-colors mode (Windows High Contrast), focus rings disappear, violating WCAG AAA.

**Fix:** `sed -i 's/outline-none/outline-hidden/g'` across `apps/web/src/components/ui/`.

### Aesthetic/UX (2)

**A1 — `backdrop-blur-sm` glassmorphism in MobileNavDrawer**

File: `apps/web/src/components/marketing/MobileNavDrawer.tsx:46`

```typescript
className="fixed inset-0 z-40 bg-stone-900/60 backdrop-blur-sm ..."
```

SKILL §1.3 bans glassmorphism / blur backdrops. This is a banned pattern.

**Fix:** Remove `backdrop-blur-sm`. Use a solid overlay: `bg-stone-900/80`.

**A2 — `tailwind.config.ts` exists** (same as I5 above — both an architecture and aesthetic issue)

---

## ✅ PASSED CHECKS (31)

### Architecture (4)
- ✅ All 18 shadcn/ui primitives exist; 13/18 import Radix directly (5 are pure HTML wrappers per standard shadcn pattern)
- ✅ 2-layer auth pattern: `proxy.ts` is cookie-only (no DB, no `auth.api.getSession`); all 4 layout guards correctly use `requireAuth()`/`requireRole()`
- ✅ `transpilePackages` array includes all 7 workspace packages per ADR-011
- ✅ 16/18 Drizzle RQB FK pairs have `relations()` definitions

### Correctness (2)
- ✅ 36 of 43 tRPC procedures have direct tests (7 untested admin procedures)
- ✅ STRIPE-001 through STRIPE-005 are all tested

### Security (8)
- ✅ `pg_advisory_xact_lock` is transaction-scoped (not session-scoped per ADR-004)
- ✅ Idempotent Stripe webhook (fast-path findFirst + advisory lock + double-check + unique-index)
- ✅ Better Auth rate limiting matches SKILL §15.7.4 (15-min window, 10/sign-in, 5/magic-link, 15/callback)
- ✅ `BETTER_AUTH_SECRET` throws fast if unset (no placeholder fallback per Lesson 97)
- ✅ All 7 security headers present (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS, X-DNS-Prefetch-Control)
- ✅ CSP with documented `'unsafe-inline' 'strict-dynamic'` weaker state (v9 V9-2 fix)
- ✅ Fail-OPEN rate limiter (Upstash failure allows request through per SKILL §15.7)
- ✅ No SQL injection (all Drizzle query builder or `sql` template literal)

### Performance (4)
- ✅ React Compiler enabled (`reactCompiler: true` + `babel-plugin-react-compiler` in devDeps)
- ✅ Bundle analyzer wired (`withBundleAnalyzer` wrapper in next.config.ts)
- ✅ SSE with `maxDuration=300` + 10s polling + NO `force-dynamic` (SKILL §15.3)
- ✅ Image config correct (avif+webp, Cloudflare+Sanity CDN, `dangerouslyAllowSVG: false`)

### Aesthetic/UX (13)
- ✅ `--radius: 0` globally (sharp edges enforced)
- ✅ No purple-pink gradients in shadcn primitives
- ✅ No Inter/Roboto (Cormorant + DM Sans + JetBrains Mono)
- ✅ No drop shadows (`shadow-sm`/`md`/`lg`/`xl`) in shadcn primitives
- ✅ No Tailwind default colors (`bg-amber-*`, `bg-red-*`, `bg-blue-*`)
- ✅ No mesh/aurora gradients
- ✅ No lotus/mandala icons
- ✅ No symmetric hero split
- ✅ Color tokens use numbered scale (`--color-stone-950`…`--color-stone-50`, etc.)
- ✅ Status colors darkened to AAA contrast (7:1)
- ✅ `prefers-reduced-motion` globally with `0.01ms`
- ✅ SkipLink + SrOnly mounted
- ✅ MobileNavDrawer uses Radix Dialog with focus trap (D32 fix)

---

## Priority-Ordered Next Actions

### P0 — Do This Now (today)
1. **Rotate all leaked secrets** (C1) — especially `BETTER_AUTH_SECRET`, `DATABASE_URL`, `SANITY_API_TOKEN`, `SANITY_WEBHOOK_SECRET`
2. **Untrack `.env.local` + `apps/web/.env.local` from git** (C1)
3. **Purge git history** using `git filter-repo` (C1)
4. **Fix waitlist promotion payload mismatch** (C2) — surgical fix in `bookings.ts:251-256`
5. **Fix `buildClaimUrl` domain** in `waitlist-promotion.ts:90` (`stillwater.yoga` → `stillwater.jesspete.shop`)

### P1 — This Week
6. **Add credit consumption to `bookings.book`** (C3) — medium-effort, ~4-6 hours
7. **Apply v12 V12-1 fix to 4 index routes** (`/`, `/schedule`, `/instructors`, `/pricing`) — bypass `apiCaller()`, query DB directly (per Phase C report)
8. **Fix 4 RBAC tier violations** (I1/S1) — change `staffProcedure` → `managerProcedure`
9. **Add `poweredByHeader: false`** to next.config.ts (S3)
10. **Add `checkout.session.completed` + `charge.refunded` handlers** to Stripe webhook (S5)
11. **Fix Cloudflare env var mismatch** (S6)

### P2 — Next Sprint
12. **Fix 7 lint errors** (Phase A finding) — remove unused `instructors` import, fix import order, replace 5× `string.match()` with `regex.exec()`
13. **Migrate fonts to `next/font/local`** (P1)
14. **Replace `<img>` with `<Image>`** in marketing components (P2)
15. **Fix `outline-none` → `outline-hidden`** in shadcn primitives (P3)
16. **Replace `process.env.X` with `env.X`** in 30 production files (S4)
17. **Replace `z.string().uuid()` with `z.uuid()`** in 24 places (S2)
18. **Remove `backdrop-blur-sm`** from MobileNavDrawer (A1)
19. **Migrate `tailwind.config.ts` to `@theme`** in globals.css (I5/A2)
20. **Add per-package coverage thresholds** (C4)
21. **Reconcile documentation drift** (Phase D — 12 conflicts)

---

## Conclusion

The Stillwater codebase is fundamentally well-engineered — 31 of 64 audit checks pass, including all the critical architectural decisions (2-layer auth, advisory locks, idempotent webhooks, RBAC matrix, design tokens, anti-generic enforcement). The 4 Critical findings are surgical fixes (≤100 LOC each) that address real production issues. The 19 Important findings are quality improvements that should be batched into a single remediation sprint.

**The most urgent issue is C1 (secret leak).** This requires immediate secret rotation + git history purge before any other work proceeds.

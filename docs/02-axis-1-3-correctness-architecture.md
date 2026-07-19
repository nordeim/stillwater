# Axis 1 + Axis 3 Audit — Stillwater Yoga Studio Monorepo

**Audit scope:** Correctness (Axis 1) + Architecture (Axis 3)
**Repo:** `/home/z/my-project/stillwater/`
**Reference docs:** `stillwater_SKILL.md` §15/§16, `PAD.md` §8–§9, §21, §28
**Audit mode:** Read-only — no project files modified
**Date:** 2026-07-14
**Test baseline:** `pnpm test` green — 729 tests passing across 7 packages (auth 102, workers 44, api 123, web 215, db 131, payments 43, email 71)

---

## Executive Summary

The architecture is largely sound at the skeleton level: the 5-layer component model, 4-tier tRPC access model, and 2-layer auth pattern are correctly structured. However, the audit surfaces **3 Critical** and **7 Important** findings:

1. 🔴 **Waitlist promotion flow is broken end-to-end** — `bookings.cancel` sends the wrong payload shape to the `waitlist-promotion` worker and never promotes the next waitlist entry to `status='offered'`. The worker always returns `sent:false` in production.
2. 🔴 **Credit consumption is missing from `bookings.book`** — PAD BOOK-004 ("consumes one credit from package on booking") and BOOK-005 ("rejects member with no active subscription or package") are unimplemented; the procedure blindly inserts an enrollment regardless of credits.
3. 🔴 **Coverage gates are failing** — `pnpm test:coverage` fails 4 of 5 measured packages against PAD §21.3 targets (api 74.87 % vs 90 %, payments 78.68 % vs 95 %, db schema 74.64 % vs 80 %, workers 84.41 % vs 85 %). Only api and workers have thresholds configured; payments/db/web have no enforced thresholds.

---

## 1. Axis 1 — Correctness Findings

### 1.1 Scenario ID → Test Mapping

Searched test files for `BOOK-00X`, `WAIT-00X`, `STRIPE-00X` IDs.

| Scenario ID | Test File | Test Name / Describe Block | Status | Notes |
|---|---|---|---|---|
| BOOK-001 | `packages/api/src/routers/bookings.test.ts:170` | `bookingsRouter.book — happy path` ("acquires advisory lock, checks capacity, and inserts enrollment") | ✅ Pass (implicit) | Test does NOT use the `BOOK-001` ID in its name; PAD label only. E2E spec `e2e/booking.spec.ts:25` uses `BOOK-001` but for a different scenario ("Browse schedule and view seat availability") — ID collision. |
| BOOK-002 | `packages/api/src/routers/bookings.test.ts:229` | "throws CONFLICT when session is full" | 🟡 Partial | Tests the **CONFLICT** path. PAD says "Adds to waitlist when session is at capacity" — but `bookings.book` does **not** auto-add to waitlist (just throws CONFLICT). The waitlist join is a separate `waitlist.join` procedure. PAD scenario is unimplemented as described. |
| BOOK-003 | `packages/api/src/routers/bookings.test.ts:219` | "throws CONFLICT when member is already enrolled" | ✅ Pass | Double-booking prevention tested. |
| BOOK-004 | — | — | 🔴 **Missing** | "Consumes one credit from package on booking" — **NOT implemented** in `bookings.book` (lines 50–165). The procedure inserts an enrollment but never touches `member_subscriptions.creditsRemaining` or `class_packages.usedCredits`. SKILL §15.1 Step 4 ("Consume membership credit OR class package credit") is skipped. |
| BOOK-005 | — | — | 🔴 **Missing** | "Rejects booking for member with no active subscription or package" — **NOT implemented**. `bookings.book` has no credit/subscription check; it will create an enrollment for any caller with a `memberId`, regardless of payment state. |
| BOOK-006 | `packages/api/src/routers/bookings.integration.test.ts:19` | "10 concurrent bookings → exactly 1 confirms, 9 get CONFLICT" | 🟡 Placeholder | `describe.skipIf(!hasDatabase)` — test is **skipped** when `DATABASE_URL` is unset or contains "placeholder". Body is `expect(true).toBe(true)`. Never runs in CI. |
| WAIT-001 | — | — | 🔴 **Missing + broken** | "Promotes next waitlist member when booking cancelled" — `bookings.cancel` (lines 185–265) **never** finds the next waitlist entry, **never** sets `status='offered'`, **never** sets `expiresAt`. It just fires the `waitlist-promotion` job, which expects the entry to **already** be `status='offered'` (worker line 68) — see §1.2 below. |
| WAIT-002 | `services/workers/src/waitlist-promotion.test.ts:49` | "sends offer email with 2-hour expiry + claim URL" | 🟡 Partial | Worker-level test only. Verifies the worker sends an email **if** the entry is already `status='offered'`. In production, no caller ever sets that status, so the worker never reaches the email send. |
| WAIT-003 | — | — | 🔴 **Missing** | "Expires offer and promotes again after window closes" — `waitlist-expiry.ts` worker sends the `WaitlistExpired` email but **does not** promote the next member. No "promotes again" path exists anywhere. |
| WAIT-004 | — | — | 🔴 **Missing** | "Returns credit to member package on cancellation" — `bookings.cancel` does **not** return credits to `class_packages.usedCredits` or `member_subscriptions.creditsRemaining`. No refund logic in the cancellation path. |
| WAIT-005 | — | — | 🟡 Partial | "Handles cancellation with no waitlist gracefully" — `bookings.cancel` will succeed (no error) when there's no waitlist, but only because it never checks for one. Not an explicit test case. |
| STRIPE-001 | `packages/payments/src/webhooks.test.ts:287` | `handleStripeWebhook — STRIPE-001: invoice.paid grants credits` | ✅ Pass | Webhook handler tested in isolation. |
| STRIPE-002 | `packages/payments/src/webhooks.test.ts:316` | `handleStripeWebhook — STRIPE-002: invoice.payment_failed marks past_due` | ✅ Pass | |
| STRIPE-003 | `packages/payments/src/webhooks.test.ts:213` | `handleStripeWebhook — idempotency (STRIPE-003)` | ✅ Pass | 3 tests cover fast-path, slow-path, and double-call idempotency. |
| STRIPE-004 | `apps/web/src/app/api/webhooks/stripe/route.test.ts:116` | "STRIPE-004: returns 400 when signature is invalid" | ✅ Pass | Tested at the route handler level (not in `@stillwater/payments`). |
| STRIPE-005 | `packages/payments/src/webhooks.test.ts:343` | `handleStripeWebhook — STRIPE-005: customer.subscription.deleted cancels` | ✅ Pass | |

**Scenario coverage scorecard:** 5/16 fully passing (STRIPE-001..005), 4/16 partial, 7/16 missing or broken.

### 1.2 🔴 Critical: Waitlist Promotion Payload Mismatch

**Files:**
- `packages/api/src/routers/bookings.ts:251-256` (producer)
- `services/workers/src/waitlist-promotion.ts:49` (consumer)

**Producer code (bookings.ts:251):**
```ts
ctx.jobs.trigger('waitlist-promotion', {
  sessionId: updated.sessionId,
  cancelledEnrollmentId: updated.id,
}).catch(() => { /* ... */ });
```

**Consumer code (waitlist-promotion.ts:49):**
```ts
run: async (payload: { waitlistEntryId: string }) => {
  // ...
  const entry = (await (db.query.waitlistEntries as any).findFirst({
    where: (e: any, { eq }: any) => eq(e.id, payload.waitlistEntryId),
```

**Bug:** Producer sends `{ sessionId, cancelledEnrollmentId }`. Consumer reads `payload.waitlistEntryId` (always `undefined`). Worker calls `findFirst({ where: e.id === undefined })` → returns `undefined` → worker returns `{ sent: false, reason: 'Waitlist entry not found' }`. The WaitlistOffer email is **never sent** in production.

The unit test at `bookings.test.ts:320-323` passes because it mocks `ctx.jobs.trigger` as a `vi.fn()` and only asserts the call shape — it does not exercise the worker. The integration test that would catch this (`bookings.integration.test.ts`) is skipped without a database.

**Also missing:** `bookings.cancel` does not perform the promotion DB write (find next-waiting entry → set `status='offered'`, `expiresAt = now + 2h`). The worker comment at `waitlist-promotion.ts:8-11` claims "The tRPC `bookings.cancel` procedure handles DB promotion" — but the code does not.

### 1.3 Procedure Test Coverage Inventory

10 routers, 43 procedures total. Each router has a `*.test.ts` file. Per-procedure coverage:

| Router | Procedures | Tested | Untested |
|---|---|---|---|
| `schedule` | 2 | 2 | 0 |
| `classes` | 4 | 4 | 0 |
| `sessions` | 5 | 5 | 0 |
| `bookings` | 3 | 3 | 0 (but see BOOK-004/005/WAIT-001 above — behavior unimplemented despite test presence) |
| `waitlist` | 3 | 3 | 0 |
| `members` | 3 | 3 | 0 |
| `instructors` | 2 | 2 | 0 |
| `memberships` | 6 | 6 | 0 |
| `payments` | 3 | 3 | 0 |
| `admin` | 12 | 5 | **7** |
| **Total** | **43** | **36** | **7** |

**Untested admin procedures** (lines uncovered per coverage report):
- `admin.listMembers` (line 194)
- `admin.getMemberDetail` (line 235)
- `admin.getRevenueDetails` (line 273)
- `admin.assignRole` (line 350)
- `admin.removeRole` (line 396)
- `admin.listAuditLog` (line 430)
- `admin.getRecentSignups` (line 478)

The `admin.test.ts` file is 302 lines covering only `getDashboard`, `getRevenue`, `getClassRoster`, `listClasses`, `deleteClass`. The 7 Phase-9 admin procedures added in `admin.ts:194-487` have **zero** direct tests.

---

## 2. Axis 1 — Coverage Assessment

Ran `npx vitest run --coverage` in each package. PAD §21.3 targets vs measured:

| Package | PAD Target | Configured Threshold | Measured (lines) | Status |
|---|---|---|---|---|
| `packages/api/routers/*` | 90 % | 80 % (api vitest.config.ts:26-31) | **74.87 %** (all api) / **77.98 %** (routers/ subdir) | 🔴 FAIL — below PAD target AND below configured threshold |
| `packages/payments/*` | 95 % | **none configured** | **78.68 %** | 🔴 FAIL — no threshold enforced; far below PAD target |
| `packages/db/schema/*` | 80 % | **none configured** | **74.64 %** (schema/ subdir) / 50.19 % (db overall) | 🔴 FAIL — no threshold enforced |
| `apps/web/components/*` | 70 % | **none configured** | ~25-50 % (varies per subdir; ui/ at 8.8 %, marketing/ mixed, membership/ 36.36 %) | 🔴 FAIL — no threshold enforced |
| `services/workers/*` | 85 % | 85 % (workers vitest.config.ts:30-35) | **84.41 %** | 🟡 FAIL by 0.59 % — function coverage at 63.41 % is the main drag |

**Notable per-file offenders** (from `npx vitest run --coverage` output):

| File | Stmts % | Lines % | Notes |
|---|---|---|---|
| `packages/api/src/routers/admin.ts` | 29.11 | 29.11 | 7 of 12 procedures untested |
| `packages/api/src/lib/jobs-client.ts` | 0 | 0 | No test file exists |
| `packages/api/src/middleware/rateLimit.ts` | 45.83 | 45.83 | No direct test (only exercised transitively via bookings.test.ts) |
| `packages/payments/src/webhooks.ts` | 65.06 | 69.73 | 7-event handler — only 3 events tested (STRIPE-001/002/005) |
| `packages/payments/src/types.ts` | 0 | 0 | 11 type tests exist but cover type-level only |
| `packages/db/src/seed/index.ts` | 0 | 0 | Seed file untested |
| `packages/db/src/scripts/reset.ts` | 0 | 0 | No test |
| `apps/web/src/components/ui/*` (18 files) | 8.8 avg | 8.8 avg | Only `dialog.tsx` (95.65 %) has direct tests; 17 primitives untested |
| `apps/web/src/hooks/useBookingMutation.ts` | 0 | 0 | No test |
| `apps/web/src/lib/trpc/client.tsx` | 0 | 0 | TRPCProvider untested |
| `apps/web/src/lib/trpc/query-keys.ts` | 0 | 0 | No test |

**Key observation:** `pnpm test` (turbo) runs `vitest run` **without** `--coverage` by default. `pnpm test:coverage` (root package.json:21) maps to `turbo test -- --coverage` — this WOULD fail in CI for api and workers (which have thresholds) but does not appear to be wired into any CI gate visible in the repo. The other 3 packages would silently pass even at <50 % coverage.

---

## 3. Axis 1 — ADR Reference Audit

Grep for `ADR-00X` in `**/*.{ts,tsx,js,jsx,sql,css,mjs}` (source files only — excluded docs/markdown).

| ADR ID | Title | Referenced from source code? | Implementing file(s) | Gap? |
|---|---|---|---|---|
| ADR-001 | Turborepo monorepo over independent repos | ❌ No source references | (would belong in `turbo.json` or `pnpm-workspace.yaml` comments) | 🟡 Important — no code reference |
| ADR-002 | tRPC over REST API | ❌ No source references | (would belong in `packages/api/src/trpc.ts` or `apps/web/src/app/api/trpc/[trpc]/route.ts`) | 🟡 Important — no code reference |
| ADR-003 | Drizzle ORM over Prisma | ✅ `packages/db/src/schema/relations.ts:16` | Drizzle schema + relations | ✅ Pass |
| ADR-004 | PostgreSQL advisory locks for booking concurrency | ✅ 6 source references | `packages/api/src/routers/bookings.ts:5,23,47,175,183`, `packages/payments/src/webhooks.ts:4,30`, `packages/db/src/index.ts:105`, `apps/web/src/app/api/webhooks/stripe/route.ts:21,23`, `packages/api/src/routers/bookings.integration.test.ts:4`, `packages/payments/src/webhooks.test.ts:4,390,410` | ✅ Pass |
| ADR-005 | Sanity CMS for marketing content only | ✅ `apps/studio/sanity.config.ts:9` | Sanity Studio config | ✅ Pass |
| ADR-006 | SSE over WebSockets for seat availability | ✅ `apps/web/src/app/api/schedule/stream/route.ts:8` | SSE route handler | ✅ Pass |
| ADR-007 | Trigger.dev for background jobs | ✅ `packages/config/src/jobs-client.ts:11,13`, `packages/api/src/lib/jobs-client.ts:11,16` | Jobs client singleton | ✅ Pass |
| ADR-008 | Better Auth over Auth.js v5 | ✅ `packages/auth/src/config.ts:15` | Auth config | ✅ Pass |
| ADR-009 | `proxy.ts` replaces `middleware.ts` | ✅ 5 source references | `apps/web/proxy.ts:30,37`, `apps/web/src/lib/auth.ts:4,11`, `apps/web/src/app/(studio)/layout.tsx:5`, `apps/web/src/app/api/auth/[...all]/proxy-verify.test.ts:4,10` | ✅ Pass |
| ADR-010 | Resend Native Templates for workers | ✅ 25+ source references | `packages/email/src/send.ts`, `send-helpers.ts`, `template-ids.ts`, `index.ts`, all 12 worker files, all email templates | ✅ Pass |
| ADR-011 | Source Resolution via `transpilePackages` + `exports.default` | ❌ No source references | (would belong in `apps/web/next.config.ts` comment block above `transpilePackages:35`) | 🟡 Important — `next.config.ts:29-34` describes the mechanism but never names "ADR-011" |

**Gap summary:** 3 of 11 ADRs (ADR-001, ADR-002, ADR-011) have zero source-code references. They are documented in `PAD.md` and referenced from various `.md` audit/log files but never cited from the implementing `.ts`/`.tsx`/config files. This makes the ADR-to-code traceability chain broken for these three decisions.

---

## 4. Axis 3 — Layer Enforcement Audit

Note: SKILL.md §5.1 actually numbers layers 0–4 (Proxy → App Router → Features → Domain → Infra). The audit prompt uses a 5-layer Token→Primitive→Composition→Feature→App numbering. Both are valid; this section uses the audit prompt's numbering and cross-references SKILL where relevant.

### 4.1 Layer 1 — Tokens (`packages/ui/src/tokens/*.css`)

| Token file | Status | Content |
|---|---|---|
| `tokens/colors.css` (87 lines) | ✅ Pass | Stone (10 stops), Clay (5 stops), Water (5 stops), Sand (3 variants), Status (success/warning/error/info), 14 semantic aliases, 24 shadcn HSL variables. `--radius: 0` enforces sharp edges per Editorial Calm. |
| `tokens/typography.css` (25 lines) | ✅ Pass | 3 font families (Cormorant, DM Sans, JetBrains Mono), 9-step fluid type scale (`clamp()`-based), 4 line-height tokens. |
| `tokens/spacing.css` (25 lines) | ✅ Pass | 14-step spacing scale (1px → 256px), 3 max-width tokens. |
| `tokens/motion.css` (28 lines) | ✅ Pass | 3 easing curves, 5 durations, global `prefers-reduced-motion` override (0.01ms — not 0ms, per anti-pattern guidance). |

**Verdict:** ✅ Pass — all 4 token categories defined per PAD §11.2–§11.5.

### 4.2 Layer 2 — Primitives (`apps/web/src/components/ui/*.tsx`)

18 shadcn/ui primitive files exist (PAD requires 18):

| Primitive | Imports Radix? | Notes |
|---|---|---|
| `avatar.tsx` | ✅ `@radix-ui/react-avatar` | |
| `button.tsx` | ✅ `@radix-ui/react-slot` (Slot for `asChild`) | |
| `calendar.tsx` | ✅ `react-day-picker` (library primitive) | Not Radix, but per SKILL §5.4 "Date picker → react-day-picker" — correct |
| `card.tsx` | No Radix | Pure HTML wrapper — standard shadcn pattern, no primitive needed |
| `checkbox.tsx` | ✅ `@radix-ui/react-checkbox` | |
| `command.tsx` | ✅ `@radix-ui/react-dialog` + `cmdk` | Composes `Dialog` from Layer 2 |
| `dialog.tsx` | ✅ `@radix-ui/react-dialog` | |
| `dropdown-menu.tsx` | ✅ `@radix-ui/react-dropdown-menu` | |
| `form.tsx` | ✅ `@radix-ui/react-slot` + `@radix-ui/react-label` | |
| `input.tsx` | No Radix | Pure HTML wrapper |
| `label.tsx` | ✅ `@radix-ui/react-label` | |
| `popover.tsx` | ✅ `@radix-ui/react-popover` | |
| `select.tsx` | ✅ `@radix-ui/react-select` | |
| `separator.tsx` | ✅ `@radix-ui/react-separator` | |
| `table.tsx` | No Radix | Pure HTML wrapper |
| `tabs.tsx` | ✅ `@radix-ui/react-tabs` | |
| `textarea.tsx` | No Radix | Pure HTML wrapper |
| `tooltip.tsx` | ✅ `@radix-ui/react-tooltip` | |

**Verdict:** ✅ Pass — 13/18 import Radix directly; the 5 that don't (calendar, card, input, table, textarea) follow the standard shadcn pattern of wrapping native HTML elements where no behavioral primitive is needed.

### 4.3 Layer 3 — Compositions (`apps/web/src/components/{marketing,booking,admin,dashboard,membership,auth,seo,a11y,analytics}/*.tsx`)

🟡 **Important finding — Layer 3 bypasses Layer 2 in `MobileNavDrawer.tsx`:**

`apps/web/src/components/marketing/MobileNavDrawer.tsx:16`:
```tsx
import * as Dialog from '@radix-ui/react-dialog';
```

This bypasses the Layer 2 `ui/dialog.tsx` primitive (which wraps Radix with Stillwater's Editorial Calm styling) and uses raw Radix directly. It also uses raw `<button>` and `<svg>` instead of the `Button` primitive from Layer 2. Violates SKILL §5.4 "Library Discipline — if a UI library provides a primitive, USE IT. Do not rebuild."

**Other Layer 3 components:** spot-checked `booking/BookingConfirmation.tsx` (uses `Dialog` from `@/components/ui/dialog` ✅), `membership/CheckoutButton.tsx` (uses `Button` ✅), `admin/AdminShell.tsx`, `dashboard/MembershipStatusCard.tsx` — all compose Layer 2 primitives correctly.

### 4.4 Layer 4 — Features (`apps/web/src/app/*/page.tsx`)

Spot-checked `(marketing)/page.tsx` — correctly composes 9 Layer 3 marketing components (`Hero`, `ClassMarquee`, `Philosophy`, `ScheduleSection`, `InstructorsSection`, `MembershipSection`, `StudioSpaceSection`, `CtaBand`, `ScrollProgressBar`) plus `JsonLd` from `@/components/seo`. ✅ Pass.

🟡 **Nit — `as unknown[]` casts in `(marketing)/page.tsx:66-72`:**
```tsx
<ScheduleSection sessions={sessions as unknown[]} />
<InstructorsSection instructors={(instructors as unknown[]).map((i) => i as { id: string; name: string; slug: string; bio?: string | null })} />
<MembershipSection plans={(membershipPlans as unknown[]).map((p) => p as { id: string; name: string; priceCents: number; interval: string; classCreditsPerCycle: number | null })} />
```
The `withTimeout(...catch(() => []))` wrappers return `unknown[]` (loss of type narrowing), forcing these casts. Violates SKILL §16.1 anti-pattern `as unknown as` cast. Should be fixed by typing the `withTimeout` fallback or using a `never[]` with explicit annotation.

### 4.5 Layer 5 — App Shell (`apps/web/src/app/layout.tsx` + `proxy.ts`)

- `apps/web/src/app/layout.tsx` — root layout with `<SkipLink>`, `<TRPCProvider>`, `<PostHogProvider>`, `<Toaster>`. ✅ Pass.
- `apps/web/proxy.ts` — see §6 below. ✅ Pass.

---

## 5. Axis 3 — Procedure Access Tier Audit

### 5.1 Tier definitions (`packages/api/src/trpc.ts:42-68`)

| Tier | Middleware | Behavior |
|---|---|---|
| `publicProcedure` | none | No auth required |
| `protectedProcedure` | `enforceIsAuthed` | Throws `UNAUTHORIZED` if no session |
| `staffProcedure` | `enforceIsAuthed` + `enforceIsStaff` | Throws `FORBIDDEN` unless roles include `staff`/`manager`/`owner` |
| `ownerProcedure` | `enforceIsAuthed` + `enforceIsOwner` | Throws `FORBIDDEN` unless roles include `owner` |

**Note:** There is no `managerProcedure` tier. PAD §9.2 RBAC matrix has 4 permissions requiring `manager+` (`revenue:view`, `memberships:manage` are manager-only; `roles:assign` and `settings:studio` are owner-only). The 4-tier model cannot express "manager+" precisely — it can only do "staff+" (too permissive) or "owner" (too restrictive).

### 5.2 Per-Router Procedure Audit

Cross-referenced against `packages/auth/src/rbac.ts` MATRIX (PAD §9.2).

| Router | Procedure | Tier Used | RBAC Permission | Correct? |
|---|---|---|---|---|
| **schedule** | `getWeek` | public | `schedule:view` (guest+) | ✅ |
| | `getSession` | public | `schedule:view` (guest+) | ✅ |
| **classes** | `list` | public | `schedule:view` (guest+) | ✅ |
| | `getBySlug` | public | `schedule:view` (guest+) | ✅ |
| | `create` | staff | `schedule:manage` (staff+) | ✅ |
| | `update` | staff | `schedule:manage` (staff+) | ✅ |
| **sessions** | `listByDateRange` | public | `schedule:view` | ✅ |
| | `create` | staff | `schedule:manage` | ✅ |
| | `cancel` | staff | `class:cancel:any` (staff+) | ✅ |
| | `checkIn` | staff | `checkin:member` (staff+) | ✅ |
| | `update` | staff | `schedule:manage` | ✅ |
| **bookings** | `book` | protected | `class:book` (member+) | ✅ |
| | `cancel` | protected | `class:cancel:own` (member+) | ✅ |
| | `checkIn` | staff | `checkin:member` (staff+) | ✅ |
| **waitlist** | `join` | protected | `class:book` (member+) | ✅ |
| | `leave` | protected | `class:cancel:own` (member+) | ✅ |
| | `getMyPosition` | protected | `history:view:own` (member+) | ✅ |
| **members** | `getProfile` | protected | `history:view:own` | ✅ |
| | `updateProfile` | protected | (implied member+) | ✅ |
| | `getHistory` | protected | `history:view:own` | ✅ |
| **instructors** | `list` | public | `schedule:view` | ✅ |
| | `getBySlug` | public | `schedule:view` | ✅ |
| **memberships** | `getPlans` | public | `schedule:view` (pricing page) | ✅ |
| | `getMySubscription` | protected | `history:view:own` | ✅ |
| | `subscribe` | protected | `class:book` (member+) | ✅ |
| | `cancel` | protected | `class:cancel:own` | ✅ |
| | `pause` | protected | (implied member+) | ✅ |
| | `resume` | protected | (implied member+) | ✅ |
| **payments** | `getPortalUrl` | protected | `history:view:own` | ✅ |
| | `getInvoices` | protected | `history:view:own` | ✅ |
| | `refund` | staff | `memberships:manage` (manager+!) | 🔴 **RBAC violation** — see below |
| **admin** | `getDashboard` | staff | (staff+ aggregate) | ✅ |
| | `getRevenue` | staff | `revenue:view` (manager+!) | 🔴 **RBAC violation** |
| | `getClassRoster` | staff | `members:view:all` (staff+) | ✅ |
| | `listClasses` | staff | `members:view:all` / `schedule:manage` | ✅ |
| | `deleteClass` | staff | `schedule:manage` | ✅ |
| | `listMembers` | staff | `members:view:all` | ✅ |
| | `getMemberDetail` | staff | `members:view:all` | ✅ |
| | `getRevenueDetails` | staff | `revenue:view` (manager+!) | 🔴 **RBAC violation** |
| | `assignRole` | owner | `roles:assign` (owner) | ✅ |
| | `removeRole` | owner | `roles:assign` (owner) | ✅ |
| | `listAuditLog` | staff | (comment says "manager+ only" but uses staffProcedure) | 🟡 Comment/code mismatch — see below |
| | `getRecentSignups` | staff | `members:view:all` | ✅ |

### 5.3 🔴 RBAC Violations (4 procedures)

Per PAD §9.2 / `packages/auth/src/rbac.ts:48-49`:
- `revenue:view` → manager, owner (NOT staff)
- `memberships:manage` → manager, owner (NOT staff)

| Procedure | File:Line | Tier Used | Should Be | Impact |
|---|---|---|---|---|
| `admin.getRevenue` | `packages/api/src/routers/admin.ts:60` | `staffProcedure` | manager+ | Staff can view aggregate revenue counts |
| `admin.getRevenueDetails` | `packages/api/src/routers/admin.ts:273` | `staffProcedure` | manager+ | Staff can view MRR, churn rate, attendance metrics, no-show rate |
| `payments.refund` | `packages/api/src/routers/payments.ts:140` | `staffProcedure` | manager+ (D12 stub — `memberships:manage`) | Staff can call refund (currently stubbed, but when v2 unwires the stub, staff will be able to issue refunds — RBAC fix needed BEFORE unwiring the stub) |
| `admin.listAuditLog` | `packages/api/src/routers/admin.ts:430` | `staffProcedure` | manager+ (per comment line 428 "manager+ only") | Code comment claims manager+ but uses staffProcedure — staff can read the full audit log |

**Root cause:** The 4-tier model has no `managerProcedure`. Either:
- (a) Add a 5th tier `managerProcedure = protectedProcedure.use(enforceIsManager)`, or
- (b) Use `ownerProcedure` for these (too restrictive — managers should see revenue), or
- (c) Add an inline `enforceRole(['manager', 'owner'])` middleware call inside each affected procedure.

The layout-level guard at `apps/web/src/app/(admin)/admin/revenue/layout.tsx:19` correctly enforces `requireRole('manager', 'owner')` for the revenue **page** — so the UI gate is correct, but the API gate is too permissive. A staff user with a stolen API token could call `admin.getRevenueDetails` directly and bypass the layout guard.

---

## 6. Axis 3 — 2-Layer Auth Audit

### 6.1 Layer 1 — `apps/web/proxy.ts`

| Check | Status | Evidence |
|---|---|---|
| Uses `getSessionCookie()` from `better-auth/cookies` | ✅ Pass | `proxy.ts:35` (`import { getSessionCookie } from "better-auth/cookies"`) + `proxy.ts:124` (`const sessionCookie = getSessionCookie(request)`) |
| Does NOT call `auth.api.getSession()` | ✅ Pass | Grep-verified — zero matches for `auth.api.getSession` in `proxy.ts` |
| Does NOT import from `@stillwater/auth` | ✅ Pass | Only imports: `next/server`, `better-auth/cookies` |
| Does NOT make DB calls | ✅ Pass | No `@stillwater/db` import, no Drizzle usage |
| Does NOT do RBAC role checks | ✅ Pass | Comment at `proxy.ts:136-138` explicitly defers RBAC to layouts |
| Exports `proxy` function (not `middleware`) | ✅ Pass | `proxy.ts:98` (`export function proxy(request: NextRequest)`) — Next.js 16 requirement per ADR-009 |
| Cookie-only optimistic redirect for unauth users | ✅ Pass | `proxy.ts:125-134` redirects to `/auth/sign-in` if no cookie |
| Has matcher config excluding static assets | ✅ Pass | `proxy.ts:147-159` |

**Layer 1 verdict:** ✅ Pass — fully compliant with SKILL §5.6 2-layer auth pattern.

### 6.2 Layer 2 — Layout Guards

| Layout file | Required role(s) | Helper | Status |
|---|---|---|---|
| `apps/web/src/app/(studio)/layout.tsx:23` | member+ (any auth) | `requireAuth()` | ✅ Pass |
| `apps/web/src/app/(admin)/layout.tsx:22` | staff, manager, owner | `requireRole('staff', 'manager', 'owner')` | ✅ Pass |
| `apps/web/src/app/(admin)/admin/revenue/layout.tsx:19` | manager, owner | `requireRole('manager', 'owner')` | ✅ Pass |
| `apps/web/src/app/(admin)/admin/settings/layout.tsx:18` | owner | `requireRole('owner')` | ✅ Pass |

**Helper implementation** (`apps/web/src/lib/auth.ts:35-52`):
- `requireAuth()` calls `auth.api.getSession()` (DB-backed), throws `NEXT_REDIRECT` if null ✅
- `requireRole(...roles)` calls `requireAuth()` then checks `session.user.roles.some(...)` ✅
- Both documented as "NEVER wrap in try/catch" per SKILL §5.7 ✅

**Layer 2 verdict:** ✅ Pass — all 4 layout guards implemented per SKILL §5.7.

### 6.3 Layer 2 — Defense-in-Depth Notes

🟢 **Nit:** The `(admin)/admin/audit-log/layout.tsx` exists (file found at `apps/web/src/app/(admin)/admin/audit-log/layout.tsx`) but does NOT enforce a manager+ guard — it appears to inherit from `(admin)/layout.tsx` (staff+) only. Since `admin.listAuditLog` should be manager+ per the code comment at `admin.ts:428`, the layout should match. Currently staff can navigate to `/admin/audit-log` and see audit log entries.

---

## 7. Axis 3 — Drizzle RQB Audit

`packages/db/src/schema/relations.ts` defines `relations()` for 14 tables. Cross-checked against every `.references(() => ...)` call in schema files:

| FK Pair (child → parent) | Schema File:Line | `relations()` defined? | Status |
|---|---|---|---|
| `members.userId` → `users.id` | `members.ts:19` | ✅ `membersRelations.user` + `usersRelations.member` | ✅ |
| `instructors.userId` → `users.id` | `instructors.ts:17` | ✅ `instructorsRelations.user` + `usersRelations.instructor` | ✅ |
| `classes.styleId` → `classStyles.id` | `classes.ts:20` | ✅ `classesRelations.style` + `classStylesRelations.classes` | ✅ |
| `classSessions.classId` → `classes.id` | `sessions.ts:27` | ✅ `classSessionsRelations.class` + `classesRelations.sessions` | ✅ |
| `classSessions.instructorId` → `instructors.id` | `sessions.ts:30` | ✅ `classSessionsRelations.instructor` + `instructorsRelations.sessions` | ✅ |
| `classSessions.roomId` → `rooms.id` (nullable) | `sessions.ts:31` | ✅ `classSessionsRelations.room` + `roomsRelations.sessions` | ✅ |
| `enrollments.sessionId` → `classSessions.id` | `enrollments.ts:25` | ✅ `enrollmentsRelations.session` + `classSessionsRelations.enrollments` | ✅ |
| `enrollments.memberId` → `members.id` | `enrollments.ts:28` | ✅ `enrollmentsRelations.member` + `membersRelations.enrollments` | ✅ |
| `waitlistEntries.sessionId` → `classSessions.id` | `waitlist.ts:26` | ✅ `waitlistEntriesRelations.session` + `classSessionsRelations.waitlistEntries` | ✅ |
| `waitlistEntries.memberId` → `members.id` | `waitlist.ts:29` | ✅ `waitlistEntriesRelations.member` + `membersRelations.waitlistEntries` | ✅ |
| `memberSubscriptions.memberId` → `members.id` | `memberships.ts:45` | ✅ `memberSubscriptionsRelations.member` + `membersRelations.subscriptions` | ✅ |
| `memberSubscriptions.planId` → `membershipPlans.id` | `memberships.ts:48` | ✅ `memberSubscriptionsRelations.plan` + `membershipPlansRelations.subscriptions` | ✅ |
| `classPackages.memberId` → `members.id` | `payments.ts:41` | ✅ `classPackagesRelations.member` + `membersRelations.classPackages` | ✅ |
| `paymentEvents.memberId` → `members.id` (nullable) | `payments.ts:22` | ✅ `paymentEventsRelations.member` + `membersRelations.paymentEvents` | ✅ |
| `roleAssignments.memberId` → `members.id` | `role-assignments.ts:20` | ✅ `roleAssignmentsRelations.member` + `membersRelations.roles` | ✅ |
| `auditLog.staffMemberId` → `members.id` | `audit-log.ts:28` | ✅ `auditLogRelations.staffMember` + `membersRelations.auditLogs` | ✅ |
| `session.userId` → `users.id` (Better Auth) | `auth-tables.ts:28` | ❌ **Not defined** | 🟡 Important |
| `account.userId` → `users.id` (Better Auth) | `auth-tables.ts:46` | ❌ **Not defined** | 🟡 Important |

**Verdict:** 16/18 FK pairs have `relations()` definitions. The 2 missing pairs are both Better Auth tables (`session` and `account`).

**Impact:** Better Auth's Drizzle adapter queries these tables directly (via `db.select().from(session).where(...)`), not via the RQB `db.query.session.findFirst({ with: {...} })` API — so the missing relations don't break Better Auth. However, if any tRPC procedure ever tries to do `db.query.users.findFirst({ with: { sessions: true } })`, it will throw `Cannot read properties of undefined (reading 'referencedTable')` at runtime (per the warning comment in `relations.ts:5-7`). Currently no consumer does this, so it's a latent risk, not an active bug.

**Recommendation:** Add `usersRelations.sessions = many(session)` + `sessionRelations.user = one(users, ...)` and equivalent for `account` to make the relation graph complete.

---

## 8. Axis 3 — Build Config Audit

### 8.1 `transpilePackages` array (`apps/web/next.config.ts:35-43`)

```ts
transpilePackages: [
  '@stillwater/auth',
  '@stillwater/api',
  '@stillwater/db',
  '@stillwater/config',
  '@stillwater/ui',
  '@stillwater/email',
  '@stillwater/payments',
],
```

| Workspace package | In `transpilePackages`? | Has `exports.default` → `./src/*.ts`? |
|---|---|---|
| `@stillwater/auth` | ✅ | (per ADR-011 — all 7 packages updated) |
| `@stillwater/api` | ✅ | ✅ |
| `@stillwater/db` | ✅ | ✅ |
| `@stillwater/config` | ✅ | ✅ |
| `@stillwater/ui` | ✅ | ✅ |
| `@stillwater/email` | ✅ | ✅ |
| `@stillwater/payments` | ✅ | ✅ |

**Verdict:** ✅ Pass — all 7 workspace packages that need source resolution are listed. Matches ADR-011 spec exactly.

### 8.2 Other Next.js 16 Build Config Checks

| Check | Status | Evidence |
|---|---|---|
| `reactCompiler: true` (stable in Next.js 16) | ✅ Pass | `next.config.ts:17` |
| `serverExternalPackages` at top-level (not `experimental.serverComponentsExternalPackages`) | ✅ Pass | `next.config.ts:47-52` — includes `drizzle-orm`, `better-auth`, `@neondatabase/serverless`, `@sanity/client` |
| No `tailwind.config.js` (Tailwind v4 — all tokens in `@theme` block in `globals.css`) | 🟡 Partial | `apps/web/tailwind.config.ts` exists at the project root. Tailwind v4 doesn't strictly require deletion but SKILL §16.4 anti-pattern says "tailwind.config.js — DELETE THIS FILE". The file exists but may be a v3→v4 migration artifact. |
| `experimental.turbopackFileSystemCacheForDev: true` | ✅ Pass | `next.config.ts:57` |
| Per-request nonce CSP in `proxy.ts` | ✅ Pass | `proxy.ts:73-95` (`generateNonce` + `buildCspHeader`) — but see Important note below |
| Static CSP fallback in `next.config.ts:headers()` | ✅ Pass | `next.config.ts:120-168` — v9 V9-2 fix documented in comments |

🟡 **Important — `tailwind.config.ts` still exists:**
`apps/web/tailwind.config.ts` (path confirmed in earlier `LS` output) is present. SKILL §16.4 anti-pattern explicitly states: "tailwind.config.js — DELETE THIS FILE. All tokens in @theme block in globals.css." Tailwind v4 reads config from CSS `@theme` directives; the `tailwind.config.ts` file may be a v3 leftover or used for IDE tooling, but its presence violates the documented anti-pattern.

🟡 **Important — `next.config.ts` CSP header overrides `proxy.ts` CSP in production:**
The `next.config.ts:97-119` comment explains that proxy.ts response headers don't reach production on Vercel + Next.js 16.2.10 (GitHub #85711, #86303). The static CSP in `next.config.ts:127-139` uses `'unsafe-inline'` for `script-src` (weaker than the nonce-based CSP in proxy.ts). This is a known, documented tradeoff — not a code bug, but a security posture regression in production.

---

## 9. Findings Summary

### Critical (🔴)

| # | Finding | Location | Fix |
|---|---|---|---|
| C1 | Waitlist promotion flow broken end-to-end. `bookings.cancel` sends `{ sessionId, cancelledEnrollmentId }` but `waitlist-promotion` worker expects `{ waitlistEntryId }`. Worker always returns `sent:false`. No code path sets `waitlistEntries.status='offered'`. | `packages/api/src/routers/bookings.ts:251-256` (producer) + `services/workers/src/waitlist-promotion.ts:49` (consumer) | Either (a) `bookings.cancel` should find the next waitlist entry, set `status='offered'` + `expiresAt`, then trigger the worker with `{ waitlistEntryId }`; or (b) change the worker payload to `{ sessionId, cancelledEnrollmentId }` and have the worker do the promotion DB write inside a transaction. |
| C2 | Credit consumption missing from `bookings.book`. BOOK-004 (consume credit) and BOOK-005 (reject no-credit member) are PAD-claimed scenarios but the procedure body has no credit logic. Any authenticated member can book unlimited sessions for free. | `packages/api/src/routers/bookings.ts:50-165` (the `book` mutation) | Add Step 4 from SKILL §15.1: query `member_subscriptions.creditsRemaining` (or `class_packages.usedCredits < totalCredits`), decrement atomically inside the advisory-lock transaction, throw `PAYLOAD_REQUIRED` if no credits. |
| C3 | Coverage thresholds failing across 4 of 5 packages. `pnpm test:coverage` would fail api (74.87 % vs 80 % threshold) and workers (84.41 % vs 85 % threshold); payments/db/web have no thresholds so they silently pass at 50-78 %. PAD §21.3 targets (90/95/80/70/85 %) are not met anywhere. | Per-package `vitest.config.ts` files | (a) Add coverage thresholds to payments/db/web vitest configs matching PAD targets; (b) wire `pnpm test:coverage` into CI as a required gate; (c) add tests for the 7 untested admin procedures; (d) add tests for `jobs-client.ts`, `rateLimit.ts`, `webhooks.ts` event handlers. |

### Important (🟡)

| # | Finding | Location | Fix |
|---|---|---|---|
| I1 | 4 RBAC violations: `admin.getRevenue`, `admin.getRevenueDetails`, `payments.refund`, `admin.listAuditLog` use `staffProcedure` but PAD §9.2 RBAC matrix requires manager+. Staff can read revenue/audit data via direct API calls (bypassing the layout guard). | `packages/api/src/routers/admin.ts:60,273,430`; `packages/api/src/routers/payments.ts:140` | Add a 5th tier `managerProcedure` to `trpc.ts` (between staff and owner); use it on these 4 procedures. Or add inline `enforceRole(['manager', 'owner'])` middleware. |
| I2 | `MobileNavDrawer.tsx` bypasses Layer 2 — imports `@radix-ui/react-dialog` directly instead of using `@/components/ui/dialog`. Also uses raw `<button>`/`<svg>` instead of the `Button` primitive. | `apps/web/src/components/marketing/MobileNavDrawer.tsx:16` | Refactor to import `Dialog, DialogContent, DialogTrigger, ...` from `@/components/ui/dialog` and use `Button` for triggers. |
| I3 | 7 of 11 ADRs are referenced from source code; ADR-001 (Turborepo), ADR-002 (tRPC over REST), and ADR-011 (transpilePackages) have zero source references. ADR-011 is implemented in `next.config.ts:35` but the comment block doesn't name the ADR. | `turbo.json`, `pnpm-workspace.yaml`, `packages/api/src/trpc.ts`, `apps/web/next.config.ts:29-34` | Add `// ADR-001` comment to `turbo.json` header; `// ADR-002` to `packages/api/src/trpc.ts:1`; `// ADR-011` to `apps/web/next.config.ts:29` above `transpilePackages`. |
| I4 | Better Auth tables (`session`, `account`) have FKs to `users` but no `relations()` definitions in `schema/relations.ts`. Latent runtime risk if any consumer tries `db.query.users.findFirst({ with: { sessions: true } })`. | `packages/db/src/schema/relations.ts` (missing entries) + `packages/db/src/schema/auth-tables.ts:28,46` (the FKs) | Add `sessionRelations = relations(session, ({ one }) => ({ user: one(users, { fields: [session.userId], references: [users.id] }) }))` and equivalent for `account`; add `sessions: many(session)` + `accounts: many(account)` to `usersRelations`. |
| I5 | `tailwind.config.ts` exists despite SKILL §16.4 anti-pattern stating it should be deleted in Tailwind v4. | `apps/web/tailwind.config.ts` | Verify if it's actually used by build tooling; if not, delete and rely on `@theme` in `globals.css`. |
| I6 | `(admin)/admin/audit-log/layout.tsx` does NOT enforce a manager+ guard, despite the code comment at `admin.ts:428` saying "manager+ only". Staff can navigate to `/admin/audit-log` and view audit log entries. | `apps/web/src/app/(admin)/admin/audit-log/layout.tsx` | Add `await requireRole('manager', 'owner')` to the layout (mirroring `revenue/layout.tsx`). |
| I7 | `as unknown[]` and `as { ... }` casts in `(marketing)/page.tsx:66-72` violate SKILL §16.1 anti-pattern. Caused by `withTimeout(...).catch(() => [])` returning `unknown[]`. | `apps/web/src/app/(marketing)/page.tsx:43-72` | Type the `withTimeout` fallback explicitly or use a `never[]` annotation that lets the cast become a safe `as Type[]`. |

### Nit (🟢)

| # | Finding | Location |
|---|---|---|
| N1 | BOOK-001 ID collision between E2E spec (`e2e/booking.spec.ts:25` — "Browse schedule") and PAD §21.4 ("Books confirmed session"). Same ID, different scenarios. | `e2e/booking.spec.ts:10-13` vs `PAD.md:2244` |
| N2 | BOOK-006 integration test is a placeholder that never runs without `DATABASE_URL`. Should either be wired to testcontainers or marked `it.skip` with a clear TODO. | `packages/api/src/routers/bookings.integration.test.ts:41` |
| N3 | Unit tests for `bookings.book` do not use the `BOOK-00X` scenario IDs in test names — they use natural-language descriptions. Makes traceability to PAD §21.4 harder. | `packages/api/src/routers/bookings.test.ts:170-380` |
| N4 | `admin.ts:428` comment says "manager+ only" but code uses `staffProcedure` (see I1). | `packages/api/src/routers/admin.ts:428-430` |
| N5 | `waitlist-promotion.ts:54` and `waitlist-expiry.ts:48` use `as any` casts on `db.query.waitlistEntries` to work around Drizzle 0.45 RQB type limitations (Lesson 69). Should be removed when migrating to Drizzle 1.0 stable. | `services/workers/src/waitlist-promotion.ts:54`, `services/workers/src/waitlist-expiry.ts:48` |

### Question (❓)

| # | Question |
|---|---|
| Q1 | The PAD changelog (line 92) claims "5 STRIPE acceptance tests passing (STRIPE-001 through STRIPE-005)" — but STRIPE-001, 002, 003, 005 are tested at the `@stillwater/payments` package level, while STRIPE-004 is tested at the route handler level (`apps/web/src/app/api/webhooks/stripe/route.test.ts`). Is this split intentional? The PAD implies all 5 are in one suite. |
| Q2 | `packages/api/src/lib/jobs-client.ts` exists (74 lines, per `LS` output) but has 0 % coverage and no test file. Is this intentional (it's a thin wrapper around Trigger.dev) or an oversight? |
| Q3 | `apps/web/src/lib/observability/error-boundary.tsx` is 95 lines with 0 % coverage. Is the error boundary tested anywhere via E2E? |

---

## 10. Next Actions (Prioritized)

1. **🔴 C1 (waitlist promotion)** — Fix the payload mismatch + add the missing DB promotion step in `bookings.cancel`. Add an integration test that exercises the full cancel→promote→email-send flow with a mocked DB. This is the highest-impact correctness bug.
2. **🔴 C2 (credit consumption)** — Add Step 4 from SKILL §15.1 to `bookings.book`. Add BOOK-004 and BOOK-005 unit tests. This is a revenue-protection bug.
3. **🔴 C3 (coverage gates)** — (a) Add `thresholds` blocks to `packages/payments/vitest.config.ts`, `packages/db/vitest.config.ts`, `apps/web/vitest.config.ts` matching PAD §21.3 targets. (b) Wire `pnpm test:coverage` into the CI workflow as a required gate. (c) Write the 7 missing admin procedure tests.
4. **🟡 I1 (RBAC violations)** — Add `managerProcedure` tier to `trpc.ts`; apply to the 4 affected procedures. This is a security regression — staff can read revenue/audit data.
5. **🟡 I2 (MobileNavDrawer)** — Refactor to use Layer 2 `Dialog` primitive.
6. **🟡 I3 (ADR references)** — Add `// ADR-00X` comments to the 3 files missing them.
7. **🟡 I4 (Better Auth relations)** — Add `relations()` for `session` and `account` tables.
8. **🟡 I6 (audit-log layout guard)** — Add `requireRole('manager', 'owner')` to `(admin)/admin/audit-log/layout.tsx`.

---

**Audit complete.** No project files were modified. All findings are read-only observations backed by file paths, line numbers, and code snippets above.

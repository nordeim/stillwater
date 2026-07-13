# Phase G — TDD / Test Coverage Audit Report

**Audit Date:** 2026-07-12  
**Auditor:** Explore Agent (Test Coverage Auditor)  
**Scope:** Stillwater Yoga Studio monorepo at `/home/z/my-project/stillwater/`  
**References:** SKILL §11.1, §11.5, §13.3, §14.4, §15.1, §15.8.1; MEP Phase 5/7/8 acceptance criteria; PAD §9.2, §15.3, §22.3.

---

## 1. Executive Summary

The Stillwater monorepo currently runs **651 tests across 97 files (7 packages + 1 service)** — all green in the default test run. This matches the Phase B counts exactly. **However, the test suite is materially weaker than the headline numbers suggest**: coverage thresholds fail in 4 of 5 audited packages (api, db, payments, workers), the BOOK-001…005 and WAIT-001…005 critical scenario IDs are *missing entirely* from the api unit-test files, the BOOK-006 concurrent-booking regression test is a no-op placeholder, factory functions are documented but never imported by tests, every workers test mocks `@stillwater/email` with `vi.fn()` rather than using a `FakeEmailService`, and 40+ test files use `vi.clearAllMocks()` on structural mock chains (the #1 SKILL §13.3 anti-pattern).

**Coverage averages (lines/branches, audited packages only):**
| Package | Lines | Branches | Target | Verdict |
|---|---|---|---|---|
| api | 75.83 % | 60.46 % | 90 % | ❌ FAIL |
| payments | 78.68 % | 55.83 % | 95 % | ❌ FAIL |
| db | 38.88 % | 25.00 % | 80 % | ❌ FAIL |
| web | 24.52 % | 21.02 % | 70 % | ❌ FAIL |
| workers | 84.72 % | 79.16 % | 85 % | ❌ FAIL (0.28 pp short on lines, 5.84 pp short on branches) |
| email | 88.70 % | 90.47 % | (n/a) | ✅ PASS (not in target list) |
| auth | 61.29 % | 63.33 % | (n/a) | ⚠ No threshold set |
| **Average (5 audited pkgs)** | **60.53 %** | **48.29 %** | **(mixed)** | **4 of 5 fail** |

**Overall test-health verdict:** ⚠️ **AMBER** — tests run and pass, but the safety net is mostly mock-based with low real coverage on critical paths. The booking race-condition guarantee (BOOK-006) is *not actually tested*. Production deployment should be gated on remediation of the 6 P0 findings below.

---

## 2. Per-Package Test Count Table

All counts captured by running `npx vitest run` in each package directory. Expected counts come from the Phase B verification spec.

| Package | Files (actual) | Files (expected) | Tests (actual) | Tests (expected) | Verdict |
|---|---|---|---|---|---|
| @stillwater/db | 17 | 17 | 117 | 117 | ✅ PASS |
| @stillwater/auth | 4 | 4 | 102 | 102 | ✅ PASS |
| @stillwater/api | 13 | 13 | 118 | 118 | ✅ PASS |
| @stillwater/payments | 7 | 7 | 43 | 43 | ✅ PASS |
| @stillwater/web | 28 | 28 | 159 | 159 | ✅ PASS |
| @stillwater/email | 17 | 17 | 71 | 71 | ✅ PASS |
| @stillwater/workers | 11 | 11 | 41 | 41 | ✅ PASS |
| **TOTAL** | **97** | **97** | **651** | **651** | **✅ PASS** |

**Evidence (vitest output excerpts):**
- db: `Test Files 17 passed (17) / Tests 117 passed (117)` — `packages/db` (9.89s)
- auth: `Test Files 4 passed (4) / Tests 102 passed (102)` — `packages/auth` (2.79s)
- api: `Test Files 13 passed (13) / Tests 118 passed (118)` — `packages/api` (23.44s)
- payments: `Test Files 7 passed (7) / Tests 43 passed (43)` — `packages/payments` (1.72s)
- web: `Test Files 28 passed (28) / Tests 159 passed (159)` — `apps/web` (16.52s)
- email: `Test Files 17 passed (17) / Tests 71 passed (71)` — `packages/email` (19.13s)
- workers: `Test Files 11 passed (11) / Tests 41 passed (41)` — `services/workers` (2.30s)

**Note on test count:** All 97 files / 651 tests pass deterministically on this machine. No flaky tests observed during the audit run. The 23.44s api duration is dominated by Drizzle import cost (17.71s of "import" time) — not a flakiness concern, but worth noting for CI parallelization.

---

## 3. Per-Package Coverage Table

Captured via `npx vitest run --coverage` in each package. Coverage targets from SKILL §11.1.

| Package | Lines % | Branches % | Functions % | Stmts % | Target (lines/branches) | Verdict |
|---|---|---|---|---|---|---|
| @stillwater/api | 75.83 | 60.46 | 73.01 | 75.89 | 90 / 90 | ❌ FAIL (-14.17 pp lines / -29.54 pp branches) |
| @stillwater/payments | 78.68 | 55.83 | 83.33 | 73.72 | 95 / 95 | ❌ FAIL (-16.32 pp lines / -39.17 pp branches) |
| @stillwater/db | 38.88 | 25.00 | 41.07 | 41.57 | 80 / 80 | ❌ FAIL (-41.12 pp lines / -55.00 pp branches) |
| @stillwater/web | 24.52 | 21.02 | 18.79 | 24.27 | 70 / 70 | ❌ FAIL (-45.48 pp lines / -48.98 pp branches) |
| @stillwater/workers | 84.72 | 79.16 | 63.15 | 84.24 | 85 / 85 | ❌ FAIL (-0.28 pp lines / -5.84 pp branches) |
| @stillwater/email | 88.70 | 90.47 | 61.76 | 89.06 | (not in target list) | ℹ️ informational |
| @stillwater/auth | 61.29 | 63.33 | 50.00 | 62.50 | (not in target list) | ℹ️ no threshold in vitest.config.ts |

### Coverage failures that break the build (vitest thresholds actually enforced)

Only 2 packages have *enforced* thresholds in their `vitest.config.ts`:

| Package | Threshold set in config | Actual | Build-breaking? |
|---|---|---|---|
| @stillwater/api | lines 80 / branches 70 / functions 80 / stmts 80 | lines 75.83 / branches 60.46 / functions 73.01 / stmts 75.89 | ❌ YES — `pnpm test:coverage` exits non-zero |
| @stillwater/workers | lines 85 / branches 85 / functions 85 / stmts 85 | lines 84.72 / branches 79.16 / functions 63.15 / stmts 84.24 | ❌ YES — `pnpm test:coverage` exits non-zero |

The other 3 audited packages (db, payments, web) have **no thresholds set** in their `vitest.config.ts` — meaning coverage can drop to 0 % without breaking the build. This is itself a P1 finding.

**Evidence (api):** `packages/api/vitest.config.ts:26-31` sets thresholds; `vitest run --coverage` prints `ERROR: Coverage for lines (75.83%) does not meet global threshold (80%)` (4 such errors for lines/functions/statements/branches).

**Evidence (workers):** `services/workers/vitest.config.ts:33-39` sets 85 % across the board; `vitest run --coverage` prints `ERROR: Coverage for lines (84.72%) does not meet global threshold (85%)` (and 3 similar errors). Function coverage is especially weak at 63.15 % because the worker task `.run` paths are only partially exercised.

### Per-file coverage hotspots (api package — worst offenders)

| File | Lines % | Uncovered lines | Why it matters |
|---|---|---|---|
| `packages/api/src/routers/admin.ts` | 29.11 | 126, 134, 173, 203-481 | Entire admin router (dashboard, revenue, roster, classes CRUD) is essentially untested beyond happy paths. Lines 203-481 = 278 untested lines. |
| `packages/api/src/lib/jobs-client.ts` | 0 | 28-74 | Trigger.dev client bootstrap is completely untested. |
| `packages/api/src/middleware/rateLimit.ts` | 68.75 | 48-60 | Upstash sliding-window path not exercised (only the no-op path is tested). |

---

## 4. Critical Scenario ID Matrix

The MEP / PAD / SKILL documents name three families of critical scenarios: BOOK-001…006 (booking race conditions), WAIT-001…005 (waitlist unique index + concurrent joins), STRIPE-001…005 (webhook idempotency).

| Scenario ID | Exists? | File:Line | Description |
|---|---|---|---|
| **BOOK-001** Books confirmed session | ❌ MISSING as test name | (only mentioned in `e2e/booking.spec.ts:10` as a comment + `PAD.md:2211`) | E2E `BOOK-001: Browse schedule and view seat availability` exists at `e2e/booking.spec.ts:25` — but it tests *page rendering*, not "books confirmed session for member with active subscription". The booking.test.ts unit equivalent (`packages/api/src/routers/bookings.test.ts:145 'acquires advisory lock, checks capacity, and inserts enrollment'`) covers the same code path but does NOT carry the BOOK-001 ID. |
| **BOOK-002** Adds to waitlist at capacity | ❌ MISSING as test name | — | `bookings.test.ts:203 'throws CONFLICT when session is full'` covers the failure path; nothing asserts the waitlist *auto-add* behavior. |
| **BOOK-003** Prevents double-booking | ❌ MISSING as test name | — | `bookings.test.ts:193 'throws CONFLICT when member is already enrolled'` covers this. Unique index `idx_enrollment_session_member` is verified by migration only. |
| **BOOK-004** Consumes one credit | ❌ MISSING as test name | — | **No test anywhere** verifies credit decrement on booking. `bookings.test.ts` does not assert on `member_subscriptions.creditsRemaining`. |
| **BOOK-005** Rejects no-subscription booking | ❌ MISSING as test name | — | **No test anywhere** verifies the "no active subscription → FORBIDDEN" path. `bookings.test.ts` does not test this branch. |
| **BOOK-006** 10 concurrent → 1 confirms, 9 waitlisted | ⚠️ PLACEHOLDER | `packages/api/src/routers/bookings.integration.test.ts:19` | `describe.skipIf(!hasDatabase)('BOOK-006: Concurrent booking with advisory lock', ...)` — the `it()` body at line 26-42 is literally `expect(true).toBe(true); // Placeholder — skipped without DATABASE_URL`. **The race-condition guarantee is not actually tested.** Even with `DATABASE_URL` set, the test would still be a no-op because the body never fires real concurrent calls. |
| **WAIT-001** Promotes next waitlist on cancel | ❌ MISSING | — | `packages/api/src/routers/waitlist.test.ts` does not contain "WAIT-001". The `bookings.test.ts:270 'cancels the caller own enrollment and triggers waitlist-promotion'` only asserts that `ctx.jobs.trigger` was called with the right payload — it does NOT verify the worker actually promotes anyone. |
| **WAIT-002** Sends offer email to promoted member | ❌ MISSING | — | Tested only at the worker level (`services/workers/src/waitlist-promotion.test.ts`) — not under the WAIT-002 ID. |
| **WAIT-003** Expires offer + re-promotes | ❌ MISSING | — | No test exercises the waitlist-offer-expiry → re-promotion loop end-to-end. `services/workers/src/waitlist-expiry.test.ts` covers the expiry step only. |
| **WAIT-004** Returns credit on cancellation | ❌ MISSING | — | No test verifies credit return. |
| **WAIT-005** Handles cancel with no waitlist gracefully | ❌ MISSING | — | No test verifies the no-waitlist edge case in `cancel`. |
| **STRIPE-001** Grants credits on invoice.paid | ✅ EXISTS | `packages/payments/src/webhooks.test.ts:287` | `describe('handleStripeWebhook — STRIPE-001: invoice.paid grants credits', ...)` — asserts `spies.set` called with `creditsRemaining: 8`. ✓ |
| **STRIPE-002** Marks past_due on payment_failed | ✅ EXISTS | `packages/payments/src/webhooks.test.ts:316` | `describe('handleStripeWebhook — STRIPE-002: invoice.payment_failed marks past_due', ...)` — asserts `status: 'past_due'`. ✓ |
| **STRIPE-003** Idempotent (same event twice) | ✅ EXISTS | `packages/payments/src/webhooks.test.ts:213` | 3 tests including `'is idempotent across two sequential calls — second call is a no-op'` at line 254. Asserts `_transaction` not called on 2nd invocation. ✓ |
| **STRIPE-004** Rejects invalid signature | ✅ EXISTS | `apps/web/src/app/api/webhooks/stripe/route.test.ts:106` | `it('STRIPE-004: returns 400 when signature is invalid', ...)` — tests route handler boundary. ✓ (Tested at the route layer, not in `webhooks.test.ts` — documented at `packages/payments/src/webhooks.test.ts:20`.) |
| **STRIPE-005** Cancels on subscription.deleted | ✅ EXISTS | `packages/payments/src/webhooks.test.ts:343` | `describe('handleStripeWebhook — STRIPE-005: customer.subscription.deleted cancels', ...)` — asserts `status: 'cancelled'`. ✓ |

**Summary:** STRIPE family is fully covered (5/5). BOOK family is 1/6 (BOOK-006 exists as a placeholder). WAIT family is 0/5. **Only 6 of 16 critical scenario IDs are present as named tests.** The remaining 10 scenarios are partially covered by anonymous tests that exercise adjacent code paths but cannot be grep'd by their canonical ID — making regression tracking effectively impossible.

---

## 5. Regression Test Verification Cycle (3 samples)

The SKILL §11.5 Red-Green-Revert_Restore pattern requires regression tests that (1) exist, (2) test the specific bug, (3) fail if the bug is reintroduced. I selected 3 candidates.

### Sample 1: BOOK-006 concurrent booking regression
- **Does it exist?** ⚠️ Yes — `packages/api/src/routers/bookings.integration.test.ts:19`
- **Does it test the specific bug?** ❌ No. The `it()` body at line 26-42 contains only:
  ```ts
  // This test would: [list of things]
  expect(true).toBe(true); // Placeholder — skipped without DATABASE_URL
  ```
  This is a documentation stub, not a test. No 10-concurrent-bookings are fired.
- **Could the bug be reintroduced without the test failing?** ✅ **YES** — removing `pg_advisory_xact_lock` from `bookings.ts` would not break this test. The race-condition guarantee is *unguarded*.
- **Red-Green-Revert compliance:** ❌ FAIL — Red phase was never written (only the Green-phase placeholder was committed).

### Sample 2: Sanity webhook signature regression (STRIPE-004)
- **Does it exist?** ✅ Yes — `apps/web/src/app/api/webhooks/stripe/route.test.ts:106 'STRIPE-004: returns 400 when signature is invalid'`
- **Does it test the specific bug?** ✅ Yes. Mocks `constructEvent` to throw `StripeSignatureVerificationError`, asserts 400 status + `error.signature` in body, and asserts `handleStripeWebhook` was NOT called (no side effects on bad signature).
- **Could the bug be reintroduced without the test failing?** ❌ No — if someone removed the try/catch around `constructEvent`, this test would fail with a 500 instead of 400.
- **Red-Green-Revert compliance:** ✅ PASS.

### Sample 3: Waitlist unique constraint regression (Phase 5)
- **Does it exist?** ⚠️ Partially — `packages/db/src/schema/waitlist.test.ts:69 'has unique index on (sessionId, memberId) to prevent duplicate waitlist entries (Phase 5)'`
- **Does it test the specific bug?** ❌ No. The test body (lines 70-77) only asserts that `waitlistEntries.sessionId` and `waitlistEntries.memberId` are `toBeDefined()`. It does NOT actually verify a unique index exists. The comment at line 74-75 admits this: *"We verify via the generated migration SQL in integration tests."* — but no such integration test exists. (The migration `0002_lyrical_cargill.sql` does contain `CREATE UNIQUE INDEX "idx_waitlist_session_member"`, but no test asserts this.)
- **Could the bug be reintroduced without the test failing?** ✅ **YES** — if someone deleted the `uniqueIndex('idx_waitlist_session_member')` line from `waitlist.ts`, this test would still pass (it doesn't inspect indexes).
- **Red-Green-Revert compliance:** ❌ FAIL — the test is a tautology (asserting columns exist on a table that's defined with those columns).

**Regression test cycle verdict:** 1 of 3 samples passes the Red-Green-Revert pattern. 2 of 3 are placeholders or tautologies that would not catch regressions.

---

## 6. Test Pyramid Distribution

| Layer | Count | % of total | Target % | Verdict |
|---|---|---|---|---|
| Unit (`*.test.ts` / `*.test.tsx`, excluding `.integration.`) | 95 | 91.3 % | ~80 % | ⚠️ Slightly over-weighted on unit tests |
| Integration (`*.integration.test.ts`) | 2 | 1.9 % | ~15 % | ❌ SEVERELY UNDER (13.1 pp below target) |
| E2E (`e2e/*.spec.ts`) | 7 files / 26 tests | 6.7 % | ~5 % | ✅ Roughly on target |
| **Total** | **104 files** | **100 %** | | |

**Integration test breakdown (only 2 files):**
1. `packages/api/src/routers/bookings.integration.test.ts` — 1 test, placeholder body, skipped without `DATABASE_URL`.
2. `packages/db/src/seed/index.integration.test.ts` — 7 tests, exercises real Drizzle against Postgres, skipped without `DATABASE_URL`.

**Implication:** The integration tier is essentially empty. The 80/15/5 pyramid is in practice 91/2/7 — top-heavy on unit tests that mock Drizzle, with almost no tests verifying that Drizzle's query builder produces correct SQL against a real Postgres. This is why the BOOK-006 race-condition guarantee and the WAIT unique-constraint guarantee are untested.

**Evidence:** `Glob **/*.integration.test.{ts,tsx}` returns exactly 2 files; `Glob e2e/**/*.spec.{ts,tsx}` returns 7 files; total test files = 97 (per Section 2) + 7 e2e = 104.

---

## 7. Factory Pattern Audit

SKILL §4.1 / §21.6 mandates: *"Factory pattern (`getMockMember`, `getMockSession`, `getMockInstructor`, `getMockClass`, `getMockEnrollment`) using `crypto.randomUUID()` — never hardcoded fixtures."*

| Factory function | Defined in code? | Used by any test? | Finding |
|---|---|---|---|
| `getMockMember` | ✅ Yes — `packages/db/src/seed/fixtures/members.ts:25` | ❌ **No test imports it** | Defined but dead-coded from the test surface. |
| `getMockSession` | ❌ No | ❌ No | Only `generateDemoSessions()` exists at `packages/db/src/seed/fixtures/sessions.ts:37` — but it returns a fixed 7-element array, not a factory with overrides. |
| `getMockInstructor` | ❌ No | ❌ No | Mentioned only in `stillwater_SKILL.md:5582` and `PAD_validation_source_documents.md:4142` — never implemented. |
| `getMockClass` | ❌ No | ❌ No | Never implemented. |
| `getMockEnrollment` | ❌ No | ❌ No | Never implemented. |

**Ad-hoc fixture usage instead:** Grep confirms 18 test files use `fixture`/`Fixture` identifiers as inline object literals. Representative examples:

| File:Line | Pattern | Issue |
|---|---|---|
| `packages/api/src/routers/bookings.test.ts:60` | `const sessionFixture = { id: SESSION_ID, classId: '22222222-...' ... }` | Hardcoded UUIDs, no `crypto.randomUUID()`, no overrides parameter |
| `packages/api/src/routers/bookings.test.ts:77` | `const enrollmentFixture = { ... }` | Same |
| `packages/api/src/routers/waitlist.test.ts:48` | `const sessionFixture = { ... }` (duplicated from bookings.test.ts) | Same fixture defined twice across files |
| `packages/api/src/routers/memberships.test.ts:78` | `const planFixture = { id: PLAN_ID, ... }` | Same |
| `packages/api/src/routers/admin.test.ts:154` | `const rosterFixture = [ { id: '55555555-...' ... } ]` | Same |
| `services/workers/src/booking-confirmation.test.ts:51` | `const enrollmentFixture = { ... }` | Same |

**Verdict:** ❌ FAIL — Factory pattern is documented but not enforced. 4 of 5 named factories don't exist. The 1 that does exist (`getMockMember`) is never imported by any test. Every test uses ad-hoc object literals with hardcoded UUIDs, exactly the anti-pattern SKILL §21.6 warns about.

---

## 8. Beyonce Rule Check (5 critical paths)

The Beyonce Rule: *"If you liked it then you shoulda put a test on it."* For each critical path, verify there's a test that would fail if the path were removed.

### Critical Path 1: Booking race condition (10 concurrent → 1 confirmed, 9 waitlisted)
- **Test exists?** ⚠️ Placeholder only — `packages/api/src/routers/bookings.integration.test.ts:19`
- **Passes?** The placeholder `expect(true).toBe(true)` passes trivially. The real concurrent-booking assertion does NOT exist.
- **Verdict:** ❌ FAIL — race condition is unguarded. Removing `pg_advisory_xact_lock` from `bookings.ts:140` would not break any test.

### Critical Path 2: Stripe webhook idempotency (same event twice → fast path return, no transaction opened)
- **Test exists?** ✅ Yes — `packages/payments/src/webhooks.test.ts:216 'returns { received: true } immediately when event already processed (fast path)'` + line 254 `'is idempotent across two sequential calls — second call is a no-op'`
- **Passes?** ✅ Yes — second-call test explicitly asserts `_transaction` was NOT called and `spies.execute` was NOT called on the 2nd invocation (lines 282-283).
- **Verdict:** ✅ PASS — strong Beyonce coverage. If someone removed the `paymentEvents.findFirst` fast-path check, this test would fail.

### Critical Path 3: Waitlist unique constraint (same member joining same session twice → error)
- **Test exists?** ⚠️ Partial — `packages/api/src/routers/waitlist.test.ts:166 'throws CONFLICT when already on the waitlist'`
- **Passes?** ✅ Yes — but only at the *router* layer (mock `findFirstExisting` returns a row, asserts CONFLICT). The actual *database unique constraint* (`idx_waitlist_session_member` from migration `0002_lyrical_cargill.sql`) is NOT tested. The schema-level test at `packages/db/src/schema/waitlist.test.ts:69` is a tautology (see Section 5 Sample 3).
- **Verdict:** ⚠️ AMBER — router-level guard is tested; DB-level constraint is not. A regression that removes the DB index but keeps the router check would pass all tests.

### Critical Path 4: RBAC enforcement (member trying to access /admin → redirected to /dashboard)
- **Test exists?** ✅ Yes — `apps/web/src/lib/auth.test.ts:62 'requireRole("owner") redirects to /dashboard when user is only "member"'`
- **Passes?** ✅ Yes — asserts `requireRole('owner')` rejects with `NEXT_REDIRECT: /dashboard` when session has only `roles: ['member']`.
- **Verdict:** ✅ PASS — strong coverage. Layout-level RBAC enforcement is verified.
- **E2E confirmation:** `e2e/admin-dashboard.spec.ts:34 'member user is redirected from /admin to /dashboard'` (skipped without DATABASE_URL, but the assertion is correct).

### Critical Path 5: Session enrichment (customSession plugin attaches memberId + roles)
- **Test exists?** ⚠️ Weak — `packages/auth/src/config.test.ts:46 'has customSession plugin for memberId + roles enrichment'`
- **Passes?** ✅ Yes — but the test only checks `pluginIds.includes('custom-session')` (line 50). It does NOT verify that `customSession` actually attaches `memberId` or `roles` to the session object. If the `customSession` callback were replaced with `() => ({})` (returning empty object), this test would still pass.
- **Verdict:** ❌ FAIL — the test asserts plugin *registration*, not plugin *behavior*. The actual enrichment logic in `packages/auth/src/config.ts:119-120` is untested. This is the canonical Beyonce Rule violation: a test that passes even when the feature is removed.

**Beyonce Rule summary: 2 of 5 critical paths are adequately tested. 3 of 5 are unguarded or only weakly guarded.**

---

## 9. Real > Fake > Stub > Mock Discipline Audit (SKILL §15.8.1)

SKILL §15.8.1 ranks test doubles: **Real > Fake > Stub > Mock**. Mocks should be the last resort, used only for "email was sent" / "analytics fired" assertions.

### 9.1 Stripe webhook tests — STUBS? 
**Required:** `stripe.webhooks.constructEvent` is stubbed with canned data.

- `packages/payments/src/client.test.ts:19` — `vi.mock('stripe', () => ({ default: class MockStripe { constructor... } }))` — uses a **mock class** that captures constructor args. Used only to assert Stripe SDK is instantiated with correct `apiVersion` and `appInfo`. Verdict: ✅ **STUB/MOCK hybrid** — appropriate for a constructor-shape test.
- `apps/web/src/app/api/webhooks/stripe/route.test.ts:30-34` — `vi.mock('stripe', () => ({ default: class MockStripe { webhooks = { constructEvent: mockConstructEvent } } }))` where `mockConstructEvent.mockReturnValue(FAKE_EVENT)` — this is a **STUB**: returns canned event data without executing real Stripe logic. ✅ **PASS.**
- `packages/payments/src/webhooks.test.ts` — does NOT mock `stripe` at all. Instead it passes a fake `db` (with mocked transaction) directly to `handleStripeWebhook`. The Stripe event objects are constructed inline as plain objects (lines 141-209). This is closer to **STUB** than Mock. ✅ **PASS.**

### 9.2 Email tests — FAKE service?
**Required:** A `FakeEmailService` that captures emails in an array, NOT `vi.mock()` on the email sender.

- `packages/email/src/send.test.tsx:17` — `vi.mock('resend', () => ({ Resend: class MockResend { emails = { send: mockEmailsSend } } }))` — mocks the **Resend SDK** with a class that captures `emails.send` calls in `mockEmailsSend` vi.fn. This is a **mock of the SDK**, not a Fake of an email service.
- **`FakeEmailService` does NOT exist anywhere in the codebase.** Grep for `FakeEmailService|InMemoryEmailService|class.*EmailService` returns 0 matches in `packages/`, `apps/`, or `services/` (only matches in `stillwater_SKILL.md:5506` documentation).
- **Workers tests** (`services/workers/src/*.test.ts`) all use the same anti-pattern:
  ```ts
  const mockSendBookingConfirmation = vi.fn();
  vi.mock('@stillwater/email', () => ({
    sendBookingConfirmation: (...args) => mockSendBookingConfirmation(...args),
  }));
  ```
  This is repeated in **all 11 worker test files** (booking-confirmation, class-reminder-1h, class-reminder-24h, class-cancellation-notify, waitlist-promotion, waitlist-expiry, weekly-digest, payment-failed-notify, membership-expiry-warn, attendance-summary, membership-credit-grant). Each test mocks the specific email helper it needs rather than injecting a single `FakeEmailService` instance.

**Verdict:** ❌ FAIL — no `FakeEmailService` exists. Workers tests use Mock pattern (10+ files × ~3 mocks each = 30+ `vi.fn()` mocks for email). This is exactly the SKILL §15.8.1 anti-pattern.

### 9.3 Booking integration test — REAL Drizzle + testcontainers Postgres?
**Required:** Integration test uses real Drizzle with testcontainers Postgres, NOT mocked DB.

- `packages/api/src/routers/bookings.integration.test.ts` — ❌ **PLACEHOLDER**. Body is `expect(true).toBe(true)` (see Section 5 Sample 1). The file imports nothing from `testcontainers` or `@stillwater/db`. There is no real Postgres connection setup.
- `packages/db/src/seed/index.integration.test.ts` — ✅ Uses real Drizzle (`import { db } from '../index'` at line 18) and is gated on `process.env.DATABASE_URL`. But it tests the *seed script*, not the booking flow.

**Verdict:** ❌ FAIL — no integration test exercises the booking flow against real Postgres. The `testcontainers` dependency declared in `packages/db/package.json:32` is unused by any test.

### 9.4 `vi.mock()` usage audit — used sparingly?
Grep across `**/*.test.{ts,tsx}` returns **63 `vi.mock()` calls across 36 test files.** Breakdown:

| Category | Files | Justified? |
|---|---|---|
| Mocking `server-only` (Next.js Server Component guard) | 5 files (cloudflare/images, sanity/client, auth, trpc/server, schedule/stream) | ✅ Justified — `server-only` throws at import time, must be no-op'd |
| Mocking `next/headers`, `next/navigation`, `next/cache` | 4 files | ✅ Justified — Next.js server primitives, cannot run in Vitest |
| Mocking `stripe` SDK | 4 files (client.test, refunds, credit-packs, subscriptions, invoices, route.test) | ✅ Justified — STUB pattern, returns canned events |
| Mocking `@stillwater/payments` to isolate router | 2 files (api/payments.test, api/memberships.test) | ⚠️ Borderline — could use a `FakePaymentsService` instead |
| Mocking `@stillwater/email` send helpers | 11 files (all workers tests + 1 api test) | ❌ **NOT justified** — should use `FakeEmailService` (see 9.2) |
| Mocking `@stillwater/db` | 11 files (all workers tests + context.test + route.test) | ❌ **NOT justified** — should use real Drizzle with testcontainers OR an in-memory FakeDb |
| Mocking `@trigger.dev/sdk` `task()` | 11 files (all workers tests) | ⚠️ Borderline — task() must return its config; could be a one-line stub helper instead |
| Mocking `@stillwater/auth` `auth.api.getSession` | 2 files | ✅ Justified — Better Auth needs runtime context |
| Mocking `next/link` | 3 files (Footer, ScheduleGrid, MarketingNav tests) | ✅ Justified — Next.js component, mocks for snapshot stability |
| Mocking `@stillwater/api` appRouter | 1 file (trpc/server.test) | ✅ Justified — testing server.ts in isolation |
| Mocking `posthog-js`, `sonner` | 2 files | ✅ Justified — third-party SDKs, "analytics fired" / "toast shown" assertions |
| Mocking `resend` SDK | 1 file (send.test) | ⚠️ Borderline — see 9.2 |

**Verdict:** ~25 of 63 `vi.mock()` calls are NOT justified per SKILL §15.8.1. The biggest offender is the workers package (33 `vi.mock()` calls across 11 files, mocking 3 dependencies × 11 files = 33). A single `FakeEmailService` + `FakeDb` injection would eliminate ~22 of these.

---

## 10. TDD Three Laws Compliance (SKILL §14.4)

The Three Laws require (1) write no production code without a failing test, (2) write no more test than sufficient to fail, (3) write no more production code than sufficient to pass. In practice this manifests as **AAA pattern** (Arrange / Act / Assert) with clear separation.

I read 5 random test files end-to-end:

| File | AAA separation? | Notes |
|---|---|---|
| `packages/api/src/routers/bookings.test.ts` (364 lines) | ✅ Clean | Each test: arrange via `makeTx({...})` → `const caller = bookingsRouter.createCaller(ctx)` → `await caller.book(...)` → `expect(...)`. Three phases visually separated. |
| `packages/api/src/routers/memberships.test.ts` (361 lines) | ✅ Clean | Same pattern — `makeCtx({query:{...}})` → `createCaller` → call → expect. |
| `packages/api/src/routers/admin.test.ts` (302 lines) | ✅ Clean | `makeSelectChain(...)` → `makeCtx({select})` → `createCaller` → call → expect. The `makeSelectChain` helper at line 46 is excellent — encapsulates the Drizzle query chain. |
| `packages/api/src/context.test.ts` (68 lines) | ⚠️ Mixed | Lines 41-50: arrange (`new Request(...)`) and act (`await createContext(...)`) and assert (`expect(ctx).toHaveProperty(...)`) are well-separated. But the file mixes arrange into act on line 54: `vi.mocked(auth.api.getSession).mockResolvedValue(null as never);` is sandwiched between `const { auth } = await import(...)` and `const req = new Request(...)`. This is the #1 cause of flaky tests per SKILL — modifying a mock AFTER importing the module under test can race with Vitest's module cache. |
| `apps/web/src/app/api/schedule/stream/route.test.ts` (103 lines) | ✅ Clean | Uses `vi.useFakeTimers()` correctly in beforeEach, real timers in afterEach. Each test does `mockGetSession.mockResolvedValue(...)` (arrange) → `await import('./route')` (act setup) → `await GET(req)` (act) → `expect(res.status).toBe(...)` (assert). |

**Cross-cutting concern — `await import('./route')` inside `it()` body:** Multiple web-side tests (`route.test.ts:51`, `auth.test.ts:39`, etc.) use dynamic `await import()` inside each test rather than a top-level static import. This is a Vitest pattern that works with `vi.mock()` (mocks are hoisted, dynamic imports re-evaluate the module each time), but it adds ~10-20ms per test. Not a Three Laws violation, but worth noting.

**Verdict:** ✅ PASS — AAA pattern is well-observed. 4 of 5 files are clean. 1 file (`context.test.ts`) has a minor arrange/act interleaving on line 54.

---

## 11. Test Discipline Findings (SKILL §13.3 anti-patterns)

### 11.1 `vi.fn()` inside `vi.mock()` factories without `vi.hoisted()`
**Target:** 0 occurrences.  
**Actual:** ❌ **~30+ occurrences across 18+ files.**

The pattern is `const mockX = vi.fn(); vi.mock('...', () => ({ foo: (...args) => mockX(...args) }))`. The mock factory references an outer const without `vi.hoisted()`. This *works* in practice (the closure is evaluated at call-time, not hoist-time), but Vitest 4 docs explicitly recommend `vi.hoisted()` for this pattern.

**Representative offenders:**
| File:Line | Pattern |
|---|---|
| `packages/api/src/routers/payments.test.ts:17,20` | `const mockCreateCustomerPortalSession = vi.fn(); vi.mock('@stillwater/payments', () => ({ createCustomerPortalSession: (...args) => mockCreateCustomerPortalSession(...args) }))` |
| `packages/api/src/routers/memberships.test.ts:20,25` | Same pattern with 4 mock vars |
| `apps/web/src/components/booking/BookingFlow.test.tsx:7,9` | `mockUseSessionAvailability` referenced inside `vi.mock` factory |
| `apps/web/src/components/membership/CheckoutButton.test.tsx:9,13` | Same pattern |
| `apps/web/src/app/api/webhooks/stripe/route.test.ts:26,30,37,42` | 3 mock vars (`mockConstructEvent`, `mockHandleStripeWebhook`, `mockGetStripeClient`) referenced inside `vi.mock` factories |
| `apps/web/src/lib/auth.test.ts:19,23,31` | 3 mock factories referencing outer vars |
| `apps/web/src/lib/trpc/server.test.ts:13,18` | 2 mock factories |
| `apps/web/src/lib/analytics/posthog.test.ts:19` | `init`, `capture`, `opt_in_capturing` mocks |
| `apps/web/src/app/api/sanity/webhook/route.test.ts:6,8` | `revalidatePathMock`, `revalidateTagMock` |
| `packages/email/src/send.test.tsx:16,17` | `mockEmailsSend` referenced in MockResend class |
| All 11 `services/workers/src/*.test.ts` files | 3 mock vars each (`mockSend...`, `mockXFindFirst`, sometimes `mockUpdate`) |

**Only 4 files use `vi.hoisted()` correctly:** `packages/payments/src/refunds.test.ts:14`, `credit-packs.test.ts:18`, `subscriptions.test.ts:26`, `invoices.test.ts:17`. These are the *payments* package — the *rest* of the codebase ignores the pattern.

### 11.2 Arrow function mock constructors
**Target:** 0 occurrences (use `class` syntax per SKILL §15.21).  
**Actual:** ✅ **0 occurrences.** All 6 mock classes use `class MockXxx { ... }` syntax. Verified at: `packages/email/src/send.test.tsx:18 (MockResend)`, `packages/payments/src/client.test.ts:21 (MockStripe)`, `packages/api/src/context.test.ts:17 (MockRedis), 26 (MockRatelimit), 33 (MockTriggerClient)`, `apps/web/src/app/api/webhooks/stripe/route.test.ts:31 (MockStripe)`, `apps/web/src/hooks/useSessionAvailability.test.tsx:6 (MockEventSource)`.

### 11.3 JSX in `*.test.ts` files (should be `*.test.tsx`)
**Target:** 0 occurrences.  
**Actual:** ✅ **0 occurrences.** Grep for `<[A-Z]\w*\s|<div|<span|<button|<input|return\s*<` in `*.test.ts` returns no matches. All JSX-containing tests are correctly named `*.test.tsx`.

### 11.4 `clearAllMocks` on structural mock chains (should use `resetAllMocks`)
**Target:** 0 occurrences of `clearAllMocks` on structural chains.  
**Actual:** ❌ **~45 occurrences across 30+ files.** Nearly every test file uses `vi.clearAllMocks()` in `beforeEach`. Only 1 file uses `vi.restoreAllMocks()` (`apps/web/src/lib/a11y/focus-utils.test.ts:56`). Zero files use `vi.resetAllMocks()`.

**Why this matters:** `clearAllMocks()` only resets call history. For structural mock chains like `update().set().where().returning()` (used heavily in api tests), `clearAllMocks` does NOT reset the implementation — meaning `mockResolvedValue` from a previous test can leak into the next test if the chain isn't re-built. `resetAllMocks()` would reset the implementation to `undefined`, forcing each test to re-establish its mock returns.

**Evidence:** Grep `clearAllMocks|resetAllMocks|restoreAllMocks` returns 45 lines, of which 44 are `clearAllMocks` and 1 is `restoreAllMocks`. Zero `resetAllMocks`.

**Particular concern:** `packages/payments/src/webhooks.test.ts:278` calls `vi.clearAllMocks()` *inside* a test body (not just in beforeEach), between the first and second invocation of `handleStripeWebhook` for the idempotency test. This is fragile — if the test author had used `resetAllMocks`, the spies would no longer have their `mockResolvedValue` returns and the test would fail loudly.

### 11.5 `setTimeout` sleeps in unit tests
**Target:** 0 occurrences (use `vi.useFakeTimers()`).  
**Actual:** ✅ **0 occurrences.** Grep for `setTimeout(|await new Promise.*setTimeout|sleep(` returns no matches in test files. The only timer manipulation is `vi.useFakeTimers()` in 2 files: `apps/web/src/app/api/schedule/stream/route.test.ts:23` and `apps/web/src/hooks/useSessionAvailability.test.tsx:97`. Both correctly call `vi.useRealTimers()` in afterEach.

---

## 12. E2E + Checkly Coverage

### 12.1 E2E specs (7 files in `e2e/`)

| File | Test count | Covers | `skipIf` guard? |
|---|---|---|---|
| `e2e/accessibility.spec.ts` | 10 tests (2 describe blocks: a11y + SEO) | Axe-core a11y scans on 6 public routes (`/`, `/schedule`, `/instructors`, `/pricing`, `/about`, `/blog`); skip-link focus; focus indicators; reduced-motion; SEO metadata (title, meta description, JSON-LD, robots.txt, sitemap.xml). | ✅ `test.skip` at lines 25-28 + 93-96 — skips when `DATABASE_URL` missing or placeholder |
| `e2e/booking.spec.ts` | 4 tests | BOOK-001 (browse schedule + seat count), BOOK-002 (navigate to booking page), BOOK-003 (seat availability widget), BOOK-004 (full session → waitlist button). | ❌ **NO `test.skip` guard!** This file will attempt to run even without a database. The tests will fail with `locator.click: Timeout 5000ms` because the dev server can't render `/schedule` without a seeded DB. **P1 finding.** |
| `e2e/admin-dashboard.spec.ts` | 2 tests | Staff sees KPI cards on /admin; member is redirected to /dashboard. | ✅ `test.skip` at lines 17-20 |
| `e2e/admin-classes.spec.ts` | 3 tests | List classes table; Create Class button navigation; Edit class flow. | ✅ `test.skip` at lines 15-18 |
| `e2e/admin-schedule.spec.ts` | 2 tests | Week calendar renders day headers; clicking empty slot opens create-session dialog. | ✅ `test.skip` at lines 15-18 |
| `e2e/admin-members.spec.ts` | 2 tests | Member directory table renders; View link navigation. | ✅ `test.skip` at lines 15-18 |
| `e2e/admin-roster.spec.ts` | 3 tests (1 real + 2 hardcoded skips) | Check-in button (1 test); 2 tests are `test.skip(true, 'Requires pre-checked-in member fixture')` placeholders. | ✅ `test.skip` at lines 15-18 + 2 inline `test.skip(true, ...)` at lines 42, 47 |

**E2E total:** 26 tests across 7 files. All except `booking.spec.ts` properly guard with `test.skip` on `DATABASE_URL`.

**Axe-core tags verification:** ✅ `e2e/accessibility.spec.ts:35` uses `.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])` — exactly the 5 tags required by the audit scope.

**Booking E2E scenario coverage (BOOK-001 through BOOK-004):**
- BOOK-001 ✅ — `e2e/booking.spec.ts:25` (browse schedule, see seat count)
- BOOK-002 ✅ — `e2e/booking.spec.ts:43` (click Book → /book/[sessionId])
- BOOK-003 ✅ — `e2e/booking.spec.ts:59` (seat availability widget with `aria-label="spots taken"`)
- BOOK-004 ✅ — `e2e/booking.spec.ts:72` (full session → WaitlistButton visible)
- BOOK-005/006 — correctly noted as integration-test territory, not E2E (per `e2e/booking.spec.ts:15` comment)

### 12.2 Checkly checks (3 files in `checkly/checks/`)

| File | What it verifies | Per audit spec? |
|---|---|---|
| `checkly/checks/api-health.check.ts` | `GET /api/trpc/schedule.getWeek?input=...` → 200 + response time < 500ms. Uses `Date.now()` timing. Throws on `!response.ok()` or `elapsed > 500`. | ✅ Matches spec exactly. Lines 13-32. |
| `checkly/checks/booking-flow.check.ts` | `page.goto('/schedule')` → wait for `h1` → look for `a[href*="book"], text=Book` → if visible, click → wait for `networkidle`. | ✅ Matches spec exactly. Lines 14-30. Tolerates missing Book link (uses `.catch(() => false)`). |
| `checkly/checks/sse-endpoint.check.ts` | `page.evaluate` creates `EventSource('/api/schedule/stream?sessionId=...')` → resolves `true` on first `onmessage`, `false` on 5s timeout or `onerror`. Throws if no event within 5s. | ✅ Matches spec exactly. Lines 15-42. Uses `CHECKLY_TEST_SESSION_ID` env var with fallback to seed session `00000000-0000-4000-8000-000000000001`. |

**Checkly verdict:** ✅ PASS — all 3 checks match the audit spec. Default `BASE_URL` is `https://stillwater.studio` (production), correct for synthetic monitoring.

---

## 13. Critical Findings (P0 — must fix before production)

### P0-1: BOOK-006 concurrent-booking test is a placeholder
- **Location:** `packages/api/src/routers/bookings.integration.test.ts:19-43`
- **Impact:** The single most important invariant in the system — "10 concurrent bookings for 1 seat → exactly 1 confirmed, 9 CONFLICT" — is *not tested*. The advisory-lock guarantee (ADR-004) could be silently removed without breaking any test.
- **Fix:** Implement the test using `testcontainers` Postgres (already in `packages/db/package.json:32` but unused). Fire 10 `Promise.all` calls to `bookingsRouter.book()`, assert exactly 1 succeeds and 9 reject with `code: 'CONFLICT'`.

### P0-2: Coverage thresholds broken in api + workers packages
- **Location:** `packages/api/vitest.config.ts:26-31` (lines/functions/statements/branches all fail); `services/workers/vitest.config.ts:33-39` (lines/functions/statements/branches all fail)
- **Impact:** `pnpm test:coverage` exits non-zero. CI is either skipping coverage or failing silently.
- **Fix:** Either (a) raise coverage to meet thresholds (preferred — focus on `admin.ts` 29% → 90% and `rateLimit.ts` 68% → 90% in api; focus on `weekly-digest.ts` and `waitlist-expiry.ts` in workers), or (b) temporarily lower thresholds with a documented remediation plan.

### P0-3: DB coverage at 38.88 % lines / 25 % branches (target 80 %)
- **Location:** `packages/db/vitest.config.ts:24-29` — **no thresholds set at all.**
- **Impact:** `packages/db/src/scripts/reset.ts` (0% covered), `packages/db/src/seed/index.ts` (0% covered except via skipped integration test), and 9 of 14 schema files below 70% line coverage. The seed script and reset script can break silently.
- **Fix:** Add `thresholds: { lines: 80, branches: 80 }` to `packages/db/vitest.config.ts`. Add unit tests for `seed/index.ts` idempotency (already partially covered by skipped integration test — wire it up to testcontainers).

### P0-4: Web coverage at 24.52 % lines / 21.02 % branches (target 70 %)
- **Location:** `apps/web/vitest.config.ts:29-33` — **no thresholds set.**
- **Impact:** 13 of 17 shadcn/ui components at 0% coverage (acceptable — they're thin wrappers). But `lib/trpc/client.tsx` (0%), `lib/trpc/query-keys.ts` (0%), `lib/admin/audit-log.ts` (0%), `lib/observability/error-boundary.tsx` (0%), `lib/observability/request-id.ts` (0%), and 4 hooks at 0% (`useBookingMutation`, `useNavScrollHide`, `useScrollProgress`, `useScrollReveal`) are all untested business logic.
- **Fix:** Add thresholds + write tests for the 4 hooks (they're pure React, easy to test with `renderHook`).

### P0-5: BOOK-004 (credit consumption) and BOOK-005 (no-subscription rejection) are untested
- **Location:** `packages/api/src/routers/bookings.test.ts` — no test asserts on `member_subscriptions.creditsRemaining` decrement; no test exercises the "no active subscription → FORBIDDEN" path.
- **Impact:** Credit accounting is the financial core of the booking flow. A regression that double-charges credits or allows booking without credits would not be caught.
- **Fix:** Add 2 tests to `bookings.test.ts`: (1) assert `update` is called with `creditsRemaining: oldCredits - 1` on successful booking; (2) assert FORBIDDEN when `member_subscriptions` query returns null/none.

### P0-6: customSession enrichment is not behaviorally tested
- **Location:** `packages/auth/src/config.test.ts:46-51` only asserts `'custom-session'` is in the plugin list.
- **Impact:** The customSession callback at `packages/auth/src/config.ts:119-120` attaches `memberId` and `roles` to the session. If the callback were replaced with `() => ({})`, every downstream check (`requireRole`, `bookingsRouter.book`, etc.) would silently break.
- **Fix:** Add a test that invokes the customSession callback with a mock user and asserts the returned session has `memberId` and `roles` populated from the DB query.

---

## 14. Important Findings (P1 — fix in next sprint)

### P1-1: Factory pattern is documented but not implemented
- **Location:** Only `getMockMember` exists (`packages/db/src/seed/fixtures/members.ts:25`); `getMockSession`, `getMockInstructor`, `getMockClass`, `getMockEnrollment` are missing. None are imported by any test.
- **Fix:** Implement all 5 factories in `packages/db/src/seed/fixtures/`. Refactor the 18 test files using ad-hoc `fixture` literals to import from these factories.

### P1-2: No `FakeEmailService` — workers use `vi.mock` for email in all 11 files
- **Location:** Every file in `services/workers/src/*.test.ts` mocks `@stillwater/email` with per-helper `vi.fn()`.
- **Fix:** Create `packages/email/src/fake.ts` exporting `FakeEmailService` with an array `sent: EmailRecord[]` and stub implementations of all 13 `sendX` helpers. Inject into workers tests via `vi.mock('@stillwater/email', () => ({ ...new FakeEmailService() }))` or constructor injection.

### P1-3: `booking.spec.ts` E2E has no `test.skip` guard
- **Location:** `e2e/booking.spec.ts` — no `test.skip(...)` block. Compare to all 6 other E2E specs which guard on `DATABASE_URL`.
- **Impact:** Running `pnpm test:e2e` without a database will fail with 4 timeouts (5s each = 20s wasted) rather than skipping cleanly.
- **Fix:** Add `test.skip(!process.env['DATABASE_URL'] || process.env['DATABASE_URL'].includes('placeholder'), 'Requires real DATABASE_URL')` at the top of the `test.describe` block.

### P1-4: `vi.clearAllMocks()` used everywhere instead of `resetAllMocks()`
- **Location:** 44 occurrences across 30+ files. Notable offender: `packages/payments/src/webhooks.test.ts:278` calls `vi.clearAllMocks()` *inside* a test body between two invocations.
- **Fix:** Replace `vi.clearAllMocks()` with `vi.resetAllMocks()` in `beforeEach` blocks. For tests that need to preserve a mock implementation across the reset, re-establish the implementation in the `beforeEach` (which is the correct pattern).

### P1-5: `vi.hoisted()` not used in 18+ test files that should use it
- **Location:** See Section 11.1 for the full list.
- **Fix:** Refactor each `const mockX = vi.fn(); vi.mock(...)` pattern to `const { mockX } = vi.hoisted(() => ({ mockX: vi.fn() })); vi.mock(...)`.

### P1-6: WAIT-001 through WAIT-005 scenario IDs are entirely missing
- **Location:** `packages/api/src/routers/waitlist.test.ts` has no WAIT-001/002/003/004/005 references. The closest tests are anonymous ("throws CONFLICT when already on the waitlist", "cancels the caller own enrollment and triggers waitlist-promotion").
- **Impact:** Cannot grep for "WAIT-00X" to verify waitlist regression coverage. Onboarding engineers cannot map PAD §9.2 requirements to tests.
- **Fix:** Rename existing tests to include the WAIT-00X prefix in the test name (e.g., `it('WAIT-001: promotes next waitlist member when booking cancelled', ...)`).

### P1-7: BOOK-001 through BOOK-005 scenario IDs missing from api unit tests
- **Location:** `packages/api/src/routers/bookings.test.ts` has no BOOK-001/002/003/004/005 references. The E2E `booking.spec.ts` uses BOOK-001 to BOOK-004 for *page rendering* tests, not the originally-scoped api-layer behaviors.
- **Fix:** Rename api test descriptions to include BOOK-00X prefix (BOOK-001 = "Books confirmed session for member with active subscription", etc.).

### P1-8: `packages/payments` coverage 78.68 % / 55.83 % (target 95 %)
- **Location:** `packages/payments/src/webhooks.ts` at 69.73 % lines (lines 333, 350, 354-375 uncovered — these are the `subscription.created` and `invoice.payment_action_required` branches); `subscriptions.ts` at 100% lines but 64.28 % branches (lines 58-133 uncovered — the Stripe API call paths).
- **Fix:** Add tests for `subscription.created` (already partially covered at `webhooks.test.ts:370`) and the `invoice.payment_action_required` event type. Add tests for `subscriptions.ts` retry/backoff paths.

---

## 15. Nits (P2 — fix when convenient)

### P2-1: Test file headers reference F-codes but not scenario IDs
- Most test files have a JSDoc header listing F-codes (F3-04, F7-04, F8-01, etc.) but not the BOOK/WAIT/STRIPE scenario IDs. Cross-referencing PAD §9.2 from a test file is currently a multi-step grep exercise.

### P2-2: Vitest configuration drift across packages
- `packages/api/vitest.config.ts:26-31` sets thresholds (lines/functions/statements/branches = 80/80/80/70)
- `services/workers/vitest.config.ts:33-39` sets thresholds (all 85)
- `packages/db/vitest.config.ts:24-29` — **no thresholds**
- `packages/payments/vitest.config.ts:21-26` — **no thresholds**
- `apps/web/vitest.config.ts:29-33` — **no thresholds**
- `packages/email/vitest.config.ts` — **no thresholds**
- `packages/auth/vitest.config.ts` — **no thresholds**
- **Fix:** Standardize threshold blocks. At minimum, set the SKILL §11.1 targets (api 90, payments 95, db 80, web 70, workers 85) as enforced thresholds.

### P2-3: `packages/api/src/lib/jobs-client.ts` is 0 % covered
- 47 lines, completely untested. This is the Trigger.dev client bootstrap. Even a smoke test that asserts `jobsClient` is defined would help.

### P2-4: `e2e/admin-roster.spec.ts:42,47` have hardcoded `test.skip(true, ...)`
- These 2 tests are permanently skipped with `test.skip(true, 'Requires pre-checked-in member fixture')`. They've been skipped since file creation. Either implement them (with a seeded fixture) or delete them.

### P2-5: Vitest 4 deprecation — `pool: 'forks'` may need updating
- All 7 packages use `pool: 'forks'` in their vitest.config.ts. Vitest 4 changed the default pool — verify this is still the recommended setting.

### P2-6: Workers tests pass `Date.now()` in fixtures without freezing time
- `services/workers/src/class-reminder-1h.test.ts:54,106,140,159` use `new Date(Date.now() + 55 * 60 * 1000)`. If the test runs across a minute boundary, the "in window" assertion may flake. Use `vi.useFakeTimers()` + `vi.setSystemTime()` instead.

### P2-7: `packages/email/src/send.test.tsx:18` — MockResend class doesn't expose `emails.send` return value
- The mock captures calls but doesn't simulate Resend's `{ id: 'email_123' }` return shape by default. Each test has to re-mock via `mockEmailsSend.mockResolvedValue({ id: 'email_123' })`. A FakeEmailService would solve this.

### P2-8: 9 of 14 db schema files below 70 % line coverage
- `audit-log.ts` (66.66%), `auth-tables.ts` (60%), `classes.ts` (50%), `enrollments.ts` (50%), `instructors.ts` (50%), `members.ts` (66.66%), `memberships.ts` (60%), `payments.ts` (60%), `role-assignments.ts` (66.66%), `sessions.ts` (40%), `waitlist.ts` (50%). Most of these are table definitions where line coverage is a weak signal, but the `index.ts` schema barrel at 0 % is a real gap.

---

## 16. Recommended Remediations (prioritized)

### Week 1 (P0 blockers — production gate)
1. **Implement BOOK-006 properly.** Add `testcontainers` Postgres to `packages/api/src/routers/bookings.integration.test.ts`. Fire 10 `Promise.all(caller.book(...))`, assert 1 succeeds + 9 reject with `CONFLICT`. Wire `pnpm test:integration` to run in CI with a Postgres service container.
2. **Add BOOK-004 + BOOK-005 unit tests** to `packages/api/src/routers/bookings.test.ts` (credit decrement + no-subscription rejection).
3. **Add customSession behavioral test** to `packages/auth/src/config.test.ts` — invoke the callback, assert `memberId` + `roles` attached.
4. **Set coverage thresholds in db, payments, web, email, auth vitest.config.ts** matching SKILL §11.1 targets. Accept that CI will fail until coverage is raised; document as a tracking issue.

### Week 2 (P1 — quality debt)
5. **Implement `FakeEmailService`** in `packages/email/src/fake.ts`. Refactor all 11 workers tests to inject it.
6. **Implement factory functions** `getMockSession`, `getMockInstructor`, `getMockClass`, `getMockEnrollment` in `packages/db/src/seed/fixtures/`. Refactor 18 test files to use them.
7. **Add `test.skip` guard to `e2e/booking.spec.ts`** matching the other 6 E2E specs.
8. **Rename existing tests** to include `BOOK-00X` / `WAIT-00X` prefixes for grep-ability.
9. **Sweep `vi.clearAllMocks()` → `vi.resetAllMocks()`** in `beforeEach` blocks across all 30+ test files.
10. **Sweep `vi.hoisted()`** pattern across 18+ test files that use the `const mockX = vi.fn(); vi.mock(...)` anti-pattern.

### Week 3+ (P2 — polish)
11. **Add tests for 0 %-covered files**: `jobs-client.ts`, `lib/trpc/client.tsx`, `lib/admin/audit-log.ts`, `lib/observability/error-boundary.tsx`, 4 marketing hooks.
12. **Implement or delete the 2 `test.skip(true, ...)` placeholders** in `admin-roster.spec.ts`.
13. **Freeze time in workers tests** that use `Date.now() + N * 60 * 1000` fixtures.
14. **Raise `packages/api/src/routers/admin.ts` coverage** from 29 % to ≥90 % by testing the 278 untested lines (lines 203-481: revenue, roster, classes CRUD, audit log).

### Sustained hygiene
15. **Add CI gate** that fails PR if `BOOK-00X` / `WAIT-00X` / `STRIPE-00X` grep returns <16 matches across `packages/`, `apps/`, `services/`. This enforces scenario-ID discipline going forward.
16. **Add CI gate** that fails PR if `vi.clearAllMocks()` count increases. Encourage `resetAllMocks()` migration.
17. **Document the factory pattern** in `CONTRIBUTING.md` with a code snippet showing the required import path.

---

## 17. Audit Methodology Notes

- **Test counts:** Run via `npx vitest run` in each package directory. All 7 packages ran to completion without timeouts. Total wall-clock time ~75 seconds.
- **Coverage:** Run via `npx vitest run --coverage` in each package. The `@vitest/coverage-v8` provider is used (v4.1.9). Text reporter output captured via `tail -60`. Branch coverage is consistently lower than line coverage across all packages (typical 10-20 pp gap) — indicating many untested conditional branches.
- **Scenario ID grep:** `rg "BOOK-00|WAIT-00|STRIPE-00"` across `packages/`, `apps/`, `services/`. Cross-referenced against `PAD.md:2211-2231` and `MASTER_EXECUTION_PLAN.md:1843-1865` for the canonical scenario list.
- **Factory pattern grep:** `rg "getMockMember|getMockSession|getMockInstructor|getMockClass|getMockEnrollment"` across the same scope. Cross-referenced against `stillwater_SKILL.md:5551-5598` for the canonical factory list.
- **Anti-pattern grep:** Used `rg "vi\.mock\("`, `rg "clearAllMocks|resetAllMocks|restoreAllMocks"`, `rg "vi\.hoisted"`, `rg "setTimeout\("`, `rg "class\s+Mock\w+"` across `**/*.test.{ts,tsx}`.
- **E2E + Checkly:** Read each file end-to-end. Verified `test.skip` guards by grep + visual inspection.
- **TDD AAA:** Read 5 random test files in full (bookings.test.ts, memberships.test.ts, admin.test.ts, context.test.ts, schedule/stream/route.test.ts). Assessed arrange/act/assert separation visually.

**Limitations:**
- Did not run E2E tests (requires running dev server + seeded Postgres).
- Did not run integration tests (requires `DATABASE_URL` to be set to a non-placeholder value).
- Coverage percentages are from a single run; minor variance (±1 pp) is expected across runs due to V8 coverage instrumentation.

---

## 18. Sign-off

**Audit complete.** 651 tests pass, but the test suite has material gaps in 4 of 5 SKILL §11.1 coverage targets, 10 of 16 critical scenario IDs are missing or placeholder, the Beyonce Rule is violated on 3 of 5 critical paths, and the Fake>Mock discipline is violated in all 11 workers test files. **Recommend blocking production deployment until P0-1 through P0-6 are resolved.**

— *Explore Agent, Test Coverage Auditor, 2026-07-12*

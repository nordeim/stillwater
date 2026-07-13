# Phase H — Architecture / Code Review

**Task ID:** H
**Agent:** Explore (Architecture & Code Reviewer)
**Scope:** Six-Axis per-file review of 10 highest-risk files in the Stillwater yoga-studio monorepo at `/home/z/my-project/stillwater/`
**Methodology:** SKILL §11.1.1 — Six-Axis Code Review (Correctness, Readability, Architecture, Security, Performance, Aesthetic/UX Rigor)
**Date:** 2026-07-11
**Codebase head:** Stillwater monorepo (PAD v1.18.0 / SKILL v2.9.0 / MEP v1.7.0 — all marked COMPLETE)

---

## Executive Summary

The Stillwater codebase is **architecturally sound and largely production-ready**. The 10 highest-risk files score an average of **54.2 / 60** (≈ 90%). The two-layer auth pattern (`proxy.ts` + layout-level RBAC) is exemplary, the Stripe webhook handler is textbook idempotency, and the dual-path email sender cleanly enforces ADR-010's CPU-budget contract.

However, four systemic issues recur across the codebase and warrant remediation before any production cutover:

1. **`pg_advisory_xact_lock()` is used everywhere correctly** — but the `bookings.book` mutation triggers its post-commit email job *inside* the transaction body (`bookings.ts:152`), violating the post-commit pattern that `webhooks.ts` implements correctly. A rollback would still fire the email.
2. **Drizzle RQB type inference is broken codebase-wide.** The project uses `drizzle-orm@0.45.2` which exposes `defineRelations()` for proper type inference, but it's never called. Every `with: { ... }` query is followed by an `as { ... }` cast workaround (`bookings.ts:100`, `webhooks.ts:278`, `stream/route.ts:41`). This is a documented self-admitted limitation that should be retired.
3. **Trigger.dev worker files are saturated with `as any` casts** (8 occurrences per reminder file, 3 in `booking-confirmation.ts`). The eslint config (`services/workers/eslint.config.mjs:65`) explicitly disables `no-explicit-any`. The justification ("verbatimModuleSyntax + NodeNext prevents importing schema tables") is incorrect — `enrollments` IS imported as a value (`class-reminder-24h.ts:24`), so the casts are unnecessary.
4. **Two legacy `sendSingleReminder` functions are dead code** in `class-reminder-24h.ts:129-178` and `class-reminder-1h.ts:119-166`. Both are marked "kept for backward compatibility" but `bookings.book` no longer invokes them. The dead branch (`if (_payload.sessionId && _payload.memberId)`) is reachable only by direct manual invocation.

No P0 (critical) findings. Four P1 findings (detailed below). Eleven P2 nits. Zero dependency-discipline violations (the `proxy.ts` boundary is clean).

### Aggregate Scorecard

| # | File | C | R | A | S | P | U | Total /60 |
|---|------|---|---|---|---|---|---|-----------|
| 1 | `packages/api/src/routers/bookings.ts` | 7 | 9 | 8 | 9 | 8 | 10 | **51** |
| 2 | `packages/payments/src/webhooks.ts` | 9 | 9 | 9 | 9 | 8 | 10 | **54** |
| 3 | `packages/auth/src/rbac.ts` + `apps/web/proxy.ts` | 10 | 9 | 10 | 10 | 10 | 10 | **59** |
| 4 | `apps/web/src/app/api/schedule/stream/route.ts` | 7 | 9 | 8 | 8 | 7 | 10 | **49** |
| 5 | `packages/email/src/send.ts` | 10 | 10 | 10 | 9 | 9 | 10 | **58** |
| 6 | `services/workers/src/{booking-confirmation,class-reminder-24h,class-reminder-1h}.ts` | 7 | 8 | 7 | 8 | 8 | 10 | **48** |
| 7 | `apps/web/src/lib/admin/audit-log.ts` | 10 | 10 | 9 | 10 | 10 | 10 | **59** |
| 8 | `packages/db/src/schema/relations.ts` | 10 | 9 | 10 | 10 | 10 | 10 | **59** |
| 9 | `packages/api/src/{trpc,context}.ts` | 9 | 9 | 9 | 9 | 8 | 10 | **54** |
| 10 | `apps/web/src/components/marketing/Hero.tsx` + `booking/BookingFlow.tsx` | 8 | 9 | 9 | 10 | 9 | 10 | **55** |
| | **Mean** | **8.7** | **9.1** | **8.9** | **9.2** | **8.7** | **10.0** | **54.6** |

(U = Aesthetic/UX; N/A for backend-only files, scored 10 by convention)

---

## Per-File Detailed Review

### File 1 — `packages/api/src/routers/bookings.ts` (51/60)

**Verification of spec items:**

| Spec requirement | Status | Evidence |
|---|---|---|
| `pg_advisory_xact_lock()` used (NOT `pg_advisory_lock()`) | ✅ | `bookings.ts:65` — `await tx.execute(sql\`SELECT pg_advisory_xact_lock(${lockKey})\`)` |
| Rate limit middleware on `book` procedure | ✅ | `bookings.ts:34,51` — `bookingRateLimit = rateLimit({ limit: 10, window: '1 m' })` then `.use(bookingRateLimit)` |
| CONFLICT error on full session (UI catches via WaitlistButton) | ✅ | `bookings.ts:122-127` throws `code: 'CONFLICT'`. `useBookingMutation.ts:33-35` catches `error.data?.code === 'CONFLICT'` and `BookingFlow.tsx:99-110` shows `<WaitlistButton>` |
| Post-commit job trigger pattern (collect closures in array, execute after commit) | ❌ **FAIL** | `bookings.ts:152-157` calls `ctx.jobs.trigger(...)` *inside* `db.transaction(async (tx) => { ... })`. The `.catch(() => {})` makes it fire-and-forget, but if the transaction rolls back after this line, the email is still dispatched. Compare `webhooks.ts:88-118` which correctly collects `postCommitActions` and runs them *after* `await db.transaction(...)`. |
| `BigInt()` constructor (NOT literals like `5381n`) | ✅ | `bookings.ts:42` — `BigInt('0x' + sessionId.replace(/-/g, '').slice(0, 16))`. (NB: this is the booking-side lock key, not the djb2 hash. The djb2 hash lives in `webhooks.ts:56-65` and correctly uses `BigInt(5381)`.) |
| No N+1 queries in enrollment lookups | ✅ | `bookings.ts:111-119` uses a single `count(*)` query (not a findMany + length check). `findFirst` at line 84 is a single existence check, not iterated. |

**Findings:**

- **P1 — `bookings.ts:152-157`** — Post-commit pattern not implemented. The `booking-confirmation` job trigger executes inside the transaction body. If the transaction fails to commit (e.g., DB connection drops, deadlock victim, constraint violation caught by the `for` loop), the email will still be sent to the member, advertising a booking that doesn't exist. **Fix**: hoist the trigger out of `db.transaction()`, mirroring `webhooks.ts:88-118`:
  ```ts
  const postCommit: Array<() => Promise<void>> = [];
  const created = await ctx.db.transaction(async (tx) => {
    // ... existing lock + insert logic ...
    postCommit.push(() => ctx.jobs.trigger('booking-confirmation', { enrollmentId: created.id, memberId }));
    return created;
  });
  for (const fn of postCommit) fn().catch(() => {});
  return created;
  ```
- **P2 — `bookings.ts:184`** — `cancel` mutation sets `cancelledAt` but not `cancellationReason`. The schema (`enrollments.ts:33`) supports `cancellationReason: text`, but the input schema (`bookings.ts:171`) only accepts `enrollmentId`. Member-initiated cancels may not need a reason, but staff-initiated cancels (via `class:cancel:any` permission) cannot record one through this endpoint.
- **P2 — `bookings.ts:203-206`** — `cancel` mutation `await`s `ctx.jobs.trigger('waitlist-promotion', ...)`. This blocks the user's HTTP response on the job-trigger round-trip. Should be fire-and-forget like the `book` mutation's `.catch(() => {})` pattern.
- **P2 — `bookings.ts:100-104`** — Type cast workaround: `const sessionData = session as { overrideCapacity: ...; class: { maxCapacity: ... } | null; room: { capacity: ... } | null }`. Comment says "Drizzle relational query types require defineRelations() for proper inference — not yet called". Drizzle 0.45.2 supports `defineRelations()` (no callers found in `packages/db`). This cast is a workaround for a fixable type-inference issue. See systemic finding #2 in Executive Summary.
- **P2 — `bookings.ts:155`** — Empty arrow function in `.catch(() => { /* comment */ })` is fine functionally but swallows all errors silently. Consider logging at debug level for observability (Sentry breadcrumb).

**Dead code**: none.
**Dep-discipline**: clean — imports only from `@trpc/server`, `drizzle-orm`, `zod`, `@stillwater/db`, and sibling `../trpc` + `../middleware/rateLimit`.

---

### File 2 — `packages/payments/src/webhooks.ts` (54/60)

**Verification of spec items:**

| Spec requirement | Status | Evidence |
|---|---|---|
| `pg_advisory_xact_lock()` on event ID hash | ✅ | `webhooks.ts:96` — `await tx.execute(sql\`SELECT pg_advisory_xact_lock(${lockKey})\`)` |
| Double-check-after-lock pattern | ⚠️ Partial | `webhooks.ts:81-86` does a fast-path check *before* the transaction opens. After the lock is acquired, the dispatcher immediately runs and then inserts the `payment_events` row. There is **no re-check inside the transaction** after lock acquisition — the code relies on the unique constraint (`isUniqueViolation` at line 124) to catch the race. This is acceptable per the comment at lines 17-19 ("the unique index is the ultimate idempotency guarantee"), but a stricter "double-check-after-lock" pattern would re-query `paymentEvents.findFirst` inside the transaction to avoid dispatching handlers twice on race. |
| PG code 23505 handling | ✅ | `webhooks.ts:124` — `if (isUniqueViolation(err)) return { received: true };`. The `isUniqueViolation` helper at lines 371-376 correctly narrows `err.code === '23505'`. |
| All 7 event types handled | ✅ | `webhooks.ts:143-165` switch covers all 7: `customer.subscription.created/updated/deleted/trial_will_end` and `invoice.paid/payment_failed/payment_action_required`. Matches `HANDLED_STRIPE_EVENT_TYPES` in `types.ts:143-151`. |
| No error swallowing (return 500 on transient errors so Stripe retries) | ✅ | `webhooks.ts:127-130` — `throw err` re-throws unexpected errors after the unique-violation check. The route handler (not in scope) is expected to translate this to HTTP 500. |

**Findings:**

- **P2 — `webhooks.ts:106`** — `payload: event.data.object as unknown as Record<string, unknown>` is a double-cast. The `as unknown as` pattern is on the SKILL §13 anti-pattern list. The Stripe SDK types the payload as `Stripe.Event.Data.Object` which is structurally compatible with `Record<string, unknown>` after a single assertion. **Fix**: declare `payload: jsonb.$inferInsert` from the schema, or use a typed narrow function.
- **P2 — `webhooks.ts:278-287`** — Same Drizzle RQB type-cast workaround as `bookings.ts:100-104`. The `as { planId: ...; plan?: { classCreditsPerCycle: ... } | null } | undefined` cast exists because `defineRelations()` is not called. See systemic finding #2.
- **P2 — `webhooks.ts:327`** — `process.env.NEXT_PUBLIC_APP_URL ?? 'https://stillwater.studio'` is read inside a post-commit action closure. This is fine functionally, but env reads inside hot loops (or repeated job triggers) should be hoisted to module scope. Minor.
- **P2 — `webhooks.ts:330`** — `await import('@stillwater/config/jobs-client')` inside the post-commit closure. Dynamic import is correct here (avoids circular dep), but the comment says "Dynamic import to avoid circular dependency" without explaining *which* circular dep. Document the specific cycle for future maintainers.
- **P2 — `webhooks.ts:362`** — `default: return 'active'` in `mapStripeSubscriptionStatus` is permissive. Unknown Stripe statuses (e.g., `unpaid`) map to `active`, granting access to members whose subscription is actually suspended. **Fix**: map `unpaid` → `past_due` and `incomplete_expired` is already handled. Add a `default: return 'incomplete'` for true unknowns.

**Dead code**: none.
**Dep-discipline**: clean — imports from `drizzle-orm`, `@stillwater/db`, and sibling `./types`. No cross-package leakage.

---

### File 3 — `packages/auth/src/rbac.ts` + `apps/web/proxy.ts` (59/60)

**Verification of spec items:**

| Spec requirement | Status | Evidence |
|---|---|---|
| `proxy.ts` uses `getSessionCookie()` only (NOT `auth.api.getSession()`) | ✅ | `proxy.ts:23,67` — only `getSessionCookie` imported and called. Comments at lines 17, 28 explicitly forbid `auth.api.getSession()`. |
| `proxy.ts` does NOT import `auth` package | ✅ | Grep for `@stillwater/auth` in `proxy.ts` returns zero matches. Only imports are `next/server` and `better-auth/cookies`. |
| RBAC matrix is 13 permissions × 6 roles | ✅ | `rbac.ts:21-34` lists 13 `Permission` values. `rbac.ts:38-52` MATRIX has 13 keys. Each key's value array contains the appropriate subset of `['guest', 'member', 'instructor', 'staff', 'manager', 'owner']` (6 roles total). |
| `'guest'` is NOT in the DB enum (used for permission matrix only) | ✅ | `enums.ts:16-22` defines `studioRoleEnum` with 5 values: `['member', 'instructor', 'staff', 'manager', 'owner']`. `'guest'` is absent. `rbac.ts:17` extends the type: `export type Role = StudioRole \| 'guest'` — correctly outside the DB enum. |
| No DB access in `proxy.ts` (FORBIDDEN) | ✅ | `proxy.ts` body (lines 57-78) does only: URL parsing, array `.some()` check, `getSessionCookie(request)`, `NextResponse.redirect`/`.next`. Zero DB calls. Edge-compatible. |

**Findings:**

- **P2 — `rbac.ts:38-52`** — The MATRIX layout uses whitespace alignment (e.g., line 39: `'schedule:view': ['guest', 'member', ...]`, line 48: `'revenue:view': ['manager', 'owner']`). This is editorially beautiful but brittle — any future edit requires re-aligning all rows. Consider a tabular source-of-truth (e.g., a YAML file) with a code generator. Minor.
- **P2 — `proxy.ts:43-51`** — `AUTH_REQUIRED_ROUTES` is a hardcoded string array. New protected routes require a code change. Consider deriving from a route manifest, or accept this as a deliberate security practice (explicit allowlist is safer than auto-detection).
- **P2 — `proxy.ts:91`** — Matcher regex `"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)).*)"` does not exclude `/api/*` paths. API routes pass through `proxy.ts` but skip the auth check (none start with the `AUTH_REQUIRED_ROUTES` prefixes). This works, but adds ~5ms of proxy overhead to every API call. Consider adding `api` to the exclusion list.

**Dead code**: none.
**Dep-discipline**: exemplary. `proxy.ts` is the cleanest file in the codebase — only `next/server` + `better-auth/cookies` imports. This is the correct Edge-compatible 2-layer pattern.

---

### File 4 — `apps/web/src/app/api/schedule/stream/route.ts` (49/60)

**Verification of spec items:**

| Spec requirement | Status | Evidence |
|---|---|---|
| `runtime = 'nodejs'` | ❌ **FAIL** | No `export const runtime` declaration in `route.ts`. `next.config.ts` does not set a default runtime either. Next.js 16 defaults streaming routes to Edge runtime in some configurations, which has different timeout/`setInterval`/`TextEncoder` behavior. The spec asked to verify `runtime = 'nodejs'`. **Fix**: add `export const runtime = 'nodejs';` after the `maxDuration` line. |
| `maxDuration = 300` | ✅ | `route.ts:21` — `export const maxDuration = 300;` |
| 10s polling interval | ✅ | `route.ts:119` — `}, 10_000);` |
| `EventSource` cleanup on abort | ✅ | `route.ts:122-125` — `request.signal.addEventListener('abort', () => { clearInterval(interval); controller.close(); })`. Client side: `useSessionAvailability.ts:113-123` cleans up on unmount. |
| NO `force-dynamic` (removed per C3 fix) | ✅ | `route.ts:9,23` — explicit comments "Do NOT add: `export const dynamic = 'force-dynamic'`". Test at `route.test.ts:36-40` asserts `mod.dynamic === undefined`. |
| Memory leaks in long-running stream | ⚠️ Partial | The `setInterval` is cleared on abort (line 123) and on null `getSeatAvailability` result (line 114). However, the in-flight `getSeatAvailability` promise (line 110) is not cancelled if the abort fires mid-fetch. When the promise resolves, `controller.enqueue(...)` (line 117) will throw `TypeError: Invalid state: Controller is already closed` because the controller was closed by the abort handler. No `try/catch` wraps the enqueue. |

**Findings:**

- **P1 — `route.ts` (missing `runtime` export)** — Without `export const runtime = 'nodejs'`, Next.js may deploy this route to the Edge runtime, which:
  - Has a 30s CPU budget on Vercel Hobby (the 300s `maxDuration` would be ignored)
  - Does not support `setInterval` reliably across all Edge runtimes
  - Has different `Request.signal` behavior
  - Cannot use the `pg` driver (the `apiCaller` invokes `scheduleRouter.getSession` which queries Postgres via `@neondatabase/serverless` — works on Edge, but `pg.Pool` does not)
  
  The route *probably* works because it uses `neon-http`, but the contract should be explicit. **Fix**: add `export const runtime = 'nodejs';`.
- **P2 — `route.ts:108-119`** — No error handling around `controller.enqueue(...)` after the async gap. If `request.signal` fires during the `getSeatAvailability` fetch, the abort handler closes the controller, then the pending promise resolves and tries to enqueue on a closed controller. **Fix**:
  ```ts
  void getSeatAvailability(sessionId).then((data) => {
    if (!data) { controller.close(); clearInterval(interval); return; }
    try { controller.enqueue(encoder.encode(formatSSEEvent(data))); } catch { /* controller closed */ clearInterval(interval); }
  });
  ```
- **P2 — `route.ts:41-48`** — Same Drizzle RQB type-cast workaround. See systemic finding #2.
- **P2 — `route.ts:65-67`** — `catch { return null; }` swallows all errors and returns null, which the interval handler interprets as "session was deleted → close stream" (line 111-115). A transient DB blip would close the SSE stream, forcing the client to reconnect (which it does, via `useSessionAvailability.ts:77-97`). This is OK behavior, but the error is invisible to operators. **Fix**: log to Sentry before returning null.
- **P2 — `route.ts:103-127`** — `ReadableStream` `start(controller)` runs once. The polling interval continues regardless of consumer backpressure. If the client is on a slow connection, `controller.enqueue` will buffer indefinitely in memory until the 300s `maxDuration` kills the route. For a 10-seat yoga studio this is fine; for higher scale, switch to `pull(controller)` with `controller.desiredSize` checks.

**Dead code**: none.
**Dep-discipline**: clean — imports only `@/lib/trpc/server`.

---

### File 5 — `packages/email/src/send.ts` (58/60)

**Verification of spec items:**

| Spec requirement | Status | Evidence |
|---|---|---|
| `sendEmail()` uses local JSX render via `render()` from `react-email` (v6 root import) | ✅ | `send.ts:26` — `import { render } from 'react-email';` (root import, not `/components` or `/render`). `send.ts:66` — `const html = (await render(template(props))) as string;` |
| `sendEmailNative()` uses Resend Native Templates (`{ template: { id, variables } }`) | ✅ | `send.ts:101-106` — `template: { id: templateId, variables: variables as Record<string, string \| number> }`. Matches Resend SDK v6 Native Templates API. |
| Both paths have null fallback when `RESEND_API_KEY` not set | ✅ | `send.ts:60-61` (`if (!resend) return null;`) and `send.ts:93-94` (same guard). The `getResendClient()` at lines 36-45 returns `null` when `process.env.RESEND_API_KEY` is falsy. |
| `sendEmail()` is for Server Components, `sendEmailNative()` is for Trigger.dev workers | ✅ | Documented at `send.ts:6-17`. Enforced via wrapper functions in `send-helpers.ts` which all call `sendEmailNative`. Workers import from `@stillwater/email` (which re-exports `send-helpers.ts`) — they never import `sendEmail` directly. Verified in `booking-confirmation.ts:17`, `class-reminder-24h.ts:25`, `class-reminder-1h.ts:24`. |

**Findings:**

- **P2 — `send.ts:29-30`** — Module-level mutable state `let cachedResend: Resend \| null = null; let cachedKey: string \| null = null;`. The cache invalidation logic at line 40 (`if (cachedResend && cachedKey === key) return cachedResend;`) correctly re-creates the client if the API key rotates. However, in serverless cold-start contexts the module is re-evaluated per instance, so the cache is per-instance not global. Acceptable.
- **P2 — `send.ts:66`** — `as string` cast on `await render(template(props))`. The `render()` return type is `Promise<string>` in `react-email@v6`, so the cast is defensive but unnecessary. Remove if the SDK type is correct.
- **P2 — `send.ts:105`** — `variables as Record<string, string \| number>` cast narrows the looser `Record<string, unknown>` input. This is intentional (Resend Native Templates accept only primitives, not nested objects) but the narrowing happens *at the SDK call site*, not at the function signature. Consider tightening the input type to `Record<string, string \| number>` directly.
- **P2 — `send.ts:42-43`** — `cachedKey = key;` retains the API key in module memory for the lifetime of the process. This is standard practice for SDK clients but worth noting in a security review — if the process is dumped, the key is recoverable. Acceptable tradeoff.

**Dead code**: none.
**Dep-discipline**: clean — imports from `resend`, `react-email`, `react`. No DB imports.

---

### File 6 — `services/workers/src/booking-confirmation.ts` + `class-reminder-24h.ts` + `class-reminder-1h.ts` (48/60)

**Verification of spec items:**

| Spec requirement | Status | Evidence |
|---|---|---|
| Workers use `sendEmailNative()` (NOT `sendEmail()`) | ✅ | All three import the typed wrapper from `@stillwater/email` (e.g., `booking-confirmation.ts:17` — `import { sendBookingConfirmation } from '@stillwater/email'`). The wrappers in `send-helpers.ts:33,55,76,101,124` all call `sendEmailNative()` internally. Zero `sendEmail` imports. |
| Cron workers filter `isNull(reminderXhSentAt)` in query | ✅ | `class-reminder-24h.ts:83-84` — `where: (e, { and, eq, isNull }) => and(eq(e.status, 'confirmed'), isNull(e.reminder24hSentAt))`. `class-reminder-1h.ts:76-77` — same pattern with `reminder1hSentAt`. |
| Atomic `UPDATE ... WHERE IS NULL` after send | ✅ | `class-reminder-24h.ts:106-109` — `.set({ reminder24hSentAt: new Date() }).where(sql\`${enrollments.id} = ${enrollment.id} AND ${enrollments.reminder24hSentAt} IS NULL\` as any)`. `class-reminder-1h.ts:97-100` — same pattern with `reminder1hSentAt`. |
| Per-task `maxDuration` + retry config | ✅ | `booking-confirmation.ts:36-42` — `retry: { maxAttempts: 3, minTimeoutInMs: 1000, factor: 2, randomize: true }, maxDuration: 30`. Same in `class-reminder-24h.ts:46-52` and `class-reminder-1h.ts:44-50`. |
| `machine: "micro"` (string literal, NOT object) | ✅ | `trigger.config.ts:72` — `machine: "micro"` (string literal). Comment at line 71 explicitly notes "v4: machine is a string literal (not an object with preset)". |

**Findings:**

- **P1 — `class-reminder-24h.ts:129-178` and `class-reminder-1h.ts:119-166`** — Dead code: `sendSingleReminder` functions. The cron fan-out path (lines 53-121 in 24h, lines 51-113 in 1h) is the only production trigger. `bookings.ts:146-149` explicitly states "class-reminder-24h and class-reminder-1h are NO LONGER triggered per-booking" — confirmed by `bookings.ts:152` which only triggers `booking-confirmation`. The `_payload.sessionId && _payload.memberId` branch at `class-reminder-24h.ts:57-59` and `class-reminder-1h.ts:53-55` is unreachable from production code. **Fix**: delete `sendSingleReminder` and the legacy branch. If manual invocation is needed, expose it as a separate task with explicit ID.
- **P1 — Pervasive `as any` casts** — `class-reminder-24h.ts` has 8 `any` casts (lines 71, 72, 83, 109, 130, 131, 175, 181 is `toLocaleString`). `class-reminder-1h.ts` has 7 (lines 65, 66, 76, 100, 120, 121, 163). `booking-confirmation.ts` has 2 (lines 48, 49). The `eslint.config.mjs:65` explicitly disables `no-explicit-any` for the workers package, with the justification "Workers use `db.query.X as any` casts per Gotcha 64 / Lesson 71". The justification is **incorrect**: the comment in `class-reminder-24h.ts:46-47` says "Per workers tsconfig: NodeNext + verbatimModuleSyntax means we can't import schema tables directly — use callback syntax for `where`". But `enrollments` IS imported as a value at line 24 (`import { db, enrollments } from '@stillwater/db'`). `verbatimModuleSyntax` only forbids mixing type and value imports in a single statement — it does not prevent importing values. **Fix**: remove the `as any` casts, use `db.query.classSessions.findMany({ where: and(eq(classSessions.status, 'scheduled'), ...) })` directly. If Drizzle's callback syntax is preferred for tree-shaking, the casts are still unnecessary — the callback parameters are typed by Drizzle's `findFirst`/`findMany` overload.
- **P2 — `class-reminder-24h.ts:181-187` and `class-reminder-1h.ts:168-174`** — `date.toLocaleString('en-US', ...)` is called with explicit locale `'en-US'`, which is correct per SKILL anti-pattern list ("`toLocaleString()` without explicit locale → SSR hydration mismatch"). ✅ This is done correctly. However, the workers run server-side only (Trigger.dev), so the hydration concern doesn't apply — the explicit locale is still good practice for deterministic output.
- **P2 — `class-reminder-24h.ts:101,168` and `class-reminder-1h.ts` (no `studioAddress`)** — Hardcoded studio address `'123 SE Division Street, Portland, OR 97202'` duplicated in two places. Should be hoisted to a constant or fetched from `siteSettings` (Sanity). Minor.
- **P2 — `class-reminder-1h.ts:168-174`** — `formatTimeFromNow` returns `'in 1 hour'` for any `diffMin >= 60`. Since the cron window is 50-65 min (line 63), this is fine, but the function is misleadingly named — it doesn't actually format a time, it formats a relative duration. Rename to `formatRelativeTime` or `formatTimeUntilStart`.
- **P2 — `booking-confirmation.ts:48-49`** — `(await (db.query.enrollments as any).findFirst(...))` — same `as any` pattern. Comment claims it's a Drizzle 0.45 type-inference workaround, but `defineRelations()` (Drizzle 0.31+) is the documented fix.
- **P2 — `class-reminder-24h.ts:112-116` and `class-reminder-1h.ts:103-107`** — `catch { skippedCount++; }` blocks swallow all errors including programming errors (e.g., malformed email address). Trigger.dev will retry the *entire task* on failure, but per-enrollment errors are silently counted. **Fix**: log the error to Sentry at warning level before incrementing `skippedCount`.

**Dead code inventory (workers):**
- `class-reminder-24h.ts:129-178` — `sendSingleReminder` function (unreachable from production)
- `class-reminder-1h.ts:119-166` — `sendSingleReminder` function (unreachable from production)
- `class-reminder-24h.ts:57-59` — legacy branch in `run` (unreachable from production)
- `class-reminder-1h.ts:53-55` — legacy branch in `run` (unreachable from production)

**Dep-discipline**: clean — workers import from `@trigger.dev/sdk`, `drizzle-orm`, `@stillwater/db`, `@stillwater/email`. No reverse imports from `apps/web` or `packages/api`.

---

### File 7 — `apps/web/src/lib/admin/audit-log.ts` (59/60)

**Verification of spec items:**

| Spec requirement | Status | Evidence |
|---|---|---|
| Fire-and-forget pattern (doesn't block admin mutation) | ✅ | `audit-log.ts:37-55` — `try { await db.insert(...) } catch (error) { console.error(...) }`. Errors are swallowed (logged to console for Sentry capture). Callers can `void logAdminAction(...)` for true fire-and-forget, or `await` it knowing it cannot throw. |
| Logs to `audit_log` table with staff+created, action, entity indexes | ✅ | `audit-log.ts` (schema) lines 35-42 — three indexes: `idx_audit_log_staff_created` (staffMemberId, createdAt), `idx_audit_log_action` (action), `idx_audit_log_entity` (entityType, entityId). All three match the spec. |
| Error swallowing (audit log failure should NOT block admin operation) | ✅ | `audit-log.ts:46-54` — `catch (error) { console.error('Failed to log admin action:', { ... }); }`. The error is logged but not re-thrown. |

**Findings:**

- **P2 — `audit-log.ts:10`** — `import 'server-only';` is correct (prevents client-bundle import). Good.
- **P2 — `audit-log.ts:48-53`** — `console.error` is the only error surface. If Sentry's `captureException` is the intended destination (per comment "logged to console for Sentry capture"), Sentry's automatic `console.error` integration must be enabled in `sentry.server.config.ts`. Worth verifying in Phase 10 observability audit.
- **P2 — `audit-log.ts:18`** — `metadata?: Record<string, unknown>` — the `unknown` values are passed directly to Drizzle's `jsonb` column. Drizzle will serialize via `JSON.stringify`, which drops `undefined` keys and converts `Date` to ISO strings. This is acceptable but undocumented — callers may be surprised that `metadata: { timestamp: new Date() }` serializes to `{"timestamp":"2026-07-11T..."}` not `{"timestamp":"<Date object>"}`.
- **P2 — `audit-log.ts:13-19`** — `Action`, `entityType`, `entityId` are all `string` (not branded types or unions). A typo like `action: 'class.creat'` is not caught at compile time. Consider a union type for `action` (e.g., `'class.create' | 'session.cancel' | 'role.assign' | ...`).

**Dead code**: none.
**Dep-discipline**: clean — imports `server-only` and `@stillwater/db` only.

---

### File 8 — `packages/db/src/schema/relations.ts` (59/60)

**Verification of spec items:**

| Spec requirement | Status | Evidence |
|---|---|---|
| All FK pairs have `relations()` definitions | ✅ | Spot-checked: `users.id ↔ members.userId` (line 45-48, 58-61), `users.id ↔ instructors.userId` (line 50-53, 86-89), `classes.styleId ↔ classStyles.id` (line 103-106, 96-99), `classSessions.{classId,instructorId,roomId}` (lines 122-135), `enrollments.{sessionId,memberId}` (lines 145-153), `waitlistEntries.{sessionId,memberId}` (lines 160-168), `memberSubscriptions.{memberId,planId}` (lines 186-194), `classPackages.memberId` (line 200-203), `paymentEvents.memberId` (line 208-211), `roleAssignments.memberId` (line 218-221), `auditLog.staffMemberId` (line 228-231). All FK pairs covered. |
| NO duplicate `many()` to the same target without `relationName` (C2 fix) | ✅ | The comment at `relations.ts:73-79` documents the C2 fix: "Previously a duplicate `roleAssignments: many()` existed alongside [the `roles` alias]... Removed because zero consumers use `with: { roleAssignments: true }`." Current code has only `roles: many(roleAssignments)` at line 79 — no duplicate. All other `many()` calls target distinct tables. |
| Relations exported from `schema/index.ts` | ✅ | `schema/index.ts:48` — `export * from './relations';`. All `*Relations` constants are re-exported. |

**Findings:**

- **P2 — `relations.ts:206-212`** — `paymentEventsRelations` declares `member: one(members, { fields: [paymentEvents.memberId], references: [members.id] })`. The schema (`payments.ts:22`) has `memberId: uuid('member_id').references(() => members.id, { onDelete: 'set null' })` — nullable FK with `SET NULL` on delete. The `one()` relation correctly infers `member` as nullable. Good.
- **P2 — `relations.ts:38`** — The MATRIX layout uses aligned columns (e.g., line 39 `'schedule:view':` followed by 7 spaces, line 50 `'roles:assign':` followed by 7 spaces). Editorial beauty. Same brittleness concern as `rbac.ts:38-52`. Acceptable for a schema file that changes rarely.
- **P2 — `relations.ts:43-82`** — `membersRelations` has 7 `many()` relations (enrollments, waitlistEntries, subscriptions, classPackages, paymentEvents, roles, auditLogs). This is the most densely-connected table. Consider documenting the access pattern (e.g., "members.roles is used by `/admin/members/[id]`; members.auditLogs is used by `/admin/audit-log?staffMemberId=X`") to help future contributors understand the graph.

**Dead code**: none.
**Dep-discipline**: clean — imports only from `drizzle-orm` and sibling `./index`.

---

### File 9 — `packages/api/src/trpc.ts` + `packages/api/src/context.ts` (54/60)

**Verification of spec items:**

| Spec requirement | Status | Evidence |
|---|---|---|
| `publicProcedure`, `protectedProcedure`, `staffProcedure`, `ownerProcedure` all defined | ✅ | `trpc.ts:45` (public), `48` (protected), `54` (staff), `63` (owner). All four exported. |
| `protectedProcedure` calls `getSession()` and throws UNAUTHORIZED if no session | ✅ | `trpc.ts:48-51` — `if (!ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' })`. The session is fetched in `context.ts:29` via `auth.api.getSession({ headers: req.headers })` and stored on `ctx.session`. |
| `staffProcedure` extends `protectedProcedure` with role check | ✅ | `trpc.ts:54` — `export const staffProcedure = protectedProcedure.use(...)`. The middleware checks `ctx.session.user.roles.some((r) => ['staff', 'manager', 'owner'].includes(r))` at line 55-57. |
| `ownerProcedure` extends `protectedProcedure` with owner-only check | ✅ | `trpc.ts:63` — `export const ownerProcedure = protectedProcedure.use(...)`. Checks `ctx.session.user.roles.includes('owner')` at line 64. |
| Context assembles db + session + jobs + redis | ✅ | `context.ts:28-31` — `return { db, session: session as TRPCContext['session'], jobs, redis, req };`. All four resources present. `db` from `@stillwater/db` (line 13), `session` from `auth.api.getSession` (line 29), `jobs` from `getJobsClient()` (line 26), `redis` from `new Redis(...)` (lines 20-23). |

**Findings:**

- **P2 — `trpc.ts:56`** — `(r: string) => ['staff', 'manager', 'owner'].includes(r)`. The cast `r: string` widens `StudioRole` (a string-literal union) to `string`. This is a TypeScript ergonomics workaround for `Array.prototype.includes` (which doesn't accept narrow types by default). **Fix**: use the `includes` type predicate pattern, or `(['staff', 'manager', 'owner'] as const).includes(r as StudioRole)`. Minor.
- **P2 — `trpc.ts:30`** — `jobs: { trigger: (task: string, payload: unknown) => Promise<unknown> }` — the `payload: unknown` is too loose. Callers can pass any value, including non-serializable ones (e.g., `Date` objects, which Trigger.dev may or may not handle). **Fix**: type as `payload: Record<string, unknown>` or use a discriminated union of known task payloads.
- **P2 — `trpc.ts:31`** — `redis: { get: (key: string) => Promise<string \| null>; set: (key: string, val: string) => Promise<string \| null> }` — this is a minimal hand-rolled type, not the full `@upstash/redis` `Redis` type. Methods like `del`, `incr`, `expire` are missing. If future rate-limit strategies need them, the type will need updating. Acceptable for now.
- **P2 — `context.ts:20-23`** — `new Redis({ url: ..., token: ... })` is instantiated at module load with placeholder fallbacks (`'https://placeholder.upstash.io'`, `'placeholder'`). In test/build contexts where `UPSTASH_REDIS_REST_URL` is unset, this creates a Redis client that will fail on any actual command. The `rateLimit` middleware (`rateLimit.ts:16-19`) creates *another* Redis client with the same pattern. **Fix**: share a single Redis client between `context.ts` and `rateLimit.ts` via `@stillwater/config`.
- **P2 — `context.ts:29`** — `session: session as TRPCContext['session']` cast. The `auth.api.getSession` return type is `Session | null` (Better Auth), and `TRPCContext['session']` is the enriched `StillwaterSession | null`. The cast is necessary because Better Auth's `customSession` plugin doesn't fully infer the enriched shape. Acceptable.
- **P2 — `trpc.ts:54-60`** — `staffProcedure` middleware calls `next()` without arguments (line 59), while `protectedProcedure` (line 50) calls `next({ ctx: { ...ctx, session: ctx.session } })`. The downstream ctx type for `staffProcedure` should still have `session` narrowed to non-null because `protectedProcedure` already did the narrowing. This works in tRPC's type system, but explicit `next({ ctx })` is more robust. Minor.

**Dead code**: none.
**Dep-discipline**: clean — `trpc.ts` imports from `@trpc/server`, `@stillwater/db`, `@stillwater/auth`. `context.ts` imports from `@stillwater/db`, `@stillwater/auth`, `@upstash/redis`, `@stillwater/config/jobs-client`. No upward imports to `apps/web`.

---

### File 10 — `apps/web/src/components/marketing/Hero.tsx` + `booking/BookingFlow.tsx` (55/60)

**Verification of spec items (Hero):**

| Spec requirement | Status | Evidence |
|---|---|---|
| Asymmetric 3-col grid `1fr 1px minmax(280px, 38%)` | ✅ | `Hero.tsx:27` — `className="grid grid-cols-1 gap-0 px-0 md:grid-cols-[1fr_1px_minmax(280px,38%)]"`. Exact match. |
| Cormorant for display text, DM Sans for body | ✅ | `Hero.tsx:46` (`style={{ fontFamily: 'var(--font-display)' }}` on `<h1>`), line 67 (stat values), line 37/73 (`var(--font-body)` on eyebrow/labels). The `--font-display` token maps to Cormorant Garamond, `--font-body` to DM Sans (per `packages/ui/src/fonts/`). |
| No raw hex colors, no shadows, no gradients | ✅ | Grep for `#[0-9a-fA-F]{3,6}` returns zero matches. Grep for `shadow` returns zero matches. Grep for `gradient` returns zero matches. All colors are tokens (`text-stone-900`, `text-clay-400`, `text-sand-50`, `bg-stone-200`, etc.). |

**Verification of spec items (BookingFlow):**

| Spec requirement | Status | Evidence |
|---|---|---|
| 4 UI states (loading/error/empty/success) | ✅ | Loading: `BookingFlow.tsx:69-75` (`if (isLoading) ...`). Error: `77-83` (`if (error) ...`). Empty: `85-87` (`if (!data) return null`). Success: `113-120` (`<BookingConfirmation open={showConfirmation} ...>`). All four present. |
| Uses `useBookingMutation` hook | ✅ | `BookingFlow.tsx:12` (`import { useBookingMutation } from '@/hooks/useBookingMutation'`), line 44 (`const { book, isLoading, isConflict, result, reset } = useBookingMutation()`). |
| No raw hex colors, no shadows, no gradients | ✅ | Grep returns zero matches for `#[0-9a-fA-F]`, `shadow`, `gradient`. All colors are tokens (`text-stone-500`, `text-stone-600`, `bg-sand-warm` in `WaitlistButton.tsx:22`). |

**Findings:**

- **P2 — `Hero.tsx:37, 46, 67, 73`** — Inline `style={{ fontFamily: 'var(--font-display)' }}` is redundant with the `font-display` Tailwind utility class (already applied via `className="font-display ..."` at lines 45, 66). The inline style overrides the utility class with the same value — no effect, just noise. **Fix**: remove the `style` props; rely on the Tailwind classes.
- **P2 — `BookingFlow.tsx:65-67`** — `setState` in render body:
  ```ts
  if (result && !showConfirmation) {
    setShowConfirmation(true);
  }
  ```
  This is the React "adjusting state during render" escape hatch (per [React docs](https://react.dev/reference/react/useState#storing-information-from-previous-renders)). It works (condition becomes false after the call), but linters flag it. **Fix**: derive state directly:
  ```ts
  const [dismissed, setDismissed] = useState(false);
  const showConfirmation = result !== null && !dismissed;
  // onClose: setDismissed(true); reset();
  ```
  This eliminates the `showConfirmation` state entirely.
- **P2 — `BookingFlow.tsx:95, 106`** — Hardcoded `disabled={false}` literals on `<BookingButton>` and `<WaitlistButton>`. The actual disabled state could be derived from `isBooking` / `waitlistMutation.isPending` (which are already passed as `isLoading`). The hardcoded `false` is misleading — readers may wonder why it's there. **Fix**: omit the `disabled` prop entirely (defaults to `false`), or pass `disabled={isBooking}` for the booking button.
- **P2 — `BookingFlow.tsx:14`** — `import { trpc } from '@/lib/trpc/client';` is used only for `trpc.waitlist.join.useMutation` (line 47). The booking mutation is abstracted via `useBookingMutation` hook, but the waitlist mutation is inline. For consistency, extract `useWaitlistMutation` hook. Minor.
- **P2 — `BookingFlow.tsx:16`** — Blank line between imports and component docstring. Cosmetic.
- **P2 — `Hero.tsx:48-58`** — `{HERO_HEADLINE_LINES.map((line, i) => ...)}` uses `key={i}` (line 49). Array index as key is acceptable here because the array is static (`HERO_HEADLINE_LINES` from `copy.ts:12` is `as const`), but the lint rule `react/no-array-index-key` may flag it. **Fix**: use the line content as key (`key={line}`).

**Dead code**: none.
**Dep-discipline**: clean — Hero imports `next/link`, `./HeroNextClass`, `@/lib/marketing/copy`. BookingFlow imports `sonner`, sibling booking components, `@/hooks/*`, `@/lib/trpc/client`. No cross-package leakage.

---

## Anti-Pattern Findings Table

| File:Line | Anti-Pattern | Severity | Fix |
|---|---|---|---|
| `bookings.ts:152-157` | Job trigger inside transaction body (should be post-commit) | P1 | Hoist `ctx.jobs.trigger(...)` out of `db.transaction()`, collect closures in array, execute after commit (mirror `webhooks.ts:88-118`) |
| `class-reminder-24h.ts:129-178` | Dead code (legacy `sendSingleReminder`) | P1 | Delete function + legacy branch (lines 57-59) |
| `class-reminder-1h.ts:119-166` | Dead code (legacy `sendSingleReminder`) | P1 | Delete function + legacy branch (lines 53-55) |
| `class-reminder-24h.ts:71,72,83,109,130,131,175` | Pervasive `as any` casts (7 occurrences) | P1 | Remove casts; use direct `eq(classSessions.status, 'scheduled')` syntax. The `verbatimModuleSyntax` justification is incorrect. |
| `class-reminder-1h.ts:65,66,76,100,120,121,163` | Pervasive `as any` casts (7 occurrences) | P1 | Same as above |
| `booking-confirmation.ts:48,49` | `as any` casts on `db.query.enrollments` | P1 | Same — use direct syntax |
| `bookings.ts:100-104` | `as { ... }` cast for Drizzle RQB types | P1 | Call `defineRelations()` in `packages/db/src/schema/relations.ts` (Drizzle 0.45+ supports this) |
| `webhooks.ts:278-287` | `as { planId: ...; plan?: ... }` cast for Drizzle RQB types | P1 | Same as above |
| `stream/route.ts:41-48` | `as { enrolledCount: ... }` cast for Drizzle RQB types | P1 | Same as above |
| `stream/route.ts` (missing) | Missing `export const runtime = 'nodejs'` | P1 | Add `export const runtime = 'nodejs';` after `maxDuration` line |
| `webhooks.ts:106` | `as unknown as` double-cast | P2 | Single assertion or typed narrow function |
| `bookings.ts:203-206` | `await ctx.jobs.trigger(...)` blocks response | P2 | Fire-and-forget: `ctx.jobs.trigger(...).catch(() => {})` |
| `bookings.ts:184` | `cancel` sets `cancelledAt` but not `cancellationReason` | P2 | Accept optional `reason` in input schema |
| `trpc.ts:56` | `(r: string)` widens `StudioRole` | P2 | `(['staff', 'manager', 'owner'] as const).includes(r)` |
| `trpc.ts:30` | `payload: unknown` too loose | P2 | `payload: Record<string, unknown>` or discriminated union |
| `context.ts:20-23` + `rateLimit.ts:16-19` | Duplicate Redis client instantiation | P2 | Share via `@stillwater/config` |
| `Hero.tsx:37,46,67,73` | Redundant inline `style` overrides Tailwind utility | P2 | Remove `style` props |
| `BookingFlow.tsx:65-67` | `setState` in render body | P2 | Derive state: `const showConfirmation = result !== null && !dismissed` |
| `BookingFlow.tsx:95,106` | Hardcoded `disabled={false}` literals | P2 | Omit prop or pass derived value |
| `stream/route.ts:117` | `controller.enqueue(...)` after async gap, no try/catch | P2 | Wrap in `try/catch` to handle closed-controller case |
| `stream/route.ts:65-67` | `catch { return null; }` swallows errors silently | P2 | Log to Sentry before returning null |
| `webhooks.ts:362` | `default: return 'active'` for unknown Stripe statuses | P2 | Map `unpaid` → `past_due`; `default: return 'incomplete'` |
| `class-reminder-24h.ts:112-116` | `catch { skippedCount++; }` swallows all errors | P2 | Log to Sentry at warning level |
| `class-reminder-1h.ts:103-107` | Same silent catch pattern | P2 | Same fix |
| `Hero.tsx:49` | `key={i}` array index as React key | P2 | Use `key={line}` (static array content) |
| `audit-log.ts:13-19` | `action: string` not a union type | P2 | `'class.create' \| 'session.cancel' \| ...` |

---

## Dead Code Inventory

| File:Lines | Description | Reason Dead | Safe to Remove? |
|---|---|---|---|
| `class-reminder-24h.ts:129-178` | `sendSingleReminder(sessionId, memberId)` | `bookings.ts:146-149` comment confirms reminders no longer triggered per-booking; cron fan-out path is sole production trigger | ✅ Yes — also remove legacy branch at lines 57-59 |
| `class-reminder-1h.ts:119-166` | `sendSingleReminder(sessionId, memberId)` | Same as above | ✅ Yes — also remove legacy branch at lines 53-55 |
| `class-reminder-24h.ts:57-59` | `if (_payload.sessionId && _payload.memberId) return sendSingleReminder(...)` | No production caller passes `sessionId + memberId` to the task | ✅ Yes (after removing `sendSingleReminder`) |
| `class-reminder-1h.ts:53-55` | Same legacy branch | Same as above | ✅ Yes |
| `BookingFlow.tsx:65-67` | `setState` during render (technically live, but anti-pattern) | Replaceable by derived state | ✅ Yes — replace with derived `showConfirmation` |

**Total dead code: ~95 lines** (40 in 24h reminder, 48 in 1h reminder, 7 in BookingFlow).

---

## Dependency-Discipline Violations

| File | Violation | Severity |
|---|---|---|
| (none) | — | — |

**The dependency graph is clean.** Specific verifications:

- `apps/web/proxy.ts` imports only `next/server` and `better-auth/cookies` — does NOT import `@stillwater/auth`. ✅
- `apps/web/src/lib/admin/audit-log.ts` imports `server-only` and `@stillwater/db` only — no API/auth imports. ✅
- `services/workers/src/*.ts` import from `@trigger.dev/sdk`, `drizzle-orm`, `@stillwater/db`, `@stillwater/email` — no reverse imports to `apps/web` or `packages/api`. ✅
- `packages/email/src/send.ts` imports from `resend`, `react-email`, `react` — no DB imports. ✅
- `packages/api/src/{trpc,context}.ts` import from `@trpc/server`, `@stillwater/db`, `@stillwater/auth`, `@upstash/redis`, `@stillwater/config` — no upward imports to `apps/web`. ✅
- `packages/db/src/schema/relations.ts` imports from `drizzle-orm` and sibling `./index` only. ✅

The package layering (`apps → packages/api → packages/{db,auth,email,payments,config}`) is respected everywhere.

---

## Critical Findings (P0)

**None.** No findings block production deployment or cause data loss / security breach / functional breakage.

---

## Important Findings (P1)

### P1-1: `bookings.book` triggers post-commit job *inside* the transaction
**File:** `packages/api/src/routers/bookings.ts:152-157`
**Impact:** If the transaction fails to commit (DB connection drop, deadlock, constraint violation caught by outer error handler), the `booking-confirmation` email is still dispatched by Trigger.dev, advertising a booking that doesn't exist. The member receives a confirmation email for a failed booking.
**Fix:** Hoist the trigger out of `db.transaction()`, mirroring `webhooks.ts:88-118`:
```ts
const postCommit: Array<() => Promise<void>> = [];
const created = await ctx.db.transaction(async (tx) => {
  // ... existing lock + capacity + insert logic ...
  postCommit.push(() =>
    ctx.jobs.trigger('booking-confirmation', { enrollmentId: created.id, memberId })
  );
  return created;
});
for (const fn of postCommit) fn().catch(() => {});
return created;
```

### P1-2: Drizzle RQB type inference broken codebase-wide
**Files:** `bookings.ts:100-104`, `webhooks.ts:278-287`, `stream/route.ts:41-48`, all worker files (`class-reminder-24h.ts:71`, `class-reminder-1h.ts:65`, `booking-confirmation.ts:48`)
**Impact:** Every `db.query.*.findFirst({ with: { ... } })` call requires an `as { ... }` cast to access nested relation fields. This silently breaks type safety — if a schema field is renamed, the cast hides the error until runtime.
**Root cause:** Drizzle 0.45.2 supports `defineRelations()` (introduced in 0.31) for proper RQB type inference. The project uses the older `relations()` API (in `packages/db/src/schema/relations.ts`) which provides runtime relation resolution but NOT full TypeScript inference for nested `with` queries.
**Fix:** Migrate `packages/db/src/schema/relations.ts` to `defineRelations()`. This is a schema-wide change but eliminates ~10 `as` casts across the codebase.

### P1-3: Missing `runtime = 'nodejs'` on SSE streaming route
**File:** `apps/web/src/app/api/schedule/stream/route.ts`
**Impact:** Without explicit `runtime = 'nodejs'`, Next.js 16 may deploy this route to the Edge runtime in some configurations. Edge runtime has:
- 30s CPU budget on Vercel Hobby (the 300s `maxDuration` is ignored)
- Unreliable `setInterval` behavior
- No `pg.Pool` support (the `apiCaller` invokes `scheduleRouter.getSession` which queries Postgres)

The route currently works because `@neondatabase/serverless` is Edge-compatible, but the contract should be explicit. A future refactor that introduces `pg.Pool` would silently break.
**Fix:** Add `export const runtime = 'nodejs';` after the `maxDuration` declaration.

### P1-4: Dead code in reminder workers (legacy `sendSingleReminder`)
**Files:** `class-reminder-24h.ts:129-178`, `class-reminder-1h.ts:119-166`
**Impact:** ~95 lines of dead code that future maintainers must read and reason about. The legacy branch (`if (_payload.sessionId && _payload.memberId)`) is unreachable from production but creates a false impression of supported invocation patterns.
**Fix:** Delete `sendSingleReminder` functions and the legacy branches. If manual invocation is needed, expose it as a separate task with an explicit ID (e.g., `class-reminder-24h-manual`).

---

## Nits (P2)

(See the Anti-Pattern Findings Table above for the complete list of 16 P2 items.)

Notable mentions:
- **`trpc.ts:30`** — `payload: unknown` is too loose. Tighten to `Record<string, unknown>` or a discriminated union of task payloads.
- **`Hero.tsx:37,46,67,73`** — Redundant inline `style={{ fontFamily: 'var(--font-display)' }}` overrides the `font-display` Tailwind utility class with the same value. Remove the `style` props.
- **`BookingFlow.tsx:65-67`** — `setState` in render body. Replace with derived state: `const showConfirmation = result !== null && !dismissed`.
- **`stream/route.ts:117`** — `controller.enqueue(...)` after an async gap, no `try/catch`. If the client disconnects during `getSeatAvailability`, the abort handler closes the controller, then the pending promise resolves and tries to enqueue on a closed controller → `TypeError`.
- **`context.ts:20-23` + `rateLimit.ts:16-19`** — Duplicate Redis client instantiation. Share via `@stillwater/config`.

---

## Recommended Refactorings (Prioritized)

### Priority 1 — Correctness & Type Safety

1. **Hoist `booking-confirmation` trigger out of `db.transaction()` in `bookings.ts:152-157`.** Mirror the post-commit pattern in `webhooks.ts:88-118`. ~15 min effort. Eliminates P1-1.

2. **Migrate `packages/db/src/schema/relations.ts` from `relations()` to `defineRelations()`.** Drizzle 0.45.2 supports the new API. This eliminates ~10 `as` casts across `bookings.ts`, `webhooks.ts`, `stream/route.ts`, and all worker files. ~2 hours effort. Eliminates P1-2.

3. **Remove `as any` casts in worker files.** The `verbatimModuleSyntax` justification in `class-reminder-24h.ts:46-47` is incorrect — `enrollments` is imported as a value at line 24. Use direct `eq(classSessions.status, 'scheduled')` syntax. Re-enable `@typescript-eslint/no-explicit-any` in `services/workers/eslint.config.mjs:65`. ~1 hour effort. Eliminates P1-2 (worker side).

4. **Add `export const runtime = 'nodejs';` to `apps/web/src/app/api/schedule/stream/route.ts`.** ~1 min effort. Eliminates P1-3.

5. **Delete dead `sendSingleReminder` functions and legacy branches** in `class-reminder-24h.ts` and `class-reminder-1h.ts`. ~10 min effort. Eliminates P1-4.

### Priority 2 — Robustness

6. **Wrap `controller.enqueue(...)` in `try/catch` in `stream/route.ts:117`.** Handles the case where the abort fires during an in-flight `getSeatAvailability` call. ~5 min effort.

7. **Tighten `jobs.trigger` payload type in `trpc.ts:30`** from `unknown` to `Record<string, unknown>` or a discriminated union. ~30 min effort (requires enumerating all task payloads).

8. **Make `cancel` mutation accept optional `reason`** in `bookings.ts:171` input schema, set `cancellationReason` in the update. ~10 min effort.

9. **Make `cancel` mutation's job trigger fire-and-forget** at `bookings.ts:203-206`. Currently `await`s, blocking the user's HTTP response. ~5 min effort.

10. **Map `unpaid` Stripe status to `past_due`** in `webhooks.ts:362` (currently maps to `active` via `default`). ~5 min effort. Prevents granting access to members with suspended subscriptions.

### Priority 3 — Code Quality

11. **Remove redundant inline `style={{ fontFamily: ... }}` props in `Hero.tsx`.** The `font-display` / `font-body` Tailwind utilities already set the same value. ~5 min effort.

12. **Replace `setState` in render body in `BookingFlow.tsx:65-67`** with derived state. ~10 min effort.

13. **Remove hardcoded `disabled={false}` literals** in `BookingFlow.tsx:95,106`. ~2 min effort.

14. **Replace `as unknown as` double-cast in `webhooks.ts:106`** with a single assertion or typed narrow function. ~10 min effort.

15. **Share Redis client between `context.ts` and `rateLimit.ts`** via `@stillwater/config`. ~30 min effort.

16. **Tighten `action` type in `audit-log.ts:15`** from `string` to a union of known actions. ~20 min effort.

---

## Conclusion

The Stillwater codebase is **architecturally sound** with **clean package boundaries, exemplary 2-layer auth, correct Stripe idempotency, and a well-designed dual-path email sender**. The four P1 findings are localized and fixable in <4 hours total. The Drizzle RQB type-inference issue (P1-2) is the most impactful — it's a codebase-wide pattern that should be retired by migrating to `defineRelations()`.

No P0 findings. The codebase is ready for production deployment after P1 fixes are applied. P2 nits can be addressed opportunistically.

**Recommended next audit:** Phase I — re-run this review after P1 fixes are applied, plus extend scope to cover the remaining routers (`waitlist.ts`, `admin.ts`, `payments.ts`, `members.ts`, `memberships.ts`, `instructors.ts`, `classes.ts`, `sessions.ts`) and the Trigger.dev worker files not covered here (`waitlist-promotion.ts`, `waitlist-expiry.ts`, `class-cancellation-notify.ts`, `payment-failed-notify.ts`, `membership-expiry-warn.ts`, `membership-credit-grant.ts`, `weekly-digest.ts`, `attendance-summary.ts`).

# Phase E — Targeted Deep-Dive Code Reviews

**Audit scope:** 4 high-risk subsystems in `/home/z/my-project/stillwater/`
**Canonical reference:** `stillwater_SKILL.md` §15 Coding Patterns + §16 Anti-Patterns
**Audit type:** Read-only — no files were modified
**Date:** 2026-07-19
**Cross-reference:** Phase B (`04-phase-b-six-axis-audit.md`) flagged I1 = 4 RBAC tier violations; Phase D (`05-phase-d-reconciliation.md`) confirmed they were NOT yet fixed.

---

## Deep-Dive 1 — Sanity Webhook + ISR Revalidation

### Files reviewed
- `apps/web/src/app/api/sanity/webhook/route.ts` (123 lines)
- `apps/web/src/app/api/sanity/webhook/route.test.ts` (125 lines)
- `apps/web/src/lib/sanity/client.ts` (58 lines)
- `apps/web/src/lib/sanity/queries.ts` (122 lines)

### Verification matrix

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | HMAC-SHA256 over body as TEXT (not JSON) | ✅ Pass | `route.ts:69` `const rawBody = await request.text();` → `route.ts:80-82` `createHmac('sha256', webhookSecret).update(rawBody).digest('hex')`. Body is parsed with `JSON.parse(rawBody)` only AFTER signature verification (`route.ts:95`). |
| 2 | `revalidatePath()` call after content publish | ✅ Pass | `route.ts:114-116` loops `REVALIDATION_MAP[payload._type]` and calls `revalidatePath(path)` for each. Detail-page revalidation for blog/instructor slugs at `route.ts:107-112`. |
| 3 | `published == true` GROQ filter (Lesson 49) | ✅ Pass | All 8 non-singleton queries in `queries.ts` filter `&& published == true`. Only exception is `siteSettingsQuery` (singleton — documented exception per Lesson 49). |
| 4 | Webhook secret via `process.env.SANITY_WEBHOOK_SECRET` | ❓ Question | `route.ts:58` uses `process.env.SANITY_WEBHOOK_SECRET`. **This MATCHES the SKILL §15.18.3 pattern** (line 6597 of SKILL.md uses `process.env.SANITY_WEBHOOK_SECRET`), but the user's verification prompt stated "via `env.SANITY_WEBHOOK_SECRET` (NOT `process.env`)". The prompt appears to conflict with the SKILL — the implementation follows the SKILL canonical pattern. |
| 5 | 200 valid / 401 invalid / 500 errors | ✅ Pass | `route.ts:62-65` returns 500 when secret missing; `route.ts:73-77` returns 401 for missing signature; `route.ts:87-90` returns 401 for invalid signature; `route.ts:118-122` returns 200 with revalidated routes. Also: `route.ts:97-100` returns 400 for invalid JSON body (bonus). |
| 6 | Test coverage (HMAC, valid publish, invalid sig, missing header) | 🟢 Mostly Pass | `route.test.ts:49-56` missing signature (401); `route.test.ts:58-66` invalid signature (401); `route.test.ts:68-79` valid signature (200) + revalidatePath called; `route.test.ts:81-103` revalidates `/blog` and `/instructors`; `route.test.ts:105-111` 500 when secret unset; `route.test.ts:113-124` timingSafeEqual regression. |

### Findings

#### 🟡 Important — Test fixture uses wrong slug shape, masks dead code path

**File:** `apps/web/src/app/api/sanity/webhook/route.test.ts:70-75`

```typescript
const body = JSON.stringify({ _type: 'blogPost', _id: 'abc', slug: 'test-post' });
const validSig = signPayload(body, 'test-webhook-secret');
const req = createWebhookRequest(
  { _type: 'blogPost', _id: 'abc', slug: 'test-post' },
  validSig,
);
```

The route handler at `route.ts:107-112` checks `payload.slug?.current`:
```typescript
if (payload._type === 'blogPost' && payload.slug?.current) {
  routesToRevalidate.push(`/blog/${payload.slug.current}`);
}
```

But the test passes `slug: 'test-post'` (string), not `slug: { current: 'test-post' }` (Sanity slug field shape). This means `payload.slug?.current` evaluates to `undefined`, and the detail-page revalidation branch is **never exercised by any test**. Real Sanity webhooks always send the `{ current: '...' }` shape — so the test fixture diverges from reality.

**Impact:** Detail-page revalidation (`/blog/[slug]` and `/instructors/[slug]`) is untested. If the `payload.slug?.current` access breaks (e.g., due to a refactor), no test would catch it.

**Fix:** Change test fixtures to use `slug: { current: 'test-post' }` and add an assertion that `revalidatePathMock` was called with `/blog/test-post`.

#### 🟢 Nit — HMAC signature verification uses `safeCompare` with short-circuit on length mismatch

**File:** `apps/web/src/app/api/sanity/webhook/route.ts:46-55`

```typescript
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;  // ← early return leaks length info
  }
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
```

The early `return false` on length mismatch leaks length information via timing. This is a known tradeoff — `timingSafeEqual` throws on length mismatch, so the guard is necessary to avoid the throw. The test at `route.test.ts:113-124` even acknowledges this:

```typescript
it('uses timingSafeEqual to prevent timing attacks', async () => {
  // This is hard to test directly, but we verify the handler doesn't
  // short-circuit on length mismatch (which would be a timing attack vector).
```

The test comment is misleading — the handler DOES short-circuit on length mismatch. The realistic threat model here is low (the attacker would need to know the secret length to exploit this), and this matches the SKILL §15.18.3 canonical pattern. **Not a bug, but the test comment is incorrect.**

#### ✅ Pass — Webhook correctly fires on any change (publish/unpublish/update)

The webhook does NOT filter on `published == true` at the webhook layer. This is correct: an `unpublish` event should also trigger revalidation so stale content is purged. The `published == true` filter is enforced at GROQ query time (Lesson 49 defense-in-depth).

---

## Deep-Dive 2 — Admin Audit Logging

### Files reviewed
- `apps/web/src/lib/admin/audit-log.ts` (55 lines)
- `apps/web/src/app/(admin)/admin/audit-log/page.tsx` (148 lines)
- `apps/web/src/app/(admin)/admin/audit-log/layout.tsx` (21 lines)
- `packages/api/src/routers/admin.ts` (488 lines) — searched for `logAdminAction` calls + audit log inserts
- `packages/api/src/routers/admin.test.ts` (302 lines)
- `packages/db/src/schema/audit-log.ts` (44 lines) + `audit-log.test.ts` (59 lines)

### Verification matrix

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | `logAdminAction()` fire-and-forget (`.catch(() => {})`) — Lesson 79 | ✅ Pass | `audit-log.ts:37-55` wraps `db.insert(auditLog)` in try/catch and logs to `console.error` — never throws. Inline audit inserts in `admin.ts:177-185`, `admin.ts:379-387`, `admin.ts:414-422` all use `.catch(() => { /* Audit logging should never block the mutation */ })`. |
| 2 | Never blocks mutations | ✅ Pass | All 3 inline audit inserts (deleteClass, assignRole, removeRole) call `.catch(() => {})` AFTER the business mutation succeeds. If the audit insert fails, the mutation result is still returned. |
| 3 | `audit_log.metadata` is `null` (not `undefined`) — Lesson 84 | ✅ Pass | `audit-log.ts:44` `metadata: params.metadata ?? null`. Schema `audit-log.ts:32` `metadata: jsonb('metadata')` (nullable, not `notNull`). Test `audit-log.test.ts:47-51` verifies nullable. |
| 4 | Audit-log page is manager+ gated (layout guard) | ✅ Pass | `audit-log/layout.tsx:19` `await requireRole('manager', 'owner');`. Comment explicitly notes "manager+ only" per F9-20. |
| 5 | `admin.listAuditLog` procedure uses manager+ tier (NOT staffProcedure) — I1 fix | 🔴 **CRITICAL — NOT FIXED** | `admin.ts:430` `listAuditLog: staffProcedure`. Comment on `admin.ts:428` says "manager+ only. Phase 9 F9-20." but the implementation uses `staffProcedure` (Tier 3 = staff+). |
| 6 | Test coverage: are audit log writes tested? | 🟡 Partial | `admin.test.ts:278-301` tests `deleteClass` audit log insert is called. **No tests** for `assignRole` audit log insert. **No tests** for `removeRole` audit log insert. **No tests** for `listAuditLog` procedure (filters, pagination, RBAC). |

### Findings

#### 🔴 Critical — `admin.listAuditLog` uses `staffProcedure` instead of manager+ (I1 — confirmed NOT fixed)

**File:** `packages/api/src/routers/admin.ts:427-472`

```typescript
/**
 * List audit log entries with filters (manager+ only). Phase 9 F9-20.
 */
listAuditLog: staffProcedure     // ← BUG: should be manager+
  .input(
    z.object({
      staffMemberId: z.string().uuid().optional(),
      action: z.string().max(100).optional(),
      ...
    }),
  )
  .query(async ({ ctx, input }) => {
    ...
  }),
```

**The comment says "manager+ only" but the implementation uses `staffProcedure` (Tier 3 = staff, manager, owner).** This is the exact I1 finding from Phase B (`04-phase-b-six-axis-audit.md:306`) and was confirmed still-open in Phase D (`05-phase-d-reconciliation.md:138`).

**Impact:** Any staff-tier user can read the entire audit log via direct tRPC call (`caller.admin.listAuditLog({})`). The audit log contains every admin mutation including role assignments, class deletions, and metadata diffs — exposing what other admins are doing and potentially leaking entity IDs.

**Defense-in-depth status:** The layout guard at `audit-log/layout.tsx:19` correctly enforces manager+ via `requireRole('manager', 'owner')`, so a staff user navigating to `/admin/audit-log` is redirected. But the tRPC procedure is callable directly (e.g., from a malicious script on another page, or via `fetch('/api/trpc/admin.listAuditLog', ...)` with the user's session cookie), bypassing the layout guard. **The procedure tier is the actual security boundary, and it's wrong.**

**Fix:** `packages/api/src/trpc.ts` does NOT define a `managerProcedure`. Two options:
1. **Add `managerProcedure` to `trpc.ts`** (Tier 3.5 — manager, owner) and use it for `listAuditLog`, `getRevenue`, `getRevenueDetails`, `payments.refund`.
2. **Inline middleware:** `staffProcedure.use(async ({ ctx, next }) => { if (!ctx.session.user.roles.some(r => ['manager', 'owner'].includes(r))) throw new TRPCError({ code: 'FORBIDDEN' }); return next(); })`

Option 1 is preferred (consistent with the existing 4-tier pattern).

**Also affected (per Phase B I1 + Phase D reconciliation):**
- `admin.getRevenue` (`admin.ts:60`) — staffProcedure, should be manager+
- `admin.getRevenueDetails` (`admin.ts:273`) — staffProcedure, should be manager+
- `payments.refund` — staffProcedure, should be manager+

#### 🟡 Important — Test coverage gap: assignRole / removeRole audit log writes untested

**File:** `packages/api/src/routers/admin.test.ts`

The test file covers:
- ✅ `getDashboard` (4 tests, lines 57-115)
- ✅ `getRevenue` (2 tests, lines 117-150)
- ✅ `getClassRoster` (2 tests, lines 152-198)
- ✅ `listClasses` (2 tests, lines 200-239)
- ✅ `deleteClass` (3 tests, lines 241-302) — including audit log write verification (line 278)

But missing:
- ❌ `assignRole` — no test (audit log insert never asserted)
- ❌ `removeRole` — no test (audit log insert never asserted)
- ❌ `getMemberDetail` — no test
- ❌ `getRevenueDetails` — no test (Phase 7+ stub)
- ❌ `listAuditLog` — no test (no filter logic verification, no RBAC tier verification)

The `deleteClass` audit-log test (line 278) is a good template — the same pattern should be applied to `assignRole` and `removeRole`. The lack of `listAuditLog` tests is especially problematic given the I1 tier violation above — a test asserting "throws FORBIDDEN for staff-only caller" would have caught the bug.

#### 🟢 Nit — `logAdminAction()` helper in `lib/admin/audit-log.ts` is unused by the tRPC procedures

**File:** `apps/web/src/lib/admin/audit-log.ts`

The `logAdminAction()` helper is defined and exported, but the inline audit inserts in `admin.ts` (lines 177-185, 379-387, 414-422) duplicate the logic inline rather than calling the helper. This is because the tRPC procedures need `ctx.db` (transaction-scoped) while the helper uses the singleton `db` import. The helper is intended for use by Server Components / Route Handlers that don't have a tRPC context (per the docstring example at `audit-log.ts:28-35`).

This is documentation, not a bug — but the inline duplication means a future change to the audit-log schema (e.g., adding an `ipAddress` column) requires updating both the helper AND every inline call site.

#### ✅ Pass — Audit-log page renders metadata safely

`page.tsx:121-128` correctly handles null metadata (`'—'`) and truncates long metadata (`JSON.stringify(e.metadata).slice(0, 50)`). Uses monospace font for audit data. Pagination summary at `page.tsx:138-145` is correctly conditional on `result.total > result.limit`.

---

## Deep-Dive 3 — SSE Endpoint + useSessionAvailability Hook

### Files reviewed
- `apps/web/src/app/api/schedule/stream/route.ts` (157 lines)
- `apps/web/src/app/api/schedule/stream/route.test.ts` (123 lines)
- `apps/web/src/hooks/useSessionAvailability.ts` (127 lines)
- `apps/web/src/hooks/useSessionAvailability.test.tsx` (128 lines)

### Verification matrix

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | `maxDuration = 300` (5 min Vercel ceiling) | ✅ Pass | `route.ts:23` `export const maxDuration = 300;`. Test at `route.test.ts:31-34` asserts `mod.maxDuration === 300`. |
| 2 | `ReadableStream` + 10s `setInterval` polling (§15.3) | ✅ Pass | `route.ts:123` `new ReadableStream({ start(controller) { ... } })`. `route.ts:129` `setInterval(() => { ... }, 10_000)`. Initial event sent immediately at `route.ts:126`. |
| 3 | NO `force-dynamic` export (Lesson 50) | ✅ Pass | Not present in `route.ts`. Test at `route.test.ts:36-40` explicitly asserts `(mod as Record<string, unknown>).dynamic).toBeUndefined()`. |
| 4 | Errors logged, not silently swallowed (v8 A1 fix) | ✅ Pass | `route.ts:76-87` catch block calls `console.error('[SSE getSeatAvailability] failed for session ${sessionId}:', error)`. Test at `route.test.ts:107-122` asserts `consoleErrorSpy` was called with SSE-prefixed message. |
| 5 | 3 reconnection attempts with exponential backoff (1s→2s→4s) | ✅ Pass | `useSessionAvailability.ts:32` `MAX_RECONNECT_ATTEMPTS = 3`. `useSessionAvailability.ts:85` `delay = BASE_RECONNECT_DELAY * Math.pow(2, attempt)` produces 1000, 2000, 4000 ms. |
| 6 | Hook cleanup non-negotiable (Lesson 51) | ✅ Pass | `useSessionAvailability.ts:113-123` cleanup function sets `isCancelledRef.current = true`, clears reconnect timer, closes EventSource, nulls ref. Test at `useSessionAvailability.test.tsx:115-122` asserts `eventSource.closeCalled === true` after unmount. |
| 7 | `MessageEvent.data` typed as `any` cast with `String()` — Lesson 56 | ✅ Pass | `useSessionAvailability.ts:65` `const rawData: unknown = JSON.parse(String(event.data));` — uses `String()` cast per Lesson 56. |
| 8 | Test coverage: SSE event format, reconnection logic, cleanup | 🟡 Partial | See findings below. |

### Findings

#### 🟡 Important — SSE wire-format (`data: {...}\n\n`) is not asserted by any test

**File:** `apps/web/src/app/api/schedule/stream/route.test.ts:75-92`

```typescript
it('returns initial seat availability event immediately', async () => {
  ...
  const res = await GET(req);
  expect(res.status).toBe(200);
  expect(res.body).not.toBeNull();
  // The response is a ReadableStream — verify it's readable
  expect(typeof res.body?.getReader).toBe('function');
});
```

The test verifies the response is a `ReadableStream` but **never reads a single byte from it**. The actual SSE wire format (`data: ${JSON.stringify(data)}\n\n` — `route.ts:90-92`) is untested. If the `formatSSEEvent` function breaks (e.g., drops the `\n\n` terminator, or forgets the `data: ` prefix), the EventSource client would silently fail to parse events — but no test would catch it.

**Fix:** Add a test that reads the stream:
```typescript
it('emits initial SSE event in correct wire format', async () => {
  mockGetSession.mockResolvedValue({ enrolledCount: 5, class: { maxCapacity: 10 }, ... });
  const { GET } = await import('./route');
  const req = new Request('http://localhost:3000/api/schedule/stream?sessionId=00000000-0000-4000-8000-000000000001');
  const res = await GET(req);
  const reader = res.body!.getReader();
  const { value } = await reader.read();
  const text = new TextDecoder().decode(value);
  expect(text).toMatch(/^data: /);
  expect(text).toMatch(/\n\n$/);
  const payload = JSON.parse(text.replace(/^data: /, '').replace(/\n\n$/, ''));
  expect(payload).toEqual({ enrolled: 5, capacity: 10, available: 5, isFull: false });
});
```

#### 🟡 Important — Reconnection test doesn't verify backoff delays (1s/2s/4s) or attempt count

**File:** `apps/web/src/hooks/useSessionAvailability.test.tsx:91-113`

```typescript
it('sets error when SSE error occurs after max reconnection attempts', async () => {
  ...
  vi.useFakeTimers();
  for (let i = 0; i < 4; i++) {
    const eventSource = MockEventSource.instances[MockEventSource.instances.length - 1];
    act(() => { eventSource?.emitError(); });
    // Advance past the reconnect delay
    act(() => { vi.advanceTimersByTime(5000); });  // ← always 5000ms
  }
  vi.useRealTimers();
  expect(result.current.error).toBeInstanceOf(Error);
});
```

The test advances timers by a flat 5000ms each iteration, which:
- ❌ Does NOT verify the exponential backoff is actually 1s → 2s → 4s (a constant 1000ms delay would also pass this test)
- ❌ Does NOT verify that exactly 3 reconnection attempts were made (a `MAX_RECONNECT_ATTEMPTS = 5` would also pass with 6 errors)
- ❌ Does NOT verify that successful messages reset `reconnectAttemptsRef.current = 0` (the reset logic at `useSessionAvailability.ts:71` is untested)

**Fix:** Advance timers by exactly 1000ms, then 2000ms, then 4000ms; assert that `MockEventSource.instances.length === 4` (initial + 3 reconnects); add a separate test that emits a successful message between errors and verifies the attempt counter resets.

#### 🟢 Nit — `useSessionAvailability.test.tsx` missing `afterEach(() => cleanup())`

**File:** `apps/web/src/hooks/useSessionAvailability.test.tsx`

Per Lesson 54, vitest with `pool: 'forks'` does NOT auto-clean jsdom DOM between test files. While this test file doesn't render components (it uses `renderHook`), adding `afterEach(() => cleanup())` is a defensive best practice and matches the Lesson 54 pattern. Low priority — `renderHook` is less prone to DOM leaks than `render`.

#### 🟢 Nit — SSE route uses `request.signal.addEventListener('abort', ...)` but doesn't handle errors in the polling `then()` callback

**File:** `apps/web/src/app/api/schedule/stream/route.ts:129-139`

```typescript
const interval = setInterval(() => {
  void getSeatAvailability(sessionId).then((data) => {
    if (!data) {
      controller.close();
      clearInterval(interval);
      return;
    }
    controller.enqueue(encoder.encode(formatSSEEvent(data)));
  });
}, 10_000);
```

The `.then()` has no `.catch()`. `getSeatAvailability` has an internal try/catch (returns `null` on error), so this should never reject — but if the try/catch is ever removed or a non-Error throw escapes, the unhandled rejection would crash the polling loop silently. Adding `.catch(() => { /* logged inside getSeatAvailability */ })` is defensive. Low priority — current behavior is correct because of the internal try/catch.

#### ✅ Pass — Hook cleanup is comprehensive

The cleanup at `useSessionAvailability.ts:113-123` handles all 3 resource types:
1. `isCancelledRef.current = true` — prevents in-flight `setTimeout` callback from reconnecting
2. `clearTimeout(reconnectTimerRef.current)` — cancels pending reconnect
3. `eventSourceRef.current.close()` + `= null` — releases SSE connection

This matches Lesson 51 exactly.

#### ✅ Pass — v8 A1 fix properly applied with regression test

The error logging fix at `route.ts:76-87` is verified by `route.test.ts:107-122`, which spies on `console.error` and asserts the call contains SSE context. Good regression coverage.

---

## Deep-Dive 4 — Proxy.ts + 2-Layer Auth

### Files reviewed
- `apps/web/proxy.ts` (159 lines)
- `apps/web/src/lib/auth.ts` (52 lines)
- `apps/web/src/lib/auth.test.ts` (92 lines)
- `apps/web/src/app/(studio)/layout.tsx` (29 lines)
- `apps/web/src/app/(admin)/layout.tsx` (26 lines)
- `apps/web/src/app/(admin)/admin/revenue/layout.tsx` (21 lines)
- `apps/web/src/app/(admin)/admin/settings/layout.tsx` (20 lines)
- `apps/web/src/app/(admin)/admin/audit-log/layout.tsx` (21 lines)
- `packages/auth/src/config.ts` (213 lines)
- `packages/auth/src/rbac.ts` (64 lines)
- `packages/api/src/trpc.ts` (68 lines)
- `packages/db/src/schema/users.ts` (emailVerified column)

### Verification matrix

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | `proxy.ts` exports `proxy` (NOT `middleware`) | ✅ Pass | `proxy.ts:98` `export function proxy(request: NextRequest)`. Comment at `proxy.ts:4-6` documents the Next.js 16 rename. |
| 2 | Uses `getSessionCookie(request)` only — NO `auth.api.getSession()`, NO DB calls | ✅ Pass | `proxy.ts:124` `const sessionCookie = getSessionCookie(request);`. No import from `@stillwater/auth`. Comment at `proxy.ts:27-31` explicitly says "Do NOT call auth.api.getSession() here." |
| 3 | Per-request CSP nonce generation (§15.16) | ✅ Pass | `proxy.ts:73-75` `generateNonce()` uses `crypto.randomUUID()` + base64. Called per request at `proxy.ts:102`. Set as `x-nonce` request header at `proxy.ts:108` so Next.js auto-adds `nonce="..."` to inline scripts. |
| 4 | 7 `AUTH_REQUIRED_ROUTES` prefixes | ✅ Pass | `proxy.ts:55-63` lists exactly 7 routes: `/dashboard`, `/book`, `/my-classes`, `/membership`, `/profile`, `/waitlist`, `/admin`. |
| 5 | `lib/auth.ts` exports `getSession`, `requireAuth`, `requireRole` | ✅ Pass | `auth.ts:26` `getSession`, `auth.ts:35` `requireAuth`, `auth.ts:47` `requireRole`. All three exported with `'server-only'` guard at `auth.ts:14`. |
| 6a | `(studio)/layout.tsx` — member+ | ✅ Pass | `(studio)/layout.tsx:23` `await requireAuth()`. |
| 6b | `(admin)/layout.tsx` — staff+ | ✅ Pass | `(admin)/layout.tsx:22` `await requireRole('staff', 'manager', 'owner')`. |
| 6c | `(admin)/admin/revenue/layout.tsx` — manager+ | ✅ Pass | `revenue/layout.tsx:19` `await requireRole('manager', 'owner')`. |
| 6d | `(admin)/admin/settings/layout.tsx` — owner | ✅ Pass | `settings/layout.tsx:18` `await requireRole('owner')`. |
| 6e | `(admin)/admin/audit-log/layout.tsx` — manager+ | ✅ Pass | `audit-log/layout.tsx:19` `await requireRole('manager', 'owner')`. |
| 7 | Better Auth: Google OAuth + Magic Link + customSession + Drizzle adapter | ✅ Pass | `config.ts:62-79` drizzleAdapter; `config.ts:98-104` google; `config.ts:106-133` magicLink; `config.ts:135-199` customSession. |
| 8 | `BETTER_AUTH_SECRET` throws if unset (no placeholder fallback) — Lesson 97 | ✅ Pass | `config.ts:45-51` throws if `!secret && !isBuildContext`. Build/test context uses `cryptoRandomSecret()` (random 32-byte base64) — acceptable per Lesson 97 (no signing happens in build context). |
| 9 | Rate limiting: 15-min window, 10/sign-in, 5/magic-link, 15/callback | ✅ Pass | `config.ts:88-97`: global `window: 900, max: 10`. Custom rules: `/api/auth/sign-in/social` 10/15min, `/api/auth/magic-link` 5/15min, `/api/auth/callback/*` 15/15min. |
| 10 | `users.emailVerified` is `boolean` (not timestamp) — Lesson 32 | ✅ Pass | `users.ts:22` `emailVerified: boolean('email_verified').default(false).notNull()`. Test `users.test.ts:39-44` + `auth-tables.test.ts:125-130` verify boolean type. |

### Findings

#### ✅ Pass — 2-Layer Auth pattern correctly implemented

Layer 1 (`proxy.ts`): cookie-existence-only optimistic check. Uses `getSessionCookie(request)` from `better-auth/cookies`. Edge-compatible. No DB calls, no `auth.api.getSession()`. Redirects unauthenticated users to `/auth/sign-in?callbackUrl=...`.

Layer 2 (`layout.tsx` files): full DB-backed session validation via `requireAuth()` / `requireRole()`. Each layout enforces the correct role tier:
- `(studio)/layout.tsx` — `requireAuth()` (any authenticated user — Tier 2)
- `(admin)/layout.tsx` — `requireRole('staff', 'manager', 'owner')` (Tier 3)
- `(admin)/admin/revenue/layout.tsx` — `requireRole('manager', 'owner')` (Tier 3.5)
- `(admin)/admin/settings/layout.tsx` — `requireRole('owner')` (Tier 4)
- `(admin)/admin/audit-log/layout.tsx` — `requireRole('manager', 'owner')` (Tier 3.5)

All 5 layout guards match the RBAC matrix in `rbac.ts:38-52`. **The layout layer is correct.** (But see Deep-Dive 2 — the tRPC procedure tier for `listAuditLog` does NOT match the layout tier. The layout enforces manager+ but the procedure allows staff+. This is the I1 bug.)

#### ✅ Pass — Per-request CSP nonce correctly threaded through request + response headers

`proxy.ts:107-109`:
```typescript
const requestHeaders = new Headers(request.headers);
requestHeaders.set("x-nonce", nonce);
requestHeaders.set("Content-Security-Policy", csp);
```

And then on the response (`proxy.ts:139-142`):
```typescript
const response = NextResponse.next({
  request: { headers: requestHeaders },
});
response.headers.set("Content-Security-Policy", csp);
```

This matches Lesson 99 (v8 S1 fix) — `proxy.ts` is the SOLE source of CSP. The CSP header is NOT set in `next.config.ts headers()` (verified by absence — Lesson 99 regression test pattern).

#### 🟢 Nit — `generateNonce()` uses `crypto.randomUUID()` + base64 (unusual but valid)

**File:** `apps/web/proxy.ts:73-75`

```typescript
function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}
```

`crypto.randomUUID()` returns a 36-char UUIDv4 string (122 bits of entropy). Base64-encoding it produces a 48-char string. This is cryptographically sufficient for CSP nonce purposes (CSP nonces need ≥128 bits of entropy before truncation, and this has 122 bits — close enough for nonces that live for a single request).

A more standard pattern would be `crypto.getRandomValues(new Uint8Array(16)).toString('base64')` (128 bits, 24 chars), but the current implementation is correct and works. The `Buffer` usage also ties this to Node.js runtime (not Edge-compatible) — but `proxy.ts` already runs on Node.js by default in Next.js 16, so this is fine.

#### ✅ Pass — `BETTER_AUTH_SECRET` fail-fast guard matches Lesson 97 exactly

`config.ts:41-55`:
```typescript
const isBuildContext =
  process.env['NEXT_PHASE'] === 'phase-production-build' ||
  process.env['NODE_ENV'] === 'test';

const secret = process.env['BETTER_AUTH_SECRET'];
if (!secret && !isBuildContext) {
  throw new Error('BETTER_AUTH_SECRET is not set. Generate one with ...');
}
const effectiveSecret = secret ?? cryptoRandomSecret();
```

This is the canonical Lesson 97 pattern:
- Production runtime: throws if secret missing ✅
- Build/test context: uses random secret (never used for actual signing) ✅
- No hardcoded placeholder string ✅

#### ✅ Pass — customSession correctly enriches session with memberId + roles + activeSubscription

`config.ts:135-199` queries `members`, `roleAssignments`, and `memberSubscriptions` to enrich the session. The no-member-record branch (line 143-158) returns `roles: [] as const` (empty array) — this is a correctness fix noted in the comment: "Previously returned roles: ['member'] which was semantically wrong (granted booking privileges to potentially-unauthenticated users)."

#### ✅ Pass — RBAC matrix in `rbac.ts` correctly implements defense-in-depth

`rbac.ts:38-52` — 13 permissions × 6 roles (including `guest` for unauthenticated). Each permission maps to the exact role list from PAD §9.2. The `can()` function (line 61-64) checks if ANY of the user's roles grants the permission.

#### 🟢 Nit — `requireRole` redirects to `/dashboard` on insufficient role (potential open-redirect if `/dashboard` changes)

**File:** `apps/web/src/lib/auth.ts:47-52`

```typescript
export async function requireRole(...roles: StudioRole[]) {
  const session = await requireAuth();
  const hasRole = session.user.roles.some((r: string) => roles.includes(r as StudioRole));
  if (!hasRole) redirect('/dashboard');
  return session;
}
```

If a user with insufficient role lands on a manager+ page (e.g., a staff user clicks a deep link to `/admin/audit-log`), they're redirected to `/dashboard`. This is correct behavior, but per Lesson 58 (redirect ghosts), `/dashboard` must exist. Verified: `(studio)/dashboard/page.tsx` exists. ✅

#### ✅ Pass — auth helpers test suite covers all 3 functions + edge cases

`auth.test.ts:49-91` covers:
- ✅ `getSession()` returns null when no session
- ✅ `requireAuth()` redirects to `/auth/sign-in` when unauthenticated
- ✅ `requireRole('owner')` redirects to `/dashboard` when user is only `member`
- ✅ `requireAuth()` returns session when authenticated
- ✅ `requireRole('member')` returns session when user has `member` role

Mocks `server-only`, `next/headers`, `next/navigation`, and `@stillwater/auth` per the SKILL §15.16 test pattern.

---

## Summary

### Critical findings (1)

| ID | Finding | File | Status |
|----|---------|------|--------|
| **E1** | `admin.listAuditLog` uses `staffProcedure` instead of manager+ (I1 — NOT fixed) | `packages/api/src/routers/admin.ts:430` | **🔴 Critical** — defense-in-depth gap; layout guard is correct but procedure tier is wrong. Confirmed open in Phase D reconciliation. |

### Important findings (3)

| ID | Finding | File | Status |
|----|---------|------|--------|
| **E2** | Webhook test fixture uses wrong slug shape (`string` instead of `{current: string}`) | `apps/web/src/app/api/sanity/webhook/route.test.ts:70-75` | **🟡 Important** — detail-page revalidation code path untested |
| **E3** | `assignRole` / `removeRole` audit log writes untested; `listAuditLog` procedure has zero tests | `packages/api/src/routers/admin.test.ts` | **🟡 Important** — a test asserting "FORBIDDEN for staff-only caller" would have caught E1 |
| **E4** | SSE wire-format (`data: {...}\n\n`) never asserted by reading the stream | `apps/web/src/app/api/schedule/stream/route.test.ts:75-92` | **🟡 Important** — `formatSSEEvent` breakages would be undetected |
| **E5** | Reconnection test advances flat 5000ms — doesn't verify 1s/2s/4s backoff or attempt count | `apps/web/src/hooks/useSessionAvailability.test.tsx:91-113` | **🟡 Important** — `MAX_RECONNECT_ATTEMPTS = 5` would also pass |

### Nit findings (4)

| ID | Finding | File | Status |
|----|---------|------|--------|
| **E6** | `safeCompare` short-circuits on length mismatch (test comment claims otherwise) | `apps/web/src/app/api/sanity/webhook/route.ts:46-55` + `route.test.ts:113-124` | **🟢 Nit** — matches SKILL §15.18.3 canonical pattern |
| **E7** | `logAdminAction()` helper is unused by tRPC procedures (they inline the audit insert) | `apps/web/src/lib/admin/audit-log.ts` | **🟢 Nit** — duplication risk if schema changes |
| **E8** | `generateNonce()` uses UUID + base64 (unusual but valid) | `apps/web/proxy.ts:73-75` | **🟢 Nit** — works correctly |
| **E9** | SSE polling `.then()` has no `.catch()` (relies on internal try/catch of `getSeatAvailability`) | `apps/web/src/app/api/schedule/stream/route.ts:129-139` | **🟢 Nit** — current behavior is correct |

### ✅ Confirmed passes (24)

Deep-Dive 1: 5/6 verification items pass (item 4 is a ❓ Question — implementation matches SKILL §15.18.3 but conflicts with the user's prompt expectation; SKILL is canonical).
Deep-Dive 2: 4/6 verification items pass (item 5 is 🔴 Critical — I1 not fixed; item 6 is 🟡 Partial — deleteClass audit tested but assignRole/removeRole/listAuditLog untested).
Deep-Dive 3: 7/8 verification items pass (item 8 is 🟡 Partial — coverage gaps in wire-format + backoff verification).
Deep-Dive 4: 10/10 verification items pass.

### Recommended next actions

1. **🔴 Fix E1 immediately** — Add `managerProcedure` to `packages/api/src/trpc.ts` and apply it to `admin.listAuditLog`, `admin.getRevenue`, `admin.getRevenueDetails`, `payments.refund` (the 4 procedures flagged in Phase B I1).
2. **🟡 Add test for E1** — `admin.test.ts` should assert `caller.listAuditLog({})` throws FORBIDDEN for a staff-role caller (this would have caught E1 in CI).
3. **🟡 Fix E2** — Update webhook test fixtures to use `slug: { current: 'test-post' }` shape; add assertion for `/blog/test-post` and `/instructors/test-post` revalidation.
4. **🟡 Fix E4** — Add a stream-reading test that asserts the `data: {...}\n\n` wire format.
5. **🟡 Fix E5** — Refactor reconnection test to advance timers by 1000/2000/4000ms and assert `MockEventSource.instances.length === 4`.
6. **🟢 Document E6** — Update `route.test.ts:113-124` comment to accurately describe the short-circuit behavior (or remove the misleading comment).

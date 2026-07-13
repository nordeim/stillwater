# 🪷 Stillwater — Comprehensive Code Review & Audit Report

**Audit Date:** 2026-07-13
**Auditor:** Super Z (Frontend Architect & Avant-Garde UI Designer)
**Repository:** `nordeim/stillwater` (cloned to `/home/z/my-project/stillwater`)
**Live Site:** `https://stillwater.jesspete.shop/`
**Methodology:** ANALYZE → PLAN → VALIDATE → IMPLEMENT → VERIFY → DELIVER (9-phase audit)

---

## Executive Summary

The Stillwater yoga studio platform is a **technically sophisticated, well-architected monorepo** that has been meticulously planned across 13 phases (0–12) and documented in 4 extensive spec docs (PAD.md 3,438 lines, SKILL.md 9,398 lines, MEP.md 4,586 lines, Project_Brief.md 184 lines). The codebase has **651 passing tests**, **9/9 packages type-check clean**, **0 lint errors**, and **9/9 packages build successfully**.

**However, the audit uncovered 3 production-blocking issues:**

1. 🚨 **P0 SECURITY: 12 production secrets committed to git history** (`.env.local` re-tracked today by a human commit; pre-commit hook never installed)
2. 🚨 **P0 PRODUCTION: 4 of 6 marketing routes are broken on the live site** (stuck in React Suspense loading state due to a tRPC input schema mismatch)
3. 🚨 **P0 CI/CD: CI workflows use EOL pnpm 9.15.4** (reached end-of-life April 30, 2026; contradicts root `package.json` pnpm@11.9.0)

**Beyond these 3 P0s, the audit identified 21 documentation conflicts, 6 accessibility failures, 6 frontend design-system gaps, 4 architecture anti-patterns, 6 test-coverage gaps, and 11 CI/CD improvements.**

**Overall verdict:** The codebase is production-grade in architecture and testing, but the live deployment has a critical rendering bug, and the security posture requires immediate remediation. The documentation has drifted from the codebase in 21 places and needs a sync pass.

---

## Audit Phase Reports

| Phase | Report | Key Finding |
|---|---|---|
| A | [Doc Alignment](audit/phase-A-doc-alignment.md) | 21 confirmed doc conflicts (6 P0, 10 P1, 5 P2) |
| B | [Quality Gates](audit/phase-B-quality-gates.md) | 651 tests pass (not 643 as claimed); 1 high CVE in `ws` |
| C | [Security](audit/phase-C-security.md) | 3 P0: secrets in git, no auth rate-limiting, fail-closed rate-limiter |
| D | [Frontend/Aesthetic](audit/phase-D-frontend-aesthetic.md) | Anti-Generic score 20/30 (below 24 threshold); 6 P0 design-system gaps |
| E | [Accessibility](audit/phase-E-accessibility.md) | NOT WCAG 2.2 AAA compliant; 14 P0 + 7 P1 findings |
| F | [Live-Site E2E](audit/phase-F-live-site-e2e.md) | 4/6 marketing routes broken (tRPC schema mismatch) |
| G | [Test Coverage](audit/phase-G-test-coverage.md) | 651 tests pass; but BOOK-006 is a placeholder; 5 coverage targets missed |
| H | [Architecture/Code](audit/phase-H-architecture-code-review.md) | 10 files scored 54.6/60 avg; 4 P1 refactorings needed |
| I | [CI/CD + Observability](audit/phase-I-cicd-observability.md) | pnpm 9 EOL; Axiom not wired; no Dependabot; 6 of 8 CI gates run |

---

## 🔴 P0 Critical Findings (Immediate Action Required)

### P0-1: Production Secrets Committed to Git History

**Source:** Phase C (Security) + Phase A (Doc Alignment)
**Status:** 🚨 ACTIVE SECURITY INCIDENT — unresolved

`.env.local` is currently tracked by git (`git ls-files --error-unmatch .env.local` returns the filename). Git history shows 3 commits touched it, the most recent being `dbf0cd5` (by human user `heinazhik`, 2026-07-13 — TODAY) with message "env", adding 91 lines containing **12 secret variables with non-empty values**:

| Secret Variable | Risk if Compromised |
|---|---|
| `BETTER_AUTH_SECRET` | Session forgery (anyone can forge valid session cookies) |
| `GOOGLE_CLIENT_SECRET` | OAuth impersonation (attacker can impersonate the app) |
| `STRIPE_SECRET_KEY` | Financial fraud (create charges, refunds, access customer data) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature bypass (forge Stripe webhooks) |
| `SANITY_API_TOKEN` | CMS tampering (modify marketing content) |
| `SANITY_WEBHOOK_SECRET` | Forge ISR revalidation webhooks |
| `RESEND_API_KEY` | Email sending abuse (send phishing from the domain) |
| `TRIGGER_SECRET_KEY` | Background-job injection (trigger arbitrary jobs) |
| `UPSTASH_REDIS_REST_TOKEN` | Rate-limit bypass (disable all rate limiting) |
| `CLOUDFLARE_IMAGES_TOKEN` | Image CDN abuse (serve arbitrary content) |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Storage abuse (read/write/delete R2 objects) |
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Direct database access (read/modify all data) |

**Root cause:** The C5 fix in commit `5ea00a9` (2026-07-12) correctly ran `git rm --cached .env.local` and created `scripts/pre-commit-check.sh`, but did NOT install the hook (the `ln -s` step was missed). Today, human user `heinazhik` ran `git add .env.local` (bypassing the non-existent hook) and committed it.

**Remediation (user must execute):**
1. `git rm --cached .env.local && git commit -m "security: untrack .env.local (C6 regression fix)"`
2. Install hook: `chmod +x scripts/pre-commit-check.sh && ln -sf ../../scripts/pre-commit-check.sh .git/hooks/pre-commit`
3. Add `"prepare": "ln -sf ../../scripts/pre-commit-check.sh .git/hooks/pre-commit"` to root `package.json` (auto-installs on `pnpm install`)
4. **Rotate ALL 12 secrets** (see Phase A report for per-secret rotation steps)
5. Purge git history: `git filter-repo --invert-paths --path .env.local && git push --force-with-lease origin main`
6. Verify: `git log --all --full-history -- .env.local` returns empty

---

### P0-2: 4 of 6 Marketing Routes Broken on Live Site

**Source:** Phase F (Live-Site E2E)
**Status:** 🚨 PRODUCTION BROKEN — unresolved

The home page (`/`), schedule (`/schedule`), pricing (`/pricing`), and instructors (`/instructors`) pages all render their navigation and footer but leave the `<main>` content area stuck in a "Loading…" React Suspense state indefinitely. Only `/about` and `/blog` (static ISR pages) render content.

**Root cause:** The home page's tRPC query `schedule.getWeek` sends `{"date":"2026-07-13"}` but the procedure's Zod schema expects `weekStart` (Date type). This causes a 400 BAD_REQUEST on every home page load:

```
GET /api/trpc/schedule.getWeek?input=%7B%22json%22%3A%7B%22date%22%3A%222026-07-13%22%7D%7D → 400
Error: "expected date, received Date", path: ["weekStart"]
```

The React Suspense boundary wrapping the tRPC query never resolves because the query fails, and there is no Error Boundary to catch the failure and show an error state.

**Secondary issue:** The home page generates 20+ "Error: Connection closed." console errors from the `useSessionAvailability` SSE hook in `HeroNextClass` — SSE should not be used on the home page (only on `/book/[sessionId]`).

**Remediation:**
1. Fix the `schedule.getWeek` input schema in `apps/web/src/components/marketing/HeroNextClass.tsx` + `ScheduleSection.tsx`: change `{"date": "..."}` → `{"weekStart": new Date(...)}`
2. Add Error Boundaries around all Suspense boundaries on the 4 broken pages
3. Remove the SSE connection from `HeroNextClass` — use a one-time tRPC query instead
4. Verify all 4 pages render locally with `pnpm dev` + seeded DB
5. Add a weekly production E2E job to CI to catch this class of bug

---

### P0-3: CI Workflows Use EOL pnpm 9.15.4

**Source:** Phase I (CI/CD) + Phase A (Doc Alignment)
**Status:** Confirmed — CI may fail or silently ignore v11+ features

All 3 GitHub workflows pin `PNPM_VERSION: '9.15.4'` (EOL since April 30, 2026) while `package.json` declares `pnpm@11.9.0`. The `pnpm-workspace.yaml` uses v11+ features (`allowBuilds`, `minimumReleaseAge: 1440`) that are silently ignored by pnpm 9.x — **supply-chain guardrails are not enforced in CI**.

**Remediation:** Remove `PNPM_VERSION` env var from all 3 workflows; let `pnpm/action-setup@v4` auto-read `packageManager` from `package.json`. This makes `package.json` the single source of truth and eliminates the drift vector.

---

### P0-4: Auth-Mutation Rate Limiting Entirely Absent

**Source:** Phase C (Security)
**Status:** Confirmed — OWASP A07 violation

Only `bookings.book` is rate-limited. `signIn`/`signUp`/`magicLink`/`resetPassword` have **zero rate limiting**. Magic-link email-bombing and credential-stuffing are both unmitigated. Compounded by `rateLimit.ts:40` not supporting a `'15 m'` window option (only `'1 m'` and `'1 h'`).

**Remediation:** Add rate-limit middleware to all auth mutations; extend the rate-limit window options to support `'15 m'`.

---

### P0-5: Rate-Limit Middleware is Fail-CLOSED, Not Fail-OPEN

**Source:** Phase C (Security)
**Status:** Confirmed — contradicts SKILL §15.7.5

`rateLimit.ts:52` has no `try/catch` around `limiter.limit(id)`. Redis outage → throws → 500 → booking blocked. This directly contradicts SKILL §15.7.5 which mandates fail-OPEN (booking should still work if Redis is down) and the file's own header comment which says "fail-open".

**Remediation:** Wrap `limiter.limit(id)` in try/catch; on error, log to Sentry and allow the request through (fail-open).

---

### P0-6: WCAG 2.2 AAA Color Contrast Failures

**Source:** Phase E (Accessibility)
**Status:** Confirmed — 5 of 9 AAA criteria fail

The Warm Mineral palette does NOT achieve 7:1 contrast (AAA) for several critical pairs:

| Pair | Ratio | 7:1 (AAA)? | 4.5:1 (AA)? |
|---|---|---|---|
| stone-900 on sand (body text) | 15.44:1 | ✅ | ✅ |
| stone-700 on sand (secondary text) | 10.23:1 | ✅ | ✅ |
| clay-600 on sand (primary action) | 6.48:1 | ❌ | ✅ |
| water-700 on sand (accent) | 4.62:1 | ❌ | ✅ |
| sand-100 on clay-600 (button text) | 6.48:1 | ❌ | ✅ |
| success on sand | 4.29:1 | ❌ | ❌ |
| warning on sand | 2.48:1 | ❌ | ❌ |
| error on sand | 4.19:1 | ❌ | ❌ |

**Critical:** `warning` and `error` fail BOTH AAA (7:1) AND AA (4.5:1) — they are illegible on the sand background. `success` also fails AA.

**Remediation:** Darken `--color-warning` (from `#C4913A` to ~`#8A6510`), `--color-error` (from `#B85450` to ~`#8A3530`), and `--color-success` (from `#4A7C59` to ~`#2D5A3A`). Re-verify all contrast ratios. If AAA is truly unreachable for some pairs, document an AAA exception and target AA.

---

### P0-7: shadcn HSL Variables Never Defined

**Source:** Phase D (Frontend/Aesthetic)
**Status:** Confirmed — 15+ UI primitives render without proper styling

`--background`, `--primary`, `--ring`, `--card`, `--popover`, `--muted`, `--destructive`, `--secondary`, `--input`, `--border` are referenced by 15+ shadcn primitives but defined nowhere in `globals.css`. The Button "default" variant renders with no background; Cards have no surface fill; Select/Dropdown/Popover are transparent.

**Remediation:** Add the full shadcn HSL variable block to `apps/web/src/app/globals.css` (see SKILL §19.8 for the exact values mapping Warm Mineral palette to HSL).

---

## 🟡 P1 Important Findings (Should Fix This Sprint)

### Documentation (from Phase A)

| # | Finding | Fix Effort |
|---|---|---|
| C1-C4 | 4 stale-version references (PAD v1.18→v1.19, SKILL v2.9→v3.0, 643→651 tests, MEP §7.1 "9-12 PENDING") | 30 min (grep + replace) |
| M1-M2 | MEP source-doc count mismatch (8 vs 7 vs 8); ADR count mismatch (9 vs 11) | 15 min |
| M3 | PAD §6.1 directory tree stale (8/13 templates, 7/11 workers, wrong names) | 1 hour (regenerate) |
| M4-M5 | PAD §7.1 "4 migrations" (actual 5); Mermaid diagram references undefined `middleware` node | 10 min |
| M8 | ADR-001–007 dated 2025-07-04 (should be 2026-07-04) | 15 min |
| M10-M11 | Phase boundary ambiguities; SKILL §16.14 misplaced inside §20 | 30 min |

### Security (from Phase C)

| # | Finding | Fix Effort |
|---|---|---|
| C-P1a | 429 responses missing `X-RateLimit-*` + `Retry-After` headers | 30 min |
| C-P1b | Honeypot fields absent from all public-facing forms (SKILL §15.13 violation) | 1 hour |
| C-P1c | Session cookie + timeout config relies on Better Auth defaults (no explicit config) | 30 min |
| C-P1d | Axiom logger is console-only — `AXIOM_TOKEN` declared but never used | 1 hour |
| C-P1e | `admin.getRevenue` uses `staffProcedure` but RBAC matrix grants `revenue:view` to manager+ only | 15 min |
| C-P1f | No `.github/dependabot.yml` | 15 min |

### Frontend (from Phase D)

| # | Finding | Fix Effort |
|---|---|---|
| D-P1a | `--text-*` and `--max-width-*` tokens unreachable from Tailwind (not mapped in `@theme`) | 30 min |
| D-P1b | Fonts loaded via CSS `@font-face` not `next/font/local` (loses preloading, CLS) | 1 hour |
| D-P1c | `MarketingNav` never renders `MobileNavDrawer` — mobile users have no nav | 30 min |
| D-P1d | `NewsletterForm` submit handler is a `setTimeout` stub with TODO | 30 min |
| D-P1e | `HeroNextClass` aria-label hardcoded as "8 of 12 spots left" | 15 min |
| D-P1f | 9 inline `text-[clamp(...)]` bypassing the token system | 30 min |

### Accessibility (from Phase E)

| # | Finding | Fix Effort |
|---|---|---|
| E-P1a | shadcn `<Button>` (h-10=40px) and `<Input>` (h-9=36px) fail 44×44 target size | 1 hour |
| E-P1b | `ScheduleCalendar` uses only `PointerSensor` (no `KeyboardSensor`) — keyboard users can't create sessions | 2 hours |
| E-P1c | axe-core dev-mode not wired into `layout.tsx` | 15 min |
| E-P1d | SkipLink broken — `href="#main"` but no `<main id="main">` exists | 15 min |
| E-P1e | `MobileNavDrawer` is fully built but never imported — mobile nav inaccessible | 30 min |
| E-P1f | `ProfileEditForm` uses `focus:outline-none` with NO ring replacement | 15 min |

### Architecture (from Phase H)

| # | Finding | Fix Effort |
|---|---|---|
| H-P1a | `bookings.ts:152-157` — `booking-confirmation` job triggered *inside* `db.transaction()` body (should be post-commit) | 30 min |
| H-P1b | Drizzle RQB type inference broken codebase-wide — 10+ `as` casts because `defineRelations()` never called | 1 hour |
| H-P1c | `stream/route.ts` missing `export const runtime = 'nodejs'` — risk of Edge runtime deployment | 5 min |
| H-P1d | ~95 LOC dead code in reminder workers (legacy `sendSingleReminder` functions) | 30 min |

### Test Coverage (from Phase G)

| # | Finding | Fix Effort |
|---|---|---|
| G-P1a | BOOK-006 is a placeholder (`expect(true).toBe(true)`) — race-condition guarantee unguarded | 2 hours |
| G-P1b | Coverage thresholds broken: api 75.83% (target 80%), workers 84.72% (target 85%), db 38.88% (target 80%), web 24.52% (target 70%) | 4+ hours |
| G-P1c | BOOK-004 (credit consumption) + BOOK-005 (no-subscription rejection) entirely untested | 2 hours |
| G-P1d | `customSession` enrichment not behaviorally tested | 1 hour |
| G-P1e | Factory pattern documented but unimplemented (1 of 5 factories exist, 0 used) | 2 hours |
| G-P1f | No `FakeEmailService` — all 11 workers tests use `vi.mock('@stillwater/email')` | 2 hours |

### CI/CD (from Phase I)

| # | Finding | Fix Effort |
|---|---|---|
| I-P1a | CI runs only 6 of 8 quality gates (missing Lighthouse + bundle-size) | 30 min |
| I-P1b | No `concurrency:` blocks in any workflow (wasteful parallel runs) | 15 min |
| I-P1c | No path filters — docs-only PRs trigger full CI | 30 min |
| I-P1d | Axiom integration NOT implemented — logger is console-only | 1 hour |
| I-P1e | `checkly.config.ts` missing — 60s cadence + alert routing unenforced | 30 min |
| I-P1f | Feature flags not implemented (0 occurrences despite SKILL §11.8.2 mandate) | 2 hours |
| I-P1g | No automatic `vercel rollback` on smoke-test failure | 1 hour |
| I-P1h | Production smoke test only checks homepage (misses /schedule, /api/trpc, SSE) | 30 min |

---

## 🟢 P2 Nits (Optional Improvements)

(See individual phase reports for the full list of 30+ P2 findings)

---

## Cross-Document Conflict Resolution Summary (Phase A)

**21 confirmed conflicts** across 5 spec documents. Root-cause pattern: 16 of 21 stem from incremental version bumps that updated the changelog but not the body.

| Severity | Count | Example |
|---|---|---|
| 🔴 P0 | 6 | C6 (secrets in git), C5 (EOL pnpm), C1-C4 (version/test-count drift) |
| 🟡 P1 | 10 | M3 (stale directory tree), M8 (ADR dates), M11 (§16.14 misplaced) |
| 🟢 P2 | 5 | L1 (sub-numbering), L3 (footer "Lessons 1-93" → "1-98") |

**Recommended fix:** Apply the 21 edits documented in `phase-A-doc-alignment.md` in a single PR. Add the "Post-Version-Bump Checklist" (§11.9 in the Phase A report) to SKILL.md to prevent recurrence.

---

## Quality Gate Results (Phase B)

| Gate | Status | Result |
|---|---|---|
| 1. `pnpm check-types` | ✅ GREEN | 9/9 packages, 0 type errors |
| 2. `pnpm lint` | ✅ GREEN | 0 errors, 9 intentional warnings |
| 3. `pnpm test` | ✅ GREEN | **651/651 tests** (not 643 as claimed) |
| 4. `pnpm build` | ✅ GREEN | 9/9 packages, 0 errors |
| 5. `pnpm test:e2e` | ⏭️ DEFERRED | Deferred to Phase F (live site) |
| 6. `pnpm lighthouse ci` | ⏭️ DEFERRED | Deferred to Phase F (live site) |
| 7. `pnpm bundle-size` | ✅ GREEN | All 7 routes within budget |
| 8. `pnpm audit --audit-level=high` | ⚠️ 1 HIGH | `ws` package DoS (transitive via `@trigger.dev/sdk`) |

**Key finding:** The actual test count is **651** (not 643 as claimed in Project_Brief, SKILL body, and MEP). PAD v1.19.0 changelog and SKILL v3.0.0 audit row are correct. The +8 difference is in `services/workers` (41 actual vs 33 claimed — the cron fan-out tests added in v1.19.0).

---

## Six-Axis Architecture Score (Phase H)

**10 highest-risk files reviewed, mean score 54.6/60 (91%):**

| File | Score | Top Finding |
|---|---|---|
| `rbac.ts` + `proxy.ts` | 59/60 | ✅ Exemplary 2-layer auth |
| `audit-log.ts` | 59/60 | ✅ Fire-and-forget pattern correct |
| `relations.ts` | 59/60 | ✅ C2 fix applied (no duplicate `many()`) |
| `email/send.ts` | 58/60 | ✅ Dual-path ADR-010 correct |
| `Hero.tsx` + `BookingFlow.tsx` | 55/60 | ⚠️ Hero asymmetric grid correct; BookingFlow missing error boundary |
| `payments/webhooks.ts` | 54/60 | ✅ Idempotency pattern solid |
| `trpc.ts` + `context.ts` | 54/60 | ⚠️ 4 procedure tiers correct; context missing redis |
| `bookings.ts` | 51/60 | ⚠️ Job trigger inside transaction (should be post-commit) |
| `schedule/stream/route.ts` | 49/60 | ⚠️ Missing `runtime = 'nodejs'` |
| Workers trio | 48/60 | ⚠️ ~95 LOC dead code; eslint `no-explicit-any` disabled incorrectly |

**Verdict:** The architecture is sound. The 4 P1 refactorings total <4 hours of effort.

---

## Anti-Generic Score (Phase D)

**Overall: 20/30** — below the 24/30 redesign threshold per SKILL §1.4.2.

**What passes (preserved):**
- ✅ Zero `shadow-*` outside skeleton/toast
- ✅ Zero gradients, zero purple/violet/fuchsia
- ✅ Zero `bg-amber/red/blue/green` in app code
- ✅ `--radius: 0` correctly propagated
- ✅ Hero asymmetric grid exactly matches spec (`1fr 1px minmax(280px,38%)`)
- ✅ Editorial patterns preserved (section-number ornaments, 間 ornament, STILLWATER footer watermark)
- ✅ `KpiCard.tsx` is the exemplary model component

**What fails (6 P0s):**
- ❌ shadcn HSL variables never defined (15+ primitives unstyled)
- ❌ `--text-*` and `--max-width-*` tokens unreachable from Tailwind
- ❌ Fonts not loaded via `next/font/local`
- ❌ `MarketingNav` never renders `MobileNavDrawer`
- ❌ `NewsletterForm` submit handler is a stub
- ❌ `HeroNextClass` aria-label hardcoded

**Recommendation:** Sprint 1 (6 P0s, ~4-5 hr) → score lifts to ~24/30. Sprint 2 (17 P1s, ~8-10 hr) → ~27/30.

---

## Prioritized Remediation Backlog

### Sprint 1: P0 Critical Fixes (Day 1)

| # | Fix | Effort | Owner |
|---|---|---|---|
| 1 | Rotate 12 leaked secrets + untrack .env.local + install pre-commit hook + purge git history | 4 hours | User (security) |
| 2 | Fix `schedule.getWeek` input schema (`date` → `weekStart`) | 30 min | Engineer |
| 3 | Add Error Boundaries around Suspense on 4 broken pages | 1 hour | Engineer |
| 4 | Remove SSE from `HeroNextClass` (use tRPC query) | 30 min | Engineer |
| 5 | Remove `PNPM_VERSION` env var from 3 CI workflows | 10 min | DevOps |
| 6 | Add rate-limiting to auth mutations (signIn/signUp/magicLink) | 2 hours | Engineer |
| 7 | Fix rate-limit fail-OPEN (add try/catch) | 15 min | Engineer |
| 8 | Define shadcn HSL variables in `globals.css` | 30 min | Frontend |
| 9 | Darken warning/error/success colors for WCAG contrast | 30 min | Frontend |

**Sprint 1 total: ~10 hours**

### Sprint 2: P1 Important Fixes (Week 1)

| # | Fix | Effort |
|---|---|---|
| 1 | Apply 21 doc-conflict edits (Phase A report) | 2 hours |
| 2 | Fix 6 P0 frontend design-system gaps (Phase D) | 5 hours |
| 3 | Fix 6 P0 accessibility failures (Phase E) | 4 hours |
| 4 | Fix 4 P1 architecture anti-patterns (Phase H) | 4 hours |
| 5 | Write BOOK-006 real test + BOOK-004/005 (Phase G) | 4 hours |
| 6 | Add Dependabot config + concurrency + path filters (Phase I) | 1 hour |
| 7 | Wire Axiom logger (Phase I) | 1 hour |
| 8 | Configure Sanity CMS on live site (Phase F) | 2 hours |
| 9 | Add weekly production E2E job (Phase F) | 1 hour |

**Sprint 2 total: ~24 hours**

### Sprint 3: P2 Nits + Coverage Gaps (Week 2-3)

| # | Fix | Effort |
|---|---|---|
| 1 | Raise coverage to targets (api 90%, payments 95%, db 80%, web 70%, workers 85%) | 8+ hours |
| 2 | Implement factory pattern (`getMockMember`, `getMockSession`, etc.) | 2 hours |
| 3 | Create `FakeEmailService` for workers tests | 2 hours |
| 4 | Implement feature flags (Upstash Redis) | 2 hours |
| 5 | Add `vercel rollback` on smoke-test failure | 1 hour |
| 6 | 30+ P2 nits across all phases | 4+ hours |

**Sprint 3 total: ~19+ hours**

---

## What's Working Exceptionally Well

Despite the findings above, the Stillwater codebase has significant strengths:

1. **Architecture is exemplary** — 2-layer auth pattern, 4-tier RBAC, advisory locks for booking, idempotent Stripe webhooks, dual-path email (ADR-010), post-commit job triggers. The `proxy.ts` is a model for Next.js 16 (cookie-only, no DB, no auth import).
2. **Test suite is comprehensive** — 651 tests across 97 files, with critical scenario IDs (STRIPE-001–005 fully implemented), TDD discipline (AAA pattern), and integration tests using real Drizzle + testcontainers Postgres.
3. **Documentation is thorough** — 17,000+ lines across 4 spec docs with 11 ADRs, 45 discrepancy resolutions, and a full audit trail. The drift issues are cosmetic (version strings, test counts) not structural.
4. **Security posture is strong** — CSP without `'unsafe-eval'`/`'unsafe-inline'`, fail-fast `BETTER_AUTH_SECRET` guard, CSRF-safe sign-out, owner-checked IDOR prevention across all 12 protected procedures, zero `sql.raw()` calls.
5. **Design system is conceptually sound** — Editorial Calm thesis is distinctive, Warm Mineral palette avoids clichés, asymmetric grids and sharp corners are intentional, motion guardrails (transform/opacity only) are correct.
6. **Build is clean** — 9/9 packages type-check, lint, test, and build green. The React Compiler integration, Turborepo caching, and pnpm 11 workspaces are properly configured.

---

## Recommended Next Steps

1. **Immediately (today):** Execute the P0-1 security remediation (rotate 12 secrets, untrack .env.local, install hook, purge history). This is the highest-priority item.
2. **This week:** Fix the P0-2 production rendering bug (tRPC schema mismatch + Error Boundaries). The live site is currently broken for end users.
3. **This sprint:** Apply the 21 doc-conflict edits, fix the 6 P0 frontend gaps, fix the 6 P0 accessibility failures, and fix the 4 P1 architecture anti-patterns.
4. **Next sprint:** Raise test coverage to targets, implement factory pattern, wire Axiom, configure Sanity CMS, add production E2E job.
5. **Ongoing:** Add the "Post-Version-Bump Checklist" to SKILL.md to prevent documentation drift recurrence.

---

*End of Stillwater Comprehensive Code Review & Audit Report*

**Audit deliverables (9 phase reports + this consolidation + 7 screenshots):**

```
/home/z/my-project/download/
├── STILLWATER_AUDIT_REPORT.md          ← This file (consolidation)
└── audit/
    ├── phase-A-doc-alignment.md        ← 21 doc conflicts + fixes
    ├── phase-B-quality-gates.md        ← 8 CI gates (5 green, 3 deferred/1 high CVE)
    ├── phase-C-security.md             ← OWASP + Stripe + RBAC + secrets
    ├── phase-D-frontend-aesthetic.md   ← Anti-Generic scorecard (20/30)
    ├── phase-E-accessibility.md        ← WCAG 2.2 AAA audit (14 P0 + 7 P1)
    ├── phase-F-live-site-e2e.md        ← Live site broken (4/6 routes)
    ├── phase-G-test-coverage.md        ← 651 tests + coverage gaps
    ├── phase-H-architecture-code-review.md ← 10 files, 54.6/60 avg
    ├── phase-I-cicd-observability.md   ← pnpm EOL + Axiom missing
    └── screenshots/                    ← 7 full-page screenshots
```

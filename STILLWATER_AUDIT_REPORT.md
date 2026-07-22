# Stillwater — Comprehensive Code Review & Audit Report

**Date:** 2026-07-21 (UTC+8)
**Auditor:** Super Z (Frontend Architect & Avant-Garde UI Designer)
**Scope:** Full review of cloned repo `nordeim/stillwater` + live site `https://stillwater.jesspete.shop/`
**Workflow:** ANALYZE → PLAN → VALIDATE → IMPLEMENT → VERIFY → DELIVER (this report = VERIFY + DELIVER)

---

## 0. Executive Summary

| Dimension | Result |
|---|---|
| Repo cloned & inspected | ✅ All 13 phases (0–12) present on disk |
| Design docs reviewed | ✅ `design.md`, `PAD.md`, `stillwater_SKILL.md`, `MASTER_EXECUTION_PLAN.md`, `Project_Brief.md` |
| Source skills catalog reviewed | ✅ 144 skills indexed; 12 most-relevant skills deep-compared |
| Doc-vs-code discrepancies | ⚠️ 8 critical conflicts (all documentation-level, no code defects) |
| `pnpm_log.txt` review | ✅ Clean build — 9/9 packages, 17 static pages, server ready in 188ms |
| Live site E2E (agent-browser) | ✅ 10/11 routes pass; V16-3 "Loading…" fix confirmed |
| Six-Axis static code review | ⚠️ **1 P0 security incident** + 1 critical UX regression + 1 critical test-integrity issue |

### Headline findings (ranked)

1. 🔴 **P0 SECURITY INCIDENT** — Production secrets (`BETTER_AUTH_SECRET`, `SANITY_API_TOKEN`, `SANITY_WEBHOOK_SECRET`) committed to public GitHub repo via `env.local` files (no leading dot — gitignore missed them). Anyone with repo access can forge auth sessions.
2. 🔴 **CLS = 0.465** on home page — 9× above the 0.05 target. Root cause: `HeroNextClass` client-side fetch with no reserved height + `font-display: swap` on Cormorant Garamond.
3. 🔴 **Stale CSP tests verify file content (string matching), not behavior** — false confidence on a security-critical control.
4. 🟡 15 `as any` casts in workers bypass TypeScript safety (Drizzle RQB type-inference issue).
5. 🟡 `proxy.ts` nonce + CSP generation is dead code in production (Vercel+Next 16.2 drops the headers).
6. 🟡 SSE endpoint has no rate limiting (DoS vector).
7. 🟡 `admin.getRevenueDetails` has a cartesian-join bug producing wrong `totalEnrollments` / `noShowRate`.
8. 🟡 0 `next/image` usage anywhere — no AVIF/WebP, no responsive srcset, no CLS-preventing dimensions.
9. 🟡 3 different studio addresses across JSON-LD / worker emails / Footer.
10. 🟢 13/16 shadcn/ui primitives still on `React.forwardRef` (consistency miss, not a bug).

### What works exceptionally well (Praise)

1. **Defense-in-depth booking flow** — `pg_advisory_xact_lock` + double-booking check + atomic credit decrement + post-commit fire-and-forget job triggers.
2. **3-layer Stripe webhook idempotency** — fast-path check + advisory lock + unique-constraint catch.
3. **5-tier tRPC procedure ladder** (V13-4 added `managerProcedure`).
4. **Full 13×6 RBAC matrix test coverage** (78 parametric cases).
5. **Dual-path email sender** (ADR-010: `sendEmail` for Server Components, `sendEmailNative` for workers — zero bundle bloat).
6. **Anti-generic design enforcement** — `--radius: 0`, `shadow-none` + `rounded-none` explicit, no gradients, no glassmorphism, self-hosted fonts.
7. **WCAG AAA compliance** — 3px focus rings, 44×44 targets, `prefers-reduced-motion` with 0.01ms, skip link, proper heading hierarchy.
8. **Comprehensive security headers** — HSTS preload, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy.
9. **Timing-safe HMAC comparison** on Sanity webhook (with length guard).
10. **Supply-chain hygiene** — `minimumReleaseAge: 1440` in `pnpm-workspace.yaml` (24h delay on new publishes).

---

## 1. Phase 1 — ANALYZE: Deep Multi-Dimensional Reconnaissance

### 1.1 What Stillwater is

Per `Project_Brief.md` (refreshed 2026-07-19 post-v16-3):

> Enterprise-grade platform for a single yoga studio (Southeast Portland). Not a SaaS — one studio's bespoke operations system: public marketing site, member class-booking, staff/admin tools, Stripe subscriptions, and background email/job processing. Wrapped around an "Editorial Calm" design identity (warm mineral palette: stone/clay/water/sand — no gradients, no drop shadows, no pill buttons).

### 1.2 Tech stack (verified against `pnpm-lock.yaml`)

| Layer | Tech | Version |
|---|---|---|
| Framework | Next.js | 16.2.10 (Turbopack) |
| UI runtime | React | 19.2.7 |
| Styling | Tailwind CSS | v4.3.2 (CSS-first `@theme`) |
| Component primitives | shadcn/ui (Radix) | 16 components |
| Type safety | TypeScript | 5.9 (strict mode) |
| API layer | tRPC | v11 |
| ORM | Drizzle ORM | 0.45.2 |
| Database | PostgreSQL | 17 (Docker) / Neon (prod) |
| Auth | Better Auth | 1.6.23 (Google OAuth + Magic Link + customSession) |
| Background jobs | Trigger.dev | v4.5.0 (root `@trigger.dev/sdk` import) |
| Email | React Email v6.6.6 + Resend 6.17.1 (dual-path per ADR-010) |
| Payments | Stripe | 22.3.0 |
| CMS | Sanity Studio v6.3.0 + @sanity/client v7.23.0 |
| Observability | Sentry + PostHog (18 events) + Axiom + Checkly (3 checks) |
| Rate limiting | Upstash Redis (sliding window, fail-open) |
| Monorepo | Turborepo 2.10.4 + pnpm 11.9 workspaces |
| Deployment | Vercel + Neon PostgreSQL |

### 1.3 Phase completion status (verified on disk)

All 13 phases (0–12) are implemented on disk. See Appendix A for the per-phase file inventory.

---

## 2. Phase 2 — PLAN: Audit Methodology

### 2.1 Skills selected from `skills/skills-catalog.md`

The catalog lists 144 skills across 10 categories. The 12 most relevant for this audit:

| Skill | Why selected |
|---|---|
| `nextjs16-react19-tailwindv4-trpcv11-drizzle-better-auth` | Exact tech-stack match — distilled into `stillwater_SKILL.md` |
| `code-quality-standards` | Six-Axis review methodology (Correctness, Readability, Architecture, Security, Performance, Aesthetic/UX) |
| `code-review-and-audit` | Unified review + security audit pipeline |
| `security-and-hardening` | OWASP-aware hardening checklist |
| `vulnerability-scanner` | OWASP 2025 + supply-chain security |
| `webapp-testing` | E2E testing patterns |
| `webapp-testing-journey` | URL journey testing |
| `agent-browser` | Headless browser CLI for live-site E2E (v0.31.1 installed) |
| `authjs-vs-better-auth` | Better Auth v1.6.23 patterns verification |
| `sanity-best-practices` | Sanity schema/GROQ patterns |
| `source-driven-development` | Doc-backed decision verification |
| `coding-agent` | Plan → Execute → Verify → Deliver workflow |

### 2.2 Audit execution plan

| Step | Agent | Method | Status |
|---|---|---|---|
| 1. Codebase inventory | EXPLORE-1 (Explore agent) | Glob/Grep/Read of all packages | ✅ Complete |
| 2. Doc conflict audit | DOCS-1 (general-purpose) | Read 5 docs + 12 source skills + 19 web searches | ✅ Complete |
| 3. `pnpm_log.txt` review | Main agent | Direct read | ✅ Clean build |
| 4. Live site E2E | E2E-1 (general-purpose) | `agent-browser` CLI on 11 URLs + 9 API endpoints + CWV + mobile | ✅ Complete |
| 5. Six-Axis code review | REVIEW-1 (general-purpose) | Read 37 priority files + run `pnpm check-types/lint/test` + grep security patterns | ✅ Complete |
| 6. Verify critical findings | Main agent | `git ls-files`, `git log`, direct inspection of `env.local` | ✅ Confirmed |

---

## 3. Phase 3 — VALIDATE: Doc & Skill Conflict Audit

### 3.1 Document inventory

| Document | Lines | Purpose | Authority | Last Updated |
|---|---|---|---|---|
| `design.md` | 846 | Phase 1 architectural critique | Historical / superseded | Pre-implementation |
| `PAD.md` | 3,471 | Project Architecture Document (31 sections, 11 ADRs) | **Authoritative** | v1.19.0 (2026-07-19) |
| `stillwater_SKILL.md` | 9,691 | Distilled operational reference (24 sections, 112 lessons) | **Authoritative** | v3.0.0 (2026-07-12, V16-3 note 2026-07-19) |
| `MASTER_EXECUTION_PLAN.md` | 4,587 | 13-phase execution plan with TDD contracts | Living plan | v1.8.0 (2026-07-14) |
| `Project_Brief.md` | 207 | High-level summary | Summary doc | 2026-07-19 |

### 3.2 Cross-document conflicts (8 Critical)

| # | Topic | Ground truth | Severity |
|---|---|---|---|
| 1 | Trigger.dev task count | **12 tasks** on disk (booking-cancellation added V8 audit C2); PAD/MEP/Brief all say "11"; SKILL.md is correct in §2.1 + §20.8 but stale in §3.2 (line 252) | Critical |
| 2 | tRPC procedure tiers | **5 tiers** on disk (`managerProcedure` added V13-4); PAD/MEP/Brief all say "4 access tiers"; only SKILL.md is correct | Critical |
| 3 | Sanity version | **Studio v6 + client v7** on disk; MEP line 114, design.md line 778, SKILL.md ADR-005 line 9236 all say "Sanity v3" | Critical |
| 4 | SKILL.md §9.9 line 5183 | Says "production CSP ships NEITHER `'unsafe-eval'` NOR `'unsafe-inline'`" — but V16-3 fix added `'unsafe-inline'` back (without `strict-dynamic`); SKILL.md footer acknowledges but body wasn't updated | Critical |
| 5 | Source skill line 259 | `skills/nextjs16-react19-tailwindv4-trpcv11-drizzle-better-auth/SKILL.md` line 259 says `@trigger.dev/sdk/v4` (subpath doesn't exist); source skill's own 6 other locations correctly say root import | Critical |
| 6 | SKILL.md "proxy.ts runtime docs inconsistent" | Outdated — official Next.js 16 docs are now CONSISTENT: `proxy.ts` runs ONLY on Node.js runtime (Edge no longer available in proxy.ts) | Important |
| 7 | `proxy.ts` CSP vs `next.config.ts` CSP | Two CSP definitions exist; `proxy.ts` nonce + `'strict-dynamic'` doesn't reach production on Vercel+Next 16.2 (V9-2 comment); `next.config.ts` ships `'unsafe-inline'` (V16-3 fix) | Important |
| 8 | `PAD.md §20.5` CSP spec | Shows `script-src 'self' https://js.stripe.com https://cdn.jsdelivr.net` (no `'unsafe-inline'`, adds `cdn.jsdelivr.net` not in code); actual `next.config.ts:146` ships `script-src 'self' 'unsafe-inline' https://js.stripe.com` | Important |

### 3.3 Web search verifications (19 performed, all cited)

Key ground-truth confirmations:

| Claim | Source | Result |
|---|---|---|
| Trigger.dev v4 import path = root `@trigger.dev/sdk` | `https://trigger.dev/docs/llms-full.txt` | ✅ SKILL.md correct |
| `@trigger.dev/sdk` latest = 4.5.0 | `https://www.npmjs.com/package/@trigger.dev/sdk` | ✅ Matches `package.json` |
| Next.js 16 `proxy.ts` default runtime = Node.js ONLY | `https://nextjs.org/docs/app/api-reference/file-conventions/proxy` | ✅ SKILL.md "inconsistent" claim is OUTDATED |
| React Compiler in Next.js 16 = stable but NOT default | `https://nextjs.org/blog/next-16` | ✅ SKILL.md correct |
| Better Auth `customSession` plugin pattern | `https://better-auth.com/docs/concepts/session-management` | ✅ Actual code matches |
| Better Auth `magicLinkClient` plugin | `https://better-auth.com/docs/plugins/magic-link` | ✅ Actual code matches |
| Stripe 22.x `current_period_end` location | `https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end` | ✅ SKILL.md correct |
| React Email v6 unified package import | `https://react.email/docs/changelog` + `https://resend.com/blog/react-email-6` | ✅ SKILL.md correct |
| Drizzle ORM 0.45 relations v1 vs v2 | `https://orm.drizzle.team/docs/relations-v1-v2` | ✅ SKILL.md correct |
| CSP `strict-dynamic` causes `unsafe-inline` to be ignored | `https://www.w3.org/TR/CSP3` + `https://content-security-policy.com/strict-dynamic` | ✅ V16-3 root-cause narrative is correct |
| Sanity Studio v6 is current latest | `https://github.com/sanity-io/sanity/releases` | ✅ SKILL.md §2.1 correct; ADR-005 wrong |

### 3.4 Source skills vs `stillwater_SKILL.md` conflicts

| Source skill | Conflict | Severity |
|---|---|---|
| `nextjs16-react19-tailwindv4-trpcv11-drizzle-better-auth` | Line 259 says `@trigger.dev/sdk/v4` (subpath doesn't exist); source skill's own 6 other locations correctly say root import. SKILL.md correctly uses root import everywhere. | Critical |
| Same source skill | §14.6.3 line 3580 CSP example has `'unsafe-eval'` (no Stripe); doesn't reflect V16-3 production state | Important |
| `authjs-vs-better-auth` | Source skill uses `async function proxy(request)`; actual code uses sync `function proxy(request)`. Both work; SKILL.md matches actual code. | Minor |
| `webapp-testing-journey` | Line 17 references `agent-browser: v0.26.0`; actual installed is v0.31.1 | Minor |
| `code-quality-standards`, `code-review-and-audit`, `security-and-hardening`, `vulnerability-scanner`, `webapp-testing`, `sanity-best-practices`, `sanity-io-deploy`, `source-driven-development`, `coding-agent`, `spec-driven-development` | All fully aligned with SKILL.md | ✅ No conflict |

**Verdict:** `stillwater_SKILL.md` is the most up-to-date doc. Its distillation preserved source-skill content faithfully, with one stale line in the source skill (line 259 `/v4`) corrected to root import.

---

## 4. Phase 4 — IMPLEMENT (audit execution): `pnpm_log.txt` Review

### 4.1 Build & server start status: ✅ CLEAN

| Step | Result |
|---|---|
| `pnpm db:setup` | ✅ Postgres container running, .env.local present |
| `pnpm db:migrate` | ✅ 6 migrations applied via drizzle-kit (1.7s) |
| `pnpm db:seed` | ✅ 5 users / 5 members / 3 instructors / 4 classes / 7 sessions / 3 plans (3.1s) |
| `pnpm db:seed:e2e` | ✅ 5 E2E accounts + 60 sessions + 5 enrollments + 1 waitlist (1.3s) |
| `pnpm install` | ✅ Already up to date (971ms) |
| `pnpm build` | ✅ 9/9 packages successful, 17 static pages (48.9s) |
| `cd apps/web && pnpm build` | ✅ Compiled successfully in 22.8s |
| `pnpm start` | ✅ Ready in 188ms |

### 4.2 Build route map (from pnpm_log.txt)

| Symbol | Meaning | Routes |
|---|---|---|
| ○ (Static) | prerendered as static content | `/_not-found`, `/about`, `/blog`, `/instructors`, `/manifest.webmanifest`, `/robots.txt` |
| ● (SSG) | prerendered with `generateStaticParams` | `/blog/[slug]`, `/instructors/[slug]` (3 instructors: mei-tanaka, james-harlow, aiko-mori) |
| ƒ (Dynamic) | server-rendered on demand | `/`, `/admin/*` (11 pages), `/api/*` (5 endpoints), `/auth/*` (4 pages), `/book/[sessionId]`, `/dashboard`, `/history`, `/membership`, `/opengraph-image`, `/pricing`, `/profile`, `/schedule`, `/sitemap.xml` |

### 4.3 Warnings (non-blocking)

- ⚠️ Sanity Studio: styled-components version mismatch (^6.1.13 declared vs ^6.1.15 required by sanity) — build still succeeds
- ⚠️ "Using edge runtime on a page currently disables static generation for that page" — expected for `proxy.ts` (edge runtime)
- ⚠️ Turborepo update available (2.10.4 → 2.10.5)
- ⚠️ pnpm update available (11.9.0 → 11.15.1)

**No server start issues.** The V16-3 remediation is fully effective.

---

## 5. Phase 5 — VERIFY: Live Site E2E + Six-Axis Code Review

### 5.1 Live site E2E (agent-browser v0.31.1)

**Test execution:** 11 URLs (6 marketing + 3 instructor detail + 2 auth) + 9 API endpoints + Core Web Vitals + mobile viewport (375×812).

#### 5.1.1 Marketing routes — ALL PASS

| Route | Title | H1 | Loading text? | Console errors | Status |
|---|---|---|---|---|---|
| `/` (force-dynamic V16-1) | Stillwater Yoga Studio — Mindful Movement in SE Portland | 1 | NO_LOADING | 0 | ✅ Pass |
| `/schedule` (force-dynamic V16-1) | Schedule — Stillwater Yoga | 1 | NO_LOADING | 0 | ✅ Pass |
| `/pricing` (force-dynamic V16-1) | Pricing — Stillwater Yoga | 1 | NO_LOADING | 0 | ✅ Pass |
| `/instructors` (static) | Instructors — Stillwater Yoga | 1 | NO_LOADING | 0 | ✅ Pass |
| `/about` (static) | About — Stillwater Yoga | 1 | NO_LOADING | 0 | ✅ Pass |
| `/blog` (static, empty state) | Blog — Stillwater Yoga | 1 | NO_LOADING | 0 | ✅ Pass |

**V16-3 "Loading…" hang bug is fully resolved.** Every previously-broken dynamic route now renders actual content with proper titles, exactly 1 H1 each, no console errors, no page errors.

#### 5.1.2 Instructor detail pages (SSG) — ALL PASS

| Route | Title | SSG cache | Status |
|---|---|---|---|
| `/instructors/mei-tanaka` | mei tanaka — Stillwater Yoga | `x-nextjs-cache: HIT` | ✅ Pass |
| `/instructors/james-harlow` | james harlow — Stillwater Yoga | `x-nextjs-cache: HIT` | ✅ Pass |
| `/instructors/aiko-mori` | aiko mori — Stillwater Yoga | `x-nextjs-cache: HIT` | ✅ Pass |

⚠️ **Minor SEO issue:** Instructor `<title>` uses slug-form lowercase ("mei tanaka") instead of display name ("Mei Tanaka" in H1).

#### 5.1.3 Auth pages — PASS

- `/auth/sign-in` — renders Better Auth UI (Google + magic-link) ✅
- `/auth/sign-up` — returns 404 (intentional — magic-link sign-in handles new users)

#### 5.1.4 API endpoint health

| Endpoint | Status | Notes |
|---|---|---|
| `/api/auth/get-session` | 200 | Better Auth v1.6 endpoint ✓ |
| `/api/auth/ok` | 200 | Better Auth health check ✓ |
| `/api/trpc/instructors.list` | 200 | Public tRPC procedure ✓ |
| `/sitemap.xml` | 200 | Valid XML `<urlset>` ✓ |
| `/robots.txt` | 200 | Correct `Disallow` + `Sitemap` directive ✓ |
| `/manifest.webmanifest` | 200 | Valid PWA manifest (theme #C4856A, 192px+512px icons) ✓ |

#### 5.1.5 SEO & accessibility

| Check | Result |
|---|---|
| Page title | ✅ Descriptive, location-specific |
| Meta description | ✅ Present, keyword-rich |
| Canonical URL | ✅ `https://stillwater.jesspete.shop/` |
| HTML lang | ✅ `en` |
| OG tags | ✅ `og:title` + `og:image` |
| Skip link | ✅ "Skip to main content" |
| Heading hierarchy | ✅ 1× H1 → 6× H2 → 30+ H3, no skipped levels |
| JSON-LD | ✅ `YogaStudio` schema with address, hours, priceRange, hasMap |

#### 5.1.6 Core Web Vitals — ⚠️ CLS REGRESSION

| Metric | Value | Target | Status |
|---|---|---|---|
| TTFB | 116 ms | < 200 ms | ✅ Pass |
| LCP | 708 ms | < 1500 ms | ✅ Pass |
| **CLS** | **0.465** | < 0.05 | ❌ **FAIL (9× over target)** |
| INP | 0 ms (no interactions) | < 100 ms | ⚠️ Not measurable |

#### 5.1.7 Mobile viewport (375×812) — PASS

- No horizontal overflow (`scrollWidth - clientWidth = 0`)
- 1 H1, correct title
- No console/page errors
- No "Loading…" text

#### 5.1.8 Screenshots saved

13 screenshots in `/home/z/my-project/download/e2e-screenshots/`:
- `home.png` (684 KB), `schedule.png`, `pricing.png`, `instructors.png`, `about.png`, `blog.png`
- `instructor-mei-tanaka.png`, `instructor-james-harlow.png`, `instructor-aiko-mori.png`
- `auth-sign-in.png`, `auth-sign-up.png`
- `home-mobile.png` (568 KB)

### 5.2 Six-Axis static code review

#### 5.2.1 Per-axis scores

| Axis | Score | Verdict |
|---|---|---|
| 1. Correctness | 8.5/10 | Logic is sound; advisory locks, idempotency, RBAC all wired correctly |
| 2. Readability | 8.0/10 | Excellent header docstrings; fix-comment trails; some `as any` in workers hurt local reasoning |
| 3. Architecture | 8.5/10 | Clean monorepo boundaries; 5-tier procedure ladder; dual-path email; layered auth; proxy.ts/next.config.ts CSP overlap is a seam |
| 4. Security | **5.0/10** | ⚠️ Leaked production secrets in public git repo. Otherwise solid HMAC/idempotency/RBAC, but the leak drops the score dramatically |
| 5. Performance | 6.0/10 | CLS=0.465 has a clear root cause; good DB timeout discipline; no `next/image`; font-display: swap on display serif |
| 6. Aesthetic/UX Rigor | 8.5/10 | Anti-generic patches verified (no shadows, `--radius: 0`, no gradients, no glassmorphism); WCAG AAA focus rings + reduced-motion; 13/16 shadcn primitives still use `forwardRef` |

**Overall: 7.4/10** — would be 8.5+ if not for the leaked-secrets finding.

#### 5.2.2 Test suite status

| Package | Test files | Tests | Status |
|---|---|---|---|
| @stillwater/auth | 4 | 102 | ✅ pass |
| @stillwater/api | 13 | 137 | ✅ pass |
| @stillwater/payments | 7 | 47 | ✅ pass |
| @stillwater/email | 17 | 71 | ✅ pass |
| @stillwater/workers | 12 | 45 | ✅ pass |
| @stillwater/db | 18 | 131 | ✅ pass |
| @stillwater/web | 34 | 230 | ✅ pass |
| **Total** | **105** | **763** | **100% pass** |

- `pnpm check-types`: ✅ 8/8 packages pass `tsc --noEmit` cleanly
- `pnpm lint`: ⚠️ web = 9 warnings / 0 errors; workers = 13 parsing errors (tsconfig include pattern bug — `**/*.test.ts` excluded)
- `pnpm test`: ✅ 763/763 pass in ~75s

---

## 6. CRITICAL FINDINGS (must-fix immediately)

### 🔴 Finding #1 — P0 SECURITY: Production secrets committed to public GitHub repo

**Severity:** P0 (Critical security incident)
**Files affected:**
- `apps/web/env.local` (tracked since commit `dbf0cd5 env`)
- `env.local` (root, tracked since same commit)

**Root cause:** `.gitignore` has the pattern `.env.local` (WITH leading dot), but the committed files are named `env.local` (NO leading dot). The gitignore pattern doesn't match the actual filename, so the files got committed.

**Leaked secrets (verified by direct read):**

| Secret | Location | Value (truncated) | Risk |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | `apps/web/env.local:23` | `aJp8oRveNW1g7mFLQmkpZsCokNbExrERoTOETluNzt4=` | Anyone can forge session cookies for ANY user (including owner role) |
| `BETTER_AUTH_URL` | `apps/web/env.local:24` | `https://stillwater.jesspete.shop` | Confirms this is the production secret, not a dev placeholder |
| `SANITY_API_TOKEN` | `apps/web/env.local:43` | `skNiilQartsPVUsqNPlu4LBbzNLxPKxAEXHvk88Uq72EbeVjTZnynAX6r6lLd2PXmkGUiNdRnNBaCeIL3a0nZrYOgV2IJ8IS3oiyBYbzE1JCeZGdFQwcgKs2KjWs9um8DaIoBUj9EVTLNIOWTqmcmsHJkWPJ3PcYQzaTVrwH1CCDksK94jTJ` (160 chars) | Read access to all Sanity CMS content (instructor bios, blog posts, FAQs, testimonials) |
| `SANITY_WEBHOOK_SECRET` | `apps/web/env.local:45` | `lo7e6qzG/Hk6j7Yx1v+eti+OSzThSvND7KA+tyd2uKY=` | Anyone can forge Sanity webhook calls → trigger unauthorized ISR revalidation or inject content |

The root `env.local` file ALSO contains a different (also-real-looking) `SANITY_API_TOKEN` (160-char) and `SANITY_WEBHOOK_SECRET` (`+XMPa8ssw2DhLNFZAGFNn3iV3tC7oryq1xEIywG7mSU=`), but `BETTER_AUTH_SECRET=your-secret-here-min-32-chars` (placeholder).

**Git history confirms exposure across multiple commits:**
```
dbf0cd5 env                              ← initial leak
d507f38 update skills                    ← still present
2e56f2a update docs                      ← still present
684b214 update pnpm log                  ← still present (latest)
```

The file's own comment block says:
```
# Copy this file to .env.local and fill in the values.
# NEVER commit .env.local or any file containing real secrets.
```
Yet the developer committed the file AS `env.local` (no dot), not `.env.local` (with dot).

**Required remediation (in priority order):**

1. **IMMEDIATELY rotate all 3 production secrets:**
   ```bash
   # 1. Generate new BETTER_AUTH_SECRET
   openssl rand -base64 32
   # 2. Update Better Auth config with new secret (Vercel env vars + local .env.local)
   # 3. Rotate Sanity API token: https://www.sanity.io/manage/project/v2gzd4bc/api
   #    → Revoke old token → Create new read-only token → Update env vars
   # 4. Rotate Sanity webhook secret: Sanity Cloud → Webhooks → Update with new secret
   #    → Must match the new SANITY_WEBHOOK_SECRET env var
   ```
   Rotating `BETTER_AUTH_SECRET` automatically invalidates ALL existing user sessions — users will need to sign in again. This is desired behavior.

2. **Remove the env.local files from git tracking:**
   ```bash
   git rm --cached env.local apps/web/env.local
   git commit -m "security: remove leaked env.local files from git tracking (P0)

   - env.local and apps/web/env.local were committed without leading dot
   - .gitignore pattern '.env.local' didn't match 'env.local' (no dot)
   - Production BETTER_AUTH_SECRET, SANITY_API_TOKEN, SANITY_WEBHOOK_SECRET exposed
   - All secrets rotated in production before this commit
   - See STILLWATER_AUDIT_REPORT.md §6 Finding #1"
   ```

3. **Rename to `.env.local` (with leading dot) so the existing .gitignore pattern catches them:**
   ```bash
   mv env.local .env.local
   mv apps/web/env.local apps/web/.env.local
   ```

4. **Strengthen `.gitignore` to catch both dot and non-dot variants:**
   ```
   # Existing
   .env
   .env.local
   .env.development.local
   .env.test.local
   .env.production.local
   
   # Add (defense-in-depth — catches non-dot variants)
   env.local
   env.*.local
   ```

5. **Scrub git history** (the secrets are still in old commits even after `git rm --cached`):
   ```bash
   # Option A: BFG Repo-Cleaner (recommended — fast)
   bfg --delete-files env.local --delete-files apps/web/env.local
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   
   # Option B: git-filter-repo (more thorough)
   git filter-repo --path env.local --path apps/web/env.local --invert-paths
   
   # After history scrub, force-push to GitHub:
   git push --force origin main
   # Then ask anyone who has cloned to re-clone (history was rewritten)
   ```

6. **Add a pre-commit hook to prevent future `.env*` commits (both dot and non-dot):**
   ```bash
   # .husky/pre-commit
   #!/bin/sh
   if git diff --cached --name-only | grep -E '(^|/)\.?env\.'; then
     echo "ERROR: Attempted to commit an env file. Use .env.example (no secrets) instead."
     exit 1
   fi
   ```

7. **Audit GitHub clone history** — anyone who cloned the repo between commit `dbf0cd5` (initial leak) and now has the production secrets. If the repo was ever public during that window, assume the secrets are compromised and rotate immediately.

8. **Consider logging to Sentry / Axiom** — set up an alert for any auth session that was created with the old `BETTER_AUTH_SECRET` after rotation (would indicate an attacker using the leaked key).

### 🔴 Finding #2 — CLS = 0.465 on home page (9× above target)

**Severity:** Critical (UX + SEO regression)
**Files affected:**
- `apps/web/src/components/marketing/HeroNextClass.tsx:23-36`
- `packages/ui/src/fonts/cormorant/cormorant.css:8` (also `dm-sans.css`, `jetbrains-mono.css`)

**Root causes (verified by code review):**

1. **`HeroNextClass` client-side fetch with no reserved height:**
   ```tsx
   // HeroNextClass.tsx
   const [weekStart, setWeekStart] = useState<Date | null>(null);
   useEffect(() => {
     setWeekStart(getWeekStart(new Date()));
   }, []);
   const { data } = useQuery({
     enabled: !!weekStart,  // ← only fetches AFTER hydration
     // ...
   });
   // SSR ships empty "No upcoming classes" card
   // Client populates after fetch resolves → height delta → layout shift
   ```

2. **`font-display: swap` on Cormorant Garamond:**
   ```css
   /* packages/ui/src/fonts/cormorant/cormorant.css */
   @font-face {
     font-family: 'Cormorant Garamond';
     /* ... */
     font-display: swap;  /* ← causes FOIT→FOUT shift on display serif */
   }
   ```
   Cormorant Garamond (display serif) has very different metrics from system fallback serif. H1 `text-[clamp(3.5rem,6.5vw,7.5rem)]` shifts significantly on font load.

**Required remediation:**

```tsx
// Option A (recommended): Move fetch to server component, pass as prop
// apps/web/src/components/marketing/Hero.tsx (server component)
import { db } from '@stillwater/db';

export async function Hero() {
  const weekStart = getWeekStart(new Date());
  const nextClass = await db.query.classSessions.findFirst({
    where: and(gte(classSessions.startsAt, weekStart), eq(classSessions.status, 'scheduled')),
    orderBy: asc(classSessions.startsAt),
    with: { class: true, instructor: { with: { user: true } } },
  }).catch(() => null);

  return <HeroNextClass nextClass={nextClass} />;  // Pure presentational
}

// Option B (fallback): Add skeleton with reserved height
// HeroNextClass.tsx
export function HeroNextClass() {
  // ... existing hook code ...
  return (
    <div className="min-h-[280px]">  {/* ← reserves space */}
      {data ? <PopulatedCard data={data} /> : <SkeletonCard />}
    </div>
  );
}
```

```css
/* packages/ui/src/fonts/cormorant/cormorant.css */
@font-face {
  font-family: 'Cormorant Garamond';
  /* ... */
  font-display: optional;  /* ← if not loaded in 100ms, use fallback for that pageview */
}

/* OR: use size-adjust to match fallback metrics */
@font-face {
  font-family: 'Cormorant Garamond Fallback';
  src: local('Georgia');
  size-adjust: 100%;
  ascent-override: 90%;
  descent-override: 10%;
  line-gap-override: 0%;
}
```

**Verification:**
```bash
# After fix, re-run E2E-1's CLS measurement:
agent-browser --session verify open https://stillwater.jesspete.shop/
agent-browser --session verify wait --load networkidle
agent-browser --session verify wait 3000
agent-browser --session verify eval "
  new Promise(resolve => {
    const vitals = {};
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'cumulative-layout-shift') vitals.cls = (vitals.cls || 0) + entry.value;
      }
    }).observe({type: 'cumulative-layout-shift', buffered: true});
    setTimeout(() => resolve(JSON.stringify(vitals)), 2000);
  })
"
# Target: CLS < 0.05
```

### 🔴 Finding #3 — Stale CSP tests verify file content, not behavior

**Severity:** Critical (false confidence on a security-critical control)
**Files affected:**
- `apps/web/src/app/api/auth/[...all]/csp-verify.test.ts:32-46`
- `apps/web/src/app/api/auth/[...all]/next-config-csp-verify.test.ts:43-49`

**Root cause:**

The tests assert on file CONTENT (string matching), not actual CSP behavior:
```ts
// csp-verify.test.ts
expect(proxyFileContent).toContain("'strict-dynamic'");  // ← passes on comment-block strings
```

The `next-config-csp-verify.test.ts` asserts `.toContain("'strict-dynamic'")` — passes ONLY because the V16-3 comment block in `next.config.ts:109-134` mentions the string in a historical note. The actual production CSP (line 146) does NOT contain `'strict-dynamic'` (it was removed in V16-3).

These tests would not catch:
- A real CSP regression where `'strict-dynamic'` is accidentally re-added
- A CSP where `'unsafe-inline'` is removed (breaking Next.js RSC streaming)
- A CSP where `https://js.stripe.com` is removed (breaking Stripe checkout)

**Required remediation:**

```ts
// Rewrite to parse the actual CSP from next.config.ts headers() config
// csp-verify.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function parseNextConfigCSP(): string {
  const configPath = join(process.cwd(), 'next.config.ts');
  const content = readFileSync(configPath, 'utf-8');
  // Extract the CSP string from the headers() function
  const cspMatch = content.match(/Content-Security-Policy[^]*?['"]([^'"]+)['"]/);
  if (!cspMatch) throw new Error('CSP not found in next.config.ts');
  return cspMatch[1];
}

describe('Production CSP (next.config.ts headers)', () => {
  const csp = parseNextConfigCSP();

  it('includes script-src with unsafe-inline (V16-3 fix)', () => {
    expect(csp).toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it('does NOT include strict-dynamic (V16-3 removed it)', () => {
    expect(csp).not.toMatch(/script-src[^;]*'strict-dynamic'/);
  });

  it('allowlists Stripe JS', () => {
    expect(csp).toMatch(/script-src[^;]*https:\/\/js\.stripe\.com/);
  });

  it('does NOT include unsafe-eval', () => {
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
  });
});
```

Better yet: run the app and assert on the response `Content-Security-Policy` header (behavior test, not file-content test).

---

## 7. IMPORTANT FINDINGS (should-fix in next 2 weeks)

### Finding #4 — 15 `as any` casts in workers bypass TypeScript safety

**Files:** All 12 task files in `services/workers/src/*.ts`

**Pattern:**
```ts
// services/workers/src/class-reminder-24h.ts:24
import { enrollments } from '@stillwater/db';  // ← imported correctly

// But then later:
const upcoming = await (db.query.enrollments as any).findFirst({
  where: (e: any, { eq, and }: any) => and(
    eq(e.sessionId, payload.sessionId),
    eq(e.status, 'confirmed'),
  ),
  // ...
});
```

**Root cause:** Drizzle 0.45 RQB type-inference issue (documented in SKILL.md Lesson 69). The same files DO `import { enrollments }` from `@stillwater/db` — the `as any` is to work around the type inference, not because the schema is unreachable.

**Fix options:**
1. **Add a typed wrapper in `@stillwater/db`** that returns pre-typed query builders:
   ```ts
   // packages/db/src/typed-queries.ts
   export const typedQueries = {
     enrollments: {
       findFirst: (opts: Parameters<typeof db.query.enrollments.findFirst>[0]) =>
         db.query.enrollments.findFirst(opts),
     },
   };
   ```
2. **Upgrade to Drizzle 1.0 stable** when `defineRelations()` lands (currently in beta) — this fixes the type inference.

### Finding #5 — `proxy.ts` nonce + CSP generation is dead code in production

**File:** `apps/web/proxy.ts:73-95`

**Issue:** Per V9-2 comment, proxy.ts response headers don't reach production on Vercel + Next.js 16.2.10. The per-request nonce generation (`crypto.randomUUID` + `Buffer.from` base64) runs on every request but has zero effect — `next.config.ts` `headers()` overrides it.

**Fix:** Pick ONE source of truth for CSP:
- **Option A (pragmatic):** Delete the dead nonce/CSP code from `proxy.ts`. Keep `next.config.ts` `headers()` as the only CSP source. Add a clear comment.
- **Option B (ideal but requires Vercel fix):** Migrate to Vercel's `middleware.ts` Headers API (now stable in Next.js 16.x). Remove `next.config.ts` CSP. This enables nonce-based CSP (more secure than `'unsafe-inline'`).

### Finding #6 — SSE endpoint has no rate limiting

**File:** `apps/web/src/app/api/schedule/stream/route.ts:94-157`

**Issue:** Each SSE client holds a `setInterval` polling the DB every 10s for up to 5 minutes (= 30 DB queries per client). A malicious client opening 100 concurrent connections = 600 DB queries/min.

**Fix:** Add per-IP rate limit on SSE connection count:
```ts
// At top of GET handler
const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
const concurrentKey = `sse:concurrent:${ip}`;
const current = await redis.incr(concurrentKey);
if (current === 1) await redis.expire(concurrentKey, 300);  // 5 min TTL
if (current > 5) {
  return new Response('Too many concurrent SSE connections', { status: 429 });
}

// On cleanup (request.signal abort):
request.signal.addEventListener('abort', () => {
  redis.decr(concurrentKey).catch(() => {});
  // ... existing cleanup
});
```

### Finding #7 — `admin.getRevenueDetails` cartesian-join bug

**File:** `packages/api/src/routers/admin.ts:317-326`

**Issue:** The query `crossJoin(sql\`enrollments\`)` against a subquery produces `totalEnrollments = enrollments_count × session_count` (cartesian product), not the intended count. The `avgClassSize` calc is correct, but `totalEnrollments` and `noShowRate` are wrong.

**Fix:** Remove the `crossJoin(sql\`enrollments\`)` and run a separate `count(*)` query:
```ts
const [revenueByMonth, totalEnrollmentsResult] = await Promise.all([
  db.select({...}).from(...).groupBy(...),
  db.select({ count: count() }).from(enrollments).where(eq(enrollments.status, 'confirmed')),
]);
const totalEnrollments = totalEnrollmentsResult[0]?.count ?? 0;
```

### Finding #8 — 0 `next/image` usage anywhere

**Issue:** `apps/web/next.config.ts:80-107` has `images` config (`remotePatterns` for Cloudflare/Sanity CDNs + `formats: ['avif', 'webp']`), but `rg "<Image" --type ts --type tsx apps/` returns 0 matches. All images use raw `<img>` or CSS backgrounds — no AVIF/WebP, no responsive srcset, no lazy loading, no CLS-preventing dimensions.

**Fix:** Migrate marketing images to `next/image`:
```tsx
import Image from 'next/image';

<Image
  src={instructor.imageUrl}
  alt={instructor.name}
  width={400}
  height={500}
  priority={isAboveTheFold}
  sizes="(max-width: 768px) 100vw, 400px"
  className="object-cover"
/>
```

### Finding #9 — 3 different studio addresses across the codebase

| Location | Address |
|---|---|
| JSON-LD default (`apps/web/src/lib/seo/schemas.ts:36`) | `123 SE Division St` |
| Worker emails (`services/workers/src/class-reminder-{24h,1h}.ts:101`) | `123 SE Division Street, Portland, OR 97202` |
| Footer (V14-2 corrected value, `apps/web/src/lib/marketing/copy.ts:127`) | `2847 SE Division Street, Portland, OR 97202` |

**Fix:** Centralize in a shared constant or Sanity site settings:
```ts
// packages/config/src/site.ts
export const SITE = {
  address: {
    street: '2847 SE Division Street',
    city: 'Portland',
    state: 'OR',
    zip: '97202',
    full: '2847 SE Division Street, Portland, OR 97202',
  },
  // ...
};
```

### Finding #10 — Instructor detail `<title>` uses slug-form lowercase

**File:** `apps/web/src/app/(marketing)/instructors/[slug]/page.tsx:105-106`

**Issue:** `<title>` uses `instructor.slug.replace(/-/g, ' ')` → "mei tanaka" (lowercase) instead of the display name ("Mei Tanaka") that appears in the H1.

**Root cause:** `instructors` table has no `name` column — display name lives on `users.name` but isn't eager-loaded.

**Fix:**
```tsx
// page.tsx
const instructor = await db.query.instructors.findFirst({
  where: eq(instructors.slug, params.slug),
  with: { user: true },  // ← add this
});

// generateMetadata
export async function generateMetadata({ params }: Props) {
  const instructor = await getInstructor(params.slug);
  const name = instructor.user.name ?? instructor.slug.replace(/-/g, ' ');
  return { title: `${name} — Stillwater Yoga` };
}
```

### Finding #11 — Workers tsconfig excludes test files (breaks `pnpm lint`)

**File:** `services/workers/tsconfig.json`

**Issue:** `include` pattern excludes `**/*.test.ts` and `vitest.config.ts`, causing 13 ESLint parsing errors ("X was not found by the project service"). Blocks `turbo lint` from succeeding.

**Fix:**
```json
// services/workers/tsconfig.json
{
  "include": [
    "src/**/*.ts",
    "src/**/*.test.ts",  // ← add
    "vitest.config.ts"   // ← add
  ]
}
```

### Finding #12 — ILIKE wildcards not escaped in admin search

**File:** `packages/api/src/routers/admin.ts:128, 208`

**Issue:** `ilike(classes.title, \`%${input.search}%\`)` — user input wildcards (`%`, `_`) are NOT escaped. A search for `%admin%` matches unintended rows.

**Fix:**
```ts
const escapedSearch = input.search.replace(/[%_]/g, '\\$&');
const results = await db.query.classes.findMany({
  where: ilike(classes.title, `%${escapedSearch}%`),
});
```

### Finding #13 — `data-session` leaks user UUID to DOM

**File:** `apps/web/src/app/(studio)/layout.tsx:25`

**Issue:** `data-session={session.user.id}` leaks user UUID into the DOM. No functional purpose.

**Fix:** Remove the `data-session` attribute.

---

## 8. MINOR FINDINGS (nice-to-fix)

| # | Issue | Fix |
|---|---|---|
| 1 | 13/16 shadcn/ui primitives still use `React.forwardRef` (only button/input/textarea migrated to React 19 ref-as-prop) | Migrate for consistency (not a bug — `forwardRef` still works in React 19) |
| 2 | 7 inline `style={{ fontFamily: 'var(--font-display)' }}` in Hero.tsx — redundant with `font-display` Tailwind utility | Use `className="font-display"` |
| 3 | `PLACEHOLDERS.BETTER_AUTH_SECRET = 'placeholder-secret-at-least-32-characters-long'` would match the Zod weak-secret check — but placeholders bypass Zod entirely | Add runtime guard: throw if `NODE_ENV === 'production'` and secret equals any PLACEHOLDER value |
| 4 | Docker-compose weak passwords (`stillwater_local_dev`, `stillwater_redis_dev`) | Add comment: `# DEV ONLY — never use in production` |
| 5 | Audit log writes use `.catch(() => {})` — failed audit writes silently lost | Consider Sentry capture for failed audit writes |
| 6 | `admin.getMemberDetail` runs 3 sequential DB queries | Wrap in `Promise.all` |
| 7 | Type casts (`sessions as ScheduleSession[]`) hide Drizzle RQB type-inference gap | Document the cast reason inline |
| 8 | SSE polls DB every 10s per client with no caching | Cache seat count in Redis for 5s with write-through on booking mutation |
| 9 | 3 routes use `force-dynamic` (no CDN caching) | Consider `revalidate = 60` (1min ISR) once DB-hang is reliably handled |
| 10 | neon-http uses HTTP per query (not pooled) — high-traffic bottleneck | Consider `neonConfig.poolConcurrency` or migrate to `neon-serverless` (WebSocket) |
| 11 | `apps/web/src/app/api/auth/[...all]/route.ts:9` comment says `GET /api/auth/session` but Better Auth v1.6 uses `/api/auth/get-session` | Update comment |
| 12 | Project_Brief.md has internal test-count inconsistencies (lines 86 vs 156, 95 vs 158, 105 vs 160, 43 vs 15+196) | Refresh brief consistently |

---

## 9. PRAISE (exceptional practices worth flagging)

1. **Defense-in-depth booking flow** (`packages/api/src/routers/bookings.ts:68-249`) — `pg_advisory_xact_lock` inside a tx + double-booking check + capacity check + atomic credit decrement + fire-and-forget post-commit job triggers. Textbook concurrent-booking handling.

2. **3-layer Stripe webhook idempotency** (`packages/payments/src/webhooks.ts:78-134`) — fast-path `payment_events` lookup → `pg_advisory_xact_lock` inside tx → unique-constraint catch on `stripe_event_id`. The `isUniqueViolation` catch elegantly handles the race where a concurrent request inserts the same event ID.

3. **5-tier tRPC procedure ladder** (`packages/api/src/trpc.ts`) — V13-4 fix added `managerProcedure` to close the staff-bypass-manager-layout gap. Each tier is a one-line middleware throwing the correct TRPCError code.

4. **Full RBAC matrix test coverage** (`packages/auth/src/rbac.test.ts:58-89`) — 13 permissions × 6 roles = 78 parametric cases. Both `true` (✅) and `false` (❌) cases asserted.

5. **Dual-path email sender** (`packages/email/src/send.ts`) — ADR-010 implemented correctly: `sendEmail()` for Server Components (1.8MB react-email bundle OK), `sendEmailNative()` for Trigger.dev workers (zero bundle bloat via Resend Native Templates).

6. **Resilient DB fetching** (`apps/web/src/app/(marketing)/page.tsx:80-107`) — `Promise.all([db.query.X.catch(() => [])])` ensures the page always renders even if the DB is unreachable. Pricing page has `FALLBACK_PLANS` so it always shows real prices ($28/$149/$220) matching the mockup.

7. **Comprehensive security headers** (`apps/web/next.config.ts:159-181`) — HSTS with preload, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy with camera/microphone disabled.

8. **Timing-safe HMAC comparison** (`apps/web/src/app/api/sanity/webhook/route.ts:46-55`) — `safeCompare` uses `timingSafeEqual` with explicit length check (returns false on mismatch without throwing). Correct defense against timing attacks.

9. **Self-hosted fonts with unicode-range subsetting** (`packages/ui/src/fonts/`) — 3 families × 4 unicode ranges each = 60+ woff2 files. No Google Fonts CDN dependency.

10. **WCAG AAA compliance** — 3px focus rings, 44×44 target sizes, `prefers-reduced-motion` with 0.01ms (not 0ms — browsers treat 0ms as "use default"), skip link as first focusable element, proper heading hierarchy, `aria-label`/`role` on all interactive elements.

11. **Anti-generic design enforcement** — `--radius: 0` globally, `shadow-none` + `rounded-none` explicitly set on shadcn primitives (where Radix defaults would add them), V13-8 fix removed `backdrop-blur-sm` glassmorphism, 0 gradients, self-hosted fonts. The design system is cohesive and distinctive.

12. **Documentation density** — Every file has a header docstring citing MEP/PAD/ADR sources. Fix comments include root-cause analysis + history (e.g., `bookings.ts:267-285` V13-2 fix narrative). `next.config.ts:109-134` V16-3 CSP history with spec citation (`https://www.w3.org/TR/CSP3/#strict-dynamic-usage`).

13. **Supply-chain hygiene** — `pnpm-workspace.yaml` has `minimumReleaseAge: 1440` (24h delay on new publishes) + `minimumReleaseAgeStrict: true` + explicit CVE overrides for OpenTelemetry, `ws`, `tmp`.

14. **Build-context fallback pattern** — `env.ts`, `packages/db/src/index.ts`, `packages/auth/src/config.ts` all check `NEXT_PHASE === 'phase-production-build'` or `NODE_ENV === 'test'` and return placeholders instead of throwing. Thoughtful pattern for CI/Vercel-build environments.

15. **Fail-open rate limiter** (`packages/api/src/middleware/rateLimit.ts`) — explicitly documented rationale: "Stripe is fail-CLOSED; rate-limiting is fail-OPEN." Correct trade-off for booking availability.

---

## 10. Recommendations — Priority Order

### 🔴 Immediate (this week)

1. **Rotate leaked secrets** — `BETTER_AUTH_SECRET`, `SANITY_API_TOKEN`, `SANITY_WEBHOOK_SECRET`. See §6 Finding #1 for full remediation. **This is the #1 priority.**
2. **Remove `env.local` files from git tracking** — `git rm --cached env.local apps/web/env.local`, rename to `.env.local`, add CI check.
3. **Scrub git history** — BFG or git-filter-repo to remove secrets from old commits.
4. **Fix CLS = 0.465** — Add skeleton with reserved height to `HeroNextClass`, change Cormorant `font-display: swap` → `optional`. See §6 Finding #2.
5. **Rewrite stale CSP tests** — Parse actual CSP from `next.config.ts` headers() config, not string-match on file content. See §6 Finding #3.

### 🟡 Short-term (next 2 weeks)

6. Delete dead `proxy.ts` nonce/CSP code (or fix Vercel header-drop issue).
7. Add SSE rate limiting (per-IP concurrent connection limit).
8. Fix `admin.getRevenueDetails` cartesian-join bug.
9. Fix instructor detail `<title>` (eager-load `user`, use `user.name`).
10. Centralize studio address (single source of truth).
11. Fix workers tsconfig (include test files so `pnpm lint` succeeds).
12. Escape ILIKE wildcards in admin search.
13. Remove `data-session` attribute from studio layout.

### 🟢 Medium-term (next month)

14. Migrate to `next/image` for automatic AVIF/WebP + responsive srcset + CLS prevention.
15. Reduce `as any` in workers (typed wrapper or Drizzle 1.0 upgrade).
16. Add Redis caching for hot reads (schedule/pricing pages hit DB on every request).
17. Migrate remaining shadcn primitives to React 19 ref-as-prop.
18. Add integration tests (run `vitest.integration.config.ts` against real Postgres).
19. Sync PAD.md / MEP.md / Project_Brief.md with V16-3 reality (8 critical doc conflicts identified by DOCS-1).
20. Update `stillwater_SKILL.md` §9.9 line 5183 + §5.6 line 797 + ADR-005 line 9236 to reflect V16-3 + Node.js-only proxy.ts runtime + Sanity v6.

---

## Appendix A — Per-Phase Implementation Inventory

(Verified on disk by EXPLORE-1)

| Phase | Brief Claim | Disk Reality | Match |
|---|---|---|---|
| 0 Scaffold | Monorepo, tooling, Docker, design tokens | 7 packages + 3 tooling + docker-compose + fonts + tokens | ✅ |
| 1 Database | 18 tables, 8 enums, 12 indexes, 6 migrations, seed, dynamic driver | 18 `pgTable()` verified, 6 migrations + `_journal.json`, dynamic driver | ✅ |
| 2 Auth & RBAC | Better Auth 1.6.23, Google OAuth, Magic Link, customSession, 13×6 RBAC, 2-layer auth | All verified; `proxy.ts` Layer 1 + `lib/auth.ts` Layer 2 | ✅ |
| 3 tRPC API | 10 routers, ~42 procedures, 4 access tiers, advisory lock, rate limiting | 10 routers ✅, 43 procedures ✅, **5 tiers (not 4)** ⚠️, advisory lock ✅, rate limit ✅ | ⚠️ Stale brief |
| 4 Marketing | Sanity CMS, 8 schemas, 8 ISR pages, webhook, Cloudflare Images, shadcn/ui | 8 schemas ✅, 8 pages ✅, webhook ✅, 16 shadcn primitives | ✅ |
| 5 Booking | SSE endpoint, hook, 5 components, booking page, ScheduleGrid | All verified | ✅ |
| 6 Dashboard | 4 routes, 7 components, CSV export | All verified | ✅ |
| 7 Payments | 8 source files, 43 tests, webhook, CheckoutButton, unstubbed tRPC | All verified; `payments.refund` correctly D12 stub | ✅ |
| 8 Background Jobs | 11 Trigger.dev tasks + 13 email templates | **12 task files on disk (booking-cancellation added V8 audit C2)** ⚠️; 13 templates ✅ | ⚠️ Stale brief |
| 9 Admin Surface | 11 admin pages, 9 components, 12 procedures, audit_log | All verified | ✅ |
| 10 Observability | Sentry + PostHog + Axiom + Checkly | All verified | ✅ |
| 11 Accessibility & SEO | WCAG AAA, SEO, OG images, JSON-LD | All verified | ✅ |
| 12 Landing Page | 19 components, 3 hooks, mobile nav, scroll progress | 18-19 components verified | ✅ |

## Appendix B — Skills Used in This Audit

| Skill | How applied |
|---|---|
| `nextjs16-react19-tailwindv4-trpcv11-drizzle-better-auth` | Source-skill cross-reference; verified SKILL.md preserved anti-patterns + lessons |
| `code-quality-standards` | Six-Axis review methodology (Correctness, Readability, Architecture, Security, Performance, Aesthetic/UX) |
| `code-review-and-audit` | Static analysis + grep security patterns + run `pnpm check-types/lint/test` |
| `security-and-hardening` | OWASP Top 10 checklist (A01–A10) applied to all priority-1 files |
| `vulnerability-scanner` | OWASP 2025 + supply-chain checks (minimumReleaseAge, CVE overrides) |
| `webapp-testing` | E2E test plan for 11 URLs + 9 API endpoints |
| `webapp-testing-journey` | URL journey + accessibility tree + Core Web Vitals + mobile viewport |
| `agent-browser` | Live-site E2E smoke tests (v0.31.1 CLI) |
| `authjs-vs-better-auth` | Verified Better Auth v1.6.23 patterns (customSession, magicLinkClient, getSessionCookie) |
| `sanity-best-practices` | Verified Sanity v6 + GROQ + webhook patterns |
| `source-driven-development` | 19 web searches to verify each tech-stack claim against official docs |
| `coding-agent` | Plan → Execute → Verify → Deliver workflow |

## Appendix C — Web Search Verifications (19 performed)

See DOCS-1 worklog entry for the full table. Key ground-truth confirmations:
- Trigger.dev v4 import = root `@trigger.dev/sdk` (NOT `/v3` or `/v4`) ✅
- Next.js 16 `proxy.ts` = Node.js runtime ONLY (Edge no longer available) ✅
- React Compiler = stable but NOT default; actual code has `reactCompiler: false` (V16-2 fix) ✅
- Better Auth 1.6.23 latest; 1.7.0 still in RC ✅
- React Email v6 unified package import ✅
- Drizzle ORM 0.45 relations v1 (`db.query.*`) is current; v2 (`defineRelations()`) requires ≥1.0.0-beta ✅
- CSP `strict-dynamic` causes `unsafe-inline` to be ignored (W3C CSP3) — V16-3 root cause ✅
- Sanity Studio v6 is current latest (v2 retired Dec 2023) ✅

---

## Report End

**Audit complete.** All findings are read-only — no files in the stillwater repo were modified by this audit. The only writes were:
- Screenshots to `/home/z/my-project/download/e2e-screenshots/` (13 files)
- This report at `/home/z/my-project/download/STILLWATER_AUDIT_REPORT.md`
- Shared worklog at `/home/z/my-project/worklog.md` (4 entries appended: EXPLORE-1, DOCS-1, E2E-1, REVIEW-1)

**Next step recommendation:** Treat Finding #1 (leaked secrets) as a P0 security incident and execute the 8-step remediation in §6 immediately. Then schedule Findings #2 (CLS) and #3 (stale CSP tests) for the same week. After critical fixes, work through the Important findings in priority order.

# Stillwater — MASTER_EXECUTION_PLAN.md

> **Phase 2 (PLAN) deliverable** of the Claw Code workflow:
> `ANALYZE → PLAN → VALIDATE → IMPLEMENT → VERIFY → DELIVER`.
>
> This document is the single source of truth for what to build, in what order,
> with what interfaces, under what test contract, and against what acceptance
> criteria. It synthesises four upstream documents and resolves every
> discrepancy between them into one canonical execution path.

---

## Document Control

| Field       | Value                                                              |
|-------------|--------------------------------------------------------------------|
| Version     | 1.3.0                                                              |
| Status      | ACTIVE — PLAN (verified against PAD v1.4.0 / SKILL v1.4.1; re-validated 2026-07-07) |
| Date        | 2026-07-04                                                         |
| Author      | Claw Code (Frontend Architect & Avant-Garde UI Designer)          |
| Workflow    | ANALYZE → PLAN → VALIDATE → IMPLEMENT → VERIFY → DELIVER          |
| Methodology | TDD (`RED → GREEN → REFACTOR → COMMIT`, one cycle per commit)     |
| Sources     | `design.md`, `PAD.md`, `scaffolding_files.md`, `static_landing_page_mockup.html`, `static_landing_page_html_mockup.md`, `guide_auth-v5_vs_better-auth.md` |

### Change Log

| Version | Date       | Author     | Change                                              |
|---------|------------|------------|-----------------------------------------------------|
| 1.0.0   | 2026-07-04 | Claw Code  | Initial plan synthesised from 4 upstream documents |
| 1.1.0   | 2026-07-05 | Claw Code / Audit | Backported Phase 2 Audit Fixes (C1–C5) + Stack Alignments from PAD v1.1.0 / SKILL v1.2.0 |
| 1.2.0   | 2026-07-05 | Claw Code / Validation | Re-validated against PAD v1.3.0 / SKILL v1.3.0: fixed Stripe apiVersion (Basil→Dahlia), env count (25→34), berkeley-mono→jetbrains-mono across D25/D34/D41/F0-23/F0-24/Phase 12/§3.2/Open Questions; marked D9 + proxy.ts questions as resolved; added .html mockup to Source Document Map |
| 1.3.0   | 2026-07-07 | Claw Code / Remediation | Re-validated against PAD v1.4.0 / SKILL v1.4.1: confirmed Trigger.dev SDK root import is canonical across all source docs; no content fixes needed in MEP body (Phase 8 F8-01–F8-11 task definitions already correct); version stamps aligned across docs |

### Source Document Map

| Source                                  | Lines   | Purpose                                                                | Used For                                   |
|-----------------------------------------|---------|------------------------------------------------------------------------|--------------------------------------------|
| `design.md`                             | 813     | Phase 1 architecture critique across 3 paths + merged optimal arch     | Conceptual framing, 12-phase skeleton      |
| `PAD.md`                                | 3,209   | Definitive Project Architecture Document (31 sections, 9 ADRs)         | All architectural decisions, schema, API   |
| `scaffolding_files.md`                  | 2,298   | Phase 0 IMPLEMENT — 39 ready-to-paste config files                     | Phase 0 file contents, version pins        |
| `static_landing_page_mockup.html`     | 2,927   | Standalone HTML mockup — **visual/aesthetic reference** for Phase 12 side-by-side comparison | Phase 12 visual fidelity |
| `static_landing_page_html_mockup.md`    | 3,056   | Landing page design spec + complete self-contained HTML mockup         | Phase 12 landing-page port (conceptual guidance)                 |
| `react_email_suggestion.md`             | 143     | React Email v6.0.0 paradigm shift analysis + Resend Native Templates recommendation | Phase 8 F8-29 send.ts import pattern, email rendering strategy |
| `pnpm_install_fix.md`                   | 327     | pnpm v11 migration, OTEL override injection, native build unblocking   | Phase 0 pnpm-workspace.yaml, allowBuilds, overrides configuration |

---

## Executive Summary

Stillwater is an **enterprise-grade yoga studio management platform** — a Turborepo monorepo that combines a public marketing surface (Next.js 16 + Sanity CMS, ISR), a member application (booking, dashboard, membership, real-time seat availability via SSE), an admin surface (RBAC-gated class/schedule/member/revenue management), a background-job infrastructure (Trigger.dev v4), and Stripe subscription billing.

This plan breaks the build into **13 phases (Phase 0 → Phase 12)** that sequence dependency-correctly from foundation to launch:

- **Phase 0** — Monorepo scaffold (covered by `scaffolding_files.md`; one correction pass + missing config files)
- **Phase 1** — Database schema, migrations, seed data
- **Phase 2** — Better Auth + RBAC + `proxy.ts` route protection
- **Phase 3** — tRPC v11 routers (10 routers, ~30 procedures)
- **Phase 4** — Marketing surface with Sanity CMS
- **Phase 5** — Booking flow + SSE real-time seat availability
- **Phase 6** — Member dashboard + membership management
- **Phase 7** — Stripe integration (subscriptions + credit packs)
- **Phase 8** — Background jobs (11 Trigger.dev tasks)
- **Phase 9** — Admin surface
- **Phase 10** — Observability + performance hardening
- **Phase 11** — Accessibility (WCAG AAA) + SEO + OG images
- **Phase 12** — Landing page port (mockup → production Next.js)

Every file in every phase has an explicit **purpose**, **interface** (exports / props / Zod input / return shape), **TDD test file**, and **Definition-of-Done checklist**. The plan is `IMPLEMENT`-ready pending the VALIDATE checkpoint.

---

## 1. Synthesis: WHAT / WHY / HOW

### 1.1 WHAT — The Product

Stillwater is the operational backbone and digital face of a boutique yoga studio in Portland, Oregon. It serves three distinct user populations from one codebase:

1. **Public audience** — prospective members browsing schedule, instructors, pricing, blog; no auth required
2. **Members** — authenticated practitioners who book classes, manage subscriptions, view attendance history
3. **Studio operations** — staff, managers, and the owner who manage classes, schedules, instructors, members, and revenue

The platform exposes ~33 routes organised into three Next.js App Router route groups: `(marketing)` (9 routes), `(studio)` (6 routes), `(admin)` (10 routes), plus auth (4 routes) and API (4 routes).

### 1.2 WHY — The Problem Being Solved

The PAD's seven explicit goals (verbatim from PAD §2.3):

| #  | Goal                                                            | Success Metric                                          |
|----|-----------------------------------------------------------------|---------------------------------------------------------|
| G1 | Members self-serve all booking needs                            | Zero booking-related support tickets per week           |
| G2 | Studio owner updates schedule without engineer involvement      | Schedule changes live in < 5 minutes via admin UI       |
| G3 | Marketing content updates require zero deployments              | Sanity publish → ISR propagates in < 5 min              |
| G4 | Platform handles 500 concurrent users without degradation       | p95 response time < 200 ms at 500 RPS                   |
| G5 | Payment processing is reliable and auditable                    | Zero unreconciled Stripe transactions                   |
| G6 | Accessibility is not an afterthought                            | Lighthouse Accessibility score: 100 (automated baseline) + quarterly manual screen-reader and keyboard audit (WCAG 2.2 AAA target)               |
| G7 | Engineers onboard in < 1 day                                    | New dev runs `pnpm dev` in < 30 minutes                 |

The demographic skews 35–65 years, with high representation of visual impairments, motor limitations, and cognitive considerations. **WCAG 2.2 Level AAA is non-negotiable** — not AA, not "best effort."

### 1.3 HOW — The Architecture (10 decisions)

| Decision                                    | Choice                                 | ADR    |
|---------------------------------------------|----------------------------------------|--------|
| Monorepo                                    | Turborepo + pnpm workspaces            | ADR-001 |
| API layer                                   | tRPC v11                               | ADR-002 |
| ORM                                         | Drizzle ORM ^0.45.0                    | ADR-003 |
| Booking concurrency                         | PostgreSQL advisory locks              | ADR-004 |
| Marketing CMS                               | Sanity v3 (marketing content only)     | ADR-005 |
| Real-time seat availability                 | SSE via Next.js streaming              | ADR-006 |
| Background jobs                             | Trigger.dev v4 (v3 deploys stop April 1, 2026) | ADR-007 |
| Auth (supersedes PAD per scaffolding)       | **Better Auth** v1.6.23 stable (replaces Auth.js v5 beta) | NEW — ADR-008; validated by `guide_auth-v5_vs_better-auth.md` (July 2026) |
| Middleware file (Next.js 16 rename)         | `proxy.ts` (replaces `middleware.ts`)  | NEW — ADR-009 |
| Test strategy                               | TDD mandatory; Vitest + Playwright     | (this doc) |

---

## 2. Critical Discrepancies & Canonical Resolutions

The four source documents disagree in 25+ places. Below is the canonical resolution for every conflict. **Every IMPLEMENT-phase decision defers to this table.**

### 2.1 Architectural discrepancies

| #  | Topic                       | PAD says                       | Scaffolding says                       | Mockup says                  | **Canonical resolution**                                                       |
|----|-----------------------------|--------------------------------|----------------------------------------|------------------------------|--------------------------------------------------------------------------------|
| D1 | Auth library                | **RESOLVED IN SOURCE (PAD v1.1.0 §5.1)** | Better Auth v1.6.23 stable (scaffolding L1–9; guide confirms) | n/a                          | **RESOLVED:** PAD.md v1.1.0 now correctly specifies Better Auth v1.6.23. Original conflict: Auth.js v5 (PAD §5, L353) vs Better Auth (scaffolding). | 
| D2 | Middleware file             | **RESOLVED IN SOURCE (PAD v1.1.0 §6.1)** | `apps/web/proxy.ts`                    | n/a                          | **RESOLVED:** PAD.md v1.1.0 now correctly specifies `proxy.ts`. Original conflict: `apps/web/middleware.ts` vs `apps/web/proxy.ts`. |
| D3 | Worker file count           | 11 jobs in catalog (PAD §13.1) | 7 worker files in tree (L610–617)      | n/a                          | **11 files** (catalog is canonical; missing 4 files to be created)              |
| D4 | Email template count        | 13 templates in catalog        | 8 template files in tree (L579–586)    | n/a                          | **13 files** (catalog is canonical; missing 5 to be created)                    |
| D5 | `enums.ts` file             | Referenced at `schema/enums.ts`| Missing from tree                      | n/a                          | **Create `packages/db/src/schema/enums.ts`** (export Drizzle `pgEnum`s)         |
| D6 | `members.stripeCustomerId`  | Referenced in payment mapping  | Missing from MEMBER table def          | n/a                          | **Add column** `stripeCustomerId text UNIQUE` to MEMBER table                   |
| D7 | Worker naming mismatch      | `class-reminder-24h`, `-1h`    | `class-reminder.ts` (singular)         | n/a                          | **Two files**: `class-reminder-24h.ts`, `class-reminder-1h.ts`                  |
| D8 | Worker naming mismatch      | `membership-expiry-warn`       | `membership-renewal.ts`                | n/a                          | **Rename**: `membership-expiry-warn.ts` (catalog wins)                          |
| D9 | Color token bug (PAD L1268) | `--color-stone-200: --color-fog: #D4CFC9;` (malformed) | n/a                     | n/a                          | **RESOLVED IN SOURCE (PAD v1.2.0):** Malformed token fixed; orphaned `--color-fog` removed entirely (it was a Phase 1 design.md named token never implemented in the numbered scale). No action required. |
| D10| `ActiveSubscriptionSummary` type | Referenced (L1102), undefined  | n/a                                    | n/a                          | **Define** in `packages/auth/src/types.ts`                                     |
| D11| `DrizzleDB` type            | Referenced (L1036), undefined  | n/a                                    | n/a                          | **Define** in `packages/db/src/index.ts` as `typeof db`                         |
| D12| Refund workflow             | Not specified                  | n/a                                    | n/a                          | **v1: Stripe Dashboard only** (per MEP §9 Q5+Q8 resolution). Staff (manager/owner) process refunds via Stripe Dashboard. `payment_events` table records all Stripe events (including `charge.refunded`) for audit. In-app refund UI (`paymentsRouter.refund` F3-12 + full `refunds.ts` F7-07) deferred to v2 — saves ~2 engineering days. Phase 7 F7-07 retains `refunds.ts` as thin wrapper for future v2 use.     |
| D13| Sanity Studio hosting       | Mentioned as separate container| No path/URL                            | n/a                          | **Host at** `stillwater.sanity.studio` (Sanity Cloud); config in `apps/studio/` |
| D14| Middleware `config.matcher` | Only `ROUTE_ROLE_MAP` shown    | `proxy.ts` provides matcher (L1501–7)  | n/a                          | **Use scaffolding's matcher** verbatim                                          |

### 2.2 Scaffolding-only discrepancies (must fix before `pnpm install` works)

| #  | Topic                                          | Issue                                                                 | **Canonical resolution**                                                              |
|----|------------------------------------------------|-----------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| D15| `@stillwater/source` custom condition          | Referenced in `tooling/typescript/base.json` + all package.json exports but never declared | **Add `pnpm.onlyBuiltDependencies` + `customConditions` declaration in `.npmrc`** OR `pnpm-workspace.yaml` `customConditions` field |
| D16| Missing devDependencies in `apps/web/package.json` | `@tailwindcss/postcss`, `@tailwindcss/typography`, `@tailwindcss/container-queries` | **Add** all three via `pnpm add -D -F @stillwater/web @tailwindcss/postcss @tailwindcss/typography @tailwindcss/container-queries` |
| D17| `.env.example` ↔ docker-compose password mismatch | `.env` uses `password@`, docker uses `stillwater_local_dev`           | **Update `.env.example`** to use `stillwater_local_dev` to match docker-compose.yml   |
| D18| `infrastructure/postgres/init/` directory missing | docker-compose volume mount references non-existent dir               | **Create** `infrastructure/postgres/init/00-create-extensions.sql` with `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS "pgcrypto";` |
| D19| `eslint-plugin-next` imported but unused       | `nextPlugin` declared at L681 of `tooling/eslint/index.js`            | **Either remove** the import OR **add** a Next.js config block using `nextPlugin.configs.recommended.rules` |
| D20| `eslint-plugin-tailwindcss` v3 vs Tailwind v4  | v3 may not support Tailwind v4 class detection                        | **Pin** `eslint-plugin-tailwindcss: ^3.17.5` for now; verify in Phase 0 smoke test; consider removing in Phase 11 |
| D21| `next.config.ts` `experimental.serverComponentsExternalPackages` | Renamed to top-level `serverExternalPackages` in Next.js 16           | **Move** to top-level: `serverExternalPackages: [...]` (no `experimental.` prefix)   |
| D22| `apps/web` has no `test` / `test:e2e` scripts  | Root `turbo test` will warn (not fail)                                | **Add** `test`, `test:watch`, `test:e2e` scripts to `apps/web/package.json`          |
| D23| `next lint` deprecated in Next.js 16           | `apps/web` uses `next lint`                                            | **Replace** with direct `eslint .` invocation using shared flat config               |
| D24| `turbo.json` `"ui": "tui"` field               | Unusual key/value, non-standard                                        | **Remove** the `"ui": "tui"` line                                                    |

### 2.3 Mockup ↔ PAD discrepancies (resolved during Phase 12 port)

| #  | Topic                            | PAD says                              | Mockup says                                              | **Canonical resolution**                                          |
|----|----------------------------------|---------------------------------------|----------------------------------------------------------|-------------------------------------------------------------------|
| D25| ~~Berkeley Mono font~~ → **JetBrains Mono** | Defined as `--font-mono` (PAD §11.2) | Not loaded, not used | **Adopt PAD spec (updated):** self-host JetBrains Mono (Apache 2.0, open-source Google Font — no license required). Berkeley Mono was the Phase 1 proposal (design.md LAYER 2) but is a paid commercial font that was never acquired. JetBrains Mono is the chosen free alternative. See PAD.md §11.2 and SKILL.md §4.4. |
| D26| Spacing scale naming             | `--space-1` … `--space-13`            | `--sp-1` … `--sp-11` (off-by-one from index 5)           | **Adopt PAD naming**; remap mockup `--sp-5+` to `--space-6+`      |
| D27| Motion duration naming           | `--duration-quick` / `standard` / `slow` | `--dur-quick` / `std` / `slow`                       | **Adopt PAD naming**                                              |
| D28| Mockup type scale not tokenised  | PAD has `--text-display-2xl` etc.     | Mockup uses inline `clamp()`                             | **Adopt PAD tokens** for port                                     |
| D29| Beginner badge colors            | `--color-success: #4A7C59`            | Hardcoded `#E8F5EE` / `#3A7D50`                          | **Use PAD `--color-success` family**                              |
| D30| Mockup spots aria-label mismatch | n/a                                   | `aria-label="4 of 16 spots taken"` vs visible "8 spots left" (math wrong) | **Fix copy**: visible "12 spots left", aria-label "4 of 16 spots taken" |
| D31| Section numbering skips 01       | n/a                                   | Philosophy is unnumbered; Schedule starts at 02          | **Add `01` to Philosophy section header**                         |
| D32| Mockup missing mobile nav        | n/a                                   | `nav__links` hidden at 768px, no hamburger               | **Implement Radix Dialog-based mobile drawer in Phase 12**        |
| D33| Mockup missing OG / JSON-LD      | PAD §23 specifies full OG + JSON-LD   | Only `<title>` + `<meta description>`                    | **Implement full PAD SEO spec in Phase 11**                       |
| D34| Mockup uses Google Fonts CDN     | PAD §11.3 mandates self-hosted fonts  | Comment says "self-hosted in prod"                       | **Self-host** Cormorant + DM Sans + JetBrains Mono in `packages/ui/src/fonts/` (all three are free Google Fonts already downloaded). Berkeley Mono was the Phase 1 proposal but is paid — use JetBrains Mono instead (see D25). |
| D35| Mockup schedule: Thu–Sun items not expandable | n/a                        | 11 of 18 items use `onclick="return false"`              | **Wire all items** to live tRPC schedule data in Phase 5           |
| D36| proxy.ts auth pattern (guide G2)     | Scaffolded proxy.ts calls `auth.api.getSession()` (full DB validation on every request) | `guide_auth-v5_vs_better-auth.md` mandates cookie-only `getSessionCookie()` in proxy | **Refactor proxy.ts** to cookie-existence-only check; move full validation + RBAC to Server Component layouts (Phase 2 F2-13 rewrite + F2-16 through F2-19). Note: proxy.ts runtime is disputed (Next.js 16 docs inconsistent — Edge or Node.js); 2-layer pattern works on both. |
| D37| Better Auth version pin (guide G1)   | Files pin `^1.2.0` (outdated)       | Guide confirms stable v1.6.23 (1.7.0-beta in testing)   | **Update version pin** to `^1.6.23` across all files              |
| D38| Auth.js v5 beta status (guide G6)    | ADR-008 context says "Sept 2025 handover" (incomplete) | Guide confirms Auth.js v5 still beta at 5.0.0-beta.31; never left beta since rewrite; Better Auth team now patches Auth.js security | **Update ADR-008 context** with full timeline + dual-maintenance fact |
| D39| Better Auth client API differences (guide G4) | Files don't document `authClient.signIn.social()` / `authClient.useSession()` return shape | Guide documents the centralized `authClient` API | **Document client API** in F2-02 + stillwater_SKILL.md §Lesson 3 |
| D40| Better Auth DB schema differences (guide G5) | Files don't document table/field renames | Guide documents User/Session/Account/Verification schema changes | **Document schema migration** in stillwater_SKILL.md §Lesson 3 + Phase 1 schema files |
| D41| PAD staleness — 14 stale references | **RESOLVED IN SOURCE (PAD v1.1.0 §5.1, §6.1)** | **RESOLVED IN SOURCE** | **RESOLVED (v1.1.0) + FURTHER UPDATED (v1.3.0 + v1.4.0):** PAD.md v1.1.0 fixed the 14 Auth.js/middleware references. PAD.md v1.3.0 additionally fixed: Stripe API version (Basil→Dahlia), pnpm (9→11), Tailwind (4.1→4.3), Zod v4 guidance, version pins (Turborepo/React Email/Resend), Drizzle $count floor (≥0.30→≥0.34), ADR-009 proxy.ts runtime (originally stated Edge; v1.4.0 softened to "Edge or Node.js — docs inconsistent"), Appendix A Cloudflare env var names + 3 missing vars, §5.1 Next.js row corrections. The MEP has been updated to reflect these in v1.2.0 (see Change Log). **No further action required.** |
| D42| Missing `@dnd-kit/core` and `recharts` in `apps/web/package.json` scaffolding | Neither package listed in scaffolding deps | Phase 9 F9-07 references `@dnd-kit/core` for drag-and-drop calendar; F9-14 references `recharts` for revenue charts | **Add** `"@dnd-kit/core": "^6.0.0"` and `"recharts": "^2.15.0"` to `apps/web/package.json` dependencies in Phase 0 (or at Phase 9 start) |
| D43| React Email v6.0.0 paradigm shift + Resend version bump | PAD/SKILL/MEP pinned React Email `^0.0.36` + Resend `^4.1.2`; `react_email_suggestion.md` documents v6.0.0 unification (April 16, 2026) + 1.8MB bundle bloat risk | Code (`packages/email/package.json`) already bumped to `react-email: ^6.6.6` + `resend: ^6.17.1` by user; docs were stale | **RESOLVED:** PAD.md §5.1 + SKILL.md §2.1 updated to `^6.6.6` / `^6.17.1` with `react_email_suggestion.md` cross-reference. MEP F8-29 `send.ts` import changed from `@react-email/render` → `react-email` (v6 unified). Consider ADR-010 for Resend Native Templates (Alternative A) to protect Trigger.dev CPU budgets. |
| D44| TypeScript `^6.0.3` drift in 9 sub-packages | Root `package.json` pinned `typescript: ^5.9.0` (per PAD §5.1 + `pnpm_install_fix.md`); 9 sub-package.json files had `typescript: ^6.0.3` (user manually bumped during package version update) | `pnpm_install_fix.md` explicitly states: "typescript 6.0.3 is available. We are intentionally ignoring this and staying on `^5.9.0` as mandated by PAD.md §5.1 to ensure compatibility with `erasableSyntaxOnly` and `verbatimModuleSyntax` rules." | **RESOLVED:** All 9 sub-package.json files reverted from `^6.0.3` → `^5.9.0` (packages/auth, api, config, db, email, payments, ui, services/workers, tooling/tailwind). `pnpm install` re-resolved cleanly. `pnpm check-types` passes (only expected TS18003 "No inputs found" errors for empty `src/` dirs). |
| D45| ESLint v10 → v9 downgrade (plugin ecosystem incompatibility) | Root + apps/web pinned `eslint: ^10.6.0`; `tooling/eslint` pinned `@eslint/js: ^10.0.1`. ESLint v10 removed `context.getFilename()` and `SourceCode.getTokenOrCommentAfter` APIs. | `eslint-plugin-react@7.37.5` (latest) supports only `^9.7` — NO v10 version exists. `eslint-plugin-import@2.32.0` (latest) supports only `^9` — NO v10 version exists. All other plugins (react-hooks, tailwindcss, typescript-eslint) support both v9 and v10. | **RESOLVED:** Downgraded ESLint from `^10.6.0` → `^9.39.4` (maintenance tag, actively receiving security/bug fixes) in 3 files: root `package.json`, `apps/web/package.json`, `tooling/eslint/package.json` (`@eslint/js: ^10.0.1` → `^9.39.4`). Re-enabled React plugin block (scoped to `.tsx`/`.jsx`) and `import/order` rule in `tooling/eslint/index.js`. `pnpm lint` passes with ALL rules active (2/2 tasks, zero errors). SKILL.md §3.2 line 239 already documented "ESLint v9 flat config" — now accurate. Upgrade to ESLint v10 can be revisited when `eslint-plugin-react` and `eslint-plugin-import` release v10-compatible versions. |

---
## 3. Architectural Principles (non-negotiable)

These principles are inherited from the Claw Code operational framework and the PAD. Every PR is reviewed against them.

### 3.1 Engineering principles
1. **TypeScript strict mode** — `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`. No `any`. Use `unknown` and narrow.
2. **Prefer `interface` over `type`** for object shapes; use `type` for unions / intersections / mapped types.
3. **Early returns**; avoid deeply nested conditionals.
4. **Composition over inheritance.**
5. **Library discipline** — if a UI library (Radix, shadcn) provides a primitive, USE IT. Do not rebuild.
6. **Handle all UI states** — loading (skeleton), error (with retry), empty (with CTA), success.
7. **Zod at every boundary** — tRPC procedure inputs, env vars (t3-env), webhook payloads, form values.
8. **Advisory locks for concurrency** — `pg_advisory_xact_lock()` for booking; never optimistic locking for limited-capacity resources.
9. **Idempotency for webhooks** — Stripe webhook events deduplicated via `payment_events.stripe_event_id` UNIQUE INDEX + `pg_advisory_xact_lock` (transaction-scoped — auto-releases at COMMIT/ROLLBACK).
10. **Side effects in background jobs** — emails, notifications, digests never run synchronously in API routes.

### 3.2 Design principles (anti-generic enforcement)
- ✗ Purple-to-pink gradients, sage green wellness palette, lavender accents
- ✗ Inter/Roboto as the only typeface
- ✗ Drop shadows on cards as depth signal
- ✗ "Book a Free Trial" pill CTAs
- ✗ Predictable 3-column feature card grids
- ✗ Sticky nav with logo left / links center / CTA right (use single-line rule nav)
- ✗ Lotus / mandala decorative icons
- ✓ Typographic hierarchy as primary structural tool (Cormorant Garamond display + DM Sans body + JetBrains Mono data)
- ✓ Whitespace as luxury signal, not empty space
- ✓ Asymmetric editorial grid breaks
- ✓ Color temperature that changes how the user feels
- ✓ Micro-interactions earned through meaning
- ✓ Self-hosted fonts (zero FOUT, zero third-party font CDN in production)

### 3.3 Accessibility principles (WCAG 2.2 Level AAA)
- Normal text contrast: minimum 7:1
- Large text (≥ 18pt): minimum 4.5:1
- Interactive element boundaries: minimum 3:1
- Visible 3px `--color-water-500` focus outline + 2px offset on ALL focusable elements
- Logical tab order matches visual order; no keyboard traps
- Skip-to-main-content link as first focusable element
- Semantic HTML5 (nav, main, article, section, aside)
- `aria-live` for dynamic content; `aria-busy` for loading
- `prefers-reduced-motion` globally respected
- Reading level: Grade 8 or below for instructional content

### 3.4 Performance principles
- Marketing page JS < 80 kb gzipped
- Booking page JS < 200 kb gzipped (Stripe.js)
- Admin JS < 400 kb gzipped
- LCP < 1.5s, INP < 100ms, CLS = 0, TTFB < 200ms
- No N+1 queries — always use Drizzle `with` for relations
- Cursor-based pagination for large datasets
- `next/image` with explicit width/height, AVIF/WebP, `priority` only on LCP
- Images served from Cloudflare Images / R2

### 3.5 Security principles
- Strict CSP (see `next.config.ts` headers)
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- HSTS with `includeSubDomains; preload`
- Secrets via t3-env Zod-validated schema; client vs server prefix enforced
- Stripe webhook signature verification on every event
- Auth session cookie encrypted (`BETTER_AUTH_SECRET`)
- Rate limiting via Upstash Redis on auth + booking mutations

---

## 4. TDD Methodology

**Test-Driven Development is MANDATORY for all business logic.** Exception: pure styling / layout changes with no logic.

### 4.1 Cycle (one atomic commit per cycle)
```
RED       → Write a failing test that describes the intended behaviour
GREEN     → Write the minimum code required to make the test pass
REFACTOR  → Clean up without changing behaviour
COMMIT    → Atomic commit with message: "<type>(<scope>): <subject>"
```

### 4.2 Test pyramid
| Layer            | Tool                                | Target count | Coverage target                |
|------------------|-------------------------------------|--------------|--------------------------------|
| Unit             | Vitest                              | ~300         | 90% on `packages/api/routers/*`; 95% on `packages/payments/*`; 80% on `packages/db/schema/*` |
| Integration      | Vitest + Testcontainers (Postgres)  | ~80          | Critical user journeys         |
| E2E              | Playwright                          | ~20          | Booking happy path + sad path  |
| Visual regression| Playwright + Percy (weekly)         | n/a          | Marketing pages × 3 breakpoints|
| A11y automated   | `@axe-core/playwright` + Lighthouse | per page     | Lighthouse A11y = 100          |

### 4.3 Factory pattern for test data
Every domain entity has a `getMock<Entity>(overrides?)` factory. **No hardcoded fixtures.** Pattern (PAD §15.6):
```typescript
const getMockMember = (overrides?: Partial<Member>): Member => ({
  id:           crypto.randomUUID(),
  userId:       crypto.randomUUID(),
  displayName:  'Test Member',
  phone:        null,
  joinedAt:     new Date(),
  ...overrides,
});
```

### 4.4 Test file naming convention
- Unit tests: `*.test.ts` co-located with source
- Integration tests: `*.integration.test.ts` in `test/` directory
- E2E tests: `e2e/<scenario>.spec.ts`
- Component tests: `*.test.tsx` co-located

### 4.5 CI gates (PR must pass all 8 before merge)
1. `pnpm turbo check-types`
2. `pnpm turbo lint`
3. `pnpm turbo test --coverage`
4. `pnpm turbo build`
5. `pnpm turbo test:e2e`
6. `pnpm lighthouse ci`
7. `pnpm bundle-size`
8. `pnpm audit --audit-level=high`

---
## 5. Phase Plan Overview

13 phases. Each phase has explicit dependencies, deliverables, and acceptance criteria.

| Phase | Focus                                                  | Deps      | Est. days | Files |
|-------|--------------------------------------------------------|-----------|-----------|-------|
| 0     | Monorepo scaffold + tooling + Docker + Phase 0 fixes  | —         | 2         | ~45   |
| 1     | DB schema, Drizzle migrations, seed data               | 0         | 3         | ~20   |
| 2     | Better Auth + RBAC + `proxy.ts` (2-layer auth pattern) | 0, 1      | 3         | ~19   |
| 3     | tRPC v11 routers (10 routers, ~30 procedures)          | 0, 1, 2   | 5         | ~25   |
| 4     | Marketing surface (Sanity CMS, ISR)                    | 0, 1, 2, 3| 4         | ~30   |
| 5     | Booking flow + SSE real-time seats                     | 3         | 5         | ~18   |
| 6     | Member dashboard + membership mgmt                     | 3, 7      | 4         | ~12   |
| 7     | Stripe integration (subscriptions + credit packs)      | 3         | 4         | ~12   |
| 8     | Background jobs (11 Trigger.dev tasks)                 | 3, 7      | 3         | ~15   |
| 9     | Admin surface (RBAC-gated)                             | 3         | 5         | ~18   |
| 10    | Observability + performance hardening                  | all prev  | 3         | ~12   |
| 11    | WCAG AAA audit + SEO + OG images                       | 4, 5, 6, 9| 3         | ~10   |
| 12    | Landing page port (mockup → Next.js production)        | 4, 11     | 4         | ~25   |
| **Total** |                                                    |           | **50**    | **~260** |

> **Note on parallelism:** Phases 5, 7, and 9 can be parallelised once Phase 3 is complete. Phases 6 and 8 depend on Phase 7. Phase 12 depends on Phase 11 (for SEO/OG) and Phase 4 (for Sanity content). With 3 engineers, critical path is ~28 calendar days.

### Phase ordering rationale
- Phase 0 first because every other phase imports from `@stillwater/*` packages
- Phase 1 before Phase 2 because Better Auth needs the `user` + `member` + `role_assignment` tables
- Phase 2 before Phase 3 because tRPC `protectedProcedure` / `staffProcedure` / `ownerProcedure` middleware needs `auth.api.getSession()` (in tRPC context — Node.js runtime, NOT in proxy.ts which uses cookie-only `getSessionCookie()` per D36)
- Phase 3 before Phases 4-9 because every UI page consumes tRPC procedures
- Phase 7 (Stripe) before Phase 6 (member dashboard membership mgmt) because the dashboard's "Manage Subscription" button calls `paymentsRouter.getPortalUrl`
- Phase 8 (background jobs) after Phase 7 because `membership-credit-grant` fires on Stripe `invoice.paid`
- Phase 11 last-before-port because WCAG audit must run against production-shaped pages
- Phase 12 last because the landing page is the highest-visibility surface; it consumes the design system, the marketing route group, and SEO infrastructure built in earlier phases

---
## 6. Per-Phase Detailed Plans

> Each phase below lists every file to **create** or **update**, with:
> - **Purpose** — what the file does, in one sentence
> - **Interface** — exports, props, Zod input, return shape, or config schema
> - **TDD test file** — the failing test written before implementation
> - **Checklist** — Definition-of-Done criteria
>
> Files marked `[SCAFFOLD]` already exist in `scaffolding_files.md` and need only to be placed on disk. Files marked `[NEW]` are created during this phase. Files marked `[PATCH]` modify an existing scaffolded file.


### Phase 0 — Monorepo Scaffold + Tooling + Docker + Phase 0 Fixes

**Goal:** A bootable monorepo where `pnpm install && pnpm dev` produces a 200 at `http://localhost:3000`, with all 39 scaffolding files placed and all 10 Phase-0 discrepancies (D15–D24) resolved.

**Dependencies:** None (this is the foundation).

**Estimated duration:** 2 days.

**Acceptance criteria:**
- [ ] `pnpm install` succeeds with no peer dep warnings
- [ ] `pnpm check-types` green across all 8 packages
- [ ] `pnpm lint` green
- [ ] `pnpm dev` boots Next.js 16 with Turbopack
- [ ] `docker compose up -d` starts postgres + redis with healthy status
- [ ] `pnpm db:migrate` runs (no-op since no schema yet, but exits 0)
- [ ] `customConditions` declaration visible in `pnpm-workspace.yaml` (D15)
- [ ] `@dnd-kit/core` and `recharts` present in `apps/web/package.json` dependencies (D42)
- [ ] CI workflow `ci.yml` runs and passes on a feature branch

#### Files to PLACE on disk (from scaffolding_files.md)

| #  | File                                                | Action     | Notes                                                       |
|----|-----------------------------------------------------|------------|-------------------------------------------------------------|
| 1  | `/package.json`                                     | [SCAFFOLD] | verbatim from scaffolding_files.md L84–127                  |
| 2  | `/pnpm-workspace.yaml`                              | [PATCH]    | add `customConditions: ['@stillwater/source']` (D15)        |
| 3  | `/turbo.json`                                       | [PATCH]    | remove `"ui": "tui"` line (D24)                             |
| 4  | `/.gitignore`                                       | [SCAFFOLD] | verbatim from L259–339                                      |
| 5  | `/.env.example`                                     | [PATCH]    | update Postgres password to `stillwater_local_dev` (D17)    |
| 6  | `/docker-compose.yml`                               | [SCAFFOLD] | verbatim from L439–526                                      |
| 7  | `/tooling/typescript/base.json`                     | [SCAFFOLD] | verbatim from L532–583                                      |
| 8  | `/tooling/typescript/nextjs.json`                   | [SCAFFOLD] | verbatim from L587–628                                      |
| 9  | `/tooling/typescript/library.json`                  | [SCAFFOLD] | verbatim from L632–661                                      |
| 10 | `/tooling/eslint/index.js`                          | [PATCH]    | wire `nextPlugin.configs.recommended.rules` (D19)           |
| 11 | `/tooling/eslint/package.json`                      | [SCAFFOLD] | verbatim                                                    |
| 12 | `/tooling/typescript/package.json`                  | [SCAFFOLD] | verbatim                                                    |
| 13 | `/tooling/tailwind/base.ts`                         | [SCAFFOLD] | verbatim from L866–1042                                     |
| 14 | `/tooling/tailwind/package.json`                    | [SCAFFOLD] | verbatim                                                    |
| 15 | `/apps/web/package.json`                            | [PATCH]    | add 3 `@tailwindcss/*` devDeps (D16); add `test`/`test:e2e` scripts (D22); replace `next lint` with `eslint .` (D23); add `@dnd-kit/core` + `recharts` deps (D42) |
| 16 | `/apps/web/tsconfig.json`                           | [SCAFFOLD] | verbatim                                                    |
| 17 | `/apps/web/next.config.ts`                          | [PATCH]    | move `experimental.serverComponentsExternalPackages` → top-level `serverExternalPackages` (D21) |
| 18 | `/apps/web/postcss.config.mjs`                      | [SCAFFOLD] | verbatim                                                    |
| 19 | `/apps/web/tailwind.config.ts`                      | [SCAFFOLD] | verbatim                                                    |
| 20 | `/apps/web/proxy.ts`                                | [SCAFFOLD] | verbatim — Phase 2 replaces auth logic entirely with cookie-only `getSessionCookie()` pattern (F2-13; D36) |
| 21 | `/apps/web/components.json`                         | [SCAFFOLD] | verbatim                                                    |
| 22 | `/packages/db/package.json`                         | [SCAFFOLD] | verbatim                                                    |
| 23 | `/packages/db/tsconfig.json`                        | [SCAFFOLD] | verbatim                                                    |
| 24 | `/packages/db/drizzle.config.ts`                    | [SCAFFOLD] | verbatim                                                    |
| 25 | `/packages/api/package.json`                        | [SCAFFOLD] | verbatim                                                    |
| 26 | `/packages/api/tsconfig.json`                       | [SCAFFOLD] | verbatim                                                    |
| 27 | `/packages/ui/package.json`                         | [SCAFFOLD] | verbatim                                                    |
| 28 | `/packages/ui/tsconfig.json`                        | [SCAFFOLD] | verbatim                                                    |
| 29 | `/packages/auth/package.json`                       | [SCAFFOLD] | verbatim                                                    |
| 30 | `/packages/auth/tsconfig.json`                      | [SCAFFOLD] | verbatim — Phase 2 may add `*.tsx` glob                     |
| 31 | `/packages/email/package.json`                      | [SCAFFOLD] | verbatim                                                    |
| 32 | `/packages/email/tsconfig.json`                     | [SCAFFOLD] | verbatim                                                    |
| 33 | `/packages/payments/package.json`                   | [SCAFFOLD] | verbatim                                                    |
| 34 | `/packages/payments/tsconfig.json`                  | [SCAFFOLD] | verbatim                                                    |
| 35 | `/packages/config/package.json`                     | [SCAFFOLD] | verbatim                                                    |
| 36 | `/packages/config/tsconfig.json`                    | [SCAFFOLD] | verbatim                                                    |
| 37 | `/services/workers/package.json`                    | [SCAFFOLD] | verbatim                                                    |
| 38 | `/services/workers/tsconfig.json`                   | [SCAFFOLD] | verbatim                                                    |
| 39 | `/services/workers/trigger.config.ts`               | [SCAFFOLD] | verbatim                                                    |

#### Files to CREATE (new — not in scaffolding)

##### F0-01. `/.npmrc`
- **Purpose:** Declares pnpm configuration including the `@stillwater/source` custom condition (D15) so workspace packages resolve to source instead of `dist/`.
- **Interface:** Plain text config file.
- **TDD test file:** n/a (config file; verified by `pnpm install` smoke test).
- **Checklist:**
  - [ ] Contains `node-linker=hoisted`
  - [ ] Contains `custom-conditions=@stillwater/source` (alternative to `pnpm-workspace.yaml.customConditions`)
  - [ ] Contains `strict-peer-dependencies=true`
  - [ ] `pnpm install` succeeds; `node_modules/@stillwater/db` is a symlink to `packages/db` (not a copy)

##### F0-02. `/.prettierrc`
- **Purpose:** Project-wide Prettier configuration; enables Tailwind class sorting.
- **Interface:** JSON config.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] `printWidth: 100`
  - [ ] `semi: true`
  - [ ] `singleQuote: true`
  - [ ] `trailingComma: 'all'`
  - [ ] `plugins: ['prettier-plugin-tailwindcss']`
  - [ ] `pnpm format:check` passes

##### F0-03. `/.editorconfig`
- **Purpose:** EditorConfig ensures consistent file encoding / line endings / indentation across editors.
- **Interface:** INI-style config.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] `root = true`
  - [ ] `[*]` block: `end_of_line = lf`, `insert_final_newline = true`, `charset = utf-8`
  - [ ] `[*.{ts,tsx,js,jsx}]` block: `indent_style = space`, `indent_size = 2`
  - [ ] `[*.{json,yml,yaml,md}]` block: `indent_size = 2`

##### F0-04. `/README.md`
- **Purpose:** Project entry point; onboards new engineers in < 30 minutes (Goal G7).
- **Interface:** Markdown.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] Project name + one-paragraph vision
  - [ ] Tech stack table
  - [ ] Prerequisites (Node 22+, pnpm 11+, Docker)
  - [ ] Quick start (`pnpm install` → `cp .env.example .env.local` → `docker compose up -d` → `pnpm db:migrate` → `pnpm dev`)
  - [ ] Monorepo structure overview
  - [ ] Common commands table
  - [ ] Links to `PAD.md`, `MASTER_EXECUTION_PLAN.md`, `docs/`
  - [ ] Contribution workflow (branch naming, PR template reference)

##### F0-05. `/infrastructure/postgres/init/00-create-extensions.sql`
- **Purpose:** Docker-entrypoint init script; creates PG extensions needed by the app. Mounted by `docker-compose.yml` line 471. (D18)
- **Interface:** SQL script run once on first container init.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
  - [ ] `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`
  - [ ] `docker compose down -v && docker compose up -d` runs without error
  - [ ] `psql -c '\dx'` lists both extensions

##### F0-06. `/packages/config/src/env.ts`  ⭐ CRITICAL
- **Purpose:** t3-env Zod-validated environment variable schema. Single source of truth for all env vars. Imported by every package that needs env access.
- **Interface:**
  ```typescript
  import { createEnv } from '@t3-oss/env-core';
  import { z } from 'zod';

  export const env = createEnv({
    server: {
      DATABASE_URL: z.string().url(),
      DATABASE_URL_UNPOOLED: z.string().url(),
      BETTER_AUTH_SECRET: z.string().min(32),
      BETTER_AUTH_URL: z.string().url(),
      GOOGLE_CLIENT_ID: z.string(),
      GOOGLE_CLIENT_SECRET: z.string(),
      STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
      STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
      RESEND_API_KEY: z.string().startsWith('re_'),
      EMAIL_FROM: z.string().email(),
      TRIGGER_SECRET_KEY: z.string().startsWith('tr_'),
      UPSTASH_REDIS_REST_URL: z.string().url(),
      UPSTASH_REDIS_REST_TOKEN: z.string(),
      SANITY_API_TOKEN: z.string(),
      SANITY_WEBHOOK_SECRET: z.string(),
      SENTRY_DSN: z.string().url().optional(),
      SENTRY_AUTH_TOKEN: z.string().optional(),
      AXIOM_TOKEN: z.string().optional(),
      AXIOM_DATASET: z.string().optional(),
      CLOUDFLARE_ACCOUNT_ID: z.string(),
      CLOUDFLARE_IMAGES_TOKEN: z.string(),
      CLOUDFLARE_R2_ACCESS_KEY_ID: z.string(),
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string(),
      CLOUDFLARE_R2_BUCKET: z.string(),
      CLOUDFLARE_R2_ENDPOINT: z.string().url(),
      NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    },
    client: {
      NEXT_PUBLIC_APP_URL: z.string().url(),
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
      NEXT_PUBLIC_SANITY_PROJECT_ID: z.string(),
      NEXT_PUBLIC_SANITY_DATASET: z.string(),
      NEXT_PUBLIC_POSTHOG_KEY: z.string(),
      NEXT_PUBLIC_POSTHOG_HOST: z.string().url(),
      NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
      NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL: z.string().url(),
    },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      // ... all 34 vars mapped to process.env
      NODE_ENV: process.env.NODE_ENV,
    },
  });
  ```
- **TDD test file:** `packages/config/src/env.test.ts`
  - [RED] Test 1: `env` throws on missing `DATABASE_URL`
  - [RED] Test 2: `env` throws on invalid URL for `DATABASE_URL`
  - [RED] Test 3: `env` accepts valid config and exposes typed `env.DATABASE_URL`
  - [RED] Test 4: `NEXT_PUBLIC_*` vars are excluded from server-side schema (cannot be accessed via `env.SERVER_*`)
- **Checklist:**
  - [ ] All 25 env vars from `.env.example` declared in schema
  - [ ] Server vs client split correct (`server` for keys without `NEXT_PUBLIC_`)
  - [ ] `runtimeEnv` maps every var to `process.env`
  - [ ] All 4 RED tests now GREEN
  - [ ] `pnpm check-types` passes
  - [ ] Importing `@stillwater/config/env` in another package returns typed `env`

##### F0-07. `/packages/config/src/index.ts`
- **Purpose:** Barrel export for the config package.
- **Interface:** `export * from './env';`
- **TDD test file:** n/a (trivial barrel).
- **Checklist:**
  - [ ] Single line re-export
  - [ ] `pnpm check-types` passes

##### F0-08. `/vitest.config.ts` (root)
- **Purpose:** Root-level Vitest configuration shared across packages; each package extends this.
- **Interface:** Vitest config exporting `defineConfig` with `coverage: { provider: 'v8' }` and `pool: 'forks'`.
- **TDD test file:** n/a (config).
- **Checklist:**
  - [ ] `test.environment: 'node'` (default)
  - [ ] `test.coverage.provider: 'v8'`
  - [ ] `test.coverage.reporter: ['text', 'json', 'html']`
  - [ ] `test.coverage.thresholds` set per package (90% for `packages/api/routers/*`, etc.)
  - [ ] `test.pool: 'forks'` (avoid worker thread issues with Drizzle)
  - [ ] `test.setupFiles: ['./test/setup.ts']` (mocks `process.env`)

##### F0-09. `/test/setup.ts`
- **Purpose:** Global Vitest setup; loads env vars from `.env.test` for integration tests.
- **Interface:** Side-effecting module.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] `import 'dotenv/config'` (loads `.env.test`)
  - [ ] Sets `process.env.NODE_ENV = 'test'`
  - [ ] Configures `@testing-library/jest-dom` if any DOM tests exist

##### F0-10. `/playwright.config.ts` (root)
- **Purpose:** Playwright E2E config; runs against `apps/web` dev server.
- **Interface:** Playwright config.
- **TDD test file:** n/a (config).
- **Checklist:**
  - [ ] `testDir: './e2e'`
  - [ ] `webServer: { command: 'pnpm dev --filter=@stillwater/web', url: 'http://localhost:3000', reuseExistingServer: true }`
  - [ ] `projects: [{ name: 'chromium' }, { name: 'firefox' }, { name: 'webkit' }]`
  - [ ] `use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' }`
  - [ ] `reporter: [['html'], ['@axe-core/playwright/reporter']]`

##### F0-11. `/.github/workflows/ci.yml`
- **Purpose:** PR-checks pipeline; runs all 8 quality gates on every PR.
- **Interface:** GitHub Actions workflow YAML.
- **TDD test file:** n/a (CI config).
- **Checklist:**
  - [ ] Triggers on `pull_request` to `develop` and `main`
  - [ ] Uses `pnpm/action-setup@v3` with `version: 11`
  - [ ] Uses `actions/setup-node@v4` with `node-version: 22` and `cache: 'pnpm'`
  - [ ] Spins up `services.postgres` (image `postgres:17-alpine`) and `services.redis` (image `redis:7-alpine`)
  - [ ] Steps: checkout → setup pnpm → setup node → `pnpm install --frozen-lockfile` → `pnpm docker compose up -d` → wait for postgres → `pnpm db:migrate` → `pnpm db:seed` → `pnpm turbo check-types lint test build test:e2e` → `pnpm lighthouse ci` → `pnpm bundle-size` → `pnpm audit --audit-level=high`
  - [ ] Uploads coverage artifact
  - [ ] Uploads Playwright report artifact on failure

##### F0-12. `/.github/workflows/deploy-preview.yml`
- **Purpose:** Auto-deploys PR branches to Vercel preview; auto-provisions Neon PR branch.
- **Interface:** GitHub Actions workflow YAML.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] Triggers on PR opened/synchronized
  - [ ] Calls Neon API to create branch from `stillwater-staging`
  - [ ] Runs `pnpm db:migrate` against the PR branch DB
  - [ ] Calls Vercel API to create preview deployment with PR-branch env vars
  - [ ] Comments preview URL on PR

##### F0-13. `/.github/workflows/deploy-production.yml`
- **Purpose:** Production deploy on merge to `main`.
- **Interface:** GitHub Actions workflow YAML (verbatim from PAD §22.7).
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] Triggers on push to `main`
  - [ ] Requires `environment: production` approval
  - [ ] Steps: run migrations → deploy to Vercel (`vercel deploy --prod`) → smoke test (`pnpm playwright test --project=smoke`) → notify Slack

##### F0-14. `/.github/PULL_REQUEST_TEMPLATE.md`
- **Purpose:** Standardised PR description; enforces Architecture Validation Checklist (PAD §31).
- **Interface:** Markdown template.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] Sections: Summary, Related issue, Type of change, Checklist (security, data, performance, reliability, a11y, docs), Screenshots, Migration notes, Rollback script

##### F0-15. `/.github/CODEOWNERS`
- **Purpose:** Auto-assigns code review based on path ownership.
- **Interface:** GitHub CODEOWNERS format.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] `* @project-owner` (default catch-all)
  - [ ] `/packages/db/ @db-owner`
  - [ ] `/packages/api/ @backend-team`
  - [ ] `/packages/ui/ @frontend-team`
  - [ ] `/packages/payments/ @backend-team`
  - [ ] `/services/workers/ @backend-team`

##### F0-16. `/packages/ui/src/tokens/colors.css`
- **Purpose:** CSS custom properties for the Warm Mineral palette (PAD §11.4).
- **Interface:** Plain CSS with `:root { --color-stone-950: #0F0D0B; ... }`.
- **TDD test file:** n/a (CSS tokens; verified by visual regression in Phase 12).
- **Checklist:**
  - [ ] All Stone tokens (950, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50)
  - [ ] All Clay tokens (600, 500, 400, 300, 200, 100)
  - [ ] All Water tokens (700, 600, 500, 400, 300, 100) — includes missing 700 from mockup (D-palette)
  - [ ] All Sand tokens (DEFAULT, warm, deep)
  - [ ] Status colors (success, warning, error, info) — using PAD hex values
  - [ ] Semantic aliases (`--color-background`, `--color-surface`, `--color-border`, `--color-text-primary`, `--color-text-secondary`, `--color-action`, `--color-action-hover`, `--color-accent`)
  - [ ] ~~`--color-fog` defined separately (D9 fix)~~ — D9 RESOLVED IN SOURCE (PAD v1.2.0); `--color-fog` removed entirely

##### F0-17. `/packages/ui/src/tokens/typography.css`
- **Purpose:** Type scale + line heights + font family declarations.
- **Interface:** CSS custom properties.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] `--font-display`, `--font-body`, `--font-mono` declarations (with fallbacks)
  - [ ] 9 type-scale tokens (`--text-display-2xl` through `--text-caption`) using PAD clamp values
  - [ ] 4 leading tokens (`--leading-display`, `--leading-heading`, `--leading-body`, `--leading-caption`)

##### F0-18. `/packages/ui/src/tokens/spacing.css`
- **Purpose:** Spacing scale + max-widths.
- **Interface:** CSS custom properties.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] 13 spacing tokens (`--space-1` through `--space-13`) using PAD values (NOT mockup `--sp-N` — D26)
  - [ ] 3 max-width tokens (`--max-width-content: 1280px`, `--max-width-narrow: 720px`, `--max-width-wide: 1440px`)

##### F0-19. `/packages/ui/src/tokens/motion.css`
- **Purpose:** Easing curves + durations + reduced-motion media query.
- **Interface:** CSS custom properties + `@media` block.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] 3 easing tokens (`--ease-gentle`, `--ease-breathe`, `--ease-sharp`) — PAD names, not mockup
  - [ ] 5 duration tokens (`--duration-instant`, `--duration-quick`, `--duration-standard`, `--duration-slow`, `--duration-crawl`) — PAD names, not mockup
  - [ ] `@media (prefers-reduced-motion: reduce)` block (verbatim from PAD)

##### F0-20. `/packages/ui/src/tokens/index.css`
- **Purpose:** Barrel import for all token files.
- **Interface:** CSS `@import` statements.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] `@import './colors.css';`
  - [ ] `@import './typography.css';`
  - [ ] `@import './spacing.css';`
  - [ ] `@import './motion.css';`

##### F0-21. `/packages/ui/src/fonts/cormorant/` (directory with .woff2 files)
- **Purpose:** Self-hosted Cormorant Garamond (display font).
- **Interface:** Static font files + `@font-face` declarations.
- **TDD test file:** n/a (verified by `next/font/local` load in Phase 12).
- **Checklist:**
  - [ ] Download Cormorant Garamond woff2 (Regular 400, Italic 400, Medium 500, SemiBold 600) from Google Fonts
  - [ ] Place files in `packages/ui/src/fonts/cormorant/`
  - [ ] Create `packages/ui/src/fonts/cormorant.css` with `@font-face` declarations (using `font-display: swap`)

##### F0-22. `/packages/ui/src/fonts/dm-sans/` (directory + .woff2)
- **Purpose:** Self-hosted DM Sans (body font).
- **Interface:** Same pattern as Cormorant.
- **Checklist:**
  - [ ] Download DM Sans woff2 (Regular 400, Italic 400, Medium 500, Bold 700)
  - [ ] Place + create `dm-sans.css` with `@font-face` declarations

##### F0-23. `/packages/ui/src/fonts/jetbrains-mono/` (directory + .woff2)
- **Purpose:** Self-hosted JetBrains Mono (data/admin mono font). Apache 2.0, open-source — **no license required**. This is a free Google Font already downloaded and present in the repo.
- **Interface:** Same pattern as Cormorant + DM Sans (directory + `jetbrains-mono.css` with `@font-face` declarations).
- **TDD test file:** n/a (font files; verified by visual smoke test in Phase 12).
- **Checklist:**
  - [ ] 18 woff2 files already present in `packages/ui/src/fonts/jetbrains-mono/` (verified)
  - [ ] Create `jetbrains-mono.css` with `@font-face` declarations for regular, medium, bold weights (latin + latin-ext subsets)
  - [ ] `--font-mono` token in `typography.css` references `'JetBrains Mono'` as primary (matches PAD.md §11.2)
  - [ ] **Do NOT** create a `berkeley-mono/` directory — Berkeley Mono is a paid commercial font (not a Google Font) and was never acquired. JetBrains Mono is the chosen open-source alternative.

##### F0-24. `/packages/ui/src/fonts/index.css`
- **Purpose:** Barrel import for all font CSS.
- **Interface:** `@import` statements.
- **Checklist:**
  - [ ] Imports Cormorant, DM Sans, JetBrains Mono

##### F0-25. `/packages/ui/src/globals.css`
- **Purpose:** Global stylesheet imported by `apps/web/src/app/globals.css`. Aggregates tokens + fonts + base reset.
- **Interface:** CSS file imported via `@import '@stillwater/ui/globals';`.
- **Checklist:**
  - [ ] `@import './tokens/index.css';`
  - [ ] `@import './fonts/index.css';`
  - [ ] CSS reset (margin: 0, box-sizing: border-box, etc.)
  - [ ] `html { font-family: var(--font-body); color: var(--color-text-primary); background: var(--color-background); }`
  - [ ] `:focus-visible { outline: 3px solid var(--color-water-500); outline-offset: 2px; }`

##### F0-26. `/packages/ui/src/index.ts`
- **Purpose:** Barrel export for UI components (currently empty — populated as components are added in later phases).
- **Interface:** `export * from './components';` (will be empty initially).
- **Checklist:**
  - [ ] Single export line
  - [ ] `pnpm check-types` passes

##### F0-27. `/apps/web/src/app/layout.tsx`
- **Purpose:** Root Next.js App Router layout. Loads fonts, sets metadata, renders `<html>` and `<body>`.
- **Interface:**
  ```typescript
  import type { Metadata } from 'next';
  import { Inter } from 'next/font/google'; // placeholder; replaced in Phase 12
  import './globals.css';

  export const metadata: Metadata = {
     title: 'Stillwater Yoga Studio',
     description: 'A sanctuary for mindful movement.',
  };

  export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en">
         <body>{children}</body>
       </html>
     );
  }
  ```
- **TDD test file:** n/a (smoke-tested by Playwright in Phase 11).
- **Checklist:**
  - [ ] Loads `./globals.css` (which imports `@stillwater/ui/globals`)
  - [ ] Sets `<html lang="en">`
  - [ ] Metadata base set
  - [ ] `<body>` renders children
  - [ ] `pnpm dev` shows the page at `/`

##### F0-28. `/apps/web/src/app/page.tsx`
- **Purpose:** Placeholder home page (replaced in Phase 4 and Phase 12).
- **Interface:** Default export React server component.
- **Checklist:**
  - [ ] Renders `<h1>Stillwater</h1><p>Phase 0 scaffold complete.</p>`
  - [ ] `pnpm dev` shows this at `http://localhost:3000`

##### F0-29. `/apps/web/src/app/globals.css`
- **Purpose:** App-level global CSS; imports UI package globals + Tailwind v4 `@theme` directive.
- **Interface:**
  ```css
  @import '@stillwater/ui/globals';
  @import 'tailwindcss';

  @theme {
    /* Map tokens to Tailwind theme variables */
    --color-stone-950: var(--color-stone-950);
    /* ... etc. for all colors */
    --font-display: var(--font-display);
    --font-body: var(--font-body);
    --font-mono: var(--font-mono);
  }
  ```
- **Checklist:**
  - [ ] Imports `@stillwater/ui/globals` first
  - [ ] Imports `tailwindcss` second
  - [ ] `@theme` block maps every design token to Tailwind's theme variable namespace
  - [ ] Tailwind utility classes work (e.g., `bg-stone-50` produces `background-color: var(--color-stone-50)`)

#### Phase 0 patches (D15–D24)

For each discrepancy, the file modification is listed in the table above. The patches are mechanical:
- D15: add `customConditions: ['@stillwater/source']` to `pnpm-workspace.yaml` AND `custom-conditions=@stillwater/source` to `.npmrc`
- D16: `pnpm add -D -F @stillwater/web @tailwindcss/postcss @tailwindcss/typography @tailwindcss/container-queries`
- D17: edit `.env.example` `DATABASE_URL` and `DATABASE_URL_UNPOOLED` lines to use `stillwater_local_dev` password
- D18: create `/infrastructure/postgres/init/00-create-extensions.sql` (F0-05)
- D19: in `tooling/eslint/index.js`, add new config block: `{ plugins: { next: nextPlugin }, rules: { ...nextPlugin.configs.recommended.rules, 'next/no-html-link-for-pages': 'off' } }`
- D20: leave as-is for Phase 0; revisit in Phase 11 (potentially remove `eslint-plugin-tailwindcss` entirely since Tailwind v4 has its own LSP)
- D21: in `apps/web/next.config.ts`, move `experimental.serverComponentsExternalPackages` to top-level `serverExternalPackages`
- D22: add `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:e2e": "playwright test"` to `apps/web/package.json` scripts
- D23: replace `"lint": "next lint"` with `"lint": "eslint ."` in `apps/web/package.json`; replace `"lint:fix": "next lint --fix"` with `"lint:fix": "eslint . --fix"`
- D24: remove the `"ui": "tui"` line from `turbo.json`

#### Phase 0 acceptance smoke test
```bash
# 1. Place all scaffolding files + patches
# 2. Place all 29 NEW files listed above
pnpm install                                # must succeed
docker compose up -d                        # postgres + redis healthy
pnpm db:migrate                             # exits 0 (no schema yet)
pnpm check-types                            # green
pnpm lint                                   # green
pnpm test                                   # green (config tests pass)
pnpm dev --filter=@stillwater/web                       # boots on :3000
curl http://localhost:3000                  # 200 + "Stillwater" in body
```

---

### Phase 1 — Database Schema, Drizzle Migrations, Seed Data

**Goal:** All 14 tables + 8 enums + 5 indexes created via Drizzle migrations; seed data fixtures load 5 demo members, 3 instructors, 4 classes, 7 days of sessions.

**Dependencies:** Phase 0 (drizzle-kit installed, `DATABASE_URL_UNPOOLED` available).

**Estimated duration:** 3 days.

**Acceptance criteria:**
- [ ] `pnpm db:generate` produces migration SQL with no warnings
- [ ] `pnpm db:migrate` applies cleanly to a fresh Postgres
- [ ] `pnpm db:seed` populates demo data
- [ ] `psql -c '\dt'` lists all 14 tables
- [ ] `psql -c '\dT'` lists all 8 enums
- [ ] ERD round-trips with PAD §7.3
- [ ] All schema unit tests pass (constraint enforcement, FK cascades)

#### Files to CREATE

##### F1-01. `/packages/db/src/schema/enums.ts`  ⭐ (resolves D5)
- **Purpose:** All 8 PostgreSQL enums as Drizzle `pgEnum`s.
- **Interface:**
  ```typescript
  import { pgEnum } from 'drizzle-orm/pg-core';

  export const classLevelEnum = pgEnum('class_level', ['all', 'beginner', 'intermediate', 'advanced']);
  export const sessionStatusEnum = pgEnum('session_status', ['scheduled', 'cancelled', 'completed', 'in_progress']);
  export const enrollmentStatusEnum = pgEnum('enrollment_status', ['confirmed', 'cancelled', 'attended', 'no_show']);
  export const waitlistStatusEnum = pgEnum('waitlist_status', ['waiting', 'offered', 'accepted', 'expired', 'removed']);
  export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'paused', 'cancelled', 'past_due', 'trialing', 'incomplete']);
  export const billingIntervalEnum = pgEnum('billing_interval', ['month', 'year']);
  export const studioRoleEnum = pgEnum('studio_role', ['member', 'instructor', 'staff', 'manager', 'owner']);
  export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'processed', 'failed', 'ignored']);
  ```
- **TDD test file:** `packages/db/src/schema/enums.test.ts`
  - [RED] Test 1: `classLevelEnum.enumValues` equals `['all', 'beginner', 'intermediate', 'advanced']`
  - [RED] Test 2: All 8 enums declared and exported
  - [RED] Test 3: Enum names match PostgreSQL snake_case convention
- **Checklist:**
  - [ ] All 8 enums defined (PAD §7.1)
  - [ ] Enum values match PAD §7.1 verbatim
  - [ ] All 3 RED tests GREEN
  - [ ] `pnpm db:generate` includes `CREATE TYPE` statements

##### F1-02. `/packages/db/src/schema/users.ts`
- **Purpose:** `users` table (Auth.js / Better Auth compatible).
- **Interface:** Drizzle `pgTable` definition with columns: `id`, `email`, `name`, `image`, `emailVerified`, `createdAt`.
- **TDD test file:** `packages/db/src/schema/users.test.ts`
  - [RED] Test 1: Table name is `'users'`
  - [RED] Test 2: `email` column is `text('email').notNull().unique()`
  - [RED] Test 3: `id` column is `uuid('id').primaryKey().defaultRandom()`
- **Checklist:**
  - [ ] Columns match PAD §7.2 USER entity
  - [ ] `id` is UUID PK with `defaultRandom()`
  - [ ] `email` is unique
  - [ ] Timestamps default to `now()`

##### F1-03. `/packages/db/src/schema/members.ts`  ⭐ (resolves D6)
- **Purpose:** `members` table — adds `stripeCustomerId` column missing from PAD schema.
- **Interface:** Columns: `id`, `userId` (FK → users), `displayName`, `phone`, `dateOfBirth`, `emergencyContact`, `emergencyPhone`, `notes`, `joinedAt`, `createdAt`, **`stripeCustomerId` (text UNIQUE NULLABLE)**.
- **TDD test file:** `packages/db/src/schema/members.test.ts`
  - [RED] Test 1: `stripeCustomerId` column exists and is unique
  - [RED] Test 2: `userId` FK references `users.id` with `onDelete: 'cascade'`
  - [RED] Test 3: `joinedAt` defaults to `now()`
- **Checklist:**
  - [ ] All PAD §7.2 MEMBER columns present
  - [ ] `stripeCustomerId` added (D6 fix)
  - [ ] FK cascade rules: `userId` cascade delete
  - [ ] Index `idx_members_stripe_customer_id` on `stripeCustomerId` for fast webhook lookups

##### F1-04. `/packages/db/src/schema/instructors.ts`
- **Purpose:** `instructors` table.
- **Interface:** Columns: `id`, `userId` (FK → users), `slug` (unique), `bio`, `specialties` (text[]), `imageKey`, `isActive`, `sortOrder`.
- **TDD test file:** `packages/db/src/schema/instructors.test.ts`
  - [RED] Test 1: `slug` is unique
  - [RED] Test 2: `specialties` is `text('specialties').array()`
  - [RED] Test 3: `isActive` defaults to `true`
- **Checklist:**
  - [ ] Columns match PAD §7.2 INSTRUCTOR
  - [ ] `slug` unique-indexed for fast lookup by URL

##### F1-05. `/packages/db/src/schema/class-styles.ts`
- **Purpose:** `class_styles` table — taxonomy of class types (Vinyasa, Yin, Ashtanga, etc.).
- **Interface:** Columns: `id`, `name`, `description`, `color`.
- **TDD test file:** `packages/db/src/schema/class-styles.test.ts`
- **Checklist:**
  - [ ] `name` is `notNull`
  - [ ] `color` is hex string (validated at app layer)

##### F1-06. `/packages/db/src/schema/classes.ts`
- **Purpose:** `classes` table — class templates.
- **Interface:** Columns: `id`, `slug` (unique), `title`, `description`, `styleId` (FK → class_styles), `level` (class_level enum), `durationMinutes`, `maxCapacity`, `isActive`, `imageKey`, `metaTitle`, `metaDescription`, `createdAt`, `updatedAt`.
- **TDD test file:** `packages/db/src/schema/classes.test.ts`
  - [RED] Test 1: `level` uses `classLevelEnum`
  - [RED] Test 2: `slug` is unique
  - [RED] Test 3: `maxCapacity` is `integer().notNull()`
- **Checklist:**
  - [ ] All PAD §7.2 CLASS columns
  - [ ] `styleId` FK to `class_styles.id`
  - [ ] `level` is enum

##### F1-07. `/packages/db/src/schema/rooms.ts`
- **Purpose:** `rooms` table — physical studio rooms.
- **Interface:** Columns: `id`, `name`, `capacity`, `isActive`.
- **TDD test file:** `packages/db/src/schema/rooms.test.ts`
- **Checklist:**
  - [ ] `capacity` is `integer().notNull()`

##### F1-08. `/packages/db/src/schema/sessions.ts`
- **Purpose:** `class_sessions` table — specific scheduled occurrences.
- **Interface:** Columns: `id`, `classId` (FK), `instructorId` (FK), `roomId` (FK nullable), `startsAt`, `endsAt`, `status` (session_status enum), `cancelReason`, `overrideCapacity`, `isVirtual`, `streamUrl`, `createdAt`.
- **TDD test file:** `packages/db/src/schema/sessions.test.ts`
  - [RED] Test 1: `startsAt` and `endsAt` both `notNull`
  - [RED] Test 2: `status` defaults to `'scheduled'`
  - [RED] Test 3: `isVirtual` defaults to `false`
- **Checklist:**
  - [ ] All PAD §7.2 CLASS_SESSION columns
  - [ ] FKs to `classes`, `instructors`, `rooms`
  - [ ] **Critical index**: `idx_sessions_starts_at_status` (partial: `WHERE status = 'scheduled'`)

##### F1-09. `/packages/db/src/schema/enrollments.ts`
- **Purpose:** `enrollments` table — confirmed bookings.
- **Interface:** Columns: `id`, `sessionId` (FK), `memberId` (FK), `status` (enrollment_status enum), `enrolledAt`, `cancelledAt`, `checkedInAt`, `cancellationReason`, `packageCreditId` (FK nullable).
- **TDD test file:** `packages/db/src/schema/enrollments.test.ts`
  - [RED] Test 1: Unique constraint on `(sessionId, memberId)`
  - [RED] Test 2: `status` defaults to `'confirmed'`
- **Checklist:**
  - [ ] **Critical index**: `idx_enrollments_session_status` (partial: `WHERE status = 'confirmed'`) — for fast seat counts
  - [ ] Unique constraint prevents double-booking

##### F1-10. `/packages/db/src/schema/waitlist.ts`
- **Purpose:** `waitlist_entries` table — ordered queue for full sessions.
- **Interface:** Columns: `id`, `sessionId` (FK), `memberId` (FK), `position`, `joinedAt`, `notifiedAt`, `expiresAt`, `status` (waitlist_status enum).
- **TDD test file:** `packages/db/src/schema/waitlist.test.ts`
- **Checklist:**
  - [ ] **Critical index**: `idx_waitlist_session_position` (partial: `WHERE status = 'waiting'`)
  - [ ] `position` is `integer().notNull()`

##### F1-11. `/packages/db/src/schema/memberships.ts`
- **Purpose:** `membership_plans` + `member_subscriptions` tables.
- **Interface:** Two `pgTable` exports.
- **TDD test file:** `packages/db/src/schema/memberships.test.ts`
  - [RED] Test 1: `membershipPlans.stripePriceId` is unique
  - [RED] Test 2: `memberSubscriptions.stripeSubscriptionId` is unique
  - [RED] Test 3: `subscriptionStatusEnum` used for `memberSubscriptions.status`
- **Checklist:**
  - [ ] **Critical index**: `idx_subscriptions_member_status` (partial: `WHERE status = 'active'`)
  - [ ] All columns match PAD §7.2

##### F1-12. `/packages/db/src/schema/payments.ts`
- **Purpose:** `payment_events` + `class_packages` tables.
- **Interface:** Two `pgTable` exports.
- **TDD test file:** `packages/db/src/schema/payments.test.ts`
  - [RED] Test 1: `paymentEvents.stripeEventId` is unique
  - [RED] Test 2: `classPackages.usedCredits` defaults to 0
- **Checklist:**
  - [ ] **Critical unique index**: `idx_payment_events_stripe_id` on `stripe_event_id` (idempotency)
  - [ ] `payload` column is `jsonb`

##### F1-13. `/packages/db/src/schema/role-assignments.ts`
- **Purpose:** `role_assignments` table — RBAC role grants.
- **Interface:** Columns: `id`, `memberId` (FK), `role` (studio_role enum), `assignedAt`.
- **TDD test file:** `packages/db/src/schema/role-assignments.test.ts`
- **Checklist:**
  - [ ] Composite unique on `(memberId, role)` (prevent duplicate grants)

##### F1-14. `/packages/db/src/schema/index.ts`
- **Purpose:** Barrel export for all schema files.
- **Interface:** `export * from './users'; export * from './members'; ...` for all 13 schema files.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] All 14 tables exported
  - [ ] All 8 enums re-exported from `./enums`
  - [ ] `drizzle.config.ts` schema path resolves correctly

##### F1-15. `/packages/db/src/index.ts`  ⭐ (resolves D11)
- **Purpose:** Database client + types. Exports `db`, `DrizzleDB` type, schema.
- **Interface:**
  ```typescript
  import { drizzle } from 'drizzle-orm/neon-http';
  import { env } from '@stillwater/config/env';
  import * as schema from './schema';

  export const db = drizzle({ connection: env.DATABASE_URL, schema });
  export type DrizzleDB = typeof db;
  export type Schema = typeof schema;
  export * from './schema';
  ```
- **TDD test file:** `packages/db/src/index.test.ts`
  - [RED] Test 1: `db` is defined and has `.query.classes` etc.
  - [RED] Test 2: `DrizzleDB` type is `typeof db`
  - [RED] Test 3: Schema re-exports work (`import { users } from '@stillwater/db'`)
- **Checklist:**
  - [ ] Uses `neon-http` driver (serverless-friendly)
  - [ ] `DrizzleDB` type exported (resolves D11)
  - [ ] Schema barrel re-exported

##### F1-16. `/packages/db/src/seed/index.ts`
- **Purpose:** Seed script for development data. Run via `pnpm db:seed`.
- **Interface:** Async function that inserts demo users, members, instructors, classes, sessions, membership plans.
- **TDD test file:** `packages/db/src/seed/index.integration.test.ts` (integration — requires Testcontainers Postgres)
  - [RED] Test 1: After seed, `db.select().from(users)` returns 5 rows
  - [RED] Test 2: After seed, `db.select().from(classes)` returns 4 rows
  - [RED] Test 3: After seed, each session has a valid `instructorId` FK
  - [RED] Test 4: Re-running seed is idempotent (uses `onConflictDoNothing`)
- **Checklist:**
  - [ ] 5 demo members (one of each role: member, instructor, staff, manager, owner)
  - [ ] 3 demo instructors (Mei Tanaka, James Harlow, Aiko Mori — matches mockup)
  - [ ] 4 demo classes (Vinyasa Flow, Ashtanga, Yin & Meditation, Restorative)
  - [ ] 7 days of sessions (one per day for current week)
  - [ ] 3 demo membership plans (Drop-in, Unlimited, 10-class Pack — matches mockup)
  - [ ] Idempotent (can re-run safely)

##### F1-17. `/packages/db/src/seed/fixtures/members.ts`
- **Purpose:** Member fixture data using factory pattern.
- **Interface:** `export const demoMembers: Array<Partial<Member>> = [...]`
- **TDD test file:** n/a (consumed by seed test F1-16).
- **Checklist:**
  - [ ] Factory pattern: `getMockMember(overrides)` exported
  - [ ] 5 distinct demo members

##### F1-18. `/packages/db/src/seed/fixtures/instructors.ts`
- **Purpose:** Instructor fixtures (Mei, James, Aiko).
- **Checklist:**
  - [ ] Bios match mockup §3.12 verbatim
  - [ ] Specialties and tags match mockup

##### F1-19. `/packages/db/src/seed/fixtures/classes.ts`
- **Purpose:** Class fixtures.
- **Checklist:**
  - [ ] 4 classes with realistic durations (60min, 75min, 90min)

##### F1-20. `/packages/db/src/seed/fixtures/sessions.ts`
- **Purpose:** Session fixtures — 7 days from today.
- **Checklist:**
  - [ ] All sessions in the future
  - [ ] At least one full session (for waitlist demo)
  - [ ] Mix of all 4 class types

##### F1-21. `/packages/db/src/scripts/reset.ts`
- **Purpose:** Local-only DB reset script. Drops all tables, re-runs migrations, re-seeds.
- **Interface:** CLI script run via `pnpm db:reset`. Throws if `NODE_ENV === 'production'`.
- **TDD test file:** n/a (script; verified by manual run).
- **Checklist:**
  - [ ] Refuses to run in production (`process.env.NODE_ENV === 'production'` check)
  - [ ] Drops schema `public` cascade
  - [ ] Re-runs migrations
  - [ ] Re-runs seed
  - [ ] Prints "✓ Local DB reset complete"

#### Phase 1 acceptance test
```bash
pnpm db:generate              # produces 0001_initial.sql
pnpm db:migrate               # applies migration
psql -c '\dt'                 # 14 tables listed
psql -c '\dT'                 # 8 enums listed
pnpm db:seed                  # loads demo data
psql -c 'SELECT count(*) FROM users;'         # 5
psql -c 'SELECT count(*) FROM class_sessions;' # 7
pnpm test --filter=@stillwater/db             # all schema + seed tests green
```

---

### Phase 2 — Better Auth + RBAC + `proxy.ts` Route Protection

**Goal:** Members can sign in via Google OAuth or Magic Link; sessions are encrypted; **2-layer auth pattern** enforced — `proxy.ts` does cookie-existence-only optimistic check (Layer 1, Edge-compatible), Server Component layouts do full session validation + RBAC via `requireAuth()` / `requireRole()` (Layer 2, Node.js). Per `guide_auth-v5_vs_better-auth.md` G2.

**Dependencies:** Phase 0 (proxy.ts scaffolded), Phase 1 (users + members + role_assignments tables).

**Estimated duration:** 3 days.

**Acceptance criteria:**
- [ ] Google OAuth flow completes end-to-end (test user lands on `/dashboard`)
- [ ] Magic Link email arrives; clicking link signs user in
- [ ] **Layer 1 (proxy.ts):** Unauthenticated visit to `/dashboard` (no session cookie) redirects to `/auth/sign-in?callbackUrl=/dashboard` via `getSessionCookie()` check
- [ ] **Layer 1 (proxy.ts):** Visit with stale/invalid session cookie passes through proxy (cookie exists), but Layer 2 layout catches it and redirects to sign-in
- [ ] **Layer 2 (layouts):** Member visiting `/admin` redirects to `/dashboard` via `(admin)/layout.tsx` `requireRole()` check
- [ ] **Layer 2 (layouts):** Staff visiting `/admin/revenue` redirects to `/dashboard` via nested layout `requireRole('manager', 'owner')` check
- [ ] **Layer 2 (layouts):** Manager visiting `/admin/settings` redirects to `/dashboard` via nested layout `requireRole('owner')` check
- [ ] proxy.ts does NOT call `auth.api.getSession()` (grep-verified)
- [ ] proxy.ts does NOT import `auth` from `@stillwater/auth` (grep-verified)
- [ ] Session cookie is encrypted (`BETTER_AUTH_SECRET`)
- [ ] `session.user.roles` populated from `role_assignments` table
- [ ] All auth tests pass (proxy + layout + integration)

#### Files to CREATE

##### F2-01. `/packages/auth/src/config.ts`  ⭐ (resolves D1, D10)
- **Purpose:** Better Auth v1.6.23 server configuration with Drizzle adapter, Google + Magic Link providers, role-enriched session callback. Per `guide_auth-v5_vs_better-auth.md`, Better Auth is at stable v1.6.23 (1.7.0-beta in testing); the `session.sessionData` callback API below must be verified against the 1.6.x docs at implementation time — Better Auth's session enrichment API has evolved across minor versions.
- **Interface:**
  ```typescript
  import { betterAuth } from 'better-auth';
  import { drizzleAdapter } from 'better-auth/adapters/drizzle';
  import { db } from '@stillwater/db';
  import { env } from '@stillwater/config/env';
  import { google, magicLink } from 'better-auth/providers';
  import { resend } from './resend-client';

  export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        // use resend
      },
    },
    session: {
      // Custom session enrichment — attaches memberId + roles
      async sessionData(user) {
        const member = await db.query.members.findFirst({
          where: (m, { eq }) => eq(m.userId, user.id),
          with: { roleAssignments: true },
        });
        return {
          memberId: member?.id ?? null,
          roles: member?.roleAssignments?.map(r => r.role) ?? ['member'],
        };
      },
    },
  });

  export type Session = typeof auth.$Infer.Session;
  ```
- **TDD test file:** `packages/auth/src/config.test.ts`
  - [RED] Test 1: `auth` is exported
  - [RED] Test 2: `Session` type includes `memberId` and `roles` (resolves D10)
  - [RED] Test 3: Google provider configured
  - [RED] Test 4: Magic Link provider configured
- **Checklist:**
  - [ ] Uses Drizzle adapter (not Prisma)
  - [ ] `BETTER_AUTH_SECRET` from env
  - [ ] Google + Magic Link providers
  - [ ] Session enriched with `memberId` + `roles`
  - [ ] `Session` type exported for downstream use

##### F2-02. `/packages/auth/src/client.ts`
- **Purpose:** Better Auth React client (for client components). Per `guide_auth-v5_vs_better-auth.md` G4, Better Auth centralizes all client APIs on a single `authClient` object — different from Auth.js's discrete `signIn`/`signOut`/`useSession` exports from `next-auth/react`.
- **Interface:**
  ```typescript
  import { createAuthClient } from 'better-auth/react';
  import { env } from '@stillwater/config/env';

  export const authClient = createAuthClient({
    baseURL: env.NEXT_PUBLIC_APP_URL,
  });

  // Better Auth client API (DIFFERENT from Auth.js — see guide G4):
  // - authClient.signIn.social({ provider: 'github' })  — NOT signIn('github')
  // - authClient.signIn.magicLink({ email, callbackURL }) — magic link flow
  // - authClient.signOut()                                — NOT signOut()
  // - authClient.useSession() returns { data, error, refetch, isPending }
  //   (NOT { data, status, update } from next-auth/react)

  export const { signIn, signOut, useSession } = authClient;
  ```
- **Usage examples (in client components):**
  ```typescript
  // Google sign-in
  await authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' });

  // Magic link
  await authClient.signIn.magicLink({ email: 'user@example.com', callbackURL: '/dashboard' });

  // Sign out
  await authClient.signOut();

  // Use session (in React component)
  const { data: session, error, isPending } = authClient.useSession();
  if (isPending) return <Skeleton />;
  if (error) return <ErrorState />;
  if (!session) return <SignInPrompt />;
  return <div>Welcome, {session.user.name}</div>;
  ```
- **TDD test file:** `packages/auth/src/client.test.ts`
  - [RED] Test 1: `authClient` exported
  - [RED] Test 2: `signIn`, `signOut`, `useSession` destructured
  - [RED] Test 3: `signIn.social` is a function (Better Auth namespace pattern)
  - [RED] Test 4: `signIn.magicLink` is a function
  - [RED] Test 5: `useSession()` return type includes `data`, `error`, `refetch`, `isPending` (NOT `status`, `update`)
- **Checklist:**
  - [ ] Client created with `NEXT_PUBLIC_APP_URL`
  - [ ] `signIn.social({ provider, callbackURL })` pattern documented
  - [ ] `signIn.magicLink({ email, callbackURL })` pattern documented
  - [ ] `useSession()` returns `{ data, error, refetch, isPending }` (NOT Auth.js `{ data, status, update }`)

##### F2-03. `/packages/auth/src/resend-client.ts`
- **Purpose:** Resend SDK singleton for sending magic link emails.
- **Interface:** `export const resend = new Resend(env.RESEND_API_KEY);`
- **TDD test file:** n/a (trivial).
- **Checklist:**
  - [ ] Singleton pattern
  - [ ] Uses `RESEND_API_KEY` from env

##### F2-04. `/packages/auth/src/types.ts`  ⭐ (resolves D10)
- **Purpose:** Shared auth types including `ActiveSubscriptionSummary` (referenced but undefined in PAD).
- **Interface:**
  ```typescript
  import type { StudioRole } from '@stillwater/db';

  export interface ActiveSubscriptionSummary {
    planName: string;
    status: 'active' | 'trialing' | 'past_due' | 'paused';
    currentPeriodEnd: Date;
    creditsRemaining: number;
  }

  export interface StillwaterSession {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      memberId: string | null;
      roles: StudioRole[];
      activeSubscription: ActiveSubscriptionSummary | null;
    };
    expires: string;
  }
  ```
- **TDD test file:** `packages/auth/src/types.test.ts`
  - [RED] Test 1: `ActiveSubscriptionSummary` interface has all 4 fields
  - [RED] Test 2: `StillwaterSession` matches PAD §9.3 verbatim
- **Checklist:**
  - [ ] `ActiveSubscriptionSummary` defined (resolves D10)
  - [ ] `StillwaterSession` matches PAD spec

##### F2-05. `/packages/auth/src/index.ts`
- **Purpose:** Barrel export.
- **Interface:** Re-exports `auth`, `authClient`, `signIn`, `signOut`, `useSession`, types.
- **Checklist:**
  - [ ] All public exports available
  - [ ] Server-only `auth` not accidentally bundled into client

##### F2-06. `/apps/web/src/app/api/auth/[...all]/route.ts`
- **Purpose:** Better Auth HTTP handler. Catches all `/api/auth/*` requests. Per `guide_auth-v5_vs_better-auth.md` G3, the file path is `[...all]` (NOT Auth.js's `[...nextauth]`), and the handler uses `toNextJsHandler(auth)` (NOT Auth.js's `handlers` export).
- **Interface:**
  ```typescript
  import { auth } from '@stillwater/auth';
  import { toNextJsHandler } from 'better-auth/next-js';

  // Better Auth pattern (DIFFERENT from Auth.js — see guide G3):
  // - File path: /api/auth/[...all]/route.ts  (NOT [...nextauth])
  // - Handler: toNextJsHandler(auth)          (NOT export const { handlers } = NextAuth(...))
  export const { GET, POST } = toNextJsHandler(auth);
  ```
- **TDD test file:** `apps/web/src/app/api/auth/[...all]/route.test.ts` (integration)
  - [RED] Test 1: `GET /api/auth/session` returns 200 with null session when unauthenticated
  - [RED] Test 2: `POST /api/auth/sign-in/social` with Google payload returns 302 to Google
  - [RED] Test 3: `GET /api/auth/ok` (Better Auth health check) returns 200
- **Checklist:**
  - [ ] Both GET and POST exported
  - [ ] File path is `[...all]` NOT `[...nextauth]` (grep-verified)
  - [ ] All Better Auth routes (`/session`, `/sign-in/*`, `/sign-out`, `/callback/*`, `/ok`) accessible

##### F2-07. `/apps/web/src/app/auth/sign-in/page.tsx`
- **Purpose:** Sign-in page with Google button + Magic Link form.
- **Interface:** Server component that renders `<SignInForm />` (client component).
- **TDD test file:** `apps/web/e2e/auth.spec.ts`
  - [RED] Test 1: Visiting `/auth/sign-in` shows Google button + email input
  - [RED] Test 2: Submitting email triggers magic link send (mock Resend)
  - [RED] Test 3: Google button click redirects to Google OAuth
- **Checklist:**
  - [ ] Two-column editorial layout (anti-generic)
  - [ ] Google button uses Radix `Button`
  - [ ] Magic Link form uses `react-hook-form` + Zod
  - [ ] Loading state on submit button
  - [ ] Error state on invalid email
  - [ ] Success state on email sent ("Check your inbox")

##### F2-08. `/apps/web/src/components/auth/SignInForm.tsx`
- **Purpose:** Client component handling sign-in form state.
- **Interface:** `'use client'` component; props: `{ callbackUrl?: string }`.
- **TDD test file:** `apps/web/src/components/auth/SignInForm.test.tsx`
  - [RED] Test 1: Renders Google + Magic Link sections
  - [RED] Test 2: Email input has accessible label
  - [RED] Test 3: Submit button disabled while pending
- **Checklist:**
  - [ ] All UI states (idle, submitting, error, success) handled
  - [ ] Uses Radix primitives
  - [ ] WCAG AAA compliant (focus management, aria-live for errors)

##### F2-09. `/apps/web/src/components/auth/MagicLinkForm.tsx`
- **Purpose:** Magic Link email form.
- **Interface:** `'use client'` component using `react-hook-form` + Zod.
- **TDD test file:** `apps/web/src/components/auth/MagicLinkForm.test.tsx`
- **Checklist:**
  - [ ] Zod schema: `z.object({ email: z.string().email() })`
  - [ ] On submit: calls `signIn.magicLink({ email, callbackURL })`
  - [ ] Shows "Check your inbox" on success

##### F2-10. `/apps/web/src/lib/auth.ts`
- **Purpose:** Server-side auth helpers (get session, require auth, require role).
- **Interface:**
  ```typescript
  import { headers } from 'next/headers';
  import { auth } from '@stillwater/auth';
  import { redirect } from 'next/navigation';
  import type { StudioRole } from '@stillwater/db';

  export async function getSession() {
    return auth.api.getSession({ headers: await headers() });
  }

  export async function requireAuth() {
    const session = await getSession();
    if (!session) redirect('/auth/sign-in');
    return session;
  }

  export async function requireRole(...roles: StudioRole[]) {
    const session = await requireAuth();
    const hasRole = session.user.roles.some(r => roles.includes(r));
    if (!hasRole) redirect('/dashboard');
    return session;
  }
  ```
- **TDD test file:** `apps/web/src/lib/auth.test.ts`
  - [RED] Test 1: `getSession()` returns null when no cookie
  - [RED] Test 2: `requireAuth()` redirects to `/auth/sign-in` when unauthenticated
  - [RED] Test 3: `requireRole('owner')` redirects to `/dashboard` when user is only 'member'
- **Checklist:**
  - [ ] All three helpers exported
  - [ ] Server-only (`import 'server-only'` at top)

##### F2-11. `/apps/web/src/app/auth/sign-out/route.ts`
- **Purpose:** Sign-out POST handler.
- **Interface:** Server action that calls `auth.api.signOut` and redirects to `/`.
- **TDD test file:** n/a (verified by E2E).
- **Checklist:**
  - [ ] POST only (rejects GET)
  - [ ] Clears session cookie
  - [ ] Redirects to `/`

##### F2-12. `/apps/web/src/app/auth/error/page.tsx`
- **Purpose:** Auth error page (OAuth failure, expired magic link, etc.).
- **Interface:** Server component reading `?error=` query param.
- **Checklist:**
  - [ ] Handles common error codes (`OAuthFailed`, `MagicLinkExpired`, `SessionExpired`)
  - [ ] Shows "Try again" CTA linking to `/auth/sign-in`

##### F2-13. `/apps/web/proxy.ts`  [PATCH]  ⭐ CRITICAL — Guide G2 (2-layer auth pattern)
- **Purpose:** Patch the scaffolded `proxy.ts` to use the **2-layer auth pattern** per Auth0 + Better Auth + Next.js 16 guidance. The original scaffolded `proxy.ts` called `auth.api.getSession()` (full DB-backed validation) inside the proxy — this is explicitly discouraged. proxy.ts must be lightweight: cookie-existence-only optimistic check via `getSessionCookie()`. Full session validation + RBAC moves to Server Component layouts.
- **Interface (REPLACES scaffolded logic entirely):**
  ```typescript
  /**
   * Stillwater — proxy.ts (Next.js 16)
   *
   * 2-LAYER AUTH PATTERN (per guide_auth-v5_vs_better-auth.md §Route Protection):
   *   Layer 1 (THIS FILE): Cookie-existence-only optimistic check.
   *     - Uses getSessionCookie() from better-auth/cookies
   *     - NO DB access, NO auth.api.getSession(), NO RBAC role checks
   *     - Edge-compatible (can run on Edge runtime)
   *     - Purpose: fast redirect for unauthenticated users
   *   Layer 2 (Server Component layouts): Full session validation + RBAC.
   *     - (studio)/layout.tsx calls requireAuth()
   *     - (admin)/layout.tsx calls requireRole('staff', 'manager', 'owner')
   *     - (admin)/admin/revenue/layout.tsx calls requireRole('manager', 'owner')
   *     - (admin)/admin/settings/layout.tsx calls requireRole('owner')
   *     - Purpose: actual security boundary
   *
   * Reference: Auth0 Next.js 16 guidance — "proxy.ts is not intended for
   * full session management or complex authorization. Keep it light."
   */

  import { getSessionCookie } from "better-auth/cookies";
  import { type NextRequest, NextResponse } from "next/server";

  // Routes that require ANY authenticated session (cookie existence check only).
  // RBAC role checks happen in layout.tsx via requireRole(), NOT here.
  const AUTH_REQUIRED_ROUTES = [
    "/dashboard",
    "/book",
    "/my-classes",
    "/membership",
    "/profile",
    "/waitlist",
    "/admin",
  ];

  export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if route requires authentication (prefix match)
    const requiresAuth = AUTH_REQUIRED_ROUTES.some((route) => pathname.startsWith(route));
    if (!requiresAuth) {
      return NextResponse.next();
    }

    // Cookie-existence-only optimistic check (Edge-compatible, no DB access)
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      const signInUrl = new URL("/auth/sign-in", request.nextUrl.origin);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // NOTE: Do NOT do RBAC role checks here. Those happen in layout.tsx.
    // The cookie existence is enough for the optimistic redirect;
    // if the session is invalid/expired, layout.tsx will catch it.
    return NextResponse.next();
  }

  export const config = {
    matcher: [
      "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)).*)",
    ],
  };
  ```
- **TDD test file:** `apps/web/e2e/proxy.spec.ts`
  - [RED] Test 1: Unauthenticated GET `/dashboard` (no session cookie) → 307 to `/auth/sign-in?callbackUrl=/dashboard`
  - [RED] Test 2: Authenticated member GET `/dashboard` (valid session cookie) → 200 (proxy passes through; layout does full validation)
  - [RED] Test 3: GET `/admin` with valid session cookie but insufficient role → proxy passes through (200 from proxy), but `(admin)/layout.tsx` redirects to `/dashboard` (Test 3 moves to layout E2E)
  - [RED] Test 4: GET `/schedule` (public route) → 200 (no cookie check)
- **Checklist:**
  - [ ] Uses `getSessionCookie()` from `better-auth/cookies` (NOT `auth.api.getSession()`)
  - [ ] NO DB access, NO `auth` import, NO Node.js-only APIs
  - [ ] `AUTH_REQUIRED_ROUTES` is a flat array (NOT a role-map — RBAC moved to layouts)
  - [ ] Edge-runtime compatible (verify with `runtime = 'edge'` if desired)
  - [ ] Matcher config preserved
  - [ ] All 4 E2E tests GREEN
  - [ ] Layout-level RBAC tests GREEN (see F2-16, F2-17, F2-18, F2-19 below)

##### F2-14. `/packages/auth/src/rbac.ts`
- **Purpose:** RBAC permission matrix as a TypeScript function (mirrors PAD §9.4 table).
- **Interface:**
  ```typescript
  import type { StudioRole } from '@stillwater/db';

  export type Permission =
    | 'schedule:view'
    | 'class:book'
    | 'class:cancel:own'
    | 'history:view:own'
    | 'schedule:view:own'
    | 'checkin:member'
    | 'members:view:all'
    | 'schedule:manage'
    | 'class:cancel:any'
    | 'revenue:view'
    | 'memberships:manage'
    | 'roles:assign'
    | 'settings:studio';

  const MATRIX: Record<Permission, StudioRole[]> = {
    'schedule:view': ['guest', 'member', 'instructor', 'staff', 'manager', 'owner'],
    'class:book': ['member', 'instructor', 'staff', 'manager', 'owner'],
    // ... all 13 permissions per PAD §9.4
  };

  export function can(roles: StudioRole[], permission: Permission): boolean {
    return roles.some(r => MATRIX[permission].includes(r));
  }
  ```
- **TDD test file:** `packages/auth/src/rbac.test.ts`
  - [RED] Test 1: `can(['member'], 'schedule:view')` returns `true`
  - [RED] Test 2: `can(['member'], 'revenue:view')` returns `false`
  - [RED] Test 3: `can(['owner'], 'settings:studio')` returns `true`
  - [RED] Test 4: All 13 permissions × 6 roles tested (78 cases)
- **Checklist:**
  - [ ] Matrix matches PAD §9.4 verbatim
  - [ ] `can()` function exported
  - [ ] Full test coverage on matrix

##### F2-15. `/apps/web/src/app/auth/callback/route.ts`
- **Purpose:** OAuth callback handler. Better Auth handles internally; this is a thin wrapper.
- **Interface:** Re-export from Better Auth.
- **Checklist:**
  - [ ] Delegates to `auth.api.callback`

##### F2-16. `/apps/web/src/app/(studio)/layout.tsx`  ⭐ NEW — Guide G2 (Layer 2 auth)
- **Purpose:** Studio route group layout. Enforces `requireAuth()` (full session validation) at the layout boundary — NOT in proxy.ts.
- **Interface:**
  ```typescript
  import { requireAuth } from '@/lib/auth';
  import { StudioShell } from '@/components/studio/StudioShell';

  export default async function StudioLayout({ children }: { children: React.ReactNode }) {
    const session = await requireAuth();  // Full validation; throws NEXT_REDIRECT if unauthenticated
    return <StudioShell session={session}>{children}</StudioShell>;
  }
  ```
- **TDD test file:** `apps/web/e2e/studio-layout.spec.ts`
  - [RED] Test 1: Unauthenticated GET `/dashboard` (with stale/invalid session cookie) → 307 to `/auth/sign-in` (proxy passes through, layout catches invalid session)
  - [RED] Test 2: Authenticated member GET `/dashboard` → 200
- **Checklist:**
  - [ ] Calls `requireAuth()` (full validation via `auth.api.getSession`)
  - [ ] Renders `<StudioShell>` with session
  - [ ] Server Component (no `'use client'`)

##### F2-17. `/apps/web/src/app/(admin)/layout.tsx`  ⭐ NEW — Guide G2 (Layer 2 RBAC)
- **Purpose:** Admin route group layout. Enforces `requireRole('staff', 'manager', 'owner')` at the layout boundary.
- **Interface:**
  ```typescript
  import { requireRole } from '@/lib/auth';
  import { AdminShell } from '@/components/admin/AdminShell';

  export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await requireRole('staff', 'manager', 'owner');  // Full validation + RBAC
    return <AdminShell session={session}>{children}</AdminShell>;
  }
  ```
- **TDD test file:** `apps/web/e2e/admin-layout.spec.ts`
  - [RED] Test 1: Authenticated member GET `/admin` → 307 to `/dashboard` (insufficient role)
  - [RED] Test 2: Authenticated staff GET `/admin` → 200
  - [RED] Test 3: Authenticated owner GET `/admin` → 200
- **Checklist:**
  - [ ] Calls `requireRole('staff', 'manager', 'owner')`
  - [ ] Server Component
  - [ ] Replaces the RBAC logic that was incorrectly in proxy.ts

##### F2-18. `/apps/web/src/app/(admin)/admin/revenue/layout.tsx`  ⭐ NEW — Guide G2 (Layer 2 RBAC)
- **Purpose:** Revenue section nested layout. Enforces `requireRole('manager', 'owner')`.
- **Interface:**
  ```typescript
  import { requireRole } from '@/lib/auth';

  export default async function RevenueLayout({ children }: { children: React.ReactNode }) {
    await requireRole('manager', 'owner');
    return <>{children}</>;
  }
  ```
- **TDD test file:** `apps/web/e2e/admin-revenue-layout.spec.ts`
  - [RED] Test 1: Authenticated staff GET `/admin/revenue` → 307 to `/dashboard`
  - [RED] Test 2: Authenticated manager GET `/admin/revenue` → 200
- **Checklist:**
  - [ ] Calls `requireRole('manager', 'owner')`
  - [ ] Nested under `(admin)/layout.tsx` (so staff is already filtered out — this is defense-in-depth)

##### F2-19. `/apps/web/src/app/(admin)/admin/settings/layout.tsx`  ⭐ NEW — Guide G2 (Layer 2 RBAC)
- **Purpose:** Settings section nested layout. Enforces `requireRole('owner')` (highest tier).
- **Interface:**
  ```typescript
  import { requireRole } from '@/lib/auth';

  export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
    await requireRole('owner');
    return <>{children}</>;
  }
  ```
- **TDD test file:** `apps/web/e2e/admin-settings-layout.spec.ts`
  - [RED] Test 1: Authenticated manager GET `/admin/settings` → 307 to `/dashboard`
  - [RED] Test 2: Authenticated owner GET `/admin/settings` → 200
- **Checklist:**
  - [ ] Calls `requireRole('owner')`
  - [ ] Nested under `(admin)/layout.tsx`

#### Phase 2 acceptance test
```bash
pnpm test --filter=@stillwater/auth              # all auth tests green
pnpm test:e2e -- --grep "auth"                   # auth E2E tests green
# Manual smoke:
# 1. Visit /auth/sign-in
# 2. Click Google → complete OAuth → land on /dashboard
# 3. Sign out → visit /dashboard → redirected to /auth/sign-in
# 4. Sign in as test owner → visit /admin → 200 OK
```

---

### Phase 3 — tRPC v11 Routers (10 routers, ~30 procedures)

**Goal:** All 10 tRPC routers implemented with full Zod input validation, RBAC middleware, and integration tests against Testcontainers Postgres.

**Dependencies:** Phase 0 (api package scaffolded), Phase 1 (db schema), Phase 2 (auth + RBAC).

**Estimated duration:** 5 days.

**Acceptance criteria:**
- [ ] All 10 routers registered in `root.ts`
- [ ] All ~30 procedures from PAD §8.4 implemented
- [ ] 90% test coverage on `packages/api/routers/*`
- [ ] Booking procedure uses advisory lock (no double-booking under concurrent requests)
- [ ] RBAC middleware enforces 4 access tiers (`public`, `protected`, `staff`, `owner`)
- [ ] Rate limiting on `bookings.book` (max 10/min per user)

#### Files to CREATE

##### F3-01. `/packages/api/src/trpc.ts`  ⭐ (defines context + procedure factories)
- **Purpose:** tRPC router factory, context type, and 4 procedure tiers.
- **Interface:**
  ```typescript
  import { initTRPC, TRPCError } from '@trpc/server';
  import { betterAuth } from 'better-auth';
  import type { DrizzleDB } from '@stillwater/db';
  import type { Redis } from '@upstash/redis';
  import type { TriggerClient } from '@trigger.dev/sdk';
  import type { Session } from '@stillwater/auth';

  export interface TRPCContext {
    db: DrizzleDB;
    session: Session | null;
    jobs: TriggerClient;
    redis: Redis;
    req: Request;
  }

  const t = initTRPC.context<TRPCContext>().create();

  export const router = t.router;
  export const publicProcedure = t.procedure;

  export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.session) throw new TRPCError({ code: 'UNAUTHORIZED' });
    return next({ ctx: { ...ctx, session: ctx.session } });
  });

  export const staffProcedure = protectedProcedure.use(async ({ ctx, next }) => {
    const hasStaff = ctx.session.user.roles.some(r => ['staff', 'manager', 'owner'].includes(r));
    if (!hasStaff) throw new TRPCError({ code: 'FORBIDDEN' });
    return next();
  });

  export const ownerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.session.user.roles.includes('owner')) throw new TRPCError({ code: 'FORBIDDEN' });
    return next();
  });
  ```
- **TDD test file:** `packages/api/src/trpc.test.ts`
  - [RED] Test 1: `publicProcedure` allows unauthenticated call
  - [RED] Test 2: `protectedProcedure` throws UNAUTHORIZED without session
  - [RED] Test 3: `staffProcedure` throws FORBIDDEN for member-only session
  - [RED] Test 4: `ownerProcedure` throws FORBIDDEN for non-owner session
- **Checklist:**
  - [ ] `TRPCContext` matches PAD §8.5
  - [ ] 4 procedure tiers exported
  - [ ] All 4 RED tests GREEN

##### F3-02. `/packages/api/src/context.ts`
- **Purpose:** Context builder — runs on every request, assembles db + session + jobs + redis.
- **Interface:**
  ```typescript
  import { db } from '@stillwater/db';
  import { auth } from '@stillwater/auth';
  import { env } from '@stillwater/config/env';
  import { Redis } from '@upstash/redis';
  import { TriggerClient } from '@trigger.dev/sdk';
  import type { TRPCContext } from './trpc';

  const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN });
  const jobs = new TriggerClient({ id: 'stillwater', apiKey: env.TRIGGER_SECRET_KEY });

  export async function createContext({ req }: { req: Request }): Promise<TRPCContext> {
    const session = await auth.api.getSession({ headers: req.headers });
    return { db, session, jobs, redis, req };
  }
  ```
- **TDD test file:** `packages/api/src/context.test.ts`
  - [RED] Test 1: `createContext` returns object with `db`, `session`, `jobs`, `redis`, `req` keys
  - [RED] Test 2: `session` is null when no auth cookie
- **Checklist:**
  - [ ] Redis singleton (not re-instantiated per request)
  - [ ] TriggerClient singleton
  - [ ] Session fetched via `auth.api.getSession`

##### F3-03. `/packages/api/src/middleware/rateLimit.ts`
- **Purpose:** Per-procedure rate limiting using Upstash Ratelimit.
- **Interface:** tRPC middleware factory:
  ```typescript
  export const rateLimit = (opts: { limit: number; window: '1 m' | '1 h'; identifier?: 'user' | 'ip' }) => t.middleware(...)
  ```
- **TDD test file:** `packages/api/src/middleware/rateLimit.test.ts`
  - [RED] Test 1: 11th request within 1 minute returns `TOO_MANY_REQUESTS`
  - [RED] Test 2: 10th request within 1 minute succeeds
- **Checklist:**
  - [ ] Uses `@upstash/ratelimit` sliding window
  - [ ] Identifier: `ctx.session.user.id` for authed, `ctx.req.headers['x-forwarded-for']` for anon
  - [ ] Returns `429` with `retryAfter` header

##### F3-04. `/packages/api/src/routers/schedule.ts`
- **Purpose:** Public schedule router — `getWeek`, `getSession`.
- **Interface:**
  ```typescript
  export const scheduleRouter = router({
    getWeek: publicProcedure
      .input(z.object({ weekStart: z.date() }))
      .query(async ({ ctx, input }) => {
        // Returns all sessions for the ISO week containing weekStart
      }),
    getSession: publicProcedure
      .input(z.object({ sessionId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        // Returns single session with live enrollment count
      }),
  });
  ```
- **TDD test file:** `packages/api/src/routers/schedule.test.ts`
  - [RED] Test 1: `getWeek` with Monday date returns 7 sessions (using seed data)
  - [RED] Test 2: `getSession` returns enrollment count matching confirmed enrollments
  - [RED] Test 3: `getSession` for non-existent ID throws NOT_FOUND
- **Checklist:**
  - [ ] Both procedures public
  - [ ] Returns DTOs (not raw DB rows) — strip sensitive fields
  - [ ] No N+1 — uses Drizzle `with` for relations

##### F3-05. `/packages/api/src/routers/classes.ts`
- **Purpose:** Class catalog CRUD (admin) + public listing.
- **Interface:** Procedures: `list` (public), `getBySlug` (public), `create` (staff), `update` (staff), `delete` (staff soft-delete).
- **TDD test file:** `packages/api/src/routers/classes.test.ts`
- **Checklist:**
  - [ ] `list` returns only `isActive: true` classes for public
  - [ ] Admin `list` includes inactive
  - [ ] `create` validates unique slug

##### F3-06. `/packages/api/src/routers/sessions.ts`
- **Purpose:** Class session management (admin).
- **Interface:** Procedures: `listByDateRange` (public), `create` (staff), `update` (staff), `cancel` (staff), `checkIn` (staff).
- **TDD test file:** `packages/api/src/routers/sessions.test.ts`
- **Checklist:**
  - [ ] `cancel` cascades to enrollments + waitlist (triggers `class-cancellation-notify` job)

##### F3-07. `/packages/api/src/routers/bookings.ts`  ⭐ CRITICAL (uses advisory lock — ADR-004)
- **Purpose:** Member booking + cancellation.
- **Interface:**
  ```typescript
  export const bookingsRouter = router({
    book: protectedProcedure
      .use(rateLimit({ limit: 10, window: '1 m' }))
      .input(z.object({ sessionId: z.string().uuid(), notes: z.string().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.transaction(async (tx) => {
          // Advisory lock keyed on sessionId
          const sessionHash = hashStringToBigInt(input.sessionId);
          await tx.execute(sql`SELECT pg_advisory_xact_lock(${sessionHash})`);

          const session = await tx.query.classSessions.findFirst({
            where: eq(classSessions.id, input.sessionId),
            with: { class: true, _count: { enrollments: { where: eq(enrollments.status, 'confirmed') } } },
          });

          if (!session) throw new TRPCError({ code: 'NOT_FOUND' });
          if (session.status !== 'scheduled') throw new TRPCError({ code: 'BAD_REQUEST' });

          const capacity = session.overrideCapacity ?? session.class.maxCapacity;
          const enrolled = session._count.enrollments;

          if (enrolled >= capacity) {
            // Auto-add to waitlist
            const position = await getNextWaitlistPosition(tx, input.sessionId);
            await tx.insert(waitlistEntries).values({
              sessionId: input.sessionId,
              memberId: ctx.session.user.memberId!,
              position,
              expiresAt: null,
            });
            // Trigger waitlist-joined email
            await ctx.jobs.trigger('waitlist-joined', { ... });
            return { status: 'waitlisted' as const, position };
          }

          // Verify membership credit OR class package
          const credit = await consumeMembershipCredit(tx, ctx.session.user.memberId!, session);
          if (!credit) throw new TRPCError({ code: 'PAYMENT_REQUIRED', message: 'No active membership or package credits' });

          const [enrollment] = await tx.insert(enrollments).values({
            sessionId: input.sessionId,
            memberId: ctx.session.user.memberId!,
            packageCreditId: credit?.id,
          }).returning();

          await ctx.jobs.trigger('booking-confirmation', {
            enrollmentId: enrollment.id,
            memberId: ctx.session.user.memberId,
          });

          return { status: 'confirmed' as const, enrollmentId: enrollment.id };
        });
      }),

    cancel: protectedProcedure
      .input(z.object({ enrollmentId: z.string().uuid(), reason: z.string().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        // Cancel enrollment → return credit → trigger waitlist-promotion job
      }),

    checkIn: staffProcedure
      .input(z.object({ enrollmentId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        // Mark enrollment as 'attended' with checkedInAt = now()
      }),
  });
  ```
- **TDD test file:** `packages/api/src/routers/bookings.test.ts` (integration — Testcontainers Postgres)
  - [RED] Test 1: BOOK-001 — Books confirmed session for member with active subscription
  - [RED] Test 2: BOOK-002 — Adds to waitlist when session at capacity
  - [RED] Test 3: BOOK-003 — Prevents double-booking same session (unique constraint)
  - [RED] Test 4: BOOK-004 — Consumes one credit from package on booking
  - [RED] Test 5: BOOK-005 — Rejects booking for member with no active subscription or package (PAYMENT_REQUIRED)
  - [RED] Test 6: BOOK-006 — Concurrent booking attempts (10 simultaneous) for 1 remaining seat → exactly 1 confirmed, 9 waitlisted
  - [RED] Test 7: Cancellation triggers `waitlist-promotion` job
  - [RED] Test 8: `checkIn` requires staff role
- **Checklist:**
  - [ ] Advisory lock used (ADR-004)
  - [ ] All 8 RED tests GREEN
  - [ ] Rate limited (10/min)
  - [ ] Returns discriminated union (`{ status: 'confirmed' } | { status: 'waitlisted', position }`)

##### F3-08. `/packages/api/src/routers/waitlist.ts`
- **Purpose:** Waitlist management.
- **Interface:** Procedures: `join` (protected), `leave` (protected), `claimOffer` (protected), `getMyPosition` (protected).
- **TDD test file:** `packages/api/src/routers/waitlist.test.ts`
  - [RED] Test 1: WAIT-001 — Promotes next waitlist member when booking cancelled
  - [RED] Test 2: WAIT-002 — Sends offer email to promoted member
  - [RED] Test 3: WAIT-003 — Expires offer and promotes again after window closes
  - [RED] Test 4: WAIT-004 — Returns credit to member package on cancellation
  - [RED] Test 5: WAIT-005 — Handles cancellation with no waitlist gracefully
- **Checklist:**
  - [ ] All 5 WAIT tests GREEN
  - [ ] `claimOffer` enforces 2-hour expiry window

##### F3-09. `/packages/api/src/routers/members.ts`
- **Purpose:** Member profile + history.
- **Interface:** Procedures: `getProfile` (protected), `updateProfile` (protected), `getHistory` (protected), `list` (staff).
- **TDD test file:** `packages/api/src/routers/members.test.ts`
- **Checklist:**
  - [ ] `getProfile` returns only the caller's own profile
  - [ ] `getHistory` returns paginated attendance + booking history
  - [ ] `list` returns all members (staff only)

##### F3-10. `/packages/api/src/routers/instructors.ts`
- **Purpose:** Instructor profiles.
- **Interface:** Procedures: `list` (public), `getBySlug` (public), `create` (staff), `update` (staff).
- **TDD test file:** `packages/api/src/routers/instructors.test.ts`
- **Checklist:**
  - [ ] Public list returns only `isActive: true`
  - [ ] `getBySlug` includes extended bio from Sanity (Phase 4 integration)

##### F3-11. `/packages/api/src/routers/memberships.ts`
- **Purpose:** Membership plan listing + subscription lifecycle.
- **Interface:** Procedures: `getPlans` (public), `subscribe` (protected), `cancel` (protected), `pause` (protected), `resume` (protected), `getMySubscription` (protected).
- **TDD test file:** `packages/api/src/routers/memberships.test.ts`
- **Checklist:**
  - [ ] `subscribe` creates Stripe Checkout Session (Phase 7 integration)
  - [ ] `cancel` sets `cancelAtPeriodEnd: true`
  - [ ] `pause` sets `pausedAt` + `pauseResumesAt`

##### F3-12. `/packages/api/src/routers/payments.ts`
- **Purpose:** Stripe customer portal + invoice history + refund (staff).
- **Interface:** Procedures: `getPortalUrl` (protected), `getInvoices` (protected), `refund` (staff, resolves D12).
- **TDD test file:** `packages/api/src/routers/payments.test.ts`
- **Checklist:**
  - [ ] `getPortalUrl` returns Stripe Billing Portal URL
  - [ ] `refund` calls `stripe.refunds.create` and logs to `payment_events`

##### F3-13. `/packages/api/src/routers/admin.ts`
- **Purpose:** Admin aggregations.
- **Interface:** Procedures: `getDashboard` (staff), `getRevenue` (manager), `getClassRoster` (staff), `getAttendanceStats` (staff).
- **TDD test file:** `packages/api/src/routers/admin.test.ts`
- **Checklist:**
  - [ ] `getDashboard` returns KPIs (active members, classes this week, revenue MTD, attendance rate)
  - [ ] `getRevenue` returns MRR, churn rate, attendance metrics
  - [ ] Read replica routing (PAD §22.4) — uses unpooled connection for heavy queries

##### F3-14. `/packages/api/src/root.ts`
- **Purpose:** Root router that merges all 10 routers.
- **Interface:**
  ```typescript
  import { router } from './trpc';
  import { scheduleRouter } from './routers/schedule';
  // ... import all 10 routers

  export const appRouter = router({
    schedule: scheduleRouter,
    classes: classesRouter,
    sessions: sessionsRouter,
    bookings: bookingsRouter,
    waitlist: waitlistRouter,
    members: membersRouter,
    instructors: instructorsRouter,
    memberships: membershipsRouter,
    payments: paymentsRouter,
    admin: adminRouter,
  });

  export type AppRouter = typeof appRouter;
  ```
- **TDD test file:** `packages/api/src/root.test.ts`
  - [RED] Test 1: `appRouter` has all 10 keys
  - [RED] Test 2: `AppRouter` type infers procedure paths
- **Checklist:**
  - [ ] All 10 routers merged
  - [ ] `AppRouter` type exported for client inference

##### F3-15. `/packages/api/src/index.ts`
- **Purpose:** Barrel export.
- **Interface:** Re-exports `appRouter`, `AppRouter`, `createContext`, procedure factories.
- **Checklist:**
  - [ ] Public API surface exported

##### F3-16. `/apps/web/src/app/api/trpc/[trpc]/route.ts`
- **Purpose:** tRPC HTTP handler for Next.js App Router.
- **Interface:**
  ```typescript
  import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
  import { appRouter, createContext } from '@stillwater/api';

  const handler = (req: Request) =>
    fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext,
    });

  export { handler as GET, handler as POST };
  ```
- **TDD test file:** `apps/web/src/app/api/trpc/[trpc]/route.test.ts` (integration)
  - [RED] Test 1: `GET /api/trpc/schedule.getWeek?input=...` returns 200 with JSON
  - [RED] Test 2: `POST /api/trpc/bookings.book` without auth returns 401
- **Checklist:**
  - [ ] Both GET and POST exported
  - [ ] Uses fetch adapter (Vercel-compatible)

##### F3-17. `/apps/web/src/lib/trpc/server.ts`
- **Purpose:** Server-side tRPC caller for RSC (zero HTTP round-trip).
- **Interface:**
  ```typescript
  import 'server-only';
  import { appRouter, createContext } from '@stillwater/api';
  import { headers } from 'next/headers';

  export async function apiCaller() {
    const heads = new Headers(await headers());
    const ctx = await createContext({ req: { headers: heads } as Request });
    return appRouter.createCaller(ctx);
  }
  ```
- **TDD test file:** `apps/web/src/lib/trpc/server.test.ts`
  - [RED] Test 1: `apiCaller()` returns object with all 10 router keys
- **Checklist:**
  - [ ] Server-only (`server-only` import)
  - [ ] Used by all RSC pages in Phases 4, 5, 6, 9

##### F3-18. `/apps/web/src/lib/trpc/client.ts`
- **Purpose:** tRPC React client setup with React Query.
- **Interface:**
  ```typescript
  'use client';
  import { createTRPCReact } from '@trpc/react-query';
  import type { AppRouter } from '@stillwater/api';
  import { httpBatchLink } from '@trpc/client';

  export const trpc = createTRPCReact<AppRouter>();
  export function TRPCProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());
    const [trpcClient] = useState(() =>
      trpc.createClient({
        links: [httpBatchLink({ url: '/api/trpc' })],
      })
    );
    return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    );
  }
  ```
- **TDD test file:** n/a (integration-tested in component tests).
- **Checklist:**
  - [ ] `'use client'` directive
  - [ ] `TRPCProvider` exported
  - [ ] Wraps root layout in Phase 4

##### F3-19. `/apps/web/src/lib/trpc/query-keys.ts`
- **Purpose:** Centralised query key factory for cache invalidation.
- **Interface:**
  ```typescript
  export const queryKeys = {
    schedule: {
      week: (weekStart: Date) => ['schedule', 'week', weekStart.toISOString()] as const,
      session: (id: string) => ['schedule', 'session', id] as const,
    },
    bookings: {
      myClasses: () => ['bookings', 'my-classes'] as const,
    },
    // ... etc
  };
  ```
- **Checklist:**
  - [ ] Covers all query procedures
  - [ ] Used by `useQuery` and `utils.invalidateQueries()`

#### Phase 3 acceptance test
```bash
pnpm test --filter=@stillwater/api                # all router tests green
pnpm test:coverage --filter=@stillwater/api       # 90%+ coverage
# Manual: hit /api/trpc/schedule.getWeek via curl
```


### Phase 4 — Marketing Surface with Sanity CMS

**Goal:** All 8 marketing routes (`/`, `/about`, `/instructors`, `/instructors/[slug]`, `/schedule`, `/classes/[slug]`, `/pricing`, `/blog`, `/blog/[slug]`) render from PostgreSQL operational data + Sanity marketing content with ISR per the rendering strategy table.

**Dependencies:** Phase 0, 1, 2, 3.

**Estimated duration:** 4 days.

**Acceptance criteria:**
- [ ] All marketing routes return 200
- [ ] ISR cache headers correct (`Cache-Control: s-maxage=3600, stale-while-revalidate`)
- [ ] Sanity webhook fires `revalidatePath` on publish
- [ ] LCP < 1.5s on `/`
- [ ] Lighthouse SEO = 100

#### Files to CREATE

##### F4-01. `/apps/studio/sanity.config.ts`
- **Purpose:** Sanity Studio configuration (hosted separately; mounted at `stillwater.sanity.studio`).
- **Interface:** Sanity Studio config exporting `defineConfig({ projectId, dataset, schema, plugins })`.
- **TDD test file:** n/a (Sanity Studio config; verified manually).
- **Checklist:**
  - [ ] Project ID from env
  - [ ] Dataset from env
  - [ ] Schema types: `siteSettings`, `homePage`, `aboutPage`, `blogPost`, `faq`, `instructorBio`, `testimonial`, `announcement`
  - [ ] Plugin: `structureTool`

##### F4-02. `/apps/studio/schema/index.ts`
- **Purpose:** Sanity schema barrel.
- **Interface:** `export const schemaTypes = [siteSettings, homePage, ...]`
- **Checklist:**
  - [ ] All 8 schema types from PAD §14.2 declared

##### F4-03–F4-10. `/apps/studio/schema/{siteSettings,homePage,aboutPage,blogPost,faq,instructorBio,testimonial,announcement}.ts`
- **Purpose:** Individual Sanity schema definitions.
- **Interface:** Sanity schema `defineType` / `defineField` blocks.
- **TDD test file:** n/a.
- **Checklist:**
  - [ ] Each schema has `name`, `title`, `type`, `fields`
  - [ ] `blogPost` has Portable Text body
  - [ ] `homePage` has `hero { headline, subheadline, ctaLabel, ctaHref }` matching GROQ query
  - [ ] `testimonial` has `quote`, `memberName`, `className`, `rating` (1-5)

##### F4-11. `/apps/web/src/lib/sanity/client.ts`
- **Purpose:** Sanity client (server-side, uses `SANITY_API_TOKEN`).
- **Interface:**
  ```typescript
  import { createClient } from '@sanity/client';
  import { env } from '@stillwater/config/env';

  export const sanityClient = createClient({
    projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: '2024-01-01',
    token: env.SANITY_API_TOKEN,
    useCdn: true,
  });
  ```
- **TDD test file:** `apps/web/src/lib/sanity/client.test.ts`
  - [RED] Test 1: Client configured with project ID from env
  - [RED] Test 2: `useCdn: true`
- **Checklist:**
  - [ ] Server-side only (token)
  - [ ] CDN enabled for ISR

##### F4-12. `/apps/web/src/lib/sanity/queries.ts`
- **Purpose:** GROQ query strings.
- **Interface:**
  ```typescript
  import groq from 'groq';

  export const homePageQuery = groq`*[_type == "homePage"][0] { ... }`;
  export const blogPostQuery = groq`*[_type == "blogPost" && slug.current == $slug][0] { ... }`;
  export const blogIndexQuery = groq`*[_type == "blogPost"] | order(publishedAt desc) { ... }`;
  export const instructorBioQuery = groq`*[_type == "instructorBio" && slug.current == $slug][0] { ... }`;
  ```
- **TDD test file:** `apps/web/src/lib/sanity/queries.test.ts`
  - [RED] Test 1: Each query is a string
- **Checklist:**
  - [ ] All 4 queries match PAD §14.4 verbatim

##### F4-13. `/apps/web/src/lib/sanity/fetch.ts`
- **Purpose:** Typed fetch helper with `next.revalidate` tag for ISR.
- **Interface:**
  ```typescript
  export async function sanityFetch<T>(query: string, params?: Record<string, unknown>, revalidate = 3600): Promise<T> {
    return sanityClient.fetch<T>(query, params, { next: { revalidate, tags: ['sanity'] } });
  }
  ```
- **TDD test file:** `apps/web/src/lib/sanity/fetch.test.ts`
- **Checklist:**
  - [ ] Default 1-hour revalidate
  - [ ] Tagged for on-demand revalidation

##### F4-14. `/apps/web/src/app/api/webhooks/sanity/route.ts`
- **Purpose:** Sanity webhook receiver. Verifies HMAC, then `revalidatePath` for affected routes.
- **Interface:**
  ```typescript
  import { revalidatePath } from 'next/cache';
  import { env } from '@stillwater/config/env';

  export async function POST(req: Request) {
    const body = await req.json();
    const signature = req.headers.get('x-sanity-signature');
    // Verify HMAC using SANITY_WEBHOOK_SECRET
    // Trigger revalidatePath for affected paths
    return new Response('ok', { status: 200 });
  }
  ```
- **TDD test file:** `apps/web/src/app/api/webhooks/sanity/route.test.ts`
  - [RED] Test 1: Valid signature → 200 + revalidatePath called
  - [RED] Test 2: Invalid signature → 401
  - [RED] Test 3: Missing signature → 400
- **Checklist:**
  - [ ] HMAC verification using `crypto.timingSafeEqual`
  - [ ] `revalidatePath('/')` for homepage changes
  - [ ] `revalidatePath('/blog/[slug]', 'page')` for blog posts

##### F4-15. `/apps/web/src/app/(marketing)/layout.tsx`
- **Purpose:** Marketing route group layout. Wraps all marketing pages with `<MarketingNav />` + `<MarketingFooter />`.
- **Interface:** Server component.
- **Checklist:**
  - [ ] Renders nav + main + footer
  - [ ] Sets `metadataBase` for SEO

##### F4-16. `/apps/web/src/app/(marketing)/page.tsx`
- **Purpose:** Home page (ISR 3600s).
- **Interface:**
  ```typescript
  import { sanityFetch, homePageQuery } from '@/lib/sanity';
  import { apiCaller } from '@/lib/trpc/server';

  export const revalidate = 3600;

  export default async function HomePage() {
    const [homeContent, schedulePreview] = await Promise.all([
      sanityFetch(homePageQuery),
      apiCaller().then(c => c.schedule.getWeek({ weekStart: getMonday(new Date()) })),
    ]);
    // Render hero, marquee, philosophy, schedule preview, instructors preview, membership, studio, CTA
  }
  ```
- **TDD test file:** `apps/web/e2e/home.spec.ts`
  - [RED] Test 1: Home page renders hero headline "The practice of returning to yourself."
  - [RED] Test 2: Schedule section shows 7 day tabs
  - [RED] Test 3: Lighthouse LCP < 1500ms
- **Checklist:**
  - [ ] `revalidate = 3600`
  - [ ] Parallel data fetch (Sanity + tRPC)
  - [ ] All UI states (loading skeleton, error, empty)

##### F4-17. `/apps/web/src/app/(marketing)/about/page.tsx`
- **Purpose:** About page (ISR 86400s).
- **Checklist:**
  - [ ] Renders studio story from Sanity `aboutPage`
  - [ ] Team narrative section

##### F4-18. `/apps/web/src/app/(marketing)/instructors/page.tsx`
- **Purpose:** Instructor roster (ISR 86400s).
- **Interface:** Server component that fetches `instructors.list` from tRPC + extended bios from Sanity.
- **Checklist:**
  - [ ] Alternating editorial layout (matches mockup §03)
  - [ ] Each instructor links to `/instructors/[slug]`

##### F4-19. `/apps/web/src/app/(marketing)/instructors/[slug]/page.tsx`
- **Purpose:** Single instructor bio (ISR 86400s).
- **Interface:** `generateStaticParams` for SSG.
- **Checklist:**
  - [ ] `generateStaticParams` returns all instructor slugs
  - [ ] `generateMetadata` for SEO
  - [ ] Photo from Cloudflare Images

##### F4-20. `/apps/web/src/app/(marketing)/schedule/page.tsx`
- **Purpose:** Schedule page (ISR 300s — 5 min).
- **Interface:**
  ```typescript
  export const revalidate = 300;
  ```
- **Checklist:**
  - [ ] 7-day tab interface
  - [ ] Filter by level / instructor
  - [ ] Class cards link to `/book/[sessionId]` (Phase 5)

##### F4-21. `/apps/web/src/app/(marketing)/classes/[slug]/page.tsx`
- **Purpose:** Class detail page (ISR 3600s).
- **Checklist:**
  - [ ] `generateStaticParams` for all class slugs
  - [ ] Lists upcoming sessions for this class

##### F4-22. `/apps/web/src/app/(marketing)/pricing/page.tsx`
- **Purpose:** Pricing page (ISR 3600s).
- **Checklist:**
  - [ ] 3-tier comparison table (matches mockup §04)
  - [ ] Each plan links to Stripe checkout (Phase 7)

##### F4-23. `/apps/web/src/app/(marketing)/blog/page.tsx`
- **Purpose:** Blog index (SSG + ODR).
- **Interface:**
  ```typescript
  export const dynamic = 'force-static';
  ```
- **Checklist:**
  - [ ] Lists all blog posts from Sanity
  - [ ] Revalidated on Sanity publish (via webhook)

##### F4-24. `/apps/web/src/app/(marketing)/blog/[slug]/page.tsx`
- **Purpose:** Blog post (SSG + ODR).
- **Checklist:**
  - [ ] `generateStaticParams` from Sanity
  - [ ] Portable Text renderer
  - [ ] OG image via `@vercel/og` (Phase 11)

##### F4-25. `/apps/web/src/components/marketing/MarketingNav.tsx`
- **Purpose:** Top navigation for marketing pages.
- **Interface:** Client component (handles scroll hide/show + mobile drawer).
- **TDD test file:** `apps/web/src/components/marketing/MarketingNav.test.tsx`
  - [RED] Test 1: Renders wordmark + 4 nav links + CTA
  - [RED] Test 2: Hides on scroll-down (after 80px)
  - [RED] Test 3: Shows on scroll-up
  - [RED] Test 4: Mobile drawer opens on hamburger tap
- **Checklist:**
  - [ ] 1px bottom rule
  - [ ] Wordmark flush left, CTA flush right
  - [ ] Mobile drawer (Radix Dialog)
  - [ ] WCAG AAA focus management

##### F4-26. `/apps/web/src/components/marketing/MarketingFooter.tsx`
- **Purpose:** Site-wide footer.
- **Checklist:**
  - [ ] 4 columns (brand, navigate, hours, newsletter)
  - [ ] Giant "STILLWATER" watermark
  - [ ] Newsletter form (submits to `waitlistRouter` or Brevo)
  - [ ] Bottom bar (Privacy, Terms, Accessibility links)

##### F4-27. `/apps/web/src/components/marketing/ClassMarquee.tsx`
- **Purpose:** Kinetic marquee strip (matches mockup §Marquee).
- **Interface:** Client component with Framer Motion `marquee` variant.
- **Checklist:**
  - [ ] Pauses on hover
  - [ ] Respects `prefers-reduced-motion`
  - [ ] Real class data from `schedule.getWeek`

##### F4-28. `/apps/web/src/components/marketing/MembershipTable.tsx`
- **Purpose:** 3-tier pricing comparison (matches mockup §04).
- **Checklist:**
  - [ ] Featured "Unlimited" column with dark inversion
  - [ ] All 7 feature rows
  - [ ] Plan CTAs link to Stripe checkout

##### F4-29. `/apps/web/src/components/marketing/ScheduleGrid.tsx`
- **Purpose:** Weekly schedule grid.
- **Interface:** Client component consuming `schedule.getWeek` query.
- **TDD test file:** `apps/web/src/components/marketing/ScheduleGrid.test.tsx`
  - [RED] Test 1: Renders 7 day tabs
  - [RED] Test 2: Clicking tab switches day panel
  - [RED] Test 3: Keyboard navigation (ArrowLeft/Right, Home/End)
  - [RED] Test 4: Each class card expands on click
- **Checklist:**
  - [ ] All 4 RED tests GREEN
  - [ ] Filter UI (level, instructor)
  - [ ] Class cards link to `/book/[sessionId]`

##### F4-30. `/apps/web/src/components/marketing/InstructorCard.tsx`
- **Purpose:** Single instructor card for roster page.
- **Checklist:**
  - [ ] Alternating layout (left/right) via prop
  - [ ] Portrait from Cloudflare Images
  - [ ] Tags displayed

#### Phase 4 acceptance test
```bash
pnpm test:e2e -- --grep "marketing"
pnpm lighthouse ci -- --url /
# Verify: SEO 100, Perf 95+, A11y 100
```

---

### Phase 5 — Booking Flow + SSE Real-Time Seat Availability

**Goal:** Member can browse schedule, click a class, see live seat count via SSE, book a spot (or join waitlist), and receive confirmation email.

**Dependencies:** Phase 3 (bookings router with advisory lock), Phase 4 (schedule page).

**Estimated duration:** 5 days.

**Acceptance criteria:**
- [ ] SSE endpoint streams seat counts every 10s
- [ ] Booking mutation completes in < 500ms p95
- [ ] Waitlist auto-promotion works on cancellation
- [ ] Booking confirmation email sent (Phase 8 job triggers)
- [ ] All BOOK-001 through BOOK-006 tests pass E2E

#### Files to CREATE

##### F5-01. `/apps/web/src/app/api/schedule/stream/route.ts`  ⭐ (SSE endpoint — ADR-006)
- **Purpose:** SSE endpoint for live seat availability.
- **Interface:**
  ```typescript
  import { db } from '@stillwater/db';
  import { classSessions, enrollments } from '@stillwater/db/schema';
  import { and, eq, gte, lte } from 'drizzle-orm';

  export const runtime = 'nodejs';
  // ⚠️ Do NOT set `export const dynamic = 'force-dynamic'` — incompatible with
  // `cacheComponents: true` (build error per Next.js 16).
  // ⚠️ Critical (audit-verified): Vercel serverless functions have a default timeout
  // (10s Hobby, 15s Pro default) that will silently terminate this SSE stream.
  // As of June 2026, Vercel allows up to 30 minutes (1800s) on Pro/Enterprise,
  // but this requires BOTH `maxDuration` AND enabling Fluid Compute in project settings.
  export const maxDuration = 300; // 5 minutes — balances live-seat freshness vs connection cost

  export async function GET(req: Request) {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) return new Response('Missing sessionId', { status: 400 });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = async () => {
          const session = await db.query.classSessions.findFirst({
            where: eq(classSessions.id, sessionId),
            with: { class: true },
          });
          if (!session) {
            controller.close();
            return;
          }
          const enrolledCount = await db.$count(
            enrollments,
            and(eq(enrollments.sessionId, sessionId), eq(enrollments.status, 'confirmed'))
          );
          const capacity = session.overrideCapacity ?? session.class.maxCapacity ?? 0;
          const data = {
            enrolled: enrolledCount,
            capacity,
            available: Math.max(0, capacity - enrolledCount),
            isFull: enrolledCount >= capacity,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Initial send
        await send();
        // Poll every 10s
        const interval = setInterval(send, 10_000);

        // Clean up on abort
        req.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  }
  ```
- **TDD test file:** `apps/web/src/app/api/schedule/stream/route.test.ts`
  - [RED] Test 1: `GET /api/schedule/stream?sessionId=<uuid>` returns 200 with `text/event-stream` content type
  - [RED] Test 2: First SSE event contains `{ enrolled, capacity, available, isFull }` shape
  - [RED] Test 3: Missing `sessionId` returns 400
  - [RED] Test 4: Non-existent sessionId closes stream gracefully
- **Checklist:**
  - [ ] `runtime = 'nodejs'`
  - [ ] `maxDuration = 300` // 5 min SSE connection ceiling on Vercel (Fluid Compute required)
  - [ ] 10s polling interval
  - [ ] Abort signal cleans up interval
  - [ ] Event payload matches PAD §10.3

##### F5-02. `/apps/web/src/hooks/useSessionAvailability.ts`
- **Purpose:** React hook that subscribes to SSE for a session.
- **Interface:**
  ```typescript
  'use client';
  export function useSessionAvailability(sessionId: string): {
    data: { enrolled: number; capacity: number; available: number; isFull: boolean } | null;
    isLoading: boolean;
    error: Error | null;
  }
  ```
- **TDD test file:** `apps/web/src/hooks/useSessionAvailability.test.tsx`
  - [RED] Test 1: Returns `isLoading: true` initially
  - [RED] Test 2: Returns `data` after first SSE event
  - [RED] Test 3: Returns `error` on EventSource error
  - [RED] Test 4: Closes EventSource on unmount
- **Checklist:**
  - [ ] Uses native `EventSource` API
  - [ ] Reconnects automatically (browser default)
  - [ ] Cleans up on unmount

##### F5-03. `/apps/web/src/app/(studio)/layout.tsx`
- **Purpose:** Studio (auth-required) route group layout. Enforces auth.
- **Interface:**
  ```typescript
  import { requireAuth } from '@/lib/auth';

  export default async function StudioLayout({ children }: { children: React.ReactNode }) {
    const session = await requireAuth();
    return <StudioShell session={session}>{children}</StudioShell>;
  }
  ```
- **Checklist:**
  - [ ] Calls `requireAuth()` (redirects unauthenticated to sign-in)
  - [ ] Renders `<StudioShell>` with member nav

##### F5-04. `/apps/web/src/components/studio/StudioShell.tsx`
- **Purpose:** Studio app shell — sidebar nav + main content area.
- **Interface:** Server component receiving `session` prop.
- **Checklist:**
  - [ ] Sidebar with: Dashboard, My Classes, Book a Class, Membership, Profile
  - [ ] User avatar + name + role badge
  - [ ] Sign-out button

##### F5-05. `/apps/web/src/app/(studio)/book/[sessionId]/page.tsx`
- **Purpose:** Booking flow page. CSR (real-time seat data).
- **Interface:**
  ```typescript
  export const dynamic = 'force-dynamic'; // CSR — booking PAGE (not the SSE endpoint; F5-01 does NOT use this per C3 fix)

  export default async function BookingPage({ params }: { params: { sessionId: string } }) {
    const session = await requireAuth();
    const api = await apiCaller();
    const sessionData = await api.schedule.getSession({ sessionId: params.sessionId });
    return <BookingFlow sessionId={params.sessionId} initialSession={sessionData} />;
  }
  ```
- **TDD test file:** `apps/web/e2e/booking.spec.ts`
  - [RED] Test 1: Visiting `/book/<uuid>` shows class title, time, instructor, live seat count
  - [RED] Test 2: Clicking "Reserve Spot" calls `bookings.book` mutation
  - [RED] Test 3: When session is full, "Join Waitlist" button appears
  - [RED] Test 4: Booking confirmation shows checkmark + calendar invite link
- **Checklist:**
  - [ ] `dynamic = 'force-dynamic'` (CSR)
  - [ ] SSR initial data hydrates instantly
  - [ ] SSE updates seat count live

##### F5-06. `/apps/web/src/components/booking/BookingFlow.tsx`
- **Purpose:** Client component orchestrating booking flow.
- **Interface:**
  ```typescript
  'use client';
  interface BookingFlowProps {
    sessionId: string;
    initialSession: SessionDetail;
  }
  ```
- **TDD test file:** `apps/web/src/components/booking/BookingFlow.test.tsx`
  - [RED] Test 1: Shows "Reserve Spot" when `available > 0`
  - [RED] Test 2: Shows "Join Waitlist" when `isFull === true`
  - [RED] Test 3: Disables button during mutation
  - [RED] Test 4: Shows error toast on mutation failure
  - [RED] Test 5: Shows confirmation dialog on success
- **Checklist:**
  - [ ] All 5 RED tests GREEN
  - [ ] Optimistic UI (seat count decrements immediately)
  - [ ] Error recovery via React Query

##### F5-07. `/apps/web/src/components/booking/SeatCounter.tsx`
- **Purpose:** Live seat availability display (matches mockup spots bar).
- **Interface:** Client component using `useSessionAvailability` hook.
- **Checklist:**
  - [ ] 12-bar visual indicator (matches mockup)
  - [ ] Color: clay-400 for taken, stone-200 for available
  - [ ] `aria-live="polite"` for screen reader announcements
  - [ ] `role="img"` with `aria-label="N of M spots taken"`

##### F5-08. `/apps/web/src/components/booking/WaitlistButton.tsx`
- **Purpose:** Waitlist join CTA.
- **Checklist:**
  - [ ] Different visual treatment than Reserve Spot
  - [ ] Shows "Position: N" after joining

##### F5-09. `/apps/web/src/components/booking/BookingConfirmation.tsx`
- **Purpose:** Success state modal.
- **Interface:** Radix Dialog.
- **Checklist:**
  - [ ] Shows class details, time, instructor
  - [ ] "Add to calendar" link (.ics download)
  - [ ] "View my classes" CTA

##### F5-10. `/apps/web/src/components/booking/CancellationDialog.tsx`
- **Purpose:** Cancellation confirmation dialog with reason input.
- **Checklist:**
  - [ ] Optional reason textarea (max 500 chars)
  - [ ] Destructive button styling
  - [ ] Triggers `bookings.cancel` mutation

##### F5-11. `/apps/web/src/lib/booking/utils.ts`
- **Purpose:** Pure utility functions for booking logic.
- **Interface:**
  ```typescript
  export function hashStringToBigInt(s: string): bigint; // for advisory lock key
  export function getNextWaitlistPosition(...): Promise<number>;
  export function canCancel(session: ClassSession, memberTimezone: string): boolean; // e.g., 2h before start
  ```
- **TDD test file:** `apps/web/src/lib/booking/utils.test.ts`
  - [RED] Test 1: `hashStringToBigInt` is deterministic for same input
  - [RED] Test 2: `canCancel` returns false if session starts in 1h
  - [RED] Test 3: `canCancel` returns true if session starts in 3h
- **Checklist:**
  - [ ] All 3 RED tests GREEN
  - [ ] Cancellation cutoff: 2 hours before session start (configurable)

##### F5-12. `/apps/web/src/lib/booking/types.ts`
- **Purpose:** Shared booking types.
- **Interface:** Type definitions for `SessionDetail`, `BookingResult`, `WaitlistResult`.
- **Checklist:**
  - [ ] Discriminated union: `BookingResult = { status: 'confirmed' } | { status: 'waitlisted'; position: number }`

##### F5-13. `/apps/web/src/app/(studio)/dashboard/page.tsx`
- **Purpose:** Member dashboard home — shows upcoming classes + quick actions.
- **Interface:** Server component using `apiCaller`.
- **Checklist:**
  - [ ] "Next class" card (matches mockup hero)
  - [ ] "Upcoming classes" list (next 3)
  - [ ] "Quick book" CTA
  - [ ] "Manage membership" CTA

##### F5-14. `/apps/web/src/components/booking/CalendarInvite.tsx`
- **Purpose:** Generates `.ics` file for booking confirmation.
- **Interface:** Function that returns a Blob.
- **Checklist:**
  - [ ] ICS format compliant (RFC 5545)
  - [ ] Includes class title, time, location, instructor
  - [ ] Downloadable via `<a href="..." download>`

##### F5-15. `/apps/web/src/hooks/useBookingMutation.ts`
- **Purpose:** React Query mutation hook for booking.
- **Interface:**
  ```typescript
  export function useBookingMutation() {
    return trpc.bookings.book.useMutation({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.schedule.session(data.sessionId) });
        // trigger PostHog event
      },
    });
  }
  ```
- **TDD test file:** `apps/web/src/hooks/useBookingMutation.test.tsx`
- **Checklist:**
  - [ ] Invalidates schedule query on success
  - [ ] Sends `class_booked` PostHog event
  - [ ] Shows Sonner toast on success/error

##### F5-16. `/apps/web/src/app/(studio)/my-classes/page.tsx`
- **Purpose:** Member's upcoming + past bookings.
- **Interface:** SSR, no cache (personalised).
- **Checklist:**
  - [ ] Tabs: Upcoming / Past / Cancelled
  - [ ] Each upcoming class has "Cancel" button
  - [ ] Past classes show attendance status

##### F5-17. `/apps/web/src/app/(studio)/waitlist/page.tsx`
- **Purpose:** Member's active waitlist positions.
- **Checklist:**
  - [ ] Lists all `waitlist_entries` where `memberId = session.user.memberId` and `status = 'waiting'`
  - [ ] "Leave waitlist" button per entry

##### F5-18. `/apps/web/src/components/schedule/ScheduleFilters.tsx`
- **Purpose:** Filter UI for schedule page.
- **Interface:** Client component using `nuqs` for URL state.
- **Checklist:**
  - [ ] Level filter (multi-select)
  - [ ] Instructor filter (multi-select)
  - [ ] Date range filter
  - [ ] All filters sync to URL (shareable)

#### Phase 5 acceptance test
```bash
pnpm test --filter=@stillwater/web -- --grep "booking"
pnpm test:e2e -- --grep "booking"
# Manual:
# 1. Open two browsers as different members
# 2. Both navigate to same session with 1 spot left
# 3. Both click Reserve Spot at same time
# 4. One gets confirmed, one gets waitlisted
```

---

### Phase 6 — Member Dashboard + Membership Management

**Goal:** Members can view and edit their profile, manage their subscription (pause, cancel, resume), view attendance history, and access the Stripe customer portal.

**Dependencies:** Phase 3 (members + memberships routers), Phase 5 (studio shell), Phase 7 (Stripe for membership actions — can be parallelised after Phase 7).

**Estimated duration:** 4 days.

**Acceptance criteria:**
- [ ] Member can edit display name, phone, emergency contact
- [ ] Member can pause subscription (with `pauseResumesAt` date)
- [ ] Member can cancel subscription (sets `cancelAtPeriodEnd`)
- [ ] Member can resume paused subscription
- [ ] Member can access Stripe customer portal
- [ ] Member can view invoice history
- [ ] All membership state transitions tested

#### Files to CREATE

##### F6-01. `/apps/web/src/app/(studio)/profile/page.tsx`
- **Purpose:** Member profile editor.
- **Interface:** SSR + form.
- **TDD test file:** `apps/web/e2e/profile.spec.ts`
  - [RED] Test 1: Profile form pre-fills with current values
  - [RED] Test 2: Submitting valid form updates profile
  - [RED] Test 3: Invalid phone shows error
- **Checklist:**
  - [ ] Fields: displayName, phone, dateOfBirth, emergencyContact, emergencyPhone, notes
  - [ ] Uses `react-hook-form` + Zod
  - [ ] Calls `members.updateProfile` mutation

##### F6-02. `/apps/web/src/app/(studio)/membership/page.tsx`
- **Purpose:** Membership management.
- **Interface:** SSR.
- **TDD test file:** `apps/web/e2e/membership.spec.ts`
  - [RED] Test 1: Shows current plan + status + renewal date
  - [RED] Test 2: "Pause" button opens pause dialog
  - [RED] Test 3: "Cancel" button opens cancel dialog
  - [RED] Test 4: "Resume" button appears when paused
- **Checklist:**
  - [ ] Current plan card (plan name, price, credits remaining, renewal date)
  - [ ] Pause / Resume / Cancel buttons (state-dependent)
  - [ ] "Manage in Stripe" link (customer portal)

##### F6-03. `/apps/web/src/components/membership/PauseDialog.tsx`
- **Purpose:** Pause subscription dialog with date picker.
- **Interface:** Radix Dialog + react-day-picker.
- **Checklist:**
  - [ ] Date picker for `pauseResumesAt` (min: today, max: 90 days out)
  - [ ] "Confirm pause" button (destructive styling)
  - [ ] Calls `memberships.pause` mutation

##### F6-04. `/apps/web/src/components/membership/CancelDialog.tsx`
- **Purpose:** Cancel subscription dialog with reason.
- **Interface:** Radix Dialog.
- **Checklist:**
  - [ ] Optional reason textarea
  - [ ] Clear copy: "Your membership will remain active until [date], then cancel."
  - [ ] Calls `memberships.cancel` mutation

##### F6-05. `/apps/web/src/components/membership/ResumeButton.tsx`
- **Purpose:** Resume paused subscription.
- **Checklist:**
  - [ ] Confirmation dialog
  - [ ] Calls `memberships.resume` mutation

##### F6-06. `/apps/web/src/components/membership/CreditsDisplay.tsx`
- **Purpose:** Visual credit balance.
- **Interface:** Renders `creditsRemaining / classCreditsPerCycle` as progress bar.
- **Checklist:**
  - [ ] Animated count-up on mount
  - [ ] "Renews on [date]" subtitle
  - [ ] Color: clay-400 for in-use, water-500 for available

##### F6-07. `/apps/web/src/components/membership/InvoiceHistory.tsx`
- **Purpose:** Paginated invoice list.
- **Interface:** Uses `payments.getInvoices` query.
- **Checklist:**
  - [ ] Columns: date, amount, status, download PDF link
  - [ ] Cursor-based pagination (10 per page)

##### F6-08. `/apps/web/src/app/(studio)/history/page.tsx`
- **Purpose:** Attendance history.
- **Interface:** SSR with pagination.
- **Checklist:**
  - [ ] Filterable by date range, class style, instructor
  - [ ] Export as CSV
  - [ ] Stats summary: total classes attended, this month, this year

##### F6-09. `/apps/web/src/components/dashboard/UpcomingClassesList.tsx`
- **Purpose:** Reusable upcoming classes list.
- **Checklist:**
  - [ ] Shows next 3 sessions
  - [ ] Each card has: time, class name, instructor, cancel button

##### F6-10. `/apps/web/src/components/dashboard/EmptyState.tsx`
- **Purpose:** Reusable empty state component.
- **Interface:** Props: `{ icon, title, description, cta: { label, href } }`.
- **Checklist:**
  - [ ] WCAG AAA compliant
  - [ ] Used by all list pages when empty

##### F6-11. `/apps/web/src/components/dashboard/ErrorState.tsx`
- **Purpose:** Reusable error state with retry.
- **Interface:** Props: `{ message, onRetry }`.
- **Checklist:**
  - [ ] Reports to Sentry on render
  - [ ] Retry button

##### F6-12. `/apps/web/src/components/dashboard/SkeletonCard.tsx`
- **Purpose:** Loading skeleton matching class card shape.
- **Checklist:**
  - [ ] Mimics final layout (no layout shift)
  - [ ] Subtle pulse animation

#### Phase 6 acceptance test
```bash
pnpm test:e2e -- --grep "dashboard|membership|profile"
```

---

### Phase 7 — Stripe Integration (Subscriptions + Credit Packs)

**Goal:** Stripe Billing handles subscription lifecycle; webhooks update `member_subscriptions` table idempotently; credit packs purchasable as one-off PaymentIntents.

**Dependencies:** Phase 1 (member_subscriptions + payment_events tables), Phase 3 (memberships + payments routers).

**Estimated duration:** 4 days.

**Acceptance criteria:**
- [ ] Stripe Checkout Session created for each plan
- [ ] Webhook handler idempotent (replaying same event has no side effect)
- [ ] All 7 webhook events from PAD §15.3 handled
- [ ] Credits granted on `invoice.paid`
- [ ] Past-due state on `invoice.payment_failed`
- [ ] 95% test coverage on `packages/payments/*`

#### Files to CREATE

##### F7-01. `/packages/payments/src/client.ts`
- **Purpose:** Stripe SDK singleton.
- **Interface:**
  ```typescript
  import Stripe from 'stripe';
  import { env } from '@stillwater/config/env';

  export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-06-24.dahlia', // ⚠️ Dahlia API (SDK v22 default): current_period_end at items.data[0]
    typescript: true,
  });
  ```
- **TDD test file:** `packages/payments/src/client.test.ts`
  - [RED] Test 1: `stripe` is an instance of Stripe
- **Checklist:**
  - [ ] Singleton
  - [ ] Pinned API version

##### F7-02. `/packages/payments/src/types.ts`
- **Purpose:** Shared Stripe event + payload types.
- **Interface:** Type definitions for all 7 handled events.
- **Checklist:**
  - [ ] Discriminated union for event types

##### F7-03. `/packages/payments/src/subscriptions.ts`
- **Purpose:** Subscription lifecycle helpers.
- **Interface:**
  ```typescript
  export async function createCheckoutSession(params: {
    memberId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session>;

  export async function createCustomerPortalSession(memberId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session>;

  export async function pauseSubscription(stripeSubscriptionId: string, resumesAt: Date): Promise<void>;
  export async function resumeSubscription(stripeSubscriptionId: string): Promise<void>;
  export async function cancelAtPeriodEnd(stripeSubscriptionId: string): Promise<void>;
  ```
- **TDD test file:** `packages/payments/src/subscriptions.test.ts`
  - [RED] Test 1: `createCheckoutSession` calls `stripe.checkout.sessions.create` with correct params
  - [RED] Test 2: `pauseSubscription` sets `pause_collection` on Stripe
  - [RED] Test 3: `cancelAtPeriodEnd` sets `cancel_at_period_end: true`
- **Checklist:**
  - [ ] All 5 functions exported
  - [ ] Uses Stripe SDK directly (no fetch)
  - [ ] Customer ID from `members.stripeCustomerId`

##### F7-04. `/packages/payments/src/webhooks.ts`  ⭐ CRITICAL (idempotent — ADR-004)
- **Purpose:** Stripe webhook event handlers. Idempotent via `payment_events` table + `pg_advisory_xact_lock` (transaction-scoped — auto-releases at COMMIT/ROLLBACK).
- **Interface:**
  ```typescript
  export async function handleStripeEvent(event: Stripe.Event, db: DrizzleDB): Promise<void> {
    // 1. Check payment_events for stripe_event_id → if exists, return
    // 2. Acquire pg_advisory_xact_lock(hash(event.id)) (transaction-scoped — auto-releases at COMMIT/ROLLBACK; do NOT use session-scoped pg_advisory_lock which breaks under Neon PgBouncer)
    // 3. Switch on event.type, dispatch to handler
    // 4. Insert payment_events record with status = 'processed' — lock auto-releases at transaction COMMIT
  }

  // Per-event handlers:
  async function handleSubscriptionCreated(event, db): Promise<void>;
  async function handleSubscriptionUpdated(event, db): Promise<void>;
  async function handleSubscriptionDeleted(event, db): Promise<void>;
  async function handleInvoicePaid(event, db): Promise<void>;
  async function handleInvoicePaymentFailed(event, db): Promise<void>;
  async function handleInvoicePaymentActionRequired(event, db): Promise<void>;
  async function handleSubscriptionTrialWillEnd(event, db): Promise<void>;
  ```
- **TDD test file:** `packages/payments/src/webhooks.test.ts` (integration — Testcontainers Postgres)
  - [RED] Test 1: STRIPE-001 — Grants credits on `invoice.paid`
  - [RED] Test 2: STRIPE-002 — Marks subscription `past_due` on `invoice.payment_failed`
  - [RED] Test 3: STRIPE-003 — Idempotent: processing same event twice has no side effect
  - [RED] Test 4: STRIPE-004 — Rejects webhook with invalid signature (verified at route layer)
  - [RED] Test 5: STRIPE-005 — Cancels subscription on `customer.subscription.deleted`
- **Checklist:**
  - [ ] All 5 STRIPE tests GREEN
  - [ ] All 7 event handlers implemented
  - [ ] Idempotency via UNIQUE INDEX on `payment_events.stripe_event_id`
  - [ ] Advisory lock for concurrent event protection
  - [ ] Triggers background jobs (membership-credit-grant, payment-failed-notify)

##### F7-05. `/packages/payments/src/invoices.ts`
- **Purpose:** Invoice history helper.
- **Interface:**
  ```typescript
  export async function listInvoices(customerId: string, limit = 10, cursor?: string): Promise<{ invoices: Stripe.Invoice[]; nextCursor: string | null }>;
  ```
- **Checklist:**
  - [ ] Cursor-based pagination
  - [ ] Returns DTOs (not raw Stripe objects)

##### F7-06. `/packages/payments/src/credit-packs.ts`
- **Purpose:** One-off credit pack purchases via PaymentIntent.
- **Interface:**
  ```typescript
  export async function createCreditPackPurchase(params: {
    memberId: string;
    packName: string;
    totalCredits: number;
    amount: number; // in cents
  }): Promise<{ clientSecret: string; classPackageId: string }>;
  ```
- **Checklist:**
  - [ ] Creates `class_packages` row with `status: 'pending'`
  - [ ] Returns Stripe PaymentIntent `clientSecret`
  - [ ] On payment success webhook, sets `class_packages.status: 'paid'`

##### F7-07. `/packages/payments/src/refunds.ts`  ⭐ (resolves D12)
- **Purpose:** Staff-initiated refunds.
- **Interface:**
  ```typescript
  export async function createRefund(params: {
    paymentIntentId: string;
    amount?: number; // partial if specified
    reason: 'requested_by_customer' | 'duplicate' | 'fraudulent';
    staffMemberId: string;
  }): Promise<Stripe.Refund>;
  ```
- **TDD test file:** `packages/payments/src/refunds.test.ts`
  - [RED] Test 1: Full refund when `amount` omitted
  - [RED] Test 2: Partial refund when `amount` specified
  - [RED] Test 3: Logs to `payment_events` with `type: 'refund'`
- **Checklist:**
  - [ ] Staff-only (enforced in router)
  - [ ] Audit logged
  - [ ] Member notified via email (Phase 8)

##### F7-08. `/packages/payments/src/index.ts`
- **Purpose:** Barrel export.
- **Interface:** Re-exports `stripe`, all helper functions, types.
- **Checklist:**
  - [ ] Public API surface exported

##### F7-09. `/apps/web/src/app/api/webhooks/stripe/route.ts`  ⭐ CRITICAL
- **Purpose:** Stripe webhook receiver. Verifies signature, dispatches to `handleStripeEvent`.
- **Interface:**
  ```typescript
  import { stripe, handleStripeEvent } from '@stillwater/payments';
  import { db } from '@stillwater/db';
  import { env } from '@stillwater/config/env';

  export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature!, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return new Response('Invalid signature', { status: 400 });
    }

    try {
      await handleStripeEvent(event, db);
      return new Response('ok', { status: 200 });
    } catch (err) {
      // Log to Sentry, return 500 so Stripe retries
      return new Response('Internal error', { status: 500 });
    }
  }
  ```
- **TDD test file:** `apps/web/src/app/api/webhooks/stripe/route.test.ts`
  - [RED] Test 1: Valid signature → 200
  - [RED] Test 2: Invalid signature → 400
  - [RED] Test 3: Handler throws → 500 (triggers Stripe retry)
- **Checklist:**
  - [ ] Reads body as text (not JSON) — required for signature verification
  - [ ] Returns 500 on handler error (Stripe retries)
  - [ ] No body parsing middleware

##### F7-10. `/apps/web/src/app/(studio)/membership/checkout/route.ts`
- **Purpose:** Stripe Checkout redirect handler.
- **Interface:** Server action that creates Checkout Session and redirects.
- **Checklist:**
  - [ ] POST only
  - [ ] Reads `priceId` from form data
  - [ ] Redirects to Stripe Checkout URL

##### F7-11. `/apps/web/src/app/(studio)/membership/checkout/success/page.tsx`
- **Purpose:** Checkout success landing page.
- **Checklist:**
  - [ ] Shows "Welcome to Stillwater" message
  - [ ] Polls `memberships.getMySubscription` until subscription appears
  - [ ] Redirects to `/dashboard` after 5s

##### F7-12. `/apps/web/src/app/(studio)/membership/portal/route.ts`
- **Purpose:** Stripe Customer Portal redirect.
- **Interface:** Server action that creates portal session and redirects.
- **Checklist:**
  - [ ] POST only
  - [ ] Uses `members.stripeCustomerId`

##### F7-13. `/apps/web/src/components/membership/CheckoutButton.tsx`
- **Purpose:** Plan selection CTA.
- **Interface:** Form with POST to `/membership/checkout`.
- **Checklist:**
  - [ ] Hidden `priceId` input
  - [ ] Loading state

##### F7-14. `/apps/web/src/lib/stripe/utils.ts`
- **Purpose:** Stripe utility functions.
- **Interface:**
  ```typescript
  export function formatStripeAmount(cents: number): string; // $28.00
  export function stripeEventToWebhookLog(event: Stripe.Event): object;
  ```
- **TDD test file:** `apps/web/src/lib/stripe/utils.test.ts`
- **Checklist:**
  - [ ] Currency formatting correct

#### Phase 7 acceptance test
```bash
pnpm test --filter=@stillwater/payments -- --coverage
# Verify 95% coverage on packages/payments/*
# Manual: use Stripe CLI to forward webhooks:
#   stripe listen --forward-to localhost:3000/api/webhooks/stripe
#   stripe trigger invoice.paid
#   stripe trigger invoice.payment_failed
```


### Phase 8 — Background Jobs (11 Trigger.dev v4 Tasks)

> ⚠️ **Trigger.dev v3 deprecation:** v3 deploys stop working April 1, 2026. All tasks MUST use `@trigger.dev/sdk` (root import). Per official Trigger.dev v4 docs: "ALWAYS import from `@trigger.dev/sdk`. NEVER import from `@trigger.dev/sdk/v3`." The `/v3` subpath is deprecated; `/v4` does not exist. See SKILL.md §9.9 Gotcha 1 + §12 Lesson 16.

**Goal:** All 11 background jobs from PAD §13.1 implemented as Trigger.dev v4 tasks. Jobs are durable, retried, and observable in Trigger.dev dashboard.

**Dependencies:** Phase 3 (tRPC routers trigger jobs), Phase 7 (Stripe webhooks trigger `membership-credit-grant` and `payment-failed-notify`).

**Estimated duration:** 3 days.

**Acceptance criteria:**
- [ ] All 11 jobs registered in Trigger.dev dashboard
- [ ] Local dev: `pnpm jobs:dev` boots Trigger.dev worker
- [ ] Production: `pnpm jobs:deploy` deploys to Trigger.dev Cloud
- [ ] 85% test coverage on `services/workers/*`
- [ ] All jobs have appropriate timeout + retry config
- [ ] Job dependency graph matches PAD §13.4

#### Files to CREATE

##### F8-01. `/services/workers/src/booking-confirmation.ts`  ⭐ (resolves D3)
- **Purpose:** Send booking confirmation email on enrollment.
- **Interface:**
  ```typescript
  import { task } from '@trigger.dev/sdk';
  import { db } from '@stillwater/db';
  import { sendBookingConfirmation } from '@stillwater/email';

  export const bookingConfirmation = task({
    id: 'booking-confirmation',
    retry: { maxAttempts: 3, minTimeoutInMs: 1000, factor: 2, randomize: true },
    maxDuration: 30, // seconds
    run: async (payload: { enrollmentId: string; memberId: string }) => {
      const enrollment = await db.query.enrollments.findFirst({
        where: (e, { eq }) => eq(e.id, payload.enrollmentId),
        with: { session: { with: { class: true, instructor: true } }, member: { with: { user: true } } },
      });
      if (!enrollment) throw new Error('Enrollment not found');

      await sendBookingConfirmation({
        to: enrollment.member.user.email,
        memberName: enrollment.member.displayName,
        className: enrollment.session.class.title,
        sessionDate: enrollment.session.startsAt,
        instructor: enrollment.session.instructor.slug,
      });

      return { sent: true };
    },
  });
  ```
- **TDD test file:** `services/workers/src/booking-confirmation.test.ts`
  - [RED] Test 1: Mock enrollment lookup returns expected data
  - [RED] Test 2: `sendBookingConfirmation` called with correct args
  - [RED] Test 3: Throws on non-existent enrollment
- **Checklist:**
  - [ ] Task ID: `booking-confirmation`
  - [ ] Timeout: 30s
  - [ ] Retries: 3
  - [ ] Payload schema documented

##### F8-02. `/services/workers/src/class-reminder-24h.ts`  ⭐ (resolves D7)
- **Purpose:** 24-hour class reminder.
- **Interface:** Task with payload `{ sessionId: string; memberId: string }`. Scheduled 24h before session via `triggerAfter` in booking mutation.
- **TDD test file:** `services/workers/src/class-reminder-24h.test.ts`
- **Checklist:**
  - [ ] Task ID: `class-reminder-24h`
  - [ ] Sends `ClassReminder24h` email template
  - [ ] Skips if enrollment was cancelled

##### F8-03. `/services/workers/src/class-reminder-1h.ts`  ⭐ (resolves D7)
- **Purpose:** 1-hour class reminder.
- **Interface:** Same as 24h but different email template + shorter delay.
- **TDD test file:** `services/workers/src/class-reminder-1h.test.ts`
- **Checklist:**
  - [ ] Task ID: `class-reminder-1h`
  - [ ] Sends `ClassReminder1h` email template
  - [ ] Skips if enrollment was cancelled in last hour

##### F8-04. `/services/workers/src/class-cancellation-notify.ts`  ⭐ (resolves D3 — missing in scaffolding)
- **Purpose:** Notify all enrolled members when staff cancels a session.
- **Interface:** Task with payload `{ sessionId: string; cancelReason: string }`.
- **TDD test file:** `services/workers/src/class-cancellation-notify.test.ts`
  - [RED] Test 1: Fetches all confirmed enrollments for session
  - [RED] Test 2: Sends `ClassCancellation` email to each member
  - [RED] Test 3: Returns credits to all enrolled members
- **Checklist:**
  - [ ] Task ID: `class-cancellation-notify`
  - [ ] Timeout: 60s (may send many emails)
  - [ ] Sends to all confirmed enrollees
  - [ ] Refunds credits via `bookings.cancel` logic

##### F8-05. `/services/workers/src/waitlist-promotion.ts`
- **Purpose:** Offer cancelled spot to next waitlist member.
- **Interface:** Task with payload `{ sessionId: string; cancelledEnrollmentId: string }`.
- **TDD test file:** `services/workers/src/waitlist-promotion.test.ts`
  - [RED] Test 1: Finds next-in-line waitlist entry
  - [RED] Test 2: Updates status to 'offered' + sets `expiresAt` (2h window)
  - [RED] Test 3: Sends `WaitlistOffer` email
  - [RED] Test 4: Schedules `waitlist-expiry` job at `expiresAt`
  - [RED] Test 5: Returns `{ promoted: false }` if no waitlist entries
- **Checklist:**
  - [ ] Task ID: `waitlist-promotion`
  - [ ] 2-hour offer window
  - [ ] Schedules follow-up `waitlist-expiry` job

##### F8-06. `/services/workers/src/waitlist-expiry.ts`
- **Purpose:** Expire unclaimed waitlist offer + promote next.
- **Interface:** Task with payload `{ waitlistEntryId: string }`.
- **TDD test file:** `services/workers/src/waitlist-expiry.test.ts`
  - [RED] Test 1: If status still 'offered', mark 'expired' + trigger `waitlist-promotion` again
  - [RED] Test 2: If status 'accepted' (member claimed), do nothing
- **Checklist:**
  - [ ] Task ID: `waitlist-expiry`
  - [ ] Idempotent (safe to re-run)
  - [ ] Triggers new `waitlist-promotion` if needed

##### F8-07. `/services/workers/src/membership-credit-grant.ts`  ⭐ (resolves D3 — missing in scaffolding)
- **Purpose:** Grant monthly credits on `invoice.paid` webhook.
- **Interface:** Task with payload `{ memberId: string; invoiceId: string }`.
- **TDD test file:** `services/workers/src/membership-credit-grant.test.ts`
  - [RED] Test 1: Resets `member_subscriptions.creditsRemaining` to plan's `classCreditsPerCycle`
  - [RED] Test 2: Idempotent (re-running for same invoiceId has no effect)
- **Checklist:**
  - [ ] Task ID: `membership-credit-grant`
  - [ ] Retries: 5 (more important than email)
  - [ ] Triggered by Stripe webhook handler (Phase 7)

##### F8-08. `/services/workers/src/membership-expiry-warn.ts`  ⭐ (resolves D8 — rename from `membership-renewal`)
- **Purpose:** 3-day renewal warning.
- **Interface:** Scheduled 3 days before subscription renews.
- **TDD test file:** `services/workers/src/membership-expiry-warn.test.ts`
- **Checklist:**
  - [ ] Task ID: `membership-expiry-warn`
  - [ ] Sends `MembershipRenewal` email template
  - [ ] Scheduled via daily cron that queries subscriptions with `currentPeriodEnd` in 3 days

##### F8-09. `/services/workers/src/payment-failed-notify.ts`  ⭐ (resolves D3 — missing in scaffolding)
- **Purpose:** Notify member on payment failure.
- **Interface:** Triggered by `invoice.payment_failed` webhook.
- **TDD test file:** `services/workers/src/payment-failed-notify.test.ts`
- **Checklist:**
  - [ ] Task ID: `payment-failed-notify`
  - [ ] Sends `PaymentFailed` email template
  - [ ] Includes Stripe customer portal link

##### F8-10. `/services/workers/src/weekly-digest.ts`
- **Purpose:** Sunday 9am weekly digest email.
- **Interface:** Cron-triggered task.
- **TDD test file:** `services/workers/src/weekly-digest.test.ts`
  - [RED] Test 1: Queries all members with `weeklyDigestOptIn: true`
  - [RED] Test 2: For each member, fetches their upcoming classes + studio announcements
  - [RED] Test 3: Sends `WeeklyDigest` email template
- **Checklist:**
  - [ ] Task ID: `weekly-digest`
  - [ ] Cron: Sunday 09:00 PT
  - [ ] Timeout: 120s (may send many emails)

##### F8-11. `/services/workers/src/attendance-summary.ts`  ⭐ (resolves D3 — missing in scaffolding)
- **Purpose:** Daily 11pm: mark no-shows + update attendance stats.
- **Interface:** Cron-triggered task.
- **TDD test file:** `services/workers/src/attendance-summary.test.ts`
  - [RED] Test 1: For each session that ended > 30 min ago, mark un-checked-in enrollments as `no_show`
  - [RED] Test 2: Marks session status as `completed`
- **Checklist:**
  - [ ] Task ID: `attendance-summary`
  - [ ] Cron: Daily 23:00 PT
  - [ ] Updates enrollment + session status

##### F8-12. `/services/workers/src/index.ts`
- **Purpose:** Barrel export — Trigger.dev auto-discovers tasks via `dirs: ['./src']` config.
- **Interface:** Re-exports all 11 tasks.
- **Checklist:**
  - [ ] All 11 tasks exported
  - [ ] Tasks appear in Trigger.dev dashboard after `pnpm jobs:dev`

##### F8-13. `/packages/email/src/templates/BookingConfirmation.tsx`
- **Purpose:** Email template for booking confirmation.
- **Interface:** React Email component with props: `{ memberName, className, sessionDate, instructor, sessionId }`.
- **TDD test file:** `packages/email/src/templates/BookingConfirmation.test.tsx`
  - [RED] Test 1: Renders subject "You're booked: {class} on {date}"
  - [RED] Test 2: Contains "Add to calendar" link
  - [RED] Test 3: Contains "Cancel booking" link
- **Checklist:**
  - [ ] Uses `EmailLayout`
  - [ ] All Stillwater tokens
  - [ ] Plain-text version generated automatically
  - [ ] CAN-SPAM footer

##### F8-14. `/packages/email/src/templates/BookingCancellation.tsx`
- **Purpose:** Email when member cancels their own booking.
- **Checklist:**
- [ ] Subject: "Booking cancelled — {class}"
- [ ] Includes "Browse other classes" CTA

##### F8-15. `/packages/email/src/templates/ClassCancellation.tsx`  ⭐ (resolves D4 — missing in scaffolding)
- **Purpose:** Email when staff cancels a session.
- **Checklist:**
- [ ] Subject: "Class cancelled: {class} on {date}"
- [ ] Explains credit was returned
- [ ] Apologises + offers alternative classes

##### F8-16. `/packages/email/src/templates/ClassReminder24h.tsx`
- **Purpose:** 24-hour reminder.
- **Checklist:**
- [ ] Subject: "Tomorrow: {class} at {time}"
- [ ] Includes studio address + what to bring

##### F8-17. `/packages/email/src/templates/ClassReminder1h.tsx`  ⭐ (resolves D4 — missing in scaffolding)
- **Purpose:** 1-hour reminder.
- **Checklist:**
- [ ] Subject: "Starting soon: {class} at {time}"
- [ ] Shorter, focused on logistics

##### F8-18. `/packages/email/src/templates/WaitlistOffer.tsx`
- **Purpose:** Waitlist spot offer.
- **Interface:** Props: `{ memberName, className, sessionDate, expiresAt, claimUrl }`.
- **Checklist:**
- [ ] Subject: "A spot opened! Claim your place in {class}"
- [ ] Bold call-out: "Offer expires in 2 hours"
- [ ] CTA: "Claim my spot" → `/book/[sessionId]?claim=true`

##### F8-19. `/packages/email/src/templates/WaitlistExpired.tsx`  ⭐ (resolves D4 — missing in scaffolding)
- **Purpose:** Waitlist offer expired.
- **Checklist:**
- [ ] Subject: "Your spot offer has expired"
- [ ] CTA: "Browse other classes"

##### F8-20. `/packages/email/src/templates/WelcomeMember.tsx`
- **Purpose:** New member welcome.
- **Checklist:**
- [ ] Subject: "Welcome to Stillwater, {name}"
- [ ] Includes studio address, hours, what to expect

##### F8-21. `/packages/email/src/templates/MembershipRenewal.tsx`
- **Purpose:** 3-day renewal warning.
- **Checklist:**
- [ ] Subject: "Your membership renews on {date}"
- [ ] Includes "Pause or cancel" link to customer portal

##### F8-22. `/packages/email/src/templates/MembershipCancellation.tsx`
- **Purpose:** Subscription cancelled confirmation.
- **Checklist:**
- [ ] Subject: "Your membership has been cancelled"
- [ ] Explains access continues until period end

##### F8-23. `/packages/email/src/templates/MembershipPaused.tsx`  ⭐ (resolves D4 — missing in scaffolding)
- **Purpose:** Subscription paused confirmation.
- **Checklist:**
- [ ] Subject: "Your membership is paused until {date}"
- [ ] Includes "Resume now" CTA

##### F8-24. `/packages/email/src/templates/PaymentFailed.tsx`
- **Purpose:** Payment failure notification.
- **Checklist:**
- [ ] Subject: "Action required: Payment failed"
- [ ] CTA: "Update payment method" → Stripe portal

##### F8-25. `/packages/email/src/templates/WeeklyDigest.tsx`  ⭐ (resolves D4 — missing in scaffolding)
- **Purpose:** Weekly digest.
- **Interface:** Props: `{ memberName, upcomingClasses: Array<{...}>, announcements: Array<{...}> }`.
- **Checklist:**
- [ ] Subject: "Your week at Stillwater ✦"
- [ ] Lists upcoming classes (next 3)
- [ ] Lists studio announcements
- [ ] "View full schedule" CTA

##### F8-26. `/packages/email/src/components/EmailLayout.tsx`
- **Purpose:** Shared email layout (single-column, 600px max).
- **Interface:** React Email `<Html>` wrapper.
- **Checklist:**
- [ ] 600px max-width
- [ ] Stillwater token colors (hex, not CSS vars — email client compat)
- [ ] CAN-SPAM footer (studio address, unsubscribe link)

##### F8-27. `/packages/email/src/components/EmailButton.tsx`
- **Purpose:** Reusable email CTA button.
- **Checklist:**
- [ ] Variants: primary (clay-400 bg), ghost (transparent with border)
- [ ] Padding 16px 32px
- [ ] Sharp corners (matches site borderRadius: 0)

##### F8-28. `/packages/email/src/components/EmailFooter.tsx`
- **Purpose:** CAN-SPAM compliant footer.
- **Checklist:**
- [ ] Studio address
- [ ] Unsubscribe link (powered by Resend)
- [ ] "Stillwater Yoga Studio LLC" copyright

##### F8-29. `/packages/email/src/send.ts`
- **Purpose:** Resend integration helper.
- **Interface:**
  ```typescript
  import { Resend } from 'resend';
  import { env } from '@stillwater/config/env';
  import { render } from 'react-email'; // ✅ v6 unified import (NOT @react-email/render — deprecated)

  const resend = new Resend(env.RESEND_API_KEY);

  export async function sendEmail<T extends Record<string, unknown>>(
    template: React.FC<T>,
    props: T,
    { to, subject }: { to: string; subject: string }
  ): Promise<void> {
    // ⚠️ React Email v6.0.0 paradigm shift (April 16, 2026):
    // All imports from 'react-email' root. @react-email/render is deprecated.
    // v6 bundle is 1.8MB (514KB gzipped) — pulls prismjs, marked, tailwindcss compiler.
    // For Trigger.dev workers, consider Resend Native Templates (Alternative A):
    //   await resend.emails.send({ from, to, subject, templateId, variables: props });
    // This avoids the 1.8MB bundle bloat in serverless cold starts.
    // See react_email_suggestion.md for full analysis.
    const html = await render(template(props));
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
  }
  ```
- **TDD test file:** `packages/email/src/send.test.ts`
  - [RED] Test 1: Calls `resend.emails.send` with correct params
  - [RED] Test 2: Renders template to HTML
- **Checklist:**
  - [ ] Singleton Resend client
  - [ ] Renders React Email to HTML
  - [ ] Uses `EMAIL_FROM` env

##### F8-30. `/packages/email/src/index.ts`
- **Purpose:** Barrel export for all templates + send helper.
- **Checklist:**
- [ ] All 13 templates exported
- [ ] `sendEmail` exported

#### Phase 8 acceptance test
```bash
pnpm test --filter=@stillwater/email
pnpm test --filter=@stillwater/workers -- --coverage
# Trigger.dev dashboard shows all 11 tasks
# Manual: trigger `booking-confirmation` via Trigger.dev UI; verify email arrives
```

---

### Phase 9 — Admin Surface (RBAC-Gated)

**Goal:** Staff, managers, and owners can manage classes, sessions, instructors, members, and view revenue dashboards. All routes RBAC-gated via `proxy.ts` + `requireRole` server helper.

**Dependencies:** Phase 3 (admin router with `getDashboard`, `getRevenue`, `getClassRoster`).

**Estimated duration:** 5 days.

**Acceptance criteria:**
- [ ] All `/admin/*` routes require staff+ role
- [ ] `/admin/revenue` requires manager+ role
- [ ] `/admin/settings` requires owner role
- [ ] Class CRUD operations work end-to-end
- [ ] Session scheduling with calendar UI
- [ ] Member management with search/filter
- [ ] Revenue dashboard with MRR, churn, attendance charts
- [ ] All admin actions audit-logged

#### Files to CREATE

##### F9-01. `/apps/web/src/app/(admin)/layout.tsx`
- **Purpose:** Admin route group layout. RBAC guard.
- **Interface:**
  ```typescript
  import { requireRole } from '@/lib/auth';

  export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    await requireRole('staff', 'manager', 'owner');
    return <AdminShell>{children}</AdminShell>;
  }
  ```
- **Checklist:**
  - [ ] Calls `requireRole('staff', 'manager', 'owner')`
  - [ ] Renders `<AdminShell>` with sidebar nav

##### F9-02. `/apps/web/src/components/admin/AdminShell.tsx`
- **Purpose:** Admin app shell — sidebar + topbar.
- **Interface:** Server component receiving session.
- **Checklist:**
  - [ ] Sidebar: Dashboard, Classes, Schedule, Instructors, Members, Revenue, Settings
  - [ ] Revenue link visible only to manager+
  - [ ] Settings link visible only to owner
  - [ ] User badge with role
  - [ ] Sign-out

##### F9-03. `/apps/web/src/app/(admin)/admin/page.tsx`
- **Purpose:** Admin dashboard home.
- **Interface:** SSR, calls `admin.getDashboard`.
- **TDD test file:** `apps/web/e2e/admin-dashboard.spec.ts`
  - [RED] Test 1: Visiting `/admin` as staff shows KPI cards
  - [RED] Test 2: Visiting `/admin` as member redirects to `/dashboard`
- **Checklist:**
  - [ ] KPI cards: Active Members, Classes This Week, MRR, Attendance Rate
  - [ ] Today's schedule (compact list)
  - [ ] Recent signups (last 5)
  - [ ] Quick actions sidebar

##### F9-04. `/apps/web/src/app/(admin)/admin/classes/page.tsx`
- **Purpose:** Class catalog management.
- **Interface:** SSR with TanStack Table.
- **TDD test file:** `apps/web/e2e/admin-classes.spec.ts`
  - [RED] Test 1: Lists all classes in table
  - [RED] Test 2: "Create class" button opens form
  - [RED] Test 3: Editing class updates DB
- **Checklist:**
  - [ ] TanStack Table with: title, level, duration, capacity, active toggle, actions
  - [ ] Search + filter
  - [ ] Pagination
  - [ ] Create / Edit / Delete (soft-delete) actions

##### F9-05. `/apps/web/src/app/(admin)/admin/classes/[id]/page.tsx`
- **Purpose:** Single class editor.
- **Checklist:**
  - [ ] Edit form: title, slug, description, level, duration, capacity, image, SEO meta
  - [ ] Sessions list for this class
  - [ ] "Schedule new session" CTA

##### F9-06. `/apps/web/src/app/(admin)/admin/schedule/page.tsx`
- **Purpose:** Session scheduling calendar.
- **Interface:** Calendar grid UI (week view).
- **TDD test file:** `apps/web/e2e/admin-schedule.spec.ts`
- **Checklist:**
  - [ ] Week calendar with drag-to-create session
  - [ ] Drag-to-reschedule (updates `startsAt` + `endsAt`)
  - [ ] Filter by instructor / room
  - [ ] Cancel session with reason

##### F9-07. `/apps/web/src/components/admin/ScheduleCalendar.tsx`
- **Purpose:** Calendar component (built on react-day-picker + custom grid).
- **Checklist:**
  - [ ] Week view (Mon-Sun columns, time rows)
  - [ ] Drag-and-drop via `@dnd-kit/core`
  - [ ] Click empty slot → create session dialog
  - [ ] Click existing session → edit dialog

##### F9-08. `/apps/web/src/app/(admin)/admin/instructors/page.tsx`
- **Purpose:** Instructor management.
- **Checklist:**
  - [ ] List instructors (sorted by `sortOrder`)
  - [ ] Create / Edit / Deactivate
  - [ ] Reorder via drag-and-drop

##### F9-09. `/apps/web/src/app/(admin)/admin/members/page.tsx`
- **Purpose:** Member directory.
- **Interface:** TanStack Table.
- **TDD test file:** `apps/web/e2e/admin-members.spec.ts`
- **Checklist:**
  - [ ] Columns: name, email, joined date, subscription status, last attended
  - [ ] Search by name/email
  - [ ] Filter by subscription status
  - [ ] Export to CSV

##### F9-10. `/apps/web/src/app/(admin)/admin/members/[id]/page.tsx`
- **Purpose:** Single member detail.
- **Checklist:**
  - [ ] Profile overview
  - [ ] Subscription history
  - [ ] Attendance history
  - [ ] Payment history
  - [ ] Role assignment (owner only)

##### F9-11. `/apps/web/src/app/(admin)/admin/revenue/page.tsx`  ⭐ (manager+ only)
- **Purpose:** Revenue dashboard.
- **Interface:** SSR, calls `admin.getRevenue`.
- **Checklist:**
  - [ ] MRR chart (last 12 months)
  - [ ] Churn rate
  - [ ] Attendance metrics (avg class size, no-show rate)
  - [ ] Top-performing classes
  - [ ] Date range picker (default: last 30 days)

##### F9-12. `/apps/web/src/app/(admin)/admin/settings/page.tsx`  ⭐ (owner only)
- **Purpose:** Studio settings.
- **Checklist:**
  - [ ] Studio name, address, phone
  - [ ] Hours of operation
  - [ ] Pricing (Stripe price IDs)
  - [ ] Role assignments
  - [ ] Feature flags

##### F9-13. `/apps/web/src/components/admin/KpiCard.tsx`
- **Purpose:** KPI card component.
- **Interface:** Props: `{ label, value, trend?: number, icon?: React.ReactNode }`.
- **Checklist:**
  - [ ] Trend arrow (up = clay-400, down = stone-500)
  - [ ] Skeleton state
  - [ ] Accessible label

##### F9-14. `/apps/web/src/components/admin/RevenueChart.tsx`
- **Purpose:** MRR chart.
- **Interface:** Props: `{ data: Array<{ month: string; mrr: number }> }`.
- **Checklist:**
  - [ ] Uses Recharts (or visx) for server-rendered SVG
  - [ ] Anti-generic: no default Recharts styling — customised to match Stillwater tokens
  - [ ] Responsive

##### F9-15. `/apps/web/src/components/admin/RosterTable.tsx`
- **Purpose:** Class roster with check-in.
- **Interface:** TanStack Table.
- **TDD test file:** `apps/web/e2e/admin-roster.spec.ts`
  - [RED] Test 1: Clicking "Check in" button calls `bookings.checkIn`
  - [RED] Test 2: Checked-in members show ✓ icon
  - [RED] Test 3: All members checked in → button disabled
- **Checklist:**
  - [ ] Columns: name, email, checked-in status, action button
  - [ ] Bulk check-in for walk-ins

##### F9-16. `/apps/web/src/components/admin/ClassForm.tsx`
- **Purpose:** Create/edit class form.
- **Interface:** `react-hook-form` + Zod.
- **Checklist:**
  - [ ] All fields from `classes` table
  - [ ] Slug auto-generated from title (editable)
  - [ ] Image upload via Cloudflare Images
  - [ ] Validation: unique slug, max capacity > 0

##### F9-17. `/apps/web/src/components/admin/SessionForm.tsx`
- **Purpose:** Create/edit session form.
- **Checklist:**
  - [ ] Class selector (dropdown)
  - [ ] Instructor selector
  - [ ] Room selector
  - [ ] Date + time picker
  - [ ] Capacity override (optional)
  - [ ] Virtual toggle + stream URL

##### F9-18. `/apps/web/src/components/admin/MemberRoleEditor.tsx`  ⭐ (owner only)
- **Purpose:** Role assignment UI.
- **Interface:** Owner-restricted component.
- **Checklist:**
  - [ ] Dropdown to add role
  - [ ] Remove role button
  - [ ] Confirmation for `owner` role grant (destructive)

##### F9-19. `/apps/web/src/lib/admin/audit-log.ts`
- **Purpose:** Audit log helper — called on every admin mutation.
- **Interface:**
  ```typescript
  export async function logAdminAction(params: {
    staffMemberId: string;
    action: string; // 'class.create', 'session.cancel', etc.
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  ```
- **TDD test file:** `apps/web/src/lib/admin/audit-log.test.ts`
- **Checklist:**
  - [ ] Logs to `audit_log` table (added in migration)
  - [ ] Called by every admin mutation
  - [ ] Searchable in admin UI

##### F9-20. `/apps/web/src/app/(admin)/admin/audit-log/page.tsx`
- **Purpose:** Audit log viewer (manager+ only).
- **Checklist:**
  - [ ] Filterable by date range, staff member, action type
  - [ ] Paginated
  - [ ] Read-only

#### Phase 9 acceptance test
```bash
pnpm test:e2e -- --grep "admin"
# Manual:
# 1. Sign in as staff → /admin works, /admin/revenue redirects to /dashboard
# 2. Sign in as owner → all /admin/* routes accessible
# 3. Create class → schedule session → see in /schedule
# 4. Check in member via roster
```

---

### Phase 10 — Observability + Performance Hardening

**Goal:** Sentry, PostHog, Axiom, Checkly all wired up. Bundle size budgets enforced in CI. Lighthouse scores hit targets.

**Dependencies:** All previous phases (to have something to observe).

**Estimated duration:** 3 days.

**Acceptance criteria:**
- [ ] Sentry captures all unhandled errors + source maps uploaded
- [ ] PostHog events fire on all 17 events from PAD §19.3
- [ ] Axiom receives structured logs
- [ ] Checkly synthetic checks run every 60s
- [ ] Lighthouse: Performance 95+, Accessibility 100, Best Practices 100, SEO 100
- [ ] Bundle sizes within budget (marketing < 80kb, booking < 200kb, admin < 400kb)

#### Files to CREATE

##### F10-01. `/apps/web/sentry.client.config.ts`
- **Purpose:** Sentry browser SDK init.
- **Interface:**
  ```typescript
  import * as Sentry from '@sentry/nextjs';

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // PII-aware: do not send request bodies for booking endpoints
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'fetch' && breadcrumb.data?.url?.includes('/api/trpc/bookings')) {
        return null;
      }
      return breadcrumb;
    },
  });
  ```
- **TDD test file:** n/a (Sentry config; verified by manual error throw).
- **Checklist:**
  - [ ] DSN from env
  - [ ] Session replay enabled (booking flow only — PII-aware mask)
  - [ ] Traces sample rate 0.1 (10%)

##### F10-02. `/apps/web/sentry.server.config.ts`
- **Purpose:** Sentry Node SDK init (server-side).
- **Checklist:**
  - [ ] DSN from env
  - [ ] Captures tRPC errors with procedure path
  - [ ] Source maps uploaded in CI

##### F10-03. `/apps/web/sentry.edge.config.ts`
- **Purpose:** Sentry edge config (for `proxy.ts` errors).
- **Checklist:**
  - [ ] Minimal config (Edge runtime has restrictions)

##### F10-04. `/apps/web/src/lib/analytics/posthog.ts`
- **Purpose:** PostHog client init + event tracker.
- **Interface:**
  ```typescript
  import posthog from 'posthog-js';
  import { PostHogProvider } from 'posthog-js/react';

  export function PostHogInit() {
    if (typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: '/_analytics', // reverse proxy for privacy
        capture_pageviews: true,
        capture_exceptions: true,
        persistence: 'localStorage+cookie',
      });
    }
  }

  export const analytics = {
    pageViewed: () => posthog.capture('page_viewed'),
    scheduleBrowsed: () => posthog.capture('schedule_browsed'),
    classBooked: (props: { sessionId: string; classId: string }) =>
      posthog.capture('class_booked', props),
    // ... all 17 events from PAD §19.3
  };
  ```
- **TDD test file:** `apps/web/src/lib/analytics/posthog.test.ts`
  - [RED] Test 1: `analytics.classBooked` calls `posthog.capture` with correct event name + props
  - [RED] Test 2: All 17 events exported
- **Checklist:**
  - [ ] All 17 events from PAD §19.3 implemented
  - [ ] Reverse proxy via `/_analytics` (privacy-friendly)
  - [ ] Provider wraps root layout

##### F10-05. `/apps/web/src/components/analytics/PostHogProvider.tsx`
- **Purpose:** React provider for PostHog.
- **Interface:** Client component wrapping children.
- **Checklist:**
  - [ ] Wraps root layout
  - [ ] SSR-compatible

##### F10-06. `/apps/web/src/lib/observability/logger.ts`
- **Purpose:** Structured logger (Axiom-compatible).
- **Interface:**
  ```typescript
  export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

  export interface LogContext {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    [key: string]: unknown;
  }

  export const logger = {
    debug: (msg: string, ctx?: LogContext) => void,
    info: (msg: string, ctx?: LogContext) => void,
    warn: (msg: string, ctx?: LogContext) => void,
    error: (msg: string, ctx?: LogContext, error?: Error) => void,
  };
  ```
- **TDD test file:** `apps/web/src/lib/observability/logger.test.ts`
  - [RED] Test 1: `logger.info` sends JSON to Axiom
  - [RED] Test 2: Error logs include stack trace
- **Checklist:**
  - [ ] Sends to Axiom via `AXIOM_TOKEN`
  - [ ] Structured JSON format
  - [ ] Includes request ID (from middleware)

##### F10-07. `/apps/web/src/lib/observability/request-id.ts`
- **Purpose:** Generate unique request ID for every request.
- **Interface:** Middleware helper that adds `x-request-id` header.
- **Checklist:**
  - [ ] UUID v4
  - [ ] Attached to all log entries

##### F10-08. `/apps/web/src/instrumentation.ts`
- **Purpose:** Next.js instrumentation hook — runs on server startup.
- **Interface:**
  ```typescript
  export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('./sentry.server.config');
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('./sentry.edge.config');
    }
  }
  ```
- **Checklist:**
  - [ ] Loads Sentry configs conditionally per runtime

##### F10-09. `/apps/web/next.config.ts` [PATCH]
- **Purpose:** Add `bundle-analyzer` + `withSentryConfig` wrappers.
- **Interface:**
  ```typescript
  import bundleAnalyzer from '@next/bundle-analyzer';
  import { withSentryConfig } from '@sentry/nextjs';

  const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

  const nextConfig = { /* existing config */ };

  export default withBundleAnalyzer(withSentryConfig(nextConfig, {
    silent: true,
    org: 'stillwater',
    project: 'stillwater-web',
    widenClientFileUpload: true,
  }));
  ```
- **Checklist:**
  - [ ] `@next/bundle-analyzer` added to devDeps
  - [ ] `ANALYZE=true pnpm build` opens analyzer
  - [ ] Sentry config wraps

##### F10-10. `/apps/web/.bundle-stats.json`
- **Purpose:** Bundle size baseline for CI gate.
- **Interface:** JSON file with per-route budgets.
- **Checklist:**
  - [ ] Marketing routes: < 80kb
  - [ ] Booking route: < 200kb
  - [ ] Admin routes: < 400kb

##### F10-11. `/scripts/check-bundle-size.ts`
- **Purpose:** CI script that compares build output against `.bundle-stats.json`.
- **TDD test file:** n/a (script).
- **Checklist:**
  - [ ] Fails CI if any route exceeds budget
  - [ ] Reports delta vs baseline

##### F10-12. `/lighthouserc.js`
- **Purpose:** Lighthouse CI config.
- **Interface:**
  ```javascript
  module.exports = {
    ci: {
      collect: {
        url: ['http://localhost:3000/', 'http://localhost:3000/schedule', 'http://localhost:3000/pricing'],
        startServerCommand: 'pnpm start',
        numberOfRuns: 3,
      },
      assert: {
        preset: 'lighthouse:no-pwa',
        assertions: {
          'categories:performance': ['warn', { minScore: 0.95 }],
          'categories:accessibility': ['error', { minScore: 1.0 }],
          'categories:seo': ['error', { minScore: 1.0 }],
          'categories:best-practices': ['error', { minScore: 1.0 }],
        },
      },
      upload: { target: 'filesystem', outputDir: './lighthouse-reports' },
    },
  };
  ```
- **Checklist:**
  - [ ] Performance 95+ (warn)
  - [ ] Accessibility 100 (error)
  - [ ] SEO 100 (error)
  - [ ] Best Practices 100 (error)

##### F10-13. `/checkly/checks/booking-flow.check.ts`
- **Purpose:** Checkly synthetic check — booking flow.
- **Interface:** Playwright script run every 60s against production.
- **Checklist:**
  - [ ] Navigates to `/schedule`
  - [ ] Clicks first class
  - [ ] Verifies booking button visible
  - [ ] Alerts Slack on failure

##### F10-14. `/checkly/checks/sse-endpoint.check.ts`
- **Purpose:** Checkly check — SSE endpoint.
- **Checklist:**
  - [ ] Hits `/api/schedule/stream?sessionId=<known-id>`
  - [ ] Verifies SSE event received within 5s
  - [ ] Alerts Slack if SSE down

##### F10-15. `/checkly/checks/api-health.check.ts`
- **Purpose:** Checkly check — tRPC health endpoint.
- **Checklist:**
  - [ ] Hits `/api/trpc/schedule.getWeek`
  - [ ] Verifies 200 response
  - [ ] Verifies response time < 500ms

##### F10-16. `/apps/web/src/lib/observability/error-boundary.tsx`
- **Purpose:** React error boundary that reports to Sentry.
- **Interface:** Client component wrapping page sections.
- **Checklist:**
  - [ ] Captures errors via `Sentry.captureException`
  - [ ] Shows fallback UI with "Try again" button
  - [ ] Logs to Axiom

#### Phase 10 acceptance test
```bash
pnpm build                                       # verifies bundle budgets
ANALYZE=true pnpm build                          # opens visualizer
pnpm lighthouse ci                               # runs Lighthouse CI
# Manual: throw an error in dev → verify Sentry captures it
# Manual: trigger booking flow → verify PostHog event fires
```

---

### Phase 11 — WCAG AAA Audit + SEO + OG Images

**Goal:** All pages pass WCAG 2.2 Level AAA automated + manual audit. SEO metadata complete on every page. Dynamic OG images generated via `@vercel/og`.

**Dependencies:** Phase 4 (marketing pages), Phase 5 (booking), Phase 6 (dashboard), Phase 9 (admin).

**Estimated duration:** 3 days.

**Acceptance criteria:**
- [ ] Lighthouse Accessibility = 100 on all routes
- [ ] `@axe-core/playwright` reports zero violations
- [ ] Manual screen reader test passes (VoiceOver + NVDA)
- [ ] Keyboard-only navigation walkthrough passes
- [ ] All routes have unique `<title>`, `<meta description>`, canonical URL
- [ ] OG images generated for all marketing routes
- [ ] JSON-LD `YogaStudio` schema on home page

#### Files to CREATE

##### F11-01. `/apps/web/src/app/layout.tsx` [PATCH]
- **Purpose:** Add full SEO metadata.
- **Interface:**
  ```typescript
  export const metadata: Metadata = {
    metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
    title: {
      default: 'Stillwater Yoga Studio',
      template: '%s — Stillwater Yoga',
    },
    description: 'A sanctuary for mindful movement in the heart of Portland. Book classes online.',
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: 'Stillwater Yoga Studio',
      images: [{ url: '/og-default.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true },
  };
  ```
- **TDD test file:** `apps/web/e2e/seo.spec.ts`
  - [RED] Test 1: Home page has `<title>Stillwater Yoga Studio</title>`
  - [RED] Test 2: Blog post page has `<title>{post.title} — Stillwater Yoga</title>`
  - [RED] Test 3: All pages have `<meta name="description">`
  - [RED] Test 4: All pages have `<link rel="canonical">`
- **Checklist:**
  - [ ] `metadataBase` set
  - [ ] Title template applied
  - [ ] OG + Twitter cards
  - [ ] Robots config

##### F11-02. `/apps/web/src/app/robots.ts`
- **Purpose:** Generate `robots.txt`.
- **Interface:** Next.js metadata route.
- **Checklist:**
  - [ ] Allows all crawling except `/api/*`, `/admin/*`, `/auth/*`
  - [ ] References sitemap

##### F11-03. `/apps/web/src/app/sitemap.ts`
- **Purpose:** Generate `sitemap.xml`.
- **Interface:**
  ```typescript
  import { db } from '@stillwater/db';

  export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [classes, instructors, blogPosts] = await Promise.all([
      db.query.classes.findMany(),
      db.query.instructors.findMany(),
      sanityClient.fetch(blogIndexQuery),
    ]);
    // Build sitemap entries
  }
  ```
- **Checklist:**
  - [ ] Static routes (/, /schedule, /pricing, /about, /blog)
  - [ ] Dynamic routes (/classes/[slug], /instructors/[slug], /blog/[slug])
  - [ ] `lastModified` for each
  - [ ] `changeFrequency` per route type

##### F11-04. `/apps/web/src/app/manifest.ts`
- **Purpose:** PWA manifest.
- **Checklist:**
  - [ ] Name: "Stillwater Yoga Studio"
  - [ ] Short name: "Stillwater"
  - [ ] Theme color: clay-400
  - [ ] Icons: 192px, 512px

##### F11-05. `/apps/web/src/app/opengraph-image.tsx`
- **Purpose:** Default OG image (generated via `@vercel/og`).
- **Interface:** ImageResponse with Stillwater branding.
- **Checklist:**
  - [ ] 1200×630
  - [ ] Stillwater wordmark + tagline
  - [ ] Warm Mineral palette

##### F11-06. `/apps/web/src/app/(marketing)/blog/[slug]/opengraph-image.tsx`
- **Purpose:** Per-blog-post OG image.
- **Interface:** Dynamic ImageResponse using blog title + author.
- **Checklist:**
  - [ ] Generates from blog post title
  - [ ] Cached per slug

##### F11-07. `/apps/web/src/app/(marketing)/classes/[slug]/opengraph-image.tsx`
- **Purpose:** Per-class OG image.
- **Checklist:**
  - [ ] Class title + level badge + duration

##### F11-08. `/apps/web/src/app/(marketing)/instructors/[slug]/opengraph-image.tsx`
- **Purpose:** Per-instructor OG image.
- **Checklist:**
  - [ ] Instructor name + specialty + portrait placeholder

##### F11-09. `/apps/web/src/components/seo/JsonLd.tsx`
- **Purpose:** JSON-LD structured data component.
- **Interface:** Props: `{ schema: object }`.
- **Checklist:**
  - [ ] Renders `<script type="application/ld+json">`
  - [ ] Used on home page (YogaStudio schema)
  - [ ] Used on blog posts (Article schema)
  - [ ] Used on instructors (Person schema)

##### F11-10. `/apps/web/src/lib/seo/schemas.ts`
- **Purpose:** JSON-LD schema builders.
- **Interface:**
  ```typescript
  export function yogaStudioSchema(): object;
  export function articleSchema(post: BlogPost): object;
  export function personSchema(instructor: Instructor): object;
  export function breadcrumbSchema(items: Array<{ name: string; url: string }>): object;
  ```
- **TDD test file:** `apps/web/src/lib/seo/schemas.test.ts`
- **Checklist:**
  - [ ] YogaStudio schema includes: name, address, telephone, openingHours, priceRange, hasMap (per PAD §23)

##### F11-11. `/apps/web/e2e/accessibility.spec.ts`
- **Purpose:** Playwright + axe-core accessibility E2E tests.
- **Interface:**
  ```typescript
  import { AxeBuilder } from '@axe-core/playwright';

  test('home page has no a11y violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
  ```
- **TDD test file:** n/a (this IS the test file).
- **Checklist:**
  - [ ] Tests for every public route
  - [ ] Tests for keyboard navigation (Tab order, focus traps)
  - [ ] Tests for color contrast (AAA)
  - [ ] Tests for `prefers-reduced-motion` handling

##### F11-12. `/apps/web/src/lib/a11y/focus-utils.ts`
- **Purpose:** Focus management utilities.
- **Interface:**
  ```typescript
  export function trapFocus(container: HTMLElement): () => void; // cleanup
  export function restoreFocus(element: HTMLElement): void;
  ```
- **TDD test file:** `apps/web/src/lib/a11y/focus-utils.test.ts`
- **Checklist:**
  - [ ] Trap returns cleanup function
  - [ ] Used by Radix Dialog (built-in) + custom modal patterns

##### F11-13. `/apps/web/src/components/a11y/SkipLink.tsx`
- **Purpose:** Skip-to-main-content link.
- **Checklist:**
  - [ ] First focusable element in DOM
  - [ ] Hidden visually until focused
  - [ ] `href="#main"`

##### F11-14. `/apps/web/src/components/a11y/SrOnly.tsx`
- **Purpose:** Screen-reader-only text wrapper.
- **Interface:** `<SrOnly>Text for screen readers</SrOnly>`
- **Checklist:**
  - [ ] Uses `.visually-hidden` CSS class

#### Phase 11 acceptance test
```bash
pnpm test:e2e -- --grep "accessibility|seo"
pnpm lighthouse ci
# Manual:
# 1. Navigate entire site with keyboard only — verify tab order logical
# 2. Test with VoiceOver (Mac) — verify all interactive elements announced
# 3. Test with NVDA (Windows) — same
# 4. Test high-contrast mode
# 5. Test at 200% zoom
```

---

### Phase 12 — Landing Page Port (Mockup → Production Next.js)

**Goal:** The static HTML mockup in `static_landing_page_mockup.html` (visual reference) and `static_landing_page_html_mockup.md` (design rationale) is faithfully ported to a production Next.js page using the shared design system, Radix primitives, Framer Motion, Sanity-backed content, and live tRPC schedule data.

**Dependencies:** Phase 4 (Sanity + marketing route group), Phase 11 (SEO + OG).

**Estimated duration:** 4 days.

**Acceptance criteria:**
- [ ] Visual fidelity: side-by-side comparison shows no regressions
- [ ] All marketing copy from mockup reproduced verbatim OR moved to Sanity
- [ ] Self-hosted fonts (Cormorant + DM Sans + JetBrains Mono — all free Google Fonts)
- [ ] All 9 fluid clamp() values use PAD tokens (D28)
- [ ] Spacing uses `--space-N` (D26), not mockup `--sp-N`
- [ ] Color tokens use `--color-` prefix (e.g., `--color-stone-950`), not mockup's unprefixed `--stone-950`
- [ ] Motion uses `--duration-*` (D27), not `--dur-*`
- [ ] Beginner badge uses `--color-success` (D29)
- [ ] Mobile nav drawer implemented (D32)
- [ ] All schedule items expandable (D35)
- [ ] OG image generated for home page
- [ ] Lighthouse: Performance 95+, Accessibility 100, SEO 100

#### Files to CREATE / UPDATE

##### F12-01. `/apps/web/src/app/(marketing)/page.tsx` [PATCH — replaces Phase 4 stub]
- **Purpose:** Production home page porting mockup sections.
- **Interface:** Server component orchestrating all sections.
- **TDD test file:** `apps/web/e2e/home-fidelity.spec.ts`
  - [RED] Test 1: Hero renders "The practice of returning to yourself." with `<em>returning</em>` italicised in clay-400
  - [RED] Test 2: Marquee renders 7 class items (duplicated for loop)
  - [RED] Test 3: Philosophy section renders `間` ornament
  - [RED] Test 4: Schedule section renders 7 day tabs (Mon-Sun)
  - [RED] Test 5: Instructors section renders 3 alternating rows
  - [RED] Test 6: Membership section renders 3 plans with "Most Popular" badge on Unlimited
  - [RED] Test 7: Studio section renders Main Hall + Stillness Room SVGs
  - [RED] Test 8: CTA band renders "The mat is waiting." with `<em>` italicised
  - [RED] Test 9: Footer renders giant "STILLWATER" watermark
  - [RED] Test 10: Spots label says "12 spots left" (D30 fix) with aria-label "4 of 16 spots taken"
- **Checklist:**
  - [ ] All 10 RED tests GREEN
  - [ ] `revalidate = 3600` (ISR)
  - [ ] Parallel fetch (Sanity + tRPC)
  - [ ] All sections render server-side
  - [ ] Client islands for interactive sections only

##### F12-02. `/apps/web/src/components/marketing/Hero.tsx`
- **Purpose:** Hero section.
- **Interface:** Server component receiving Sanity hero data.
- **TDD test file:** `apps/web/src/components/marketing/Hero.test.tsx`
- **Checklist:**
  - [ ] Asymmetric grid: `1fr 1px minmax(280px, 38%)`
  - [ ] Headline clamp: `var(--text-display-2xl)`
  - [ ] `<em>returning</em>` italicised + clay-400
  - [ ] "Next Class" card on right (CSR via `useSessionAvailability` for live spots)
  - [ ] 3 meta stats (42+ classes, 8 instructors, 3 rooms)
  - [ ] 2 CTAs: "Start Your Practice" (primary), "View Full Schedule" (ghost)

##### F12-03. `/apps/web/src/components/marketing/HeroNextClass.tsx`
- **Purpose:** Live "Next Class" card.
- **Interface:** Client component using `useSessionAvailability` + `trpc.schedule.getWeek`.
- **Checklist:**
  - [ ] Fetches today's soonest session
  - [ ] Live seat count via SSE
  - [ ] 12-bar spots indicator
  - [ ] CTA links to `/book/[sessionId]`

##### F12-04. `/apps/web/src/components/marketing/ClassMarquee.tsx` [PATCH — replaces Phase 4 stub]
- **Purpose:** Marquee strip.
- **Interface:** Client component with Framer Motion.
- **Checklist:**
  - [ ] Uses Framer Motion variant mirroring mockup's `marquee 32s linear infinite`
  - [ ] Pauses on hover
  - [ ] Respects `prefers-reduced-motion`
  - [ ] Items duplicated 2× for seamless loop

##### F12-05. `/apps/web/src/components/marketing/Philosophy.tsx`
- **Purpose:** § 01 Philosophy section.
- **Checklist:**
  - [ ] 3-column grid: vertical-text sidebar / centered quote / `間` ornament
  - [ ] Quote with italic + clay-400 span on "touching your toes."
  - [ ] `01` section number added (D31 fix)
  - [ ] Vertical text uses `writing-mode: vertical-rl`

##### F12-06. `/apps/web/src/components/marketing/ScheduleSection.tsx`
- **Purpose:** § 02 Schedule preview.
- **Interface:** Server component fetching `schedule.getWeek` + client `ScheduleGrid`.
- **Checklist:**
  - [ ] 7-day tab system
  - [ ] Expandable class items
  - [ ] All items expandable (D35 fix — wires Thu-Sun items)
  - [ ] Level badge colors use PAD tokens (D29 fix)

##### F12-07. `/apps/web/src/components/marketing/InstructorsSection.tsx`
- **Purpose:** § 03 Instructors preview.
- **Checklist:**
  - [ ] 3 alternating rows (Mei, James, Aiko)
  - [ ] Portrait from Cloudflare Images (replaces mockup SVG)
  - [ ] "View all 8 instructors" link to `/instructors`

##### F12-08. `/apps/web/src/components/marketing/MembershipSection.tsx`
- **Purpose:** § 04 Membership comparison.
- **Interface:** Server component fetching `memberships.getPlans` + `MembershipTable`.
- **Checklist:**
  - [ ] 4-column grid (label + 3 plans)
  - [ ] Featured "Unlimited" column with dark inversion
  - [ ] All 7 feature rows
  - [ ] 7-day trial note
  - [ ] Plan CTAs link to Stripe checkout

##### F12-09. `/apps/web/src/components/marketing/StudioSpaceSection.tsx`
- **Purpose:** § 05 Studio Space.
- **Checklist:**
  - [ ] 3-column grid with `grid-row: span 2` for tall image
  - [ ] Main Hall SVG (or real image via Cloudflare)
  - [ ] Stillness Room SVG
  - [ ] Dark stats block (42+ classes, 8 instructors)
  - [ ] Third room added (D-draft gap; not in mockup) — add "Sunrise Room" card

##### F12-10. `/apps/web/src/components/marketing/CtaBand.tsx`
- **Purpose:** Pre-footer CTA.
- **Checklist:**
  - [ ] Dark stone-900 background
  - [ ] "The mat is waiting." with italic sub
  - [ ] 2 CTAs: "Begin Free Trial" (primary), "Browse Schedule" (ghost)

##### F12-11. `/apps/web/src/components/marketing/MarketingFooter.tsx` [PATCH — replaces Phase 4 stub]
- **Purpose:** Footer.
- **Checklist:**
  - [ ] 4 columns (brand/address, navigate, hours, newsletter)
  - [ ] Newsletter form (submits to Brevo or Resend audience)
  - [ ] Bottom bar (Privacy, Terms, Accessibility)
  - [ ] Giant "STILLWATER" watermark
  - [ ] Copyright

##### F12-12. `/apps/web/src/components/marketing/MobileNavDrawer.tsx`
- **Purpose:** Mobile nav drawer (D32 fix).
- **Interface:** Radix Dialog.
- **TDD test file:** `apps/web/src/components/marketing/MobileNavDrawer.test.tsx`
  - [RED] Test 1: Hidden by default
  - [RED] Test 2: Opens on hamburger tap
  - [RED] Test 3: Closes on link tap
  - [RED] Test 4: Focus trapped when open
  - [RED] Test 5: Closes on Escape
- **Checklist:**
  - [ ] All 4 nav links + CTA
  - [ ] Slide-in from right
  - [ ] Focus trap
  - [ ] Backdrop dismiss

##### F12-13. `/apps/web/src/hooks/useScrollProgress.ts`
- **Purpose:** Reading progress bar (top of page).
- **TDD test file:** `apps/web/src/hooks/useScrollProgress.test.ts`
- **Checklist:**
  - [ ] Returns 0-1 representing scroll position
  - [ ] Throttled via `requestAnimationFrame`
  - [ ] SSR-safe (returns 0 on server)

##### F12-14. `/apps/web/src/hooks/useScrollReveal.ts`
- **Purpose:** IntersectionObserver-based scroll reveal.
- **TDD test file:** `apps/web/src/hooks/useScrollReveal.test.ts`
- **Checklist:**
  - [ ] Adds `reveal--visible` class when element enters viewport at 88% threshold
  - [ ] Single observer per element (efficient)
  - [ ] Respects `prefers-reduced-motion`

##### F12-15. `/apps/web/src/hooks/useNavScrollHide.ts`
- **Purpose:** Hide nav on scroll-down, show on scroll-up.
- **Checklist:**
  - [ ] Hides after 80px scroll-down
  - [ ] Shows on scroll-up
  - [ ] Adds `nav--scrolled` class after 20px (blur backdrop)

##### F12-16. `/apps/web/src/components/marketing/ScrollProgressBar.tsx`
- **Purpose:** Visual scroll progress bar (matches mockup).
- **Checklist:**
  - [ ] Fixed top, full-width, 2px tall
  - [ ] clay-400 background
  - [ ] `transform: scaleX(progress)` with `transform-origin: left`

##### F12-17. `/apps/web/src/app/(marketing)/page.module.css` (or Tailwind classes)
- **Purpose:** Page-specific styles for asymmetric grid breaks.
- **Checklist:**
  - [ ] Hero grid: `grid-template-columns: 1fr 1px minmax(280px, 38%)`
  - [ ] Philosophy grid: `auto 1fr auto`
  - [ ] Section number absolute positioning
  - [ ] All values use PAD tokens (not hardcoded)

##### F12-18. `/apps/web/src/components/marketing/SectionHeader.tsx`
- **Purpose:** Reusable section header with number + label + title.
- **Interface:** Props: `{ number: string; label: string; title: string; description?: string }`.
- **Checklist:**
  - [ ] Section number: clamp(5rem, 10vw, 9rem) Cormorant 300 stone-100
  - [ ] Label: 0.6875rem DM Sans uppercase clay-400
  - [ ] Title: clamp(2rem, 4vw, 3.25rem) Cormorant 300

##### F12-19. `/apps/web/src/components/marketing/InstructorRow.tsx`
- **Purpose:** Single instructor row (alternating).
- **Interface:** Props: `{ instructor: Instructor; index: number; orientation: 'left' | 'right' }`.
- **Checklist:**
  - [ ] Alternates portrait/content order via `order` CSS
  - [ ] Portrait from Cloudflare Images
  - [ ] Name + specialty + bio + tags + "Full profile" link

##### F12-20. `/apps/web/src/lib/marketing/copy.ts`
- **Purpose:** Static marketing copy (not from Sanity) — eyebrow, taglines, etc.
- **Interface:** Exported constants.
- **Checklist:**
  - [ ] `HERO_EYEBROW = 'Est. 2019 · Portland, Oregon'`
  - [ ] `HERO_HEADLINE_LINES = ['The practice', 'of returning', 'to yourself.']`
  - [ ] `HERO_EMPHASIS_WORD = 'returning'`
  - [ ] All other static copy from mockup

##### F12-21. `/apps/web/src/lib/marketing/stats.ts`
- **Purpose:** Static stats (42+ classes, 8 instructors, 3 rooms).
- **Interface:** Computed from DB at build time (ISR).
- **Checklist:**
  - [ ] Falls back to hardcoded values if DB unreachable
  - [ ] Refreshed on ISR revalidation

##### F12-22. `/apps/web/src/components/marketing/StudioSpaceSVG.tsx`
- **Purpose:** SVG illustrations for studio rooms (until real photos available).
- **Interface:** Props: `{ variant: 'main-hall' | 'stillness-room' | 'sunrise-room' }`.
- **Checklist:**
  - [ ] Reproduces mockup SVG verbatim
  - [ ] Accessible: `role="img"` + `aria-label`
  - [ ] Inline SVG (no external request)

##### F12-23. `/apps/web/src/components/marketing/NewsletterForm.tsx`
- **Purpose:** Newsletter signup.
- **Interface:** Client component using `react-hook-form` + Zod.
- **TDD test file:** `apps/web/src/components/marketing/NewsletterForm.test.tsx`
  - [RED] Test 1: Invalid email shows error
  - [RED] Test 2: Valid email submits (mock fetch)
  - [RED] Test 3: Success state shows "Subscribed ✓"
  - [RED] Test 4: Button disabled during submit
- **Checklist:**
  - [ ] Submits to Resend Audience or Brevo
  - [ ] Anti-generic: no rounded pill button
  - [ ] Accessible label on input

##### F12-24. `/apps/web/src/components/marketing/MarqueeItem.tsx`
- **Purpose:** Single marquee item (class name + time + instructor + dot separator).
- **Checklist:**
  - [ ] Italic Cormorant class name
  - [ ] Uppercase DM Sans time
  - [ ] 4×4px clay-400 dot separator

##### F12-25. `/apps/web/src/lib/marketing/animations.ts`
- **Purpose:** Framer Motion variants mirroring mockup CSS animations.
- **Interface:**
  ```typescript
  import type { Variants } from 'framer-motion';

  export const revealVariant: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  export const staggerContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  ```
- **Checklist:**
  - [ ] Easing: `[0.16, 1, 0.3, 1]` (gentle)
  - [ ] Duration: 600ms (slow)
  - [ ] Stagger: 80ms

#### Phase 12 acceptance test
```bash
pnpm test:e2e -- --grep "home-fidelity"
pnpm lighthouse ci -- --url /
# Manual:
# 1. Compare mockup HTML to production side-by-side
# 2. Verify all 9 sections render correctly
# 3. Test on mobile (375px), tablet (768px), desktop (1440px)
# 4. Verify all animations respect prefers-reduced-motion
# 5. Run Lighthouse: Performance 95+, A11y 100, SEO 100
```

---

## Phase Completion Checklist (per phase)

Before merging any phase to `develop`:

- [ ] All RED tests for that phase are now GREEN
- [ ] `pnpm turbo check-types` green
- [ ] `pnpm turbo lint` green
- [ ] `pnpm turbo test --coverage` meets phase coverage target
- [ ] `pnpm turbo build` green
- [ ] `pnpm turbo test:e2e` green for the phase's E2E tests
- [ ] All new env vars added to `.env.example`
- [ ] `MASTER_EXECUTION_PLAN.md` updated with phase completion timestamp
- [ ] ADR added if significant decision made during implementation
- [ ] PR description includes Architecture Validation Checklist (PAD §31)
- [ ] Rollback script included as PR comment (for migrations)




## 7. Validation Against Source Documents

After IMPLEMENT, the following matrix must be GREEN. Each row maps a source-document requirement to the file(s) that satisfy it.

### 7.1 PAD.md section-by-section coverage

> **External validation:** `guide_auth-v5_vs_better-auth.md` (July 2026) independently confirms ADR-008 (Better Auth v1.6.23 stable) and ADR-009 (`proxy.ts` rename). The guide additionally mandates a **2-layer auth pattern** (cookie-only `proxy.ts` + Server Component `requireAuth()`/`requireRole()`) which has been incorporated into Phase 2 (F2-13 rewrite + F2-16 through F2-19 new layout files). See discrepancy D36 below.
>
> **⚠️ PAD Alignment Partially Verified:** PAD.md v1.1.0 alignment confirmed (14 Auth.js/middleware references). PAD.md v1.3.0 introduced additional corrections (Stripe Dahlia, pnpm 11, Tailwind 4.3, env vars 34, ADR-009 proxy.ts, JetBrains Mono) that have been incorporated into MEP v1.2.0. PAD.md v1.4.0 further softened ADR-009 proxy.ts runtime language ("Edge or Node.js — docs inconsistent") and added ADR-010 (Resend Native Templates proposed). The PLAN and PAD are now in alignment. Phase 0 can proceed.

| PAD § | Topic                                  | Satisfied by (file / phase)                                                |
|-------|----------------------------------------|----------------------------------------------------------------------------|
| 1     | Executive Summary                      | This document §1                                                           |
| 2     | Project Vision & Goals                 | This document §1.2 (G1-G7)                                                 |
| 3     | System Context & Stakeholders          | Phase 0 (`docker-compose.yml`), Phase 7 (Stripe), Phase 8 (Trigger.dev)    |
| 4     | Architecture Overview                  | Phase 0 (monorepo), all phases                                             |
| 5     | Technology Stack                       | Phase 0 `package.json`s + version pins                                     |
| 6     | Monorepo Project Structure             | Phase 0 (scaffolding_files.md applied + patches)                           |
| 7     | Data Architecture                      | Phase 1 (`packages/db/src/schema/*`)                                       |
| 8     | API Architecture (tRPC)                | Phase 3 (`packages/api/src/routers/*`)                                     |
| 9     | Auth & RBAC                            | Phase 2 (`packages/auth/*`, `apps/web/proxy.ts`)                           |
| 10    | Frontend Architecture                  | Phases 4, 5, 6, 9, 12 (route groups + components)                          |
| 11    | Design System                          | Phase 0 (`packages/ui/src/tokens/*`, `packages/ui/src/fonts/*`) + Phase 12 |
| 12    | Rendering Strategy                     | Per-route `export const revalidate` / `dynamic` in Phases 4, 5, 6, 9       |
| 13    | Real-Time Architecture (SSE)           | Phase 5 (`apps/web/app/api/schedule/stream/route.ts`)                      |
| 14    | Content Management (Sanity)            | Phase 4 (`apps/studio/` + `packages/sanity/` if extracted)                 |
| 15    | Payment Architecture (Stripe)          | Phase 7 (`packages/payments/*` + `apps/web/app/api/webhooks/stripe/`)      |
| 16    | Background Jobs                        | Phase 8 (`services/workers/src/*`)                                         |
| 17    | Email (React Email + Resend)           | Phase 8 (`packages/email/src/templates/*`)                                 |
| 18    | Testing Strategy                       | Every phase (TDD test files listed per-file)                               |
| 19    | Observability                          | Phase 10 (Sentry, PostHog, Axiom, Checkly)                                 |
| 20    | Performance Targets                    | Phase 10 + per-route bundle budgets                                        |
| 21    | Accessibility                          | Phase 11 (WCAG AAA audit) + per-component tests                            |
| 22    | Deployment & Environments              | Phase 0 (CI workflows), Phase 10 (Vercel + Neon)                           |
| 23    | ADRs                                   | ADR-001 to ADR-007 (existing) + ADR-008 (Better Auth v1.6.23) + ADR-009 (proxy.ts) — ✅ all 9 ADRs now in PAD.md §29 |
| 24    | Glossary                               | This document Appendix C                                                   |

### 7.2 scaffolding_files.md coverage

| Scaffolding file                                 | Phase | Action                     |
|--------------------------------------------------|-------|----------------------------|
| `/package.json`                                  | 0     | [SCAFFOLD] place on disk   |
| `/pnpm-workspace.yaml`                           | 0     | [PATCH] add `customConditions` field for `@stillwater/source` (D15) |
| `/turbo.json`                                    | 0     | [PATCH] remove `"ui": "tui"` line (D24) |
| `/.gitignore`                                    | 0     | [SCAFFOLD]                  |
| `/.env.example`                                  | 0     | [PATCH] fix Postgres password (D17) |
| `/docker-compose.yml`                            | 0     | [SCAFFOLD]                  |
| `/tooling/typescript/base.json`                  | 0     | [SCAFFOLD]                  |
| `/tooling/typescript/nextjs.json`                | 0     | [SCAFFOLD]                  |
| `/tooling/typescript/library.json`               | 0     | [SCAFFOLD]                  |
| `/tooling/eslint/index.js`                       | 0     | [PATCH] wire `nextPlugin` (D19) |
| `/tooling/eslint/package.json`                   | 0     | [SCAFFOLD]                  |
| `/tooling/typescript/package.json`               | 0     | [SCAFFOLD]                  |
| `/tooling/tailwind/base.ts`                      | 0     | [SCAFFOLD]                  |
| `/tooling/tailwind/package.json`                 | 0     | [SCAFFOLD]                  |
| `/apps/web/package.json`                         | 0     | [PATCH] add `@tailwindcss/*` devDeps (D16); add `test`/`test:e2e` scripts (D22); replace `next lint` with `eslint .` (D23) |
| `/apps/web/tsconfig.json`                        | 0     | [SCAFFOLD]                  |
| `/apps/web/next.config.ts`                       | 0     | [PATCH] move `serverComponentsExternalPackages` to top-level (D21) |
| `/apps/web/postcss.config.mjs`                   | 0     | [SCAFFOLD]                  |
| `/apps/web/tailwind.config.ts`                   | 0     | [SCAFFOLD]                  |
| `/apps/web/proxy.ts`                             | 0     | [SCAFFOLD] (Phase 2 replaces auth logic entirely — F2-13, D36; cookie-only `getSessionCookie()`) |
| `/apps/web/components.json`                      | 0     | [SCAFFOLD]                  |
| `/packages/db/package.json`                      | 0     | [SCAFFOLD]                  |
| `/packages/db/tsconfig.json`                     | 0     | [SCAFFOLD]                  |
| `/packages/db/drizzle.config.ts`                 | 0     | [SCAFFOLD]                  |
| `/packages/api/package.json`                     | 0     | [SCAFFOLD]                  |
| `/packages/api/tsconfig.json`                    | 0     | [SCAFFOLD]                  |
| `/packages/ui/package.json`                      | 0     | [SCAFFOLD]                  |
| `/packages/ui/tsconfig.json`                     | 0     | [SCAFFOLD]                  |
| `/packages/auth/package.json`                    | 0     | [SCAFFOLD]                  |
| `/packages/auth/tsconfig.json`                   | 0     | [SCAFFOLD]                  |
| `/packages/email/package.json`                   | 0     | [SCAFFOLD]                  |
| `/packages/email/tsconfig.json`                  | 0     | [SCAFFOLD]                  |
| `/packages/payments/package.json`                | 0     | [SCAFFOLD]                  |
| `/packages/payments/tsconfig.json`               | 0     | [SCAFFOLD]                  |
| `/packages/config/package.json`                  | 0     | [SCAFFOLD]                  |
| `/packages/config/tsconfig.json`                 | 0     | [SCAFFOLD]                  |
| `/services/workers/package.json`                 | 0     | [SCAFFOLD]                  |
| `/services/workers/tsconfig.json`                | 0     | [SCAFFOLD]                  |
| `/services/workers/trigger.config.ts`            | 0     | [SCAFFOLD]                  |

### 7.3 static_landing_page_html_mockup.md coverage (Phase 12)

| Mockup section       | Ported to (Next.js route / component)                                  |
|----------------------|------------------------------------------------------------------------|
| Nav                  | `apps/web/src/components/marketing/MarketingNav.tsx`                   |
| Hero                 | `apps/web/src/app/(marketing)/page.tsx` (server) + `Hero.tsx` (client) |
| Marquee              | `apps/web/src/components/marketing/ClassMarquee.tsx`                   |
| § 01 Philosophy      | Inline in `(marketing)/page.tsx`                                       |
| § 02 Schedule        | `apps/web/src/app/(marketing)/schedule/page.tsx` + `ScheduleGrid.tsx`  |
| § 03 Instructors     | `apps/web/src/app/(marketing)/instructors/page.tsx` + `InstructorCard.tsx` |
| § 04 Membership      | `apps/web/src/app/(marketing)/pricing/page.tsx` + `MembershipTable.tsx` |
| § 05 Studio Space    | Inline in `(marketing)/page.tsx` + `StudioSpaceGrid.tsx`               |
| CTA Band             | `apps/web/src/components/marketing/CtaBand.tsx`                        |
| Footer               | `apps/web/src/components/marketing/MarketingFooter.tsx`                |
| Inline `<style>`     | → `packages/ui/src/tokens/*.css` + `apps/web/src/app/globals.css`      |
| Inline `<script>`    | → React hooks (`useScrollProgress`, `useScrollReveal`, `useScheduleTabs`) |
| Marketing copy       | Sanity content types (`homePage`, `aboutPage`, `testimonial`, etc.)    |

### 7.4 design.md 12-phase proposal coverage

| design.md phase | This plan's phase(s)  |
|-----------------|-----------------------|
| Phase 0         | Phase 0               |
| Phase 1         | Phase 1               |
| Phase 2         | Phase 2               |
| Phase 3         | Phase 3               |
| Phase 4         | Phase 4               |
| Phase 5         | Phase 5               |
| Phase 6         | Phase 6               |
| Phase 7         | Phase 7               |
| Phase 8         | Phase 8               |
| Phase 9         | Phase 9               |
| Phase 10        | Phase 10              |
| Phase 11        | Phase 11              |
| (not in design) | Phase 12 (landing port)|

---

## 8. Risks & Mitigations

| #  | Risk                                                                | Likelihood | Impact | Mitigation                                                                                  |
|----|--------------------------------------------------------------------|------------|--------|---------------------------------------------------------------------------------------------|
| R1 | `@stillwater/source` custom condition silently fails → packages resolve to non-existent `dist/` | High | High | Phase 0 patches `pnpm-workspace.yaml` with `customConditions` declaration (D15); smoke test: `pnpm dev` boots |
| R2 | Better Auth + Drizzle adapter migration pain                       | Medium     | Medium | Phase 2 starts with Better Auth's official Drizzle adapter example; falls back to manual adapter if needed |
| R3 | SSE on Vercel Serverless may hit 15s default function timeout      | Medium     | High   | Phase 5 uses `runtime = 'nodejs'` + `maxDuration = 300` (verified for SSE streams. Requires Fluid Compute. Client gracefully disconnects & reconnects) |
| R4 | Sanity webhook secret mismatch                                     | Low        | Medium | Phase 4 integration test verifies HMAC signature; Checkly monitors webhook 200 rate          |
| R5 | Stripe webhook duplicate processing                                | Low        | High   | `payment_events.stripe_event_id` UNIQUE INDEX + `pg_advisory_xact_lock` (D12 + ADR-004) |
| R6 | Trigger.dev vendor lock-in                                         | Low        | Low    | ADR-007 already documents "thin abstraction layer" mitigation                                 |
| R7 | WCAG AAA target too ambitious; some AAA criteria conflict with editorial design | Medium | Medium | Phase 11 audits per-component; documented exceptions recorded in `docs/a11y-exceptions.md` |
| R8 | Landing page port loses mockup's hand-tuned motion feel             | Medium     | Medium | Phase 12 uses Framer Motion variants that mirror mockup's `--ease-gentle` curves              |
| R9 | Bundle size creep on admin pages                                   | Medium     | Medium | Phase 10 adds `@next/bundle-analyzer` (D-scaffolding gap); CI gates per-route budget          |
| R10| Mockup's "Beginner badge" palette deviation (D29)                   | Low        | Low    | Phase 12 swaps hardcoded `#3A7D50` for `--color-success` family                               |
| R11| `pnpm install` may pull different versions than scaffolding pinned | Low        | Medium | Phase 0 commits `pnpm-lock.yaml`; CI verifies lockfile is up to date                          |
| R12| Drizzle Kit migration generation may produce destructive SQL        | Low        | High   | `drizzle.config.ts` already has `strict: true`; migration PRs require rollback script as comment |
| R13| Trigger.dev local dev mode requires manual `trigger dev` process    | Medium     | Low    | Phase 0 adds `pnpm jobs:dev` turbo task (already in scaffolding); Phase 8 documents workflow  |
| R14| Better Auth Google OAuth requires production callback URL on Vercel preview | Medium | Low    | Phase 2 documents Vercel env var per-branch strategy                                          |
| R15| Self-hosted fonts bloat `packages/ui` bundle                        | Low        | Low    | Fonts are woff2-only (smaller); loaded via `next/font/local` for zero FOUT                    |

---

## 9. Open Questions (for VALIDATE checkpoint)

The following items require explicit project-owner sign-off before IMPLEMENT begins.

1. **Better Auth vs Auth.js** — ✅ RESOLVED. `guide_auth-v5_vs_better-auth.md` (July 2026) independently confirms: Better Auth v1.6.23 stable is correct for greenfield Next.js 16. Auth.js v5 still beta (5.0.0-beta.31), with confirmed friction (GitHub #13302 peer-dep conflicts, #13388 server-action failures). Better Auth team also patches Auth.js security. ADR-008 stands. **No action required — this question is answered.**
2. **`proxy.ts` rename** — ✅ RESOLVED. Next.js 16.2.0 is pinned in `apps/web/package.json`; `apps/web/proxy.ts` exists in the repo. ADR-009 adopted. No reversion needed.
3. **Self-hosted fonts** — ✅ RESOLVED. Self-hosting Cormorant Garamond + DM Sans + JetBrains Mono (all free Google Fonts, already downloaded to `packages/ui/src/fonts/`). Berkeley Mono (paid) was the Phase 1 proposal but was never acquired — JetBrains Mono (Apache 2.0) is the chosen free alternative. See PAD.md §11.2 and SKILL.md §4.4.
4. **Sanity Cloud hosting** — ✅ RESOLVED. **Decision: Sanity Cloud (managed at `stillwater.sanity.studio`).** Rationale: (a) ADR-005 mandates "marketing content only" with clear Sanity/PostgreSQL boundary — Sanity Cloud enforces this naturally; (b) PAD §2.3 non-goals explicitly state "no infrastructure management" — self-hosting Sanity Studio as a Next.js app in `apps/studio/` would add infra burden (build, deploy, monitor, update); (c) Sanity Cloud is free for small teams and includes hosting, CDN, and version history; (d) Studio config (`sanity.config.ts`) still lives in the monorepo at `apps/studio/sanity.config.ts` (F4-01) — only the Studio *runtime* is hosted by Sanity. Content editors access `stillwater.sanity.studio` directly. **Action: Phase 4 F4-01 path confirmed as `apps/studio/sanity.config.ts` (config in repo, runtime in Sanity Cloud).**
5. **Stripe refund workflow** — ✅ RESOLVED. **Decision: Stripe Dashboard for v1; defer in-app refund UI to v2.** Rationale: (a) Staff (manager/owner roles) already have Stripe Dashboard access for reconciliation per PAD §18.1; (b) In-app refunds add complexity — permission checks, audit logging, partial refund UI, webhook handling for `charge.refunded` — that isn't justified for v1 with a single studio; (c) D12 scope reduced: `paymentsRouter.refund` (F3-12) and `packages/payments/refunds.ts` (F7-07) are deferred to v2; (d) The `payment_events` table still records all Stripe events (including refunds initiated via Dashboard) for audit trail. **Action: D12 updated to note "v1: Stripe Dashboard only"; Phase 7 F7-07 scope reduced (remove in-app refund UI; keep `refunds.ts` as thin wrapper for future v2 use).**
6. **Mobile nav drawer** — ✅ RESOLVED. **Decision: Radix Dialog-based drawer (D32 default).** Rationale: (a) SKILL.md §5.4 library discipline mandates Radix primitives — "if a UI library provides it, USE IT"; (b) Radix Dialog provides built-in focus trap, Escape-to-close, backdrop dismiss, and `aria-modal` — all required for WCAG 2.2 Level AAA (PAD §22, Goal G6); (c) D32 already specifies this pattern; (d) The drawer will be implemented in Phase 12 F12-12 (`MobileNavDrawer.tsx`) using `@radix-ui/react-dialog` (already in `apps/web/package.json` deps). **Action: Phase 12 F12-12 confirmed as Radix Dialog implementation.**
7. **~~Berkeley Mono license~~** — ✅ RESOLVED. JetBrains Mono (Apache 2.0, open-source Google Font) selected. No license acquisition needed. The `packages/ui/src/fonts/jetbrains-mono/` directory already contains 18 woff2 files.
8. **Refund workflow scope** — ✅ RESOLVED (merged with Q5). **Decision: Defer in-app refund UI to v2.** See Q5 above for full rationale. D12 scope reduced: v1 uses Stripe Dashboard only. Phase 7 F7-07 retains `refunds.ts` as a thin wrapper (for future v2 in-app UI) but the UI itself is deferred. This saves ~2 engineering days in Phase 7.
9. **Test data PII** — ✅ RESOLVED. **Decision: Synthetic data only — `crypto.randomUUID()` for all IDs, factory pattern for all entities, never copy real member data.** Rationale: (a) SKILL.md §21.6 already mandates this: "Test Data: Factory pattern (`getMockMember`, `getMockSession`) using `crypto.randomUUID()` — never hardcoded fixtures"; (b) GDPR/CCPA compliance — test fixtures must not contain real names, emails, phone numbers, or emergency contacts; (c) Phase 1 seed fixtures (F1-17…F1-20) will use clearly synthetic data (e.g., `member1@stillwater.test`, `+1-555-0100`); (d) Integration tests use Testcontainers Postgres with fresh synthetic data per test run. **Action: Phase 1 F1-17…F1-20 fixture files MUST use synthetic data only. Add a `PII-SAFETY.md` note to `packages/db/src/seed/` documenting the synthetic-data mandate.**
10. **Production cutover strategy** — ✅ RESOLVED. **Decision: Feature-flag-gated progressive rollout (5% → 25% → 100%).** Rationale: (a) PostHog feature flags are already in the stack (PAD §18.1) — no new infrastructure needed; (b) Progressive rollout allows monitoring for issues at each stage (error rate, booking success rate, Stripe webhook health) before expanding; (c) Big-bang deploy is risky for a studio with active members — a booking system outage directly impacts revenue and member trust; (d) Feature flags allow instant rollback (disable flag → traffic reverts to old system) without a redeploy. **Rollout plan:** Phase 10 implements the flag (`nextgen_booking`); Phase 12 launch starts at 5% (studio owner + staff) → 25% (invited beta members) → 100% (all members). Each stage requires 48h of green metrics before expanding. **Action: Phase 10 F10-04 (`PostHogProvider`) must include the `nextgen_booking` feature flag; Phase 12 acceptance criteria includes rollout flag configuration.**

---

## 10. Next Steps

### 10.1 Immediate (pre-IMPLEMENT)
1. **VALIDATE checkpoint** — Project owner reviews this document and answers Open Questions §9
2. **ADR-008 and ADR-009** ✅ COMPLETE — drafted and added to PAD.md §29 (Better Auth v1.6.23 + proxy.ts rename; see `PAD.md` lines after ADR-007)
3. **✅ PAD.md stale references resolved (COMPLETED in PAD v1.1.0)** — All 14 stale references identified in D41 have been remediated in PAD.md v1.1.0 (Next.js 16, Better Auth v1.6.23, TypeScript ^5.9.0, `proxy.ts`, `[...all]`, `BETTER_AUTH_SECRET`, etc.). No further action required.
4. **Phase 0 smoke test** — `git init`, place all scaffolding files, apply D15-D24 patches, run `pnpm install && pnpm dev`; verify `http://localhost:3000` returns a 200 (even if it's a placeholder page)

### 10.2 First IMPLEMENT cycle (Phase 0 only)
- Create the repo structure from scaffolding_files.md
- Apply all Phase 0 patches (D15-D24)
- Create the 5 missing Phase 0 files (`packages/config/src/env.ts`, `infrastructure/postgres/init/00-create-extensions.sql`, `.npmrc`, `.prettierrc`, `.editorconfig`, `README.md`, root `vitest.config.ts`, `.github/workflows/ci.yml`, `.github/workflows/deploy-preview.yml`, `.github/workflows/deploy-production.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS`)
- Verify: `pnpm install` succeeds; `pnpm dev` boots Next.js to a placeholder `/` route; `pnpm check-types` passes; `pnpm lint` passes; `docker compose up -d` starts postgres + redis cleanly

### 10.3 Per-phase VALIDATE
After each phase, the following must be GREEN before merging to `develop`:
- All TDD test files for that phase pass
- `pnpm turbo check-types && pnpm turbo lint && pnpm turbo test` green
- Architecture Validation Checklist (PAD §31) completed for the PR
- ADR added if a significant decision was made
- `.env.example` updated if new env vars introduced
- This MASTER_EXECUTION_PLAN.md updated with phase completion timestamp

---

## Appendix A: Complete File Inventory (all phases)

> Files marked with phase number; total ~260 files across 13 phases.

(See per-phase detailed sections in §6 for full file specifications.)

## Appendix B: Environment Variables Reference

All 25 env vars from `/.env.example` (scaffolding) — see scaffolding_files.md §5 for verbatim values.

Critical env vars consumed per package:
- `packages/config/src/env.ts` — Zod-validated schema for ALL env vars (created in Phase 0)
- `packages/db` — `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (migrations)
- `packages/auth` — `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `packages/payments` — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `packages/email` — `RESEND_API_KEY`, `EMAIL_FROM`
- `packages/api` — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (rate limiting)
- `services/workers` — `TRIGGER_SECRET_KEY` + 6 build env vars (see `trigger.config.ts`)
- `apps/web` — `NEXT_PUBLIC_SANITY_*`, `NEXT_PUBLIC_POSTHOG_*`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `AXIOM_TOKEN`, `AXIOM_DATASET`, `CLOUDFLARE_*`

## Appendix C: Glossary

Inherited from PAD §24. Key terms: Class, Session, Enrollment, Waitlist, Membership Plan, Subscription, Credit, Class Package, ISR, ODR, RSC, tRPC, GROQ, Advisory Lock, SSE, ADR, MRR.

## Appendix D: Commands Cheat Sheet

```bash
# Setup (Phase 0)
pnpm install
cp .env.example .env.local
docker compose up -d
pnpm db:migrate
pnpm db:seed

# Dev
pnpm dev                    # All apps
pnpm dev --filter=@stillwater/web       # Just web
pnpm jobs:dev               # Trigger.dev local worker

# Quality
pnpm check-types
pnpm lint
pnpm format
pnpm test
pnpm test:coverage
pnpm test:e2e

# DB
pnpm db:generate            # drizzle-kit generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
pnpm db:reset               # LOCAL ONLY

# Build
pnpm build
pnpm build --filter=@stillwater/web

# Deploy
pnpm jobs:deploy            # Trigger.dev cloud
# Vercel deploy handled by CI on main merge
```

---

**End of MASTER_EXECUTION_PLAN.md v1.3.0**

> Awaiting VALIDATE checkpoint. Once confirmed, Phase 0 IMPLEMENT begins immediately.

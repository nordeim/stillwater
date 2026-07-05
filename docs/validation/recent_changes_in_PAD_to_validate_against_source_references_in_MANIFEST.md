diff --git a/PAD.md b/PAD.md
index b7761aa..61e31f8 100644
--- a/PAD.md
+++ b/PAD.md
@@ -158,7 +158,7 @@ Stillwater is the operational backbone and digital face of the studio — a plat
 | G3 | Marketing content updates require zero deployments | Content editor publishes via Sanity; ISR propagates in < 5 min |
 | G4 | Platform handles 500 concurrent users without degradation | p95 response time < 200ms at 500 RPS |
 | G5 | Payment processing is reliable and auditable | Zero unreconciled transactions; full Stripe webhook audit log |
-| G6 | Accessibility is not an afterthought | Lighthouse Accessibility score: 100; WCAG AAA compliant |
+| G6 | Accessibility is not an afterthought | **Lighthouse Accessibility score: 100 (automated baseline) + quarterly manual screen-reader & keyboard audit (WCAG 2.2 Level AAA target).** Lighthouse wraps axe-core which catches only ~30–57% of WCAG issues; a perfect 100 does NOT equal WCAG compliance. Source: `PAD_audit_report-1.md` §"Lighthouse 100 + WCAG AAA" + Deque Systems axe-core coverage stats. |
 | G7 | Engineers can onboard in < 1 day | New dev runs `pnpm dev` successfully within 30 minutes |
 
 ### 2.3 Non-Goals (Explicit Scope Exclusions)
@@ -266,7 +266,7 @@ C4Container
   }
 
   Container_Boundary(workers, "Background Services") {
-    Container(jobs, "Job Workers", "Trigger.dev v3", "Email dispatch, waitlist promotion, membership renewal, reminders")
+    Container(jobs, "Job Workers", "Trigger.dev v4", "Email dispatch, waitlist promotion, membership renewal, reminders")
   }
 
   Container_Boundary(content, "Content Layer") {
@@ -340,27 +340,27 @@ sequenceDiagram
 
 | Layer | Technology | Version | Rationale | Rejected Alternatives |
 |-------|-----------|---------|-----------|----------------------|
-| **Frontend Framework** | Next.js | 16.x | App Router, Turbopack stable, React Compiler, `proxy.ts` (replaces middleware), streaming, ISR — the complete solution | Remix (less ecosystem), Nuxt (different team skills) |
-| **UI Library** | React | 19.x | Concurrent features, `use()`, Server Components | — |
-| **Language** | TypeScript | 5.7+ | Strict mode end-to-end; `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables` | — |
-| **Styling** | Tailwind CSS | v4.x | Utility-first, zero dead CSS in production, v4's native CSS variables | CSS Modules (verbose), styled-components (runtime cost) |
+| **Frontend Framework** | Next.js | `^16.2.0` | App Router, Turbopack stable, React Compiler, `proxy.ts` (replaces `middleware.ts` — also shifts from Edge to Node.js runtime by default), streaming, ISR, top-level `cacheComponents: true` (NOT under `experimental`) | Remix (less ecosystem), Nuxt (different team skills) |
+| **UI Library** | React | `^19.2.3` | Concurrent features, `use()`, Server Components. ⚠️ **CVE-2025-55182 floor** ("React2Shell" RCE, CVSS 10.0) — never downgrade below 19.2.3. | — |
+| **Language** | TypeScript | `^5.9.0` | Strict mode end-to-end; `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `verbatimModuleSyntax: true` (requires `import type`), `erasableSyntaxOnly: true` (FORBIDS `enum` and `namespace`) | — |
+| **Styling** | Tailwind CSS | `^4.1.0` | Utility-first, zero dead CSS in production, v4's CSS-first `@theme`, `@source` directives for monorepo content scanning | CSS Modules (verbose), styled-components (runtime cost) |
 | **Component Primitives** | Radix UI | latest | Fully accessible, unstyled, composable | Headless UI (fewer components), Ark UI (less mature) |
 | **API Layer** | tRPC | v11 | End-to-end type safety, no code generation, integrates natively with Next.js | REST (no type safety bridge), GraphQL (overkill, complex) |
-| **ORM** | Drizzle ORM | latest | Type-safe SQL, zero magic, excellent PostgreSQL support, fast | Prisma (slower, heavier, type gen required), Kysely (more verbose) |
+| **ORM** | Drizzle ORM | `^0.45.0` | Type-safe SQL, zero magic, excellent PostgreSQL support, fast. `db.$count` and relational query API require ≥0.30. | Prisma (slower, heavier, type gen required), Kysely (more verbose) |
 | **Database** | PostgreSQL | 17 | Advisory locks for bookings, JSONB for metadata, proven at scale | MySQL (weaker advisory lock support), SQLite (not for prod) |
 | **Database Host** | Neon | latest | Serverless PostgreSQL, branching for preview envs, zero cold starts | Supabase (more opinionated), RDS (heavy setup) |
 | **Cache / Rate Limit** | Upstash Redis | latest | Serverless Redis, per-request billing, edge-compatible | Redis Cloud (needs VPC), Memcached (no sorted sets) |
 | **Auth** | Better Auth | v1.6.23 | Type-safe, framework-agnostic, Drizzle adapter, magic link + OAuth, server-component native; stable v1.x line (Auth.js v5 still beta at 5.0.0-beta.31) | Auth.js v5 (still beta, maintenance handover to Better Auth team Sept 2025), Clerk (vendor lock-in, cost), NextAuth v4 (legacy) |
-| **Background Jobs** | Trigger.dev | v3 | Durable execution, retries, scheduling, excellent DX | Inngest (similar but fewer features), BullMQ (self-hosted complexity) |
+| **Background Jobs** | Trigger.dev | **v4** | Durable execution, retries, scheduling, excellent DX. **v3 is deprecated — new v3 deploys stop working April 1, 2026; v4 reached GA August 2025.** | Inngest (similar but fewer features), BullMQ (self-hosted complexity) |
 | **CMS** | Sanity | v3 | GROQ queries, real-time collaborative editing, webhook-driven ISR | Contentful (expensive), Payload CMS (self-hosted complexity) |
-| **Payments** | Stripe | latest | Industry standard, Billing API, webhooks, tax support | Paddle (US restrictions), Braintree (complex) |
+| **Payments** | Stripe | `^22.3.0` | Industry standard, Billing API, webhooks, tax support. ⚠️ **"Basil" API (2025-03-31)** — `current_period_end` moved from top-level to `items.data[0].current_period_end`. SDK v22+ uses camelCase (`currentPeriodEnd` not `current_period_end`). | Paddle (US restrictions), Braintree (complex) |
 | **Email Templates** | React Email | latest | JSX email templates, preview server, TypeScript | MJML (XML, not TypeScript), Handlebars (no type safety) |
 | **Email Delivery** | Resend | latest | Built for developers, React Email native integration, generous free tier | SendGrid (complex API), Postmark (no React Email native) |
 | **Monorepo** | Turborepo | latest | Incremental builds, task caching, excellent pnpm support | Nx (heavier), Lerna (legacy) |
-| **Package Manager** | pnpm | 9.x | Workspace support, fast, disk-efficient | npm (slow workspaces), yarn (inconsistent behavior) |
+| **Package Manager** | pnpm | `9.15.4` (≥9.0.0) | Workspace support, fast, disk-efficient. `custom-conditions=@stillwater/source` in `.npmrc`. | npm (slow workspaces), yarn (inconsistent behavior) |
 | **Testing: Unit/Integration** | Vitest | latest | Fast, ESM native, compatible with Vite ecosystem | Jest (slower, ESM friction) |
+| **Validation** | Zod | `^4.4.0` | Env module, Server Action inputs, tRPC procedure inputs. Zod v4 `.url()` accepts any scheme → compose with `.refine()`. | yup (less TypeScript-native), Joi (older) |
 | **Testing: E2E** | Playwright | latest | Cross-browser, reliable, component testing support | Cypress (slower, no Firefox) |
-| **Error Tracking** | Sentry | latest | Source maps, session replay, Next.js SDK | Rollbar (less Next.js integration), Bugsnag |
 | **Analytics** | PostHog | latest | Self-hostable, GDPR-friendly, feature flags, funnels | Mixpanel (cost), Amplitude (cost), GA4 (privacy concerns) |
 | **Logging** | Axiom | latest | Structured logs, fast queries, Next.js native integration | Datadog (cost), Papertrail (limited) |
 | **Deployment** | Vercel | latest | Zero-config Next.js, edge network, preview deployments | Fly.io (more config), Railway (less edge) |
@@ -371,8 +371,8 @@ sequenceDiagram
 
 ```
 Node.js:    >= 22.x LTS  (required for native fetch, ESM stability)
-pnpm:       9.x          (workspace protocol support)
-TypeScript: 5.7+         (const type parameters, inferred type predicates, `erasableSyntaxOnly`)
+pnpm:       9.15.4       (workspace protocol support; ≥9.0.0 floor)
+TypeScript: ^5.9.0       (const type parameters, inferred type predicates, `erasableSyntaxOnly`, `verbatimModuleSyntax`)
 ```
 
 ---
@@ -1473,7 +1473,18 @@ sequenceDiagram
 // apps/web/app/api/schedule/stream/route.ts
 
 export const runtime = 'nodejs';
-export const dynamic = 'force-dynamic';
+// ⚠️ Do NOT set `export const dynamic = 'force-dynamic'` — incompatible with `cacheComponents: true` (build error per Next.js 16). Route handlers that read `req.url` or stream are dynamic by default.
+
+// ⚠️ Critical (audit-verified): Vercel serverless functions have a default timeout
+// (10s Hobby, 15s Pro default) that will silently terminate this SSE stream.
+// The stream polls every 10s indefinitely, so it WILL hit the default timeout.
+// As of June 2026, Vercel allows up to 30 minutes (1800s) on Pro/Enterprise,
+// but this requires BOTH `maxDuration` AND enabling Fluid Compute in project settings.
+// Source: PAD_audit_report-1.md §"SSE on Vercel" + PAD_audit_report-2.md §A.
+export const maxDuration = 300;  // 5 minutes — balances live-seat freshness vs connection cost
+// For longer sessions, increase to 1800 (30 min) and ensure Fluid Compute is enabled.
+// The client-side EventSource auto-reconnects on disconnect (ADR-006), so brief
+// staleness during reconnection is acceptable.
 
 export async function GET(req: Request) {
   const { searchParams } = new URL(req.url);
@@ -1650,11 +1661,12 @@ Solution: Idempotency via PaymentEvent table + advisory lock.
 Webhook Handler Flow:
 1. Verify Stripe signature (stripe.webhooks.constructEvent)
 2. Check payment_events table for stripe_event_id → if exists, return 200 (already processed)
-3. Acquire pg_advisory_lock(hash(event.id)) → prevents concurrent processing of same event
+3. Acquire `pg_advisory_xact_lock(hash(event.id))` → prevents concurrent processing of same event (transaction-scoped — auto-releases at COMMIT/ROLLBACK; **do NOT use session-scoped `pg_advisory_lock`** which breaks under Neon's PgBouncer transaction pooling and can leak)
 4. Process event (update subscription status, provision credits, etc.)
-5. Insert payment_events record with status = 'processed'
-6. Release lock
-7. Return 200
+5. Insert payment_events record with status = 'processed' — lock auto-releases at transaction COMMIT
+6. Return 200
+
+> ⚠️ **Critical (audit-verified):** The original draft of this section specified `pg_advisory_lock()` (session-scoped). Under Neon's managed PgBouncer (transaction pooling mode, the default), session-scoped locks are NOT guaranteed to release on the same backend that acquired them — this causes lock leaks and pool exhaustion. The booking flow (§4.2) correctly uses `pg_advisory_xact_lock()`; the webhook handler MUST use the same. Source: `PAD_audit_report-1.md` §"Advisory Lock Inconsistency" + `PAD_audit_report-2.md` §B + Neon FAQ on built-in connection pooling.
 
 Events Handled:
   customer.subscription.created      → Create MemberSubscription record
@@ -1717,8 +1729,8 @@ All emails share:
 
 ### 17.1 Job Catalog
 
-| Job ID | Trigger | Timeout | Retries | Description |
-|--------|---------|---------|---------|-------------|
+| Job ID | Trigger | Target CPU Budget | Retries | Description |
+|--------|---------|-------------------|---------|-------------|
 | `booking-confirmation` | Booking mutation | 30s | 3 | Send confirmation email |
 | `class-reminder-24h` | Scheduled (24h before session) | 30s | 3 | Reminder email + push |
 | `class-reminder-1h` | Scheduled (1h before session) | 30s | 3 | Final reminder |
@@ -1731,17 +1743,23 @@ All emails share:
 | `weekly-digest` | Cron: Sunday 09:00 local | 120s | 2 | Weekly schedule digest |
 | `attendance-summary` | Cron: Daily 23:00 | 60s | 2 | Mark no-shows, update stats |
 
+> ⚠️ **Critical (audit-verified):** The column is labeled "Target CPU Budget" (not "Timeout") because Trigger.dev's `maxDuration` measures **active CPU time**, NOT wall-clock time — time spent waiting on `triggerAndWait` or `wait.for` calls is excluded. Source: `PAD_audit_report-1.md` §"Trigger.dev Retry Config" + `PAD_audit_report-2.md` §C + Trigger.dev docs on max-duration. The `maxDuration` MUST be set in `trigger.config.ts` below (or per-task); if unset, tasks run indefinitely.
+
 ### 17.2 Trigger.dev Configuration
 
 ```typescript
 // services/workers/trigger.config.ts
 
-import { defineConfig } from '@trigger.dev/sdk/v3';
+import { defineConfig } from '@trigger.dev/sdk/v4';  // v4 — v3 deploys stop working April 1, 2026
 
 export default defineConfig({
   project: 'stillwater-prod',
   runtime: 'node',
   logLevel: 'info',
+  // ⚠️ maxDuration measures ACTIVE CPU TIME, not wall-clock time.
+  // Time spent on triggerAndWait / wait.for is excluded.
+  // Source: PAD_audit_report-1.md §"Trigger.dev Retry Config".
+  maxDuration: 120,  // 120s CPU budget — covers the longest job (weekly-digest)
   retries: {
     enabledInDev: false,
     default: {
@@ -2137,42 +2155,56 @@ const getMockSession = (overrides?: Partial<ClassSession>): ClassSession => ({
 
 The Stillwater platform targets **WCAG 2.2 Level AAA** compliance. This is non-negotiable for the yoga studio demographic (35–65 years, high representation of users with visual impairments, motor limitations, and cognitive considerations).
 
-### 22.2 Implementation Standards
-
-```
-COLOR CONTRAST:
-  Normal text (< 18pt):    Minimum 7:1 ratio (AAA)
-  Large text (≥ 18pt):     Minimum 4.5:1 ratio (AAA)
-  Interactive elements:    Minimum 3:1 for UI component boundaries
-  Measurement tool:        https://webaim.org/resources/contrastchecker/
-
-KEYBOARD NAVIGATION:
-  ✓ All interactive elements reachable via Tab
-  ✓ Logical tab order matches visual order
-  ✓ Visible focus indicator on ALL elements (2px solid --color-clay-400)
-  ✓ No keyboard traps
-  ✓ Skip-to-main-content link as first element
-  ✓ Modal focus trapping via Radix Dialog (built-in)
-
-SCREEN READER:
-  ✓ Semantic HTML5 elements (nav, main, article, section, aside)
-  ✓ All images have descriptive alt text (or alt="" for decorative)
-  ✓ Form inputs have associated <label> elements
-  ✓ Error messages linked to inputs via aria-describedby
-  ✓ Dynamic content changes announced via aria-live regions
-  ✓ Loading states use aria-busy="true"
-  ✓ Icon-only buttons have aria-label
-
-MOTION:
-  ✓ prefers-reduced-motion media query respected globally
-  ✓ Animated content can be paused (WCAG 2.2.2)
-
-COGNITIVE:
-  ✓ Reading level: Grade 8 or below for instructional content
-  ✓ Error messages are specific and actionable ("Please enter a valid email address")
-  ✓ No time limits on user actions without warning + extension option
-  ✓ Consistent navigation across all pages
-```
+### 22.2 Implementation Standards (WCAG 2.2 Level AAA)
+
+Source: `avant-garde-design-v4/references/04-accessibility-checklist.md` §Level AAA Requirements. Stillwater targets WCAG 2.2 Level AAA (not just AA). The table below covers all 9 criteria applicable to web apps, cross-referenced to `stillwater_SKILL.md` §8.1.
+
+| # | WCAG 2.2 AAA Criterion | Requirement | Stillwater Value |
+|---|------------------------|-------------|------------------|
+| 1.4.6 | Contrast (Enhanced) — normal text | 7:1 minimum | All `--color-stone-*` on `--color-sand` verified |
+| 1.4.6 | Contrast (Enhanced) — large text (≥ 18pt) | 4.5:1 minimum | All Cormorant display sizes |
+| 1.4.8 | Visual Presentation | (a) Width ≤ 80 chars; (b) no justified text; (c) line spacing ≥ 1.5 | `--leading-body: 1.65`; `max-width: 70ch`; `text-align: left` (never `justify`) |
+| 1.4.9 | Images of Text (No Exception) | No images of text (logos exempt) | All text is real HTML text |
+| 2.2.4 | Interruptions | User can postpone/suppress | Toast notifications dismissible; no auto-redirects |
+| 2.3.2 | Three Flashes | ≤ 3 flashes/sec | No flashing animations; reduced-motion respected |
+| 2.5.5 | Target Size (Enhanced) | 44×44 CSS px minimum | `min-h-[44px] min-w-[44px]` on all interactive elements |
+| 2.5.7 | Dragging Movements (WCAG 2.2 NEW) | Dragging MUST have click/tap alternative | Booking calendar has click-to-select alternative |
+| 3.1.5 | Reading Level | Lower secondary (≈ Grade 8) | Instructional copy only |
+| 3.1.6 | Pronunciation | Pronunciation for meaning-dependent words | Japanese term 間 (ma) has `<ruby>` annotation |
+| — | Focus indicator (exceeds WCAG) | 3px solid `--color-water-500` + 2px offset | Global `:focus-visible` rule; `--color-clay-300` on dark backgrounds |
+| — | Keyboard navigation | Full tab order, no traps | Radix primitives + custom testing |
+| — | Screen reader | Semantic HTML, ARIA labels | axe-core + Lighthouse A11y = 100 |
+| — | Reduced motion | `0.01ms` durations globally | `@media (prefers-reduced-motion: reduce)` block |
+| — | Time limits | None without warning + extension | No auto-logout, no countdown timers |
+
+**ADA Title II compliance:** As of April 24, 2026, ADA Title II requires WCAG 2.1 AA for state/local government websites. Stillwater targets AAA (stricter), so AA is implicit. Non-compliance risk: legal action, financial penalties, reputation damage.
+
+**Keyboard Navigation Detail:**
+- ✓ All interactive elements reachable via Tab
+- ✓ Logical tab order matches visual order
+- ✓ Visible focus indicator on ALL elements (3px solid `--color-water-500` + 2px offset)
+- ✓ No keyboard traps
+- ✓ Skip-to-main-content link as first element
+- ✓ Modal focus trapping via Radix Dialog (built-in)
+
+**Screen Reader Detail:**
+- ✓ Semantic HTML5 elements (nav, main, article, section, aside)
+- ✓ All images have descriptive alt text (or alt="" for decorative)
+- ✓ Form inputs have associated `<label>` elements
+- ✓ Error messages linked to inputs via aria-describedby
+- ✓ Dynamic content changes announced via aria-live regions
+- ✓ Loading states use aria-busy="true"
+- ✓ Icon-only buttons have aria-label
+
+**Motion Detail:**
+- ✓ prefers-reduced-motion media query respected globally
+- ✓ Animated content can be paused (WCAG 2.2.2)
+
+**Cognitive Detail:**
+- ✓ Reading level: Grade 8 or below for instructional content
+- ✓ Error messages are specific and actionable ("Please enter a valid email address")
+- ✓ No time limits on user actions without warning + extension option
+- ✓ Consistent navigation across all pages
 
 ### 22.3 Accessibility Testing Process
 
@@ -2799,7 +2831,7 @@ Unknown error                  "Something unexpected happened. We've been
 
 **Context:** Multiple async side effects (emails, waitlist promotion, reminders) cannot run in serverless functions due to timeout constraints.
 
-**Decision:** Trigger.dev v3 (cloud-hosted).
+**Decision:** Trigger.dev v4 (cloud-hosted). v3 is deprecated — new v3 deploys stop working April 1, 2026. v4 reached GA August 2025.
 
 **Rationale:**
 - Durable execution with automatic retries and exponential backoff.

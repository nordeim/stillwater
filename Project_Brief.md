I now have a complete, evidence-backed picture. All three quality gates the docs claim are "green" are actually failing. Let me compile the validation report. 
 
---
 
Validation Report — AGENTS.md / CLAUDE.md / MASTER_EXECUTION_PLAN.md vs. Codebase 
 
Repo: /home/project/stillwater (git working tree clean — committed state = 66a21ad). 
Verdict: The docs are largely aligned on architecture/intent (versions, structure, most gotchas), but their central claim — "all quality gates green (603+ tests passing)" — is false. The committed code fails check-types, lint, and 
test. There are also several doc-internal inconsistencies. 
 
---
 
1. What is accurately aligned ✅ (verified against code) 
 
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────┐ 
│ Claim                                                                                                                                                                                              │ Result                            │ 
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤ 
│ Stack versions (TS 5.9.0, Next 16.2.10, React 19.2.7, Tailwind 4.3.2, tRPC ^11.18.0, Drizzle 0.45.2, Better Auth 1.6.23, Stripe 22.3.0, Zod 4.4.3, @trigger.dev/sdk 4.5.0, pnpm 11.9.0, ESLint     │ ✅ all match in every             │ 
│ 9.39.4)                                                                                                                                                                                            │ package.json                      │ 
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤ 
│ Monorepo layout (apps/{web,studio}, packages/*, services/workers, tooling/*)                                                                                                                       │ ✅ matches                        │ 
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤ 
│ @stillwater/source custom condition in .npmrc + pnpm-workspace.yaml                                                                                                                                │ ✅ present                        │ 
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤ 
│ Gotcha 7 — Stripe '2026-06-24.dahlia' + items.data[0].current_period_end (packages/payments/src/client.ts:52)                                                                                      │ ✅ correct                        │ 
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤ 
│ Gotcha 11 — reactCompiler: true + babel-plugin-react-compiler installed                                                                                                                            │ ✅ correct                        │ 
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤ 
│ Gotcha 13 — machine: "micro" string (trigger.config.ts:68)                                                                                                                                         │ ✅ correct                        │ 
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤ 
│ Gotcha 27 — exports.default → ./src/index.ts + transpilePackages (all 7 pkg)                                                                                                                       │ ✅ correct                        │ 
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤ 
│ Gotcha 56 — workers verbatimModuleSyntax: false; Gotcha 59 — @trigger.dev/sdk in @stillwater/config                                                                                                │ ✅ correct                        │ 
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤ 
│ 10 tRPC routers, 11 Trigger.dev tasks, 13 email templates, 4 migrations (0000–0003)                                                                                                                │ ✅ correct                        │ 
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤ 
│ 84 gotchas present & sequentially numbered in CLAUDE.md                                                                                                                                            │ ✅ correct                        │ 
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────┤ 
│ All 13 phases feature-implemented in code (schema, auth, api, payments, email, workers, 11 admin pages, Sentry/PostHog, a11y SkipLink/SrOnly, landing page)                                        │ ✅ correct                        │ 
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────┘ 
 
---
 
2. CRITICAL — Quality gates are RED, not green ❌ 
 
The docs repeatedly assert green gates (AGENTS.md pre-commit checklist; CLAUDE.md "603+ tests"; MEP "✅ Green (9/9)", "✅ Green (0 errors)"). None of the three holds. 
 
### 2.1 pnpm check-types → 8/9 pass; @stillwater/web FAILS (~20 TS errors) 
 
Real, committed type errors, e.g.: 
- src/lib/analytics/posthog.ts:20 — capture_pageviews does not exist (typo; should be capture_pageview) 
- src/lib/observability/error-boundary.tsx:37,61 — missing override modifier (TS4114) 
- src/components/ui/calendar.tsx:25,56 — react-day-picker API mismatch (caption/IconLeft not in type) 
- src/components/admin/SessionForm.tsx — RHF resolver generic mismatch + durationMinutes missing + instructor .name undefined 
- src/hooks/useScrollReveal.ts, src/lib/a11y/focus-utils.ts, logger.test.ts, schemas.test.ts — nullability/unknown errors 
 
### 2.2 pnpm test → NOT green; 12 failing tests (626 passed / 638 total) 
 
- @stillwater/api — 5 fail: admin.test.ts calls caller.admin.deleteClass(...) / caller.admin.listClasses(...), but adminRouter is a flat router → must be caller.deleteClass(...). Source is correct; the test file is wrong ("No 
  procedure found on path admin,deleteClass"). 
- @stillwater/web — 8 fail: KpiCard.test.tsx ×7 → Invalid Chai property: toBeInTheDocument because apps/web/vitest.config.ts has no setupFiles (jest-dom never registered). logger.test.ts → "cannot be imported from a Client Component"  
  (the Gotcha-20 server-only mock is missing from web's test setup). 
 
### 2.3 pnpm lint → 1/2 pass; @stillwater/web FAILS (276 errors, 11 warnings) 
 
Only services/workers lints clean. Web has 276 errors (mostly import/order and @typescript-eslint/dot-notation, 188 auto-fixable). 
 
│ Conclusion: "all green / 603+ passing" is inaccurate. The gates are green only for db, auth, payments, email, workers (and workers lint). web fails all three; api tests also fail. 
 
---
 
3. Doc-internal & doc-vs-doc inconsistencies ⚠ 
 
┌─────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┐ 
│ #   │ Inconsistency                                                                                                                                                         │ Evidence                                                 │ 
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤ 
│ 3.1 │ Table count: Architecture section (AGENTS.md, CLAUDE.md line 24, MEP Doc Control) says 17 tables (14 domain); Phase-status tables say 18; actual schema = 18 (15      │ grep pgTable = 18; CLAUDE.md:600 lists 14 domain (omits  │ 
│     │ domain). The missing one is audit_log.                                                                                                                                │ audit_log)                                               │ 
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤ 
│ 3.2 │ Phase status contradiction: CLAUDE.md Doc Control = "Phase 10–12 pending"; MEP Doc Control = "Phases 0–8 COMPLETE"; MEP §7 = "Phases 9–12 PENDING" — yet MEP Current  │ CLAUDE.md:24, MEP:18, MEP:4343 vs MEP:338 + code         │ 
│     │ Status block AND the actual code show all 13 phases complete.                                                                                                         │                                                          │ 
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤ 
│ 3.3 │ Test-count math: MEP breakdown (109/102/113/43/132/71/33) sums exactly to 603 but uses stale per-package numbers. AGENTS.md (119/139) sums to 616 but is labelled     │ MEP:450, AGENTS.md Phase-status, my run                  │ 
│     │ "603+" — and actual passing is db 117, auth 102, api 113, payments 43, web 147, email 71, workers 33 = 626 (≠ either doc).                                            │                                                          │ 
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤ 
│ 3.4 │ packages/ui contents: AGENTS.md says it holds "Radix components"; actual packages/ui/src has only tokens/, fonts/, globals.css, empty index.ts. The 18 shadcn         │ packages/ui/src/index.ts ("Currently empty"),            │ 
│     │ components (avatar, button, calendar, table, form, input, …) live in apps/web/src/components/ui, not the ui package.                                                  │ apps/web/src/components/ui = 18 files                    │ 
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤ 
│ 3.5 │ Admin pages: docs say 10; actual = 11 (/admin/audit-log is real). Marketing components: docs say 15; actual = 19 source files.                                        │ find …/(admin) page.tsx = 11; components/marketing = 19  │ 
├─────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────┤ 
│ 3.6 │ pnpm build status: AGENTS.md pre-commit checklist claims build must be green; MEP says "not verified". Inconsistent — and it would fail given 2.1.                    │ AGENTS.md checklist vs MEP:361                           │ 
└─────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────┘ 
 
---
 
4. Confirmed current project status 
 
- Feature completeness: ✅ All 13 phases are implemented in code (schema, auth/RBAC, 10 tRPC routers, Stripe, email + 11 workers, 11 admin routes, Sentry/PostHog, a11y, landing page). 
- Repository health: 🔴 RED. check-types 8/9, lint 1/2, test 12 failing. The "603+ green" narrative in all three docs does not reflect the committed state. 
- Doc accuracy: Architecture, versions, structure, and 84 gotchas are trustworthy. The status/claims sections (AGENTS.md "ALL 13 PHASES COMPLETE … all green", CLAUDE.md Doc Control, MEP Doc Control + §7) are stale/contradictory versus 
  both the code and MEP's own Current Status block. 
 
---
 
5. Recommended remediation (plan) 
 
1. Fix web check-types (posthog typo, override modifiers, calendar.tsx day-picker API, SessionForm RHF generics, nullability) — ~20 errors. 
2. Fix web test setup: add setupFiles importing @testing-library/jest-dom, and a vi.mock('server-only', () => ({})) global — resolves 8 web failures. 
3. Fix admin.test.ts: caller.admin.X → caller.X (5 api failures). 
4. Run pnpm lint:fix on web (188 of 276 auto-fixable), then manually review dot-notation/import/order remainders. 
5. Reconcile the docs: set table count to 18 (15 domain) everywhere; update phase-status lines in CLAUDE.md Doc Control + MEP Doc Control/§7 to "0–12 COMPLETE"; refresh the test breakdown to the actual 626-passing counts (or simply    
   state "626 passing / 12 failing" honestly); correct the packages/ui "Radix components" description.


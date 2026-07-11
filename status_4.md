Validation complete. Both gates the doc claims are green are in fact red, and the failures are caused by the doc's own prescribed fixes (Lessons 86 & 88). Here is the meticulous report. 
 
---
 
Validation Report — Last Commit b34380f (stillwater_SKILL.md v2.7.0 → v2.8.0) 
 
Nature of commit: Docs-only. 1 file changed, +213 / −0. No code, tests, or config were touched. The doc documents a prior "post-deploy remediation" that it claims fixed 101 errors (1 TS + 100 ESLint) and left the repo "all green". 
 
### Validation dimensions & results 
 
┌───┬─────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────┐    
│ # │ Dimension                                               │ Method                                                    │ Result                                                                                                    │    
├───┼─────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┤    
│ 1 │ Internal consistency (section/lesson numbering, counts) │ Grep section headers, lesson sequence                     │ ✅ Clean — §15.24, §16.13 added correctly; Lessons 84→88 sequential; §12/§15/§16/Appendix counts coherent │    
├───┼─────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┤    
│ 2 │ Gotcha cross-references (CLAUDE 81–84 / AGENTS 74–77)   │ Compared against AGENTS.md                                │ ✅ All four mappings correct                                                                              │    
├───┼─────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┤    
│ 3 │ External accuracy — code claims vs. actual repo         │ Inspected schema, admin.ts, eslint.config.mjs, worker src │ ⚠ Mixed — 2 of the 4 fixes are actively broken (see below)                                               │    
├───┼─────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────┤    
│ 4 │ "All green" claim                                       │ Ran pnpm check-types + pnpm lint                          │ ❌ FAIL — both gates RED in @stillwater/workers                                                           │    
└───┴─────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────┘    
 
### ✅ Claims that hold 
 
- L85 — payment_events has no amountCents column; amount is in payload jsonb (packages/db/src/schema/payments.ts:25). admin.ts:288 correctly uses (${paymentEvents.payload}->>'amount_received')::bigint. ✅ 
- L87 — Both ESLint overrides exist in services/workers/eslint.config.mjs; as any present in exactly 9 source files (matches "9 worker source files"); no per-line eslint-disable comments remain. ✅ 
- Import/order — blank line after @trigger.dev/sdk import present in all 11 source files. ✅ 
 
### ❌ Two blocking defects — caused by the doc's OWN prescribed fixes 
 
Defect A — pnpm check-types fails (2× TS2769) — tied to Lesson 88 
- services/workers/src/attendance-summary.ts:30 and membership-credit-grant.ts:27. 
- Lesson 88 prescribes "remove async: run: () => instead of run: async () =>." But Trigger.dev task() overloads require run to return Promise<unknown> (error: "missing the following properties from type 'Promise<unknown>': then, 
  catch, finally"). Removing async makes it return a plain object → type error. 
- Correct fix (not in doc): keep a Promise return without the async keyword → run: () => Promise.resolve({...}). This satisfies the type AND avoids require-await. The doc's literal prescription is wrong and breaks check-types. 
 
Defect B — pnpm lint crashes — tied to Lesson 86 
- Error: Error while loading rule '@typescript-eslint/await-thenable': You have used a rule which requires type information, but don't have parserOptions set to generate type information on attendance-summary.test.ts. 
- Root cause: shared config tooling/eslint/index.js:45 sets parserOptions.projectService: true globally and :70 enables the typed rule await-thenable. Lesson 86's override sets projectService: false for *.test.ts — which strips the    
  type info that typed rules need → ESLint aborts the entire run. 
- Correct fix (not in doc): don't disable type info. Give test files a type-aware context via a dedicated tsconfig.eslint.json (includes src/**/*.test.ts) referenced by parserOptions.projectService: true (+ project), keeping the main  
  tsconfig.json test-excluded for tsc. Lesson 86's projectService: false prescription is insufficient/wrong. 
 
### Minor observations (non-blocking) 
 
- Appendix C count nuance: v2.8.0 row says import/order fixed in "9 worker files"; all 11 source files now carry the blank line. Current state is correct/complete; the historical "9" likely undercounts. 
- Appendix C ordering: jumps v2.8.0 → v2.4.0 (skips v2.5–2.7). Pre-existing (this commit only appended the top entry), not introduced here. 
 
---
 
Verdict 
 
The commit's documentation is inaccurate. It asserts the codebase is green and that Lessons 86 & 88 are validated fixes. In reality: 
1. pnpm check-types and pnpm lint are both red in @stillwater/workers. 
2. The red state is directly produced by the fixes the doc prescribes (remove-async, projectService: false). 
3. This aligns with the doc's own admission that the remediation was committed "without running full quality gates (OOM)." — the gates were never actually green. 
 
Remediation plan (for your approval — broader than the docs commit) 
 
1. Fix attendance-summary.ts + membership-credit-grant.ts → run: () => Promise.resolve({...}) (resolves Defect A). 
2. Fix services/workers/eslint.config.mjs → replace the projectService: false test-file override with a typed-info context (dedicated tsconfig.eslint.json + projectService: true), resolving Defect B. 
3. Re-run pnpm check-types + pnpm lint → confirm workers green. 
4. Correct the doc (stillwater_SKILL.md) → Lessons 86 & 88 to prescribe the working fixes, and soften the "all 101 resolved / all green" claim (it introduced 2 new TS errors + broke lint). 
5. Re-run full pre-commit gates (check-types, lint, test, build) across all 13 packages to confirm no other package is red. 
 
I have not modified any code — these changes exceed the docs commit's scope and need your go-ahead per the validate-checkpoint.

---

Also let me note: the final eslint.config.mjs state has: 
- projectService: { allowDefaultProject: ['src/*.test.ts', 'vitest.config.ts'], defaultProject: './tsconfig.eslint.json', maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20 } 
- 3 overrides: parserOptions (projectService), test-file unsafe-* rules, source-file any-cast rules 
- The standalone tsconfig.eslint.json file extends tsconfig.json and includes test files 
- vitest.config.ts import order fixed (builtin before external) 
 
This is the correct, working final state. 
 
Now let me write the final deliverable. I should be concise but complete. Summary: 
1. What the commit did (docs-only SKILL.md v2.8.0). 
2. Validation findings: doc incorrectly prescribed projectService: false and remove async — both BROKE quality gates. 
3. Remediation applied: 4 phase fix (2 code + 1 config + 2 import-order + doc corrections). 
4. Final state: workers gates GREEN; broader "all green" was already false for web (pre-existing, unrelated). 
5. Files changed list. 
 
Let me write this. 

The 188 web errors are pre-existing (my changes touched only services/workers/ — source, config, a new tsconfig file — plus two .md docs). The @stillwater/web lint is outside scope of this commit and this task. 
 
Let me write the final deliverable. 
 
---
 
Final Delivery — Commit b34380f Validation + Remediation 
 
### What was validated 
 
The commit was a docs-only update to stillwater_SKILL.md v2.7.0 → v2.8.0 (+213/−0, no code). It documented a "post-deploy remediation" that it claimed fixed 101 errors and left the repo "all green." 
 
### What the validation found 
 
The doc's central claim was false — two of its prescribed fixes were actively broken: 
 
┌───────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ Doc prescription                      │ What it breaks                                                                       │ Root cause                                                                                              │ 
├───────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Lesson 86: projectService: false for  │ lint crashes — await-thenable/no-floating-promises/no-misused-promises/require-await │ projectService: false strips type info → typed rules crash. Correct fix: projectService: {              │ 
│ test files                            │  are typed rules that require type info                                              │ allowDefaultProject: [...], defaultProject: './tsconfig.eslint.json' }                                  │ 
├───────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ Lesson 88: remove async → run: () =>  │ check-types fails — task() overloads require run() to return Promise<unknown>        │ Removing async returns a plain object. Correct fix: run: () => Promise.resolve({...})                   │ 
│ for no-op stubs                       │                                                                                      │                                                                                                         │ 
└───────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
### Files changed (code fixes) 
 
┌───────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ File                                          │ Change                                                                                                                                                                                 │ 
├───────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ services/workers/src/attendance-summary.ts    │ return Promise.resolve({...}) instead of plain object                                                                                                                                  │ 
├───────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ services/workers/src/membership-credit-grant. │ return Promise.resolve({...}) instead of plain object                                                                                                                                  │ 
│ ts                                            │                                                                                                                                                                                        │ 
├───────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ services/workers/eslint.config.mjs            │ projectService: { allowDefaultProject: ['src/*.test.ts', ...], defaultProject: './tsconfig.eslint.json', maximumDefaultProjectFileMatchCount...: 20 } + test-file                      │ 
│                                               │ no-unsafe-assignment/no-unsafe-argument override                                                                                                                                       │ 
├───────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ services/workers/vitest.config.ts             │ Fixed import/order — builtin node:path before external vitest/config                                                                                                                   │ 
├───────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ services/workers/tsconfig.eslint.json         │ New file — extends tsconfig.json, re-includes test files (used as defaultProject)                                                                                                      │ 
└───────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
### Files changed (doc corrections) 
 
┌─────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ File                │ Changes                                                                                                                                                                                                          │ 
├─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ stillwater_SKILL.md │ Lessons 86/88 corrected to prescribe working fixes; §15.24.2/§15.24.4 patterns/code examples fixed; §16.13 async anti-pattern fix corrected; Appendix C v2.8.0 — 2 fix rows corrected, softened "all green"      │ 
│                     │ summary to note quality gates weren't run                                                                                                                                                                        │ 
├─────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ AGENTS.md           │ Gotchas 75 & 77 corrected to match working fixes; "all green" Phase-status line softened                                                                                                                         │ 
└─────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
### Final gate status — @stillwater/workers 
 
┌────────────────────────────┬──────────────────────────────────┐ 
│ Gate                       │ Result                           │ 
├────────────────────────────┼──────────────────────────────────┤ 
│ check-types (tsc --noEmit) │ ✅ exit 0                        │ 
├────────────────────────────┼──────────────────────────────────┤ 
│ lint (eslint .)            │ ✅ exit 0 — 0 errors, 0 warnings │ 
├────────────────────────────┼──────────────────────────────────┤ 
│ test (vitest run)          │ ✅ 33/33 passed (11 files)       │ 
└────────────────────────────┴──────────────────────────────────┘ 
 
### Broader state 
 
@stillwater/web has 188 pre-existing lint errors (unrelated — no web files were touched). The doc's broader "all green" claim was incorrect for the whole monorepo even before this commit. The workers package — the focus of the 
commit's documentation — is now green. 

---

Sync Complete — All Three Docs Updated 
 
### Documents synced 
 
┌─────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ Doc                         │ Sections corrected                                                                         │ Stale content removed                                                                                       │ 
├─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ stillwater_SKILL.md (5      │ Lesson 86 + fix-refs, §15.24.2, §15.24 key takeaway, §16.13 projectService anti-pattern,   │ projectService: false prescription in §16.13; incomplete allowDefaultProject-only code/prose → full working │ 
│ edits)                      │ Appendix C v2.8.0 row                                                                      │ config                                                                                                      │ 
├─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ CLAUDE.md (4 edits)         │ Gotcha 82 (full rewrite), Gotcha 84 fix #1, troubleshooting table rows 1809 + 1811         │ projectService: false → allowDefaultProject + defaultProject + maxCount + tsconfig.eslint.json; remove      │ 
│                             │                                                                                            │ async → Promise.resolve(...)                                                                                │ 
├─────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ AGENTS.md (1 edit)          │ Gotcha 75 expanded                                                                         │ Incomplete allowDefaultProject-only → full components                                                       │ 
└─────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
### Final-state consistency — the working fix now documented as 
 
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────┐ 
│ Component                                                                                                                                                            │ Documented in                                              │ 
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤ 
│ projectService: { allowDefaultProject: ['src/*.test.ts', 'vitest.config.ts'], defaultProject: './tsconfig.eslint.json', maximumDefaultProjectFileMatchCount...: 20 } │ SKILL.md L86/§15.24.2, CLAUDE.md G82, AGENTS.md G75        │ 
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤ 
│ services/workers/tsconfig.eslint.json (NEW file — extends tsconfig, includes tests)                                                                                  │ All three docs                                             │ 
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤ 
│ ESLint override: no-unsafe-assignment/no-unsafe-argument off for src/**/*.test.ts                                                                                    │ All three docs                                             │ 
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤ 
│ vitest.config.ts import order fix (node:path before vitest/config)                                                                                                   │ All three docs                                             │ 
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤ 
│ return Promise.resolve({...}) without async for Trigger.dev no-op stubs                                                                                              │ SKILL.md L88/§15.24.4/§16.13, CLAUDE.md G84, AGENTS.md G77 │ 
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤ 
│ String(diffMin) for template-literals (was already correct)                                                                                                          │ All three docs ✓                                           │ 
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────┘ 
 
### Verification 
 
- No stale projectService: false prescriptions remain in any gotcha/lesson/pattern/anti-pattern section 
- No stale remove async as fix remains 
- Gates: workers check-types / lint / test all remain green (this round was docs-only, no code changed)

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


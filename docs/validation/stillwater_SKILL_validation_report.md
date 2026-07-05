# Stillwater SKILL.md — Independent Validation Report

**Date:** 2026-07-05
**Validator:** Independent review (Frontend Architect & Avant-Garde UI Designer persona)
**Target:** `/home/z/my-project/stillwater/stillwater_SKILL.md` (v1.2.0, 5,015 lines)
**Reference Catalog:** `/home/z/my-project/stillwater/skills/skills-catalog.md` (141 skills, 10 categories)
**Meta-Skill Standard:** `skills/to-distill-project-into-skill/SKILL.md` (Six-Phase Distillation Process)
**Prior Report:** `stillwater_SKILL_VALIDATION_REPORT.md` (v1.0.0, 3972 lines, 92/100 fidelity score)

---

## Executive Summary

The `stillwater_SKILL.md` is an **ambitious, structurally complete** distillation that faithfully follows the 20-section + 4-appendix template prescribed by the `to-distill-project-into-skill` meta-skill. Section structure, color tokens, the Iron Law, the Six-Axis Review, the OKLCH citation, and the proxy.ts migration claim are all verified accurate against their source skills and the actual codebase.

However, this independent validation — performed against the **current** 5,015-line file (the prior report audited a 3,972-line version) and the **actual `package.json` / `tsconfig.json` / `env.ts` files** — surfaces **4 Critical (P0)** and **2 High (P1)** findings that the prior report missed entirely. The root cause is the same one the document itself acknowledges in its header: it is explicitly **"forward-looking — they describe the conventions the codebase WILL enforce, not the state of the repo today."** That admission is a direct violation of the meta-skill's anti-pattern against speculative future work, and it propagates into concrete factual errors that will mislead any agent who treats the SKILL.md as a source of truth.

**Revised Fidelity Score: 78/100** — down from the prior report's 92/100, primarily because the prior report did not verify version claims against `package.json` and did not catch the env-var count error or the source-skill count contradiction.

**Bottom line:** The document is structurally excellent and aesthetically rigorous, but **cannot be trusted as a factual source of truth** until the P0 version/count mismatches are either (a) reconciled with the actual codebase, or (b) explicitly re-framed as a migration target with a clear "NOT YET ENFORCED" stamp on every forward-looking claim.

---

## Methodology

This validation followed the meta-skill's own Phase 5 VERIFY checklist, applied rigorously:

1. **Structural completeness** — Verified all 20 core sections + 4 appendices exist and the Table of Contents matches headings.
2. **Source-skill citation accuracy** — For every explicit citation of the form `(from \`source-skill\`)` or `(per source \`source-skill\` §X.Y)`, opened the cited source skill file and verified that (a) the cited section exists and (b) its content substantively matches the SKILL.md's claim.
3. **Version-pin verification** — Read every `package.json` in the monorepo (`apps/web`, `packages/db`, `packages/auth`, root) and compared against the §2.1 "Locked Versions" table.
4. **Env-var count verification** — Read the full `packages/config/src/env.ts` Zod schema and counted actual vars.
5. **TypeScript strict-flag verification** — Read `tooling/typescript/base.json` and compared against §2.1's claimed flags.
6. **Color-token verification** — Read `packages/ui/src/tokens/colors.css` and compared every hex in §19 against the actual definition.
7. **File-existence verification** — Confirmed `apps/web/proxy.ts` exists, no `middleware.ts` exists, and the three `verification-and-review-protocol/references/*.md` files exist.
8. **Internal consistency** — Grepped for the document's own claims about how many source skills it distills from, and checked the arithmetic.

The prior validation report was read in full and its 12 findings were checked against the current file. Five of its fixes were confirmed applied (§17.4 Container Queries, §11.1.1 Six-Axis, OKLCH note, Iron Law enhancement, `outline-hidden` migration); three of its "low-priority remaining" items were confirmed still open.

---

## Findings

### P0 — Critical (factual errors that will mislead agents)

#### Finding #1 — Zod version mismatch (CRITICAL)

**Location:** SKILL.md §2.1 (line 152)
**Claim:** `Zod | ^4.4.0 | Env module, Server Action inputs, tRPC procedure inputs; Zod v4 .url() accepts any scheme → compose with .refine() for protocol restriction; enum errors use { message } not { errorMap }`

**Actual:**
- `apps/web/package.json` line 50: `"zod": "^3.24.1"`
- `packages/db/package.json` line 23: `"zod": "^3.24.1"`
- `packages/auth/package.json` line 18: `"zod": "^3.24.1"`

**Evidence the code is genuinely Zod v3:** `packages/config/src/env.ts` line 75 uses `z.ZodIssueCode.custom` — this API was removed in Zod v4 (replaced with `z.core.$ZodIssueCode` and a different issue-shape contract). If the project were actually on Zod v4, this code would not type-check.

**Impact:** Any agent reading §2.1 will write Zod v4 idioms (e.g., `z.url()` accepting any scheme, `{ message }` for enum errors) that either don't compile under v3 or behave differently. The "Zod v4 `.url()` accepts any scheme" guidance is actively misleading — it describes a v4 behavior the codebase doesn't have.

**Severity:** P0 — the document gives wrong API guidance for the validation library that gates every boundary.

**Fix:** Either (a) downgrade the §2.1 row to `Zod | ^3.24.1` and rewrite the "Critical Note" to describe v3 behavior, or (b) actually upgrade the codebase to Zod v4 (`pnpm -r add zod@^4`) and verify `env.ts` compiles, then keep the §2.1 row as-is.

---

#### Finding #2 — Stripe version mismatch (CRITICAL — 5-major-version gap)

**Location:** SKILL.md §2.1 (line 150)
**Claim:** `Stripe | ^22.3.0 | "Basil" API (2025-03-31) — current_period_end moved to items.data[0].current_period_end; SDK v22+ uses camelCase (currentPeriodEnd); ...`

**Actual:** `apps/web/package.json` line 42: `"stripe": "^17.6.0"`

**Impact:** The SKILL.md describes Stripe v22 API surface (`items.data[0].current_period_end`, camelCase `currentPeriodEnd`) that does not exist in the v17 SDK currently pinned. Any agent implementing Stripe webhook handlers per §15.2 ("Idempotent Stripe Webhook Handler") and §9.4 ("Stripe Webhook Anti-Patterns") will write code that either doesn't compile against v17 or accesses properties that don't exist. This is a 5-major-version gap — Stripe's v18, v19, v20, v21, and v22 releases each introduced breaking changes.

**Severity:** P0 — payment-handling code is the highest-stakes surface in the project.

**Fix:** Same pattern as Finding #1 — either align the §2.1 row to `^17.6.0` and rewrite the "Critical Note" to describe v17 API, or upgrade the SDK to `^22.3.0` and verify every Stripe-touching file compiles.

---

#### Finding #3 — Environment variable count is wrong (34 actual, not 25)

**Location:** SKILL.md §3.3 (line 251) and §20.5 (line 4576)
**Claim:** "Environment Variables (25 total)" / "Env Schema (25 vars)"

**Actual count from `packages/config/src/env.ts`:**

| Group | Count | Vars |
|---|---|---|
| Server — Database | 2 | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` |
| Server — Auth | 4 | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Server — Stripe | 2 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Server — Sanity | 2 | `SANITY_API_TOKEN`, `SANITY_WEBHOOK_SECRET` |
| Server — Email | 2 | `RESEND_API_KEY`, `EMAIL_FROM` |
| Server — Jobs | 1 | `TRIGGER_SECRET_KEY` |
| Server — Redis | 2 | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Server — Observability | 4 | `SENTRY_DSN` (optional), `SENTRY_AUTH_TOKEN`, `AXIOM_TOKEN`, `AXIOM_DATASET` |
| Server — Cloudflare | 6 | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_IMAGES_TOKEN`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_ENDPOINT` |
| Server — App | 1 | `NODE_ENV` (default) |
| Client | 8 | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SENTRY_DSN` (optional), `NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL` |
| **Total** | **34** | |

The §3.3 table lists 20 vars explicitly, then says "Plus 5 Sentry/PostHog/Axiom/Cloudflare vars (mostly `optional()` with build-context fallback)." That "5" is wrong — the actual count of omitted vars is **14**: 4 observability (Sentry ×2, Axiom ×2) + 6 Cloudflare server + 2 PostHog client + 1 Sentry client + 1 Cloudflare Images client.

**Impact:** An agent bootstrapping the environment from §3.3 will miss 14 env vars. Six of those (the Cloudflare R2 set) are required for the §15.4 "Server-Side URL Signing (Cloudflare Images)" pattern and the §15.6 "Infrastructure Client with Null Fallback" pattern — both of which the SKILL.md itself documents.

**Severity:** P0 — env-var completeness is a bootstrap-blocking issue.

**Fix:** Replace the "Plus 5 ..." line with the full 14-row table, or restructure §3.3 to list all 34 vars. Update §20.5's "25 vars" to "34 vars".

---

#### Finding #4 — TypeScript strict flags misclaimed (compiler does NOT forbid enum/namespace)

**Location:** SKILL.md §2.1 (line 146)
**Claim:** `TypeScript | ^5.9.0 | strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, useUnknownInCatchVariables, verbatimModuleSyntax: true (requires import type for type-only imports), erasableSyntaxOnly: true (FORBIDS enum and namespace — use string unions or Drizzle pgEnum())`

**Actual (`tooling/typescript/base.json`):**
```json
"strict": true,
"noUncheckedIndexedAccess": true,
"noImplicitOverride": true,
"noImplicitReturns": true,
"noFallthroughCasesInSwitch": true,
"exactOptionalPropertyTypes": true,
"useUnknownInCatchVariables": true
```

**Missing from actual config:** `verbatimModuleSyntax`, `erasableSyntaxOnly`
**Present in actual config but unmentioned in SKILL.md:** `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`

**Knock-on effect on §9.2 and §13.2:** Both sections assert that `enum` and `namespace` are "FORBIDDEN" — but without `erasableSyntaxOnly: true` in the tsconfig, the TypeScript compiler will happily accept `enum` and `namespace` declarations. They are forbidden **by convention** in this codebase, not **by the compiler**. An agent reading §9.2 will believe the compiler rejects enums; an agent running `tsc` will discover it doesn't.

Additionally, the version claim `^5.9.0` doesn't match the actual `^5.7.3` pinned in root `package.json` and every workspace `package.json`. `erasableSyntaxOnly` was added in TypeScript 5.8, so even if the flag were added to `base.json`, the pinned `^5.7.3` compiler would reject the option as unknown.

**Severity:** P0 — agents will write code believing compiler enforcement exists when it doesn't, and will be unable to enable `erasableSyntaxOnly` without first upgrading TypeScript.

**Fix:** Either (a) add `verbatimModuleSyntax` and `erasableSyntaxOnly` to `tooling/typescript/base.json` AND upgrade TypeScript to `^5.9.0` in every `package.json`, then keep §2.1 as-is; or (b) downgrade the §2.1 row to `^5.7.3` and remove the `verbatimModuleSyntax` / `erasableSyntaxOnly` claims, and soften §9.2/§13.2 to "enum and namespace are forbidden by convention — enforce via ESLint rule `@typescript-eslint/no-enum` and review".

---

### P1 — High (internal inconsistencies that undermine credibility)

#### Finding #5 — Source-skill count contradicts itself three ways

**Three conflicting claims in the same document:**

| Location | Text | Claimed count |
|---|---|---|
| Frontmatter (line 6) | "Distills ... from 25+ source skills" | 25+ |
| §12 preamble (line 2642) | "distilled from the 12 source skills and the 35 reconciled discrepancies" | 12 |
| Closing line (line 5015) | "distilling knowledge from 12 source skills (4 Next.js 16 stack + 4 frontend design + 4 TDD/code quality + 5 cross-referenced)" | 12 (but 4+4+4+5 = 17) |

**Actual distinct skills explicitly cited (verified by grep):** 21

The arithmetic in the closing line is wrong on its face: 4 + 4 + 4 + 5 = 17, not 12. And none of the three numbers (12, 17, 25+) agree with the actual citation count (21).

**Impact:** An agent trying to audit "are all 12 source skills reflected?" has no reliable list to audit against. The meta-skill's §4 VALIDATE checklist requires "Every claim must be verifiable" — this claim is not.

**Severity:** P1 — credibility erosion, not a runtime defect.

**Fix:** Pick one number, make the arithmetic consistent, and list the 21 cited skills explicitly in an appendix. Recommended framing: "distills from 21 source skills (5 Next.js 16 stack + 4 frontend design + 4 TDD/code quality + 4 review/verification + 4 cross-referenced)".

---

#### Finding #6 — "Forward-looking" framing violates the meta-skill's anti-pattern against speculative content

**Location:** SKILL.md header (line 20)
**Text:** "Status: v1.0.0 — Phase 0 (scaffold) ready; Phases 1–12 pending per `MASTER_EXECUTION_PLAN.md`. Patterns captured here are forward-looking — they describe the conventions the codebase WILL enforce, not the state of the repo today."

**Meta-skill rule violated:** `to-distill-project-into-skill/SKILL.md` §5.1 explicitly lists "Speculative future work — 'We might switch to X' — not useful" as an anti-pattern. §4 IMPLEMENT requires "Include exact versions, not ranges" and "Every claim must be verifiable by reading a specific file or running a specific command." §5.2 adds: "Don't copy from old docs without re-verifying — code drifts."

**Why this matters:** Findings #1, #2, and #4 are all symptoms of this root cause. The SKILL.md describes Zod v4, Stripe v22, and TypeScript 5.9 because those are the versions the project *plans to use*, not the versions currently pinned. An agent who treats the SKILL.md as a source of truth will write code against APIs that don't exist yet.

**Counter-argument considered:** The meta-skill's §1.1 does list "Version bump — Major dependency upgrade that changes patterns" as a valid trigger for re-distillation. But even in a version-bump scenario, the SKILL.md should describe the **current** state (with the old version) and note the migration plan — not describe the **future** state as if it were current.

**Severity:** P1 — this is the root cause of the P0 findings. Fixing this framing (by either upgrading the codebase or stamping every forward-looking claim) resolves #1, #2, and #4 by transitivity.

**Fix:** Two options:
- **Option A (upgrade the codebase):** Bump Zod to `^4.4.0`, Stripe to `^22.3.0`, TypeScript to `^5.9.0`, add the two missing tsconfig flags. Then the SKILL.md becomes accurate.
- **Option B (re-frame the document):** Keep the codebase as-is. Add a prominent "FORWARD-LOOKING — NOT YET ENFORCED" stamp to every §2.1 row that doesn't match the actual `package.json`. Change the header Status line to: "Phase 0 (scaffold) reflects current `package.json` pins; Phase 1+ migration targets are marked with 🎯."

---

### P2 — Medium (minor version drift / partial accuracy)

#### Finding #7 — Minor version drift across the board

| Layer | SKILL.md §2.1 | Actual `package.json` | Drift |
|---|---|---|---|
| Next.js | `^16.2.0` | `^16.0.0` | 2 minor |
| React | `^19.2.3` | `^19.0.0` | 2 minor |
| TypeScript | `^5.9.0` | `^5.7.3` | 2 minor |
| Tailwind CSS | `^4.1.0` | `^4.0.6` | 1 minor |
| Drizzle ORM | `^0.45.0` | `^0.40.1` (`packages/db`) | 5 minor |

Individually each is a minor drift, but cumulatively an agent installing fresh from §2.1 will get a different lockfile than the repo. The Drizzle drift is the most consequential: SKILL.md §2.1 claims "`db.$count` and relational query API require ≥0.30" — the actual `^0.40.1` satisfies this, but the claim "`^0.45.0`" overstates what's pinned.

**Severity:** P2 — `package.json` ranges will still resolve to compatible versions, but the SKILL.md is not a faithful record of the lockfile.

**Fix:** Either align §2.1 to the actual pinned ranges, or run `pnpm update` to bump the lockfile to match §2.1, then commit the updated `package.json`.

---

#### Finding #8 — Line-number citation slightly off

**Location:** SKILL.md §11.1.2 (line 2276)
**Claim:** "Source: `code-quality-standards/SKILL.md` §Multi-Model Review Pattern lines 220–237."

**Actual:** The `## Multi-Model Review Pattern` heading is at line 220 of `code-quality-standards/SKILL.md`, but the section's content (including the example prompt code block) extends through line 244. The cited range "220–237" truncates the section by 7 lines.

**Severity:** P2 — the heading line is correct, so an agent can still find the section; the range is just slightly narrow.

**Fix:** Update to "lines 220–244".

---

#### Finding #9 — DATABASE_URL validation claim doesn't match the actual code

**Location:** SKILL.md §3.3 table row 1
**Claim:** `DATABASE_URL | Pooled PG connection (app queries) | z.string().url() + custom refine for postgres scheme`

**Actual (`packages/config/src/env.ts` lines 71-73):**
```typescript
DATABASE_URL: z
  .string()
  .refine((s) => s.startsWith('postgres'), 'Must be a postgresql:// URL'),
```

There is no `.url()` call — only `.string().refine(...)`. The refine alone does both the URL-shape check (implicitly, via the `startsWith('postgres')` guard) and the protocol restriction.

**Severity:** P2 — the validation behavior is effectively the same, but the documented API surface (`z.string().url() + custom refine`) doesn't match the actual code (`z.string().refine(...)`). An agent copying the pattern from §3.3 will write slightly different code than what's in `env.ts`.

**Fix:** Change the table row to `z.string().refine(s => s.startsWith('postgres'))` to match the actual implementation.

---

### P3 — Low (cosmetic / editorial)

#### Finding #10 — "#1 cause" editorialization not in source

**Location:** SKILL.md §13.6 (line 2891)
**Text:** "the #1 cause of 'Tailwind classes not applying in production' (per source `nextjs16-react19-tailwind4-auth5-video-gen` §10.4)"

**Source (`nextjs16-react19-tailwind4-auth5-video-gen` §10.4, line 943):** The section is a 5-row table of Visual/Styling issues. "Tailwind classes not applying | Missing `@source` directives" is the **first row**, but the source does not rank rows by frequency — it's an unordered issue→cause→fix table.

**Severity:** P3 — the citation is substantively accurate (the source does list `@source` directives as the cause), but the "#1 cause" framing adds editorial weight the source doesn't claim.

**Fix:** Soften to "a common cause" or "the first-listed cause in `nextjs16-react19-tailwind4-auth5-video-gen` §10.4".

---

#### Finding #11 — `skills-catalog.md` is never referenced

**Location:** Whole document
**Issue:** The SKILL.md cites 21 individual source skills by name but never references `skills/skills-catalog.md`, even though that file is the canonical index of all 141 available skills. An agent who wants to discover additional relevant skills (e.g., `performance-optimization`, `memory-architect`, `loop-builder`) has no pointer from the SKILL.md to the catalog.

**Severity:** P3 — discoverability gap, not an accuracy issue.

**Fix:** Add a one-line reference in §1 or Appendix A: "For the full catalog of 141 available skills, see `skills/skills-catalog.md`."

---

## Verified Accurate (Positive Findings)

These items were checked against their source skills and/or the actual codebase and confirmed correct:

| § | Claim | Source / File Verified Against | Verdict |
|---|---|---|---|
| §4 + §19 | All 30 color tokens (stone/clay/water/sand/status) + 9 semantic aliases | `packages/ui/src/tokens/colors.css` | ✅ 100% hex-accurate |
| §4 | `@theme` block structure + `--radius: 0` override + `--radius-full: 9999px` exception | `apps/web/src/app/globals.css` | ✅ Exact match |
| §5.6 / §9.1 / ADR-009 | `proxy.ts` replaces `middleware.ts`; export `proxy` function; `getSessionCookie()` for cookie-only check | `apps/web/proxy.ts` (exists, 3415 bytes); no `middleware.ts` found | ✅ Verified |
| §11.1.1 | Six-Axis Code Review (Correctness, Readability, Architecture, Security, Performance, Aesthetic/UX Rigor) | `code-quality-standards/SKILL.md` lines 26-120 | ✅ All 6 axes match exactly |
| §11.1.2 | Multi-Model Review Pattern content (Model A writes → Model B reviews → Model A addresses → Human decides) | `code-quality-standards/SKILL.md` lines 220-244 | ✅ Content matches (line range slightly off — see Finding #8) |
| §11.1.2 | `code-reviewer` subagent dispatch with `BASE_SHA` / `HEAD_SHA` / `WHAT_WAS_IMPLEMENTED` / `PLAN_OR_REQUIREMENTS` / `DESCRIPTION` | `verification-and-review-protocol/SKILL.md` lines 100-112 | ✅ Exact match |
| §11.1 / §12 Lesson 13 | Iron Law + Gate Function (`IDENTIFY → RUN → READ → VERIFY → THEN claim`) + Red Flags ("should", "probably", "seems to") | `verification-and-review-protocol/SKILL.md` lines 116-136 | ✅ Exact match |
| Line 502 | OKLCH recommendation cited to `nextjs16-tailwind4` §2.4 + `tailwind-patterns` §7 | `nextjs16-tailwind4/SKILL.md` line 282; `tailwind-patterns/SKILL.md` lines 161-170 | ✅ Both sources say exactly what's claimed |
| §13.6 / line 2891 | `@source` directives required for monorepo Tailwind scanning; cited to `nextjs16-react19-tailwind4-auth5-video-gen` §10.4 | `nextjs16-react19-tailwind4-auth5-video-gen/SKILL.md` lines 941-949 | ✅ Substantively accurate (see Finding #10 for "#1 cause" framing) |
| §17.4 | Container Queries section (added per prior report Finding #6) | `nextjs16-tailwind4` §2.4 + `tailwind-patterns` §3 | ✅ Accurately reflects both sources |
| §3.4 | Env Module Build-Context Fallback pattern (`isBuildContext()` + `PLACEHOLDERS` + `loadEnv()`) | `packages/config/src/env.ts` lines 22-39, 158-178 | ✅ Pattern matches actual code |
| Frontmatter | Better Auth `^1.6.23`, tRPC `^11.0.0`, Turborepo `^2.3.3`, pnpm `9.15.4` | `apps/web/package.json`, `packages/auth/package.json`, root `package.json` | ✅ All four exact |
| §2.2 | Node.js >= 22, pnpm >= 9 | root `package.json` `engines` field | ✅ Exact match |
| Reference files | `verification-and-review-protocol/references/{code-review-reception,requesting-code-review,verification-before-completion}.md` | `ls skills/verification-and-review-protocol/references/` | ✅ All three exist |

---

## Comparison to Prior Validation Report

The prior report (`stillwater_SKILL_VALIDATION_REPORT.md`) scored the document 92/100 and declared it "production-ready." This independent validation revises that score to **78/100** and identifies the prior report's methodology gaps:

| Prior Report Gap | Impact |
|---|---|
| Did not read `apps/web/package.json` to verify version claims | Missed Zod v3/v4, Stripe v17/v22, and 5 minor-version drifts |
| Did not read `packages/config/src/env.ts` to count env vars | Missed the 25-vs-34 count error |
| Did not read `tooling/typescript/base.json` to verify strict flags | Missed the `verbatimModuleSyntax` / `erasableSyntaxOnly` misclaim |
| Did not check arithmetic of "12 source skills (4+4+4+5)" | Missed the 12-vs-17-vs-25+ contradiction |
| Audited a 3,972-line version; file is now 5,015 lines | 1,043 lines of new content went un-audited |
| Used file paths `/home/project/stillwater/...` and `/home/pete/.pi/agent/skills/...` | Different environment — could not open the actual source skill files to verify citations |

The prior report's 12 findings were mostly legitimate (and 5 fixes were confirmed applied in the current file), but its methodology was insufficiently rigorous against the meta-skill's own Phase 5 VERIFY checklist. Specifically, it did not run the "Every version number matches `package.json`" check that the meta-skill explicitly requires.

---

## Recommendations

### Immediate (P0 — fix before any agent relies on this document)

1. **Resolve Finding #6 first** — decide whether the SKILL.md describes the current codebase or a migration target. This decision determines whether Findings #1, #2, #4, and #7 are fixed by (a) editing the SKILL.md to match `package.json` or (b) editing `package.json` to match the SKILL.md.
2. **Fix Finding #3** — replace the "Plus 5 ..." line in §3.3 with the full 14-row table; update §20.5's "25 vars" to "34 vars".
3. **Fix Finding #5** — pick one source-skill count, make the arithmetic consistent, list the 21 cited skills in an appendix.

### Short-term (P1 — fix within the next sprint)

4. **Verify every other §2.1 row** against `package.json` — this validation spot-checked 8 of ~20 rows and found 5 mismatches. The other ~12 rows (React Email, Resend, Sentry, PostHog, Upstash, Sanity, Trigger.dev, Vitest, Playwright, Zod, Turborepo, Radix) need the same check.
5. **Reconcile §9.2 / §13.2** with the actual `tooling/typescript/base.json` — either add the missing flags or soften "FORBIDDEN" to "forbidden by convention".

### Ongoing (P2/P3 — quality-of-life)

6. Update the §11.1.2 line citation from "220–237" to "220–244".
7. Fix the §3.3 DATABASE_URL validation cell to match the actual `z.string().refine(...)` code.
8. Soften the "#1 cause" framing in §13.6.
9. Add a reference to `skills/skills-catalog.md` in §1 or Appendix A.

---

## Validation Matrix (revised)

| § | Section | Source Skills | Fidelity | Notes |
|---|---------|---------------|----------|-------|
| §1 | Project Identity & Design Philosophy | `avant-garde-design-v4`, `code-quality-standards`, `aesthetic` | ✅ Excellent | Anti-Generic Litmus Test faithfully captured |
| §2 | Tech Stack & Environment | `nextjs16-tailwind4`, `nextjs16-react19-tailwind4-full-stack` | ❌ **P0 — 4 version mismatches** | Zod, Stripe, TypeScript, Tailwind, Drizzle all wrong (Findings #1, #2, #4, #7) |
| §3 | Bootstrapping & Configuration | Project-specific | ❌ **P0 — env count wrong** | 25 claimed, 34 actual (Finding #3); DATABASE_URL validation cell wrong (Finding #9) |
| §4 | Design System (Code-First) | `nextjs16-tailwind4`, `tailwind-patterns` | ✅ Excellent | `@theme` block, typography, keyframes all accurate; OKLCH note added |
| §5 | Component Architecture & Patterns | `nextjs16-tailwind4`, `authjs-vs-better-auth` | ✅ Excellent | 5-layer architecture, auth patterns, proxy.ts verified |
| §6 | Custom Hooks Deep Dive | `nextjs16-tailwind4` | ✅ Excellent | SSE hook, useReducedMotion, useScrollProgress |
| §7 | Content Management & Data Ingestion | `nextjs16-react19-postgres17` | ✅ Excellent | Sanity ↔ PostgreSQL boundary clear |
| §8 | Accessibility (WCAG AAA) | `code-quality-standards`, `nextjs16-tailwind4` | ✅ Excellent | Focus rings, skip-to-content, ARIA patterns |
| §9 | Anti-Patterns & Common Bugs | `nextjs16-tailwind4`, `tailwind-patterns` | ⚠️ **P0** | §9.2 enum/namespace "FORBIDDEN" claim is false without `erasableSyntaxOnly` (Finding #4) |
| §10 | Debugging Guide | `debugging-and-error-recovery` | ✅ Excellent | Triage checklists, BOOK/STRIPE patterns |
| §11 | Pre-Ship Checklist | `verification-and-review-protocol`, `code-quality-standards` | ✅ Excellent | Iron Law + Six-Axis + Multi-Model all verified accurate |
| §12 | Lessons Learnt | Cross-referenced | ⚠️ **P1** | Source-skill count contradicts itself (Finding #5) |
| §13 | Pitfalls to Avoid | Multiple | ⚠️ P2/P3 | §13.2 enum claim cascades from Finding #4; §13.6 "#1 cause" framing (Finding #10); §13.6 @source citation accurate |
| §14 | Best Practices | Multiple | ✅ Excellent | Conventions well-organized |
| §15 | Coding Patterns | Multiple | ✅ Excellent | 13 production-grade patterns |
| §16 | Coding Anti-Patterns | Multiple | ✅ Excellent | TypeScript/React/Next/Tailwind/Stripe/Vitest covered |
| §17 | Responsive Breakpoint Reference | `tailwind-patterns` | ✅ Excellent | §17.4 Container Queries now present (prior fix confirmed) |
| §18 | Z-Index Layer Map | `nextjs16-tailwind4` | ✅ Accurate | Token system documented |
| §19 | Color Reference (Complete) | `nextjs16-tailwind4` | ✅ **Perfect** | All 30 hex values + 9 aliases match `colors.css` exactly |
| §20 | TypeScript Interface Reference | `nextjs16-react19-tailwind4-full-stack` | ⚠️ P0 | §20.5 "25 vars" wrong (Finding #3); interfaces themselves are forward-looking but clearly stamped as such |
| App A | ADRs | `authjs-vs-better-auth` | ✅ Excellent | 9 ADRs with rationale; ADR-009 proxy.ts verified |
| App B | Pipeline/Workflow Costs | Project-specific | ✅ Good | Cost estimates reasonable |
| App C | Audit History | Project-specific | ✅ Good | 11 findings documented |
| App D | Post-Deploy Validation | `webapp-testing-journey` | ✅ Good | Smoke test + Checkly |

---

## Conclusion

The `stillwater_SKILL.md` is a **structurally exemplary** document that demonstrates mastery of the `to-distill-project-into-skill` meta-skill's section template. Its design philosophy, anti-pattern catalog, color reference, and verification protocol sections are best-in-class.

However, it currently fails the meta-skill's most fundamental requirement — **"Every claim must be verifiable by reading a specific file or running a specific command"** — because it explicitly describes a future codebase state rather than the current one. This manifests as 4 P0 factual errors (Zod v3/v4, Stripe v17/v22, 25-vs-34 env vars, missing tsconfig flags) that will cause any agent who trusts the document to write code against APIs that don't exist.

**Recommended action:** Treat the document as a **migration target spec**, not a current-state reference. Either (a) upgrade the codebase to match the spec (preferred — the spec describes better choices), or (b) re-stamp every forward-looking claim with a visible "🎯 MIGRATION TARGET — NOT YET ENFORCED" marker so agents know which guidance to defer.

Once the P0 findings are resolved, this document will merit the 92+/100 score the prior report awarded prematurely.

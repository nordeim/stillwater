# Stillwater SKILL.md — Independent Validation Report

**Date:** 2026-07-05
**Validator:** Independent multi-agent validation (4 parallel Explore agents + 1 coordinator)
**Target:** `/home/z/my-project/stillwater/stillwater_SKILL.md` (4,044 lines, 166 KB)
**Sources validated:** 33 source skills across 4 categories (Next.js/React/Tailwind stack; Auth/DB/Stripe/Security; Design/Avant-Garde/UI/A11y; Process/Quality/Testing/Debugging) — sampled from the 142 source skills in `/home/z/my-project/stillwater/skills/`
**Methodology:** Line-level comparison of source `SKILL.md` clauses against corresponding sections of `stillwater_SKILL.md`; reference-file chain following; coverage scan of all 142 source skills; cross-check against prior `stillwater_SKILL_VALIDATION_REPORT.md`.

---

## Executive Summary

**Independent verdict: NOT YET a faithful, high-fidelity representation.**

The prior validation report (`stillwater_SKILL_VALIDATION_REPORT.md`) scored the document **95/100** and declared it "production-ready". My independent line-level validation across a 33-skill sample (vs the prior report's 12) found the actual fidelity to be **~60–65% on average across sampled source skills**, with **11 must-fix defects (P0)**, **27 should-fix gaps (P1)**, and **broad coverage gaps** that the prior report did not detect.

The document is **strong on structural ambition** (24 thematic sections, 9 ADRs, 8 CI gates, 15 lessons) but **structurally inconsistent in execution**: it contains internal contradictions, fabricated facts, draft thinking left in the final doc, pervasive downward version drift, and silent omissions of critical clauses from the very source skills it claims to distill.

An AI coding agent reading `stillwater_SKILL.md` as a single source of truth will receive **substantially accurate guidance on the Anti-Generic design philosophy, the 8 CI gates, the Iron Law, and Better Auth's primary API surface**, but will receive **contradictory guidance on Stripe SDK versions and auth guard function names**, **factually wrong guidance on JetBrains Mono licensing**, **missing guidance on OWASP Top 10, XSS prevention, security headers, rate-limit strategy, TDD Three Laws, the Beyonce Rule, Multi-Model Review, `use(promise)`, the Stripe Basil API shape change, and 5 of 6 WCAG 2.2 AAA criteria**, and **inconsistent guidance on the 5-layer architecture, focus-ring color, and self-hosted font wiring**.

**Recommended action:** Apply the 11 P0 fixes before treating `stillwater_SKILL.md` as authoritative. Then work through the 27 P1 gaps. Re-validate after each batch.

---

## Methodology

This validation used the **Meticulous Approach**: ANALYZE → PLAN → VALIDATE → IMPLEMENT → VERIFY → DELIVER.

1. **Source indexing** — enumerated all 142 `skills/*/SKILL.md` files and their reference-file trees (total 1,200+ files).
2. **Target parsing** — extracted the real markdown structure of `stillwater_SKILL.md` (1 top-level header, 24 second-level sections, 166 third-level headers — discounting shell-comment false positives inside code fences).
3. **Coverage diff** — Python scan of all 142 source skill names against `stillwater_SKILL.md` text.
4. **Stratified deep-dive (parallel)** — 4 Explore agents, each owning a category, each reading source SKILL.md files *and* their reference-file chains *and* the corresponding `stillwater_SKILL.md` sections, producing line-cited findings in 6 categories (Faithful, Omission, Distortion, Contradiction, Fabrication, Version Drift, Reference Integrity).
5. **Coverage scan** — identified relevant-but-unmentioned source skills outside the 4 agent scopes.
6. **Cross-check** — compared findings against the prior `stillwater_SKILL_VALIDATION_REPORT.md` to identify where the prior report was correct, where it was overly generous, and where it missed critical defects.

The four parallel agents are credited as 4a (Next.js/React/Tailwind stack), 4b (Auth/DB/Stripe/Security), 4c (Design/Avant-Garde/UI/A11y), 4d (Process/Quality/Testing/Debugging). Their full work records are in `/home/z/my-project/worklog.md`.

---

## Section-by-Section Fidelity Matrix

| § | Section | Primary source skills sampled | Independent fidelity | Prior report verdict | Discrepancy |
|---|---------|-------------------------------|----------------------|----------------------|-------------|
| §1 | Project Identity & Design Philosophy | `avant-garde-design-v4`, `code-quality-standards`, `frontend-design` | **7/10** — Anti-Generic Mandate + Rejection Matrix captured; 10-point checklist + 24/30 scoring + Strategic Quadrant + Core Web Vitals budgets MISSING | "✅ Excellent" | Over-credited |
| §2 | Tech Stack & Environment | `nextjs16-tailwind4`, `nextjs16-react19-tailwind4-full-stack`, `nextjs16-react19-postgres17`, `nextjs16-react19-next-auth5-drizzle-orm`, `nextjs16-react19-tailwind4-auth5-video-gen` | **4/10** — Pervasive downward version drift (Next.js, React, TS, Tailwind, Drizzle, Stripe, pnpm all below source floors); Stripe v17 vs v22+ **internal contradiction**; missing CVE-2025-55182 React security floor; missing `verbatimModuleSyntax` + `erasableSyntaxOnly` TS flags | "✅ Excellent" | **Materially wrong** |
| §3 | Bootstrapping & Configuration | Project-specific | **8/10** — Phase 0 patches well-documented; `pnpm >=10.26.0` `allowBuilds` floor missed | "✅ Excellent" | Roughly correct |
| §4 | Design System (Code-First) | `nextjs16-tailwind4`, `tailwind-patterns`, `avant-garde-design-v4`, `visual-design-foundations` | **5/10** — `@theme` block + typography captured; **font variable disconnect** (`--font-berkeley-mono` declared but not consumed by `@theme --font-mono`); **JetBrains Mono fabrication** (called paid when it's Apache 2.0); OKLCH softened to "consider later"; missing `data-attribute variants`, `inset-shadow-*`, gradient interpolation modifiers, "Compositor Only: animate transform/opacity" rule, "Avoid `transition: all`" rule, 60fps frame budget | "✅ Excellent" | Over-credited |
| §5 | Component Architecture & Patterns | `nextjs16-tailwind4`, `nextjs16-react19-tailwind4-full-stack`, `nextjs16-react19-postgres17`, `authjs-vs-better-auth` | **5/10** — **5-Layer Architecture Layer 3/4 inverted** vs ALL Next.js 16 source skills; `verifySession()` vs `requireAuth()` mismatch (§5.6/§5.7 define `requireAuth()` but §9/§10.2/§16.3 use Auth.js v5 `verifySession()`); shadcn style inconsistency (`new-york` in §2.1 vs `default` in §3.2) | "✅ Excellent" | **Materially wrong** |
| §6 | Custom Hooks Deep Dive | `nextjs16-tailwind4` | **8/10** — SSE hook + useReducedMotion + useScrollProgress faithful; minor: missing `use(promise)` React 19 pattern | "✅ Excellent" | Roughly correct |
| §7 | Content Management & Data Ingestion | `nextjs16-react19-postgres17` | **6/10** — Sanity↔PostgreSQL boundary clear; missing `published: true` filter on public queries (Critical-class audit finding in IRONFORGE) | "✅ Excellent" | Over-credited |
| §8 | Accessibility (WCAG AAA) | `avant-garde-design-v4` `references/04-accessibility-checklist.md`, `code-quality-standards` | **4/10** — Captures only 3 of 6 WCAG 2.2 AAA criteria (contrast, touch targets, reading level); misses Visual Presentation, Images of Text, Interruptions, Three Flashes, Dragging Movements, Pronunciation; ADA Title II / April 24, 2026 federal compliance date not mentioned | "✅ Excellent" | **Materially wrong** |
| §9 | Anti-Patterns & Common Bugs | `nextjs16-tailwind4`, `tailwind-patterns`, `authjs-vs-better-auth`, `nextjs-react-expert`, `testing-patterns` | **5/10** — Many anti-patterns captured; **`pg_advisory_lock` vs `pg_advisory_xact_lock` misnaming** (prose says session-scoped, code is transaction-scoped); Stripe v17 contradiction; missing Stripe Basil API shape change; missing `use(promise)`; missing `published: true` filter; missing owner-checked queries (IDOR); missing Server Action `id` UUID validation; missing honeypot field on forms | "⚠️ 2 Issues" | Under-credited issues |
| §10 | Debugging Guide | `debugging-and-error-recovery` | **6/10** — Stop-the-Line Rule + git bisect + Treat-Error-Output-as-Untrusted verbatim; **missing the systematic 6-step Triage Checklist** (Reproduce→Localize→Reduce→Fix→Guard→Verify); §10.4/§10.5 BOOK/STRIPE patterns appear forward-looking (no source attribution) | "✅ Excellent" | Over-credited |
| §11 | Pre-Ship Checklist | `verification-and-review-protocol`, `code-quality-standards`, `code-review-and-audit`, `code-review-checklist`, `lint-and-validate` | **5/10** — Iron Law + Gate Function + 4 Red Flags + Six-Axis Review all verbatim; **missing** Multi-Model Review Pattern, Receiving Feedback Protocol (no performative agreement rule, YAGNI check, pushback protocol), Requesting Review subagent dispatch, 5 review modes (quick/standard/deep/security-only/quality-only), Severity Matrix with CVSS ranges, response SLAs, Dead Code Hygiene, Dependency Discipline 5-step check, Honesty in Review, Change Sizing, Review Speed, Handling Disagreements hierarchy, severity labels (Critical/Nit/Optional/FYI), common-failures table, rationalization-prevention table | "⚠️ 1 Issue" | **Materially wrong** |
| §12 | Lessons Learnt | Cross-referenced | **7/10** — 15 lessons well-articulated; some lessons reference patterns not actually in source skills (forward-looking) | "✅ Excellent" | Roughly correct |
| §13 | Pitfalls to Avoid | Multiple | **5/10** — Comprehensive by category BUT: **"Better Auth 1.2" typo** in §13.13 (no such version exists); §13.6 `@source` syntax under-specified (one-liner, no example) | "✅ Excellent" | Over-credited |
| §14 | Best Practices | Multiple | **6/10** — Conventions organized; missing rate-limit strategy selection table, missing API error response shape, missing XSS rules | "✅ Excellent" | Over-credited |
| §15 | Coding Patterns | Multiple | **7/10** — 12 production-grade patterns; missing `use(promise)`, missing `setProgress` fix pattern (rule stated but CSS keyframes fix not shown) | "✅ Excellent" | Roughly correct |
| §16 | Coding Anti-Patterns | Multiple | **5/10** — Same `verifySession()` vs `requireAuth()` mismatch as §9 | "⚠️ 1 Issue" | Under-credited |
| §17 | Responsive Breakpoint Reference | `tailwind-patterns`, `nextjs16-tailwind4` | **8/10** — §17.4 Container Queries faithfully captured (prior fix verified); missing dark-mode strategies (`class`/`media`/`selector`) | "✅ Accurate" | Correct |
| §18 | Z-Index Layer Map | `avant-garde-design-v4` | **6/10** — Token values faithful; **§18.2 contains draft "Wait — let me reconsider" meta-commentary left in final doc** | "✅ Accurate" | Missed defect |
| §19 | Color Reference (Complete) | `nextjs16-tailwind4`, `tailwind-patterns` | **7/10** — Full palette with hex/RGB/usage; OKLCH note added but softened; missing 3-layer color token architecture (Primitive→Semantic→Component reduced to 2-layer) | "✅ Excellent" | Roughly correct |
| §20 | TypeScript Interface Reference | `nextjs16-react19-tailwind4-full-stack` | **7/10** — Forward-looking, well-typed | "✅ Excellent" | Roughly correct |
| App A | ADRs | `authjs-vs-better-auth` | **6/10** — 9 ADRs with rationale; **ADR-008 fabricates "Sept 2025" date** and **"officially directs new projects" claim**; missing rationale for `pg_advisory_xact_lock` vs `SELECT FOR UPDATE` | "✅ Excellent" | Over-credited |
| App B | Pipeline/Workflow Costs | Project-specific | **7/10** — Reasonable | "✅ Good" | Correct |
| App C | Audit History | Project-specific | **7/10** — 11 findings documented | "✅ Good" | Correct |
| App D | Post-Deploy Live-Site Validation | `webapp-testing-journey`, `webapp-testing` | **6/10** — Smoke test covers 6 surfaces; missing 4-tool matrix, URL journey methodology, 8 Lessons Learned | "✅ Good" | Roughly correct |

**Average independent fidelity across 24 sections: ~6.0/10 (~60%).**

---

## P0 Defects — Must Fix Before Treating as Authoritative

### P0-1. Stripe SDK version internal contradiction (§2.1 vs §9.4 vs §13.5)

- **§2.1 line 134:** pins `Stripe | ^17.6.0`
- **§9.4 lines 1615–1618:** "Stripe SDK v22+ uses camelCase (`currentPeriodEnd` not `current_period_end`) — Fix: Use v22+ SDK."
- **§13.5 line 2320:** "Don't use Stripe SDK pre-v22 camelCase."
- **Source `nextjs16-react19-next-auth5-drizzle-orm` line 113:** pins `stripe ^22.3.0`

An agent following §2.1 will install Stripe 17.6.0, then immediately trip the §9.4 and §13.5 anti-patterns. **Fix:** change §2.1 line 134 to `Stripe | ^22.3.0`. *Found by: Agent 4b (C1) + Agent 4a (V1).*

### P0-2. `verifySession()` (Auth.js v5) vs `requireAuth()` (Better Auth) mismatch

- **§5.6 line 743 + §5.7 line 821:** define `requireAuth()` as the Better Auth server-side guard that throws `NEXT_REDIRECT`.
- **§9 lines 1400–1408, §10.2 line 1825, §16.3 lines 3153–3167:** use `verifySession()` (Auth.js v5 pattern) in the same role.

These two function names cannot both be correct in a Better Auth codebase. An agent reading §16.3 in isolation will look for `verifySession()` in the codebase, not find it (because Stillwater uses Better Auth's `requireAuth()`), and be confused. **Fix:** replace `verifySession()` with `requireAuth()` in §9, §10.2, §16.3. *Found by: Agent 4b (D2, C2).*

### P0-3. Missing CVE-2025-55182 React security floor

- **§2.1 line 121:** pins `React | ^19.0.0`
- **Source `nextjs16-react19-tailwind4-auth5-video-gen` §2.1 line 88:** pins `^19.2.3` with explicit note: "CVE-2025-55182 / React2Shell RCE floor".
- All four Next.js 16 source skills pin `^19.2.3`.

`^19.0.0` allows versions vulnerable to CVE-2025-55182 (CVSS 10.0 RCE). **Fix:** change §2.1 to `React | ^19.2.3` and add a note citing CVE-2025-55182. *Found by: Agent 4a (Critical Omission).*

### P0-4. `pg_advisory_lock` vs `pg_advisory_xact_lock` misnaming

- **§9.4 line 1569 prose + Lesson 8 line 2181:** say "Idempotency via `payment_events.stripe_event_id` UNIQUE INDEX + `pg_advisory_lock`".
- **§9.4 line 1580 code + §15.2 line 2622 code:** use `pg_advisory_xact_lock` (transaction-scoped).

These are two different PostgreSQL functions: `pg_advisory_lock` is session-scoped and requires explicit `pg_advisory_unlock`; `pg_advisory_xact_lock` auto-releases at transaction end. The code is correct (transaction-scoped is what you want for a webhook handler); the prose is wrong. An agent copying the prose pattern into a different context could create a lock-leak bug. **Fix:** change prose in §9.4 line 1569 and Lesson 8 line 2181 from `pg_advisory_lock` to `pg_advisory_xact_lock`. *Found by: Agent 4b (D1).*

### P0-5. "Better Auth 1.2" typo in §13.13

- **§13.13 line 2405:** "Don't use Auth.js v5 patterns — Better Auth 1.2 (ADR-008)".
- **§2.1 line 129 + ADR-008 line 3863:** say Better Auth 1.6.23.
- **Source `authjs-vs-better-auth` line 13:** confirms stable v1.6.23 (1.7.0-beta in testing).

"Better Auth 1.2" does not exist. **Fix:** change §13.13 line 2405 from "Better Auth 1.2" to "Better Auth 1.6.23". *Found by: Agent 4b (C3).*

### P0-6. 5-Layer Architecture Layer 3/4 inversion vs all Next.js 16 source skills

- **§5.1 lines 584–592:** Layer 3 = tRPC routers (Drizzle, auth, payments, jobs allowed); Layer 4 = Domain (pure, `import type` only).
- **All Next.js 16 source skills uniformly specify:** Layer 3 = Domain (pure, `import type` only); Layer 4 = Infrastructure/lib (Drizzle, Auth, etc.).
  - `nextjs16-react19-postgres17` §5 lines 600–605
  - `nextjs16-react19-tailwind4-full-stack` §5 lines 305–311
  - `nextjs16-react19-next-auth5-drizzle-orm` §5 lines 714–719
  - `nextjs16-full-stack` §9 lines 542–547

Stillwater places Domain ABOVE infrastructure in the layer stack, while every source skill places it BELOW (Domain is closer to the pure core). The ESLint `no-restricted-imports` rule at §5.1 line 598 is faithful in intent, but the visual layer numbering misrepresents the source consensus. An agent reading §5.1 will believe Domain is the deepest layer (Layer 4), but the actual source-skill "Golden Rule" puts Infrastructure at Layer 4. **Fix:** swap Layer 3 ↔ Layer 4 in §5.1. *Found by: Agent 4a (Distortion).*

### P0-7. Focus ring color/size/offset contradiction

- **§1.3 line 1177:** "2px solid `--color-clay-400` + 3px offset" (the outlier)
- **§8.3 lines 1234–1238:** `--color-water-500`, 3px outline, 2px offset
- **§5.5 line 705 + §9 line 1754:** `--color-water-500`, `ring-2`, `ring-offset-2`

Three different specifications. §1.3 is the outlier — should be `water-500` to match the rest. **Fix:** update §1.3 line 1177 to `water-500`, `ring-2`, `ring-offset-2`. *Found by: Agent 4c (Contradiction).*

### P0-8. Font variable disconnect (`--font-berkeley-mono` declared but never consumed)

- **§4.4 line 509:** `next/font/local` declares `variable: '--font-berkeley-mono'` for `BerkeleyMono-Variable.woff2`.
- **§4.1 line 378:** `@theme { --font-mono: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace }` — does NOT reference `var(--font-berkeley-mono)`.

The self-hosted font is imported but never consumed by the theme. An agent applying `font-mono` will get the system JetBrains Mono (if installed) or fallback monospace, NOT the self-hosted Berkeley Mono. **Fix:** either change `@theme --font-mono` to `'Berkeley Mono', var(--font-berkeley-mono), 'JetBrains Mono', monospace`, or rename the `next/font/local` variable to `--font-mono` and reference it in `@theme`. *Found by: Agent 4c (Contradiction).*

### P0-9. JetBrains Mono fabrication (§4.4)

- **§4.4 line 509:** "JetBrains Mono is a paid font. If the license is not acquired, fall back to 'JetBrains Mono' or 'IBM Plex Mono' (both open-source)."

This is internally contradictory (calls JetBrains Mono paid, then lists it as an open-source fallback to itself) AND factually wrong. JetBrains Mono is Apache 2.0 open-source. The actual paid font in the code block is Berkeley Mono. **Fix:** correct the warning text to "Berkeley Mono is a paid font. If the license is not acquired, fall back to 'JetBrains Mono' (Apache 2.0) or 'IBM Plex Mono' (OFL) — both open-source." *Found by: Agent 4c (Fabrication).*

### P0-10. `force-dynamic` + `cacheComponents` incompatibility (§15.3)

- **§15.3 line 2677:** uses `export const dynamic = 'force-dynamic';` for the SSE route.
- **§9.1 lines 1339–1343:** implies `cacheComponents: true` is enabled (lists "cacheComponents inside `experimental`" as a bug — meaning stillwater expects top-level `cacheComponents: true`).
- **Source `nextjs16-react19-postgres17` §13.1 line 1736:** explicitly states "Don't use `export const dynamic = "force-dynamic"` with `cacheComponents: true` — incompatible."

If both are enabled, this is a contradiction with postgres17's rule. Stillwater doesn't clarify which mode it's in. **Fix:** either remove `force-dynamic` from §15.3, or add a note explicitly stating `cacheComponents: false` for the SSE route, or document the exact `next.config.ts` setting. *Found by: Agent 4a (Contradiction).*

### P0-11. Draft "Wait — let me reconsider" meta-commentary left in §18.2

- **§18.2 lines 3405–3407:** "Wait — dropdowns are 200, sticky is 300? Actually sticky nav should be above dropdowns. Let me reconsider."

This reads as live thinking left in the final doc — distorts the authoritative voice a project skill file should have. **Fix:** delete the meta-commentary and finalize the z-index values. *Found by: Agent 4c (Distortion).*

---

## P1 Gaps — Should Fix

### P1-1 through P1-7: Pervasive downward version drift (§2.1)

| Layer | stillwater §2.1 | Source floor | Drift severity |
|-------|----------------|--------------|----------------|
| Next.js | `^16.0.0` | `16.1.4+` / `^16.2.0` / `^16.2.9` | Below all sources |
| React | `^19.0.0` | `^19.2.3` (CVE-2025-55182 floor) | **Security floor missed** (see P0-3) |
| TypeScript | `^5.7.3` | `5.9+` / `^5.9.0` / `^6.0` | Below all sources |
| Tailwind CSS | `^4.0.6` | `4.1.18+` / `^4.3.0` | Below all sources |
| Drizzle ORM | `^0.40.1` | `0.45.2` / `^0.45.2` | 5 minor versions behind |
| Stripe SDK | `^17.6.0` | `^22.3.0` | **5 major versions behind + internal contradiction** (see P0-1) |
| pnpm | `9.15.4` / `>=9.0.0` | `>=10.26.0` (for `allowBuilds:` syntax) | Below `allowBuilds` syntax floor |
| Zod | unpinned | `^4.4.3` | Unpinned |

**Fix:** align §2.1 with source floors. *Found by: Agent 4a (Version Drift).*

### P1-2. Missing OWASP Top 10 coverage (§14.6, §13.10)

`security-and-hardening` and `vulnerability-scanner` source skills mandate OWASP Top 10 (2021 + 2025) coverage. Stillwater has NO OWASP Top 10 section. The §14.6 "Security Conventions" list is 7 bullets and omits XSS, broken access control, security misconfiguration, sensitive data exposure, supply chain, integrity failures, logging failures, SSRF, exceptional conditions. **Fix:** add a §14.6.1 "OWASP Top 10 (2025) mapping" subsection. *Found by: Agent 4b (Critical Omission).*

### P1-3. Missing auth-specific security checklist (§5.6, §14.6)

Stillwater omits: password hashing algorithm (bcrypt/scrypt/argon2) with salt rounds ≥ 12; password-reset token expiry; email verification; OAuth scope minimization; session fixation prevention; MFA; account lockout; brute-force protection on auth endpoints. §14.6 line 2467 only says "Auth session cookie encrypted (BETTER_AUTH_SECRET)". Source `security-and-hardening` mandates stricter rate limit for `/api/auth/` mutations (10/15min). **Fix:** add auth-security checklist to §5.6 or new §5.6.1. *Found by: Agent 4b (Critical Omission).*

### P1-4. Missing XSS prevention rules

Stillwater §15.10 covers JSON-LD XSS via `escapeForScriptContext` only. The general XSS guidance ("Never use `eval()` or `innerHTML` with user-provided data"; "Use framework auto-escaping, don't bypass it"; "DOMPurify.sanitize if rendering HTML") is absent. No ban on `dangerouslySetInnerHTML`. **Fix:** add XSS rules to §13.10 or §14.6. *Found by: Agent 4b (Critical Omission).*

### P1-5. Missing security headers enumeration (§14.6)

Stillwater mentions "CSP headers in `next.config.ts`" but provides NO actual CSP directive configuration, NO enumeration of HSTS / X-Frame-Options / X-Content-Type-Options / Referrer-Policy, and no helmet equivalent. **Fix:** add concrete security-headers template to §14.6. *Found by: Agent 4b (Critical Omission).*

### P1-6. Missing rate-limit strategy selection table (§15.7)

Stillwater §15.7 shows one Upstash sliding-window limiter (10/1min) for bookings. Source's three-strategy selection table (token bucket / sliding window / fixed window), the stricter auth-endpoint limit (10/15min), the `X-RateLimit-Limit / -Remaining / -Reset` response headers, and the explicit "return 429 when exceeded" rule are all absent. **Fix:** add rate-limit strategy table to §15.7. *Found by: Agent 4b (Critical Omission).*

### P1-7. Missing Multi-Model Review Pattern (§11)

`code-quality-standards` §"Multi-Model Review Pattern" lines 220–237 defines: "Model A writes → Model B reviews for correctness and architecture → Model A addresses feedback → Human makes the final call." This pattern catches issues a single model misses. Stillwater does not mention it. **Fix:** add to §11.1.1 or new §11.X. *Found by: Agent 4d (Critical Omission).*

### P1-8. Missing Receiving Feedback Protocol (§11)

`verification-and-review-protocol` §"Receiving Feedback Protocol" + reference file `code-review-reception.md` (209 lines) define: READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT; the "no performative agreement" rule (never say "You're absolutely right!", "Great point!", "Thanks for catching that"); the YAGNI check; source-specific handling; implementation order; pushback protocol. All absent from stillwater. **Fix:** add to §11 or new §11.X. *Found by: Agent 4d (Critical Omission).*

### P1-9. Missing TDD Three Laws + AAA pattern + Test Prioritization (§14.4)

`tdd-workflow` §2 "Three Laws of TDD" lines 27–33 + §3–5 RED/GREEN/REFACTOR phase rules + §6 AAA Pattern + §8 Test Prioritization (happy → error → edge → performance) + §10 AI-Augmented multi-agent pattern — all absent. TDD discipline is captured at the cycle level (§14.4 line 2447 "TDD mandatory: Red → Green → Refactor → Commit") but the granular laws and phase rules are not enforced. **Fix:** add TDD Three Laws to §14.4 or §15.8. *Found by: Agent 4d (Critical Omission).*

### P1-10. Missing Beyonce Rule + DAMP-over-DRY + Real>Fake>Stub>Mock hierarchy (§15.8)

`test-driven-development` source skills define: Beyonce Rule ("if you liked it, you should have put a test on it"); DAMP-over-DRY test philosophy; Test Pyramid percentages (80/15/5); Real>Fake>Stub>Mock preference order (prevents over-mocking); Browser Testing DevTools workflow; subagent-test-writing pattern. All absent. **Fix:** add to §15.8 or §15.11. *Found by: Agent 4d (Critical Omission).*

### P1-11. Missing Dead Code Hygiene + Dependency Discipline + Honesty in Review + Change Sizing + Review Speed + Handling Disagreements hierarchy + severity labels (§11)

All from `code-quality-standards`. Particularly consequential: Dead Code Hygiene ("Identify orphaned code, list explicitly, ASK before deleting" — agents will silently delete code); Dependency Discipline 5-step check ("Before adding any dependency: Does existing stack solve this? How large? Actively maintained? Known vulns? License?"); Change Sizing (~100 lines good / ~300 acceptable / ~1000 split it). **Fix:** add to §11 or new §11.X. *Found by: Agent 4d (Critical Omission).*

### P1-12. Missing 6-step Triage Checklist from `debugging-and-error-recovery` (§10)

Source defines systematic 6-step Triage Checklist (Reproduce → Localize → Reduce → Fix Root Cause → Guard Against Recurrence → Verify End-to-End) with decision trees (non-reproducible bug: Timing/Environment/State/Truly random; layer failing: UI/API/DB/Build/External/Test). Stillwater §10.1–10.5 replaces it with topic-specific error/cause/fix tables. Agents lose the systematic methodology that works for any bug class. **Fix:** add §10.0 "General Triage Checklist" before §10.1. *Found by: Agent 4d (Critical Omission).*

### P1-13. Missing `use(promise)` React 19 pattern (§6, §15)

`nextjs-react-expert` Rule 1.5 lines 291–300 documents `function DataDisplay({ dataPromise }) { const data = use(dataPromise); }` as the React 19 way to unwrap promises in Client Components. Stillwater does not cover it. Agents will fall back to `useEffect + setState` anti-patterns. **Fix:** add to §6 or §15. *Found by: Agent 4a (Critical Omission).*

### P1-14. Missing Stripe Basil API shape change (§9.4, §13.5)

`nextjs16-react19-tailwind4-auth5-video-gen` §2.1 line 101 + §9 line 1086 + ADR-003 line 1909: Stripe "Basil" API (2025-03-31) moved `current_period_end` from top-level to `items.data[0].current_period_end`. Stillwater §9.4 line 1615–1618 and §13.5 line 2320 only cover the camelCase SDK change, NOT the API response shape change. Stripe webhook handlers will silently read `undefined` for period end. **Fix:** add Basil API shape-change note to §9.4 and §13.5. *Found by: Agent 4a (Critical Omission).*

### P1-15. Missing data-attribute variants + `@source` directive syntax (§4, §13.6)

`nextjs16-tailwind4` §2.4 line 283 documents `data-current:opacity-100` for state-driven styling. `nextjs16-tailwind4` §2.5 line 291 + `nextjs16-react19-tailwind4-auth5-video-gen` §14.3 line 1210 + §10.4 line 945 document `@source '../components/**/*.{ts,tsx}';` as the #1 fix for "Tailwind classes not applying". Stillwater has neither (§13.6 has a one-liner about `@source` but no syntax). **Fix:** add data-attribute variants to §4.5 and `@source` syntax example to §13.6. *Found by: Agent 4a (Critical Omissions).*

### P1-16. Missing `published: true` filter on public queries (§7, §9)

`nextjs16-react19-tailwind4-full-stack` H2 fix lines 642–647 + audit lesson 30 line 853: "Public Queries Did Not Filter by `published: true`" — Critical-class audit finding. Stillwater omits. Public Sanity/tRPC queries could leak unpublished content. **Fix:** add to §7.5 or §9. *Found by: Agent 4a (Critical Omission).*

### P1-17. Missing honeypot field on forms (§15)

`nextjs16-react19-tailwind4-full-stack` §14 line 893: honeypot field (`company_website`) as spam-prevention best practice for booking forms. Stillwater omits. Booking forms will lack spam protection. **Fix:** add honeypot pattern to §15. *Found by: Agent 4a (Critical Omission).*

### P1-18. Missing owner-checked queries pattern (§5.8, §15)

`nextjs16-react19-next-auth5-drizzle-orm` §14 line 1881 + `nextjs16-react19-postgres17` §11 line 1607: `getProject()` returns null if `row.userId !== userId` — security best practice. Stillwater omits. IDOR vulnerabilities in member-facing routes. **Fix:** add owner-checked queries pattern to §5.8 or §15. *Found by: Agent 4a (Critical Omission).*

### P1-19. Missing Server Action `id` UUID validation (§5.8, §9)

`nextjs16-react19-tailwind4-full-stack` M5 fix lines 680–685: `z.string().uuid().safeParse(id)` before any DB call — added 18 regression tests. Stillwater omits. Server actions accepting `id: string` are vulnerable to non-UUID input hitting the DB. **Fix:** add UUID validation rule to §5.8 or §9. *Found by: Agent 4a (Critical Omission).*

### P1-20. Missing 5 of 6 WCAG 2.2 AAA criteria (§8.1)

`avant-garde-design-v4` `references/04-accessibility-checklist.md` lines 107–125 lists 6 WCAG 2.2 AAA criteria applicable to web apps. Stillwater §8.1 captures only 3 (contrast 1.4.6, touch targets 2.5.5, reading level 3.1.5). Missing: 1.4.8 Visual Presentation (80-char width, no justified text, ≥1.5 line spacing); 1.4.9 Images of Text (No Exception); 2.2.4 Interruptions; 2.3.2 Three Flashes; 2.5.7 Dragging Movements (WCAG 2.2 new); 3.1.6 Pronunciation. **Fix:** add the 5 missing criteria to §8.1. *Found by: Agent 4c (Critical Omission).*

### P1-21. Missing Core Web Vitals targets (§11.1)

`avant-garde-design-v4` `references/15-performance-budgets.md` §1.0 lines 7–14 + §4.0 specifies: FCP < 0.8s, LCP < 1.2s, TTI < 1.5s, CLS < 0.05 for Institutional quadrant; CLS/LCP/INP audit protocols. Stillwater §11.1 has bundle-size gate (marketing 80kb / booking 200kb / admin 400kb) and Lighthouse A11y = 100, but no FCP/LCP/INP/CLS targets. **Fix:** add Core Web Vitals targets to §11.1 or new §11.X. *Found by: Agent 4c (Critical Omission).*

### P1-22. Missing "Compositor Only: animate transform and opacity" rule (§4.5, §9)

`avant-garde-design-v4` `references/14-animation-standards.md` §6.0 line 99: "Compositor Only: Only animate `transform` and `opacity`" rule + "Avoid `transition: all`" rule + "60fps frame budget" rule. Stillwater's §4.5 keyframes happen to use only transform/opacity, but the RULE is never stated — agents may add `transition: all` or animate `width/height/top/left` without realizing they violate the source's performance guardrails. **Fix:** add compositor-only rule to §4.5. *Found by: Agent 4c (Critical Omission).*

### P1-23. Missing 10-point anti-generic checklist + 24/30 scoring threshold (§1.4)

`avant-garde-design-v4` `references/12-anti-generic-checklist.md` §2.0 lines 17–30 + §3.0 lines 34–44: 10-point anti-generic checklist (Intentionality / Distinctive Hierarchy / Whitespace as Voice / Human Imperfection / Tactile Interaction / Radical Color / Narrative Flow / Typography Soul / Invisible UX / Strategic Alignment) with 24/30 scoring threshold (Memorability / Integrity / Craftsmanship axes). Only ~4 of the 10 points are implicitly captured elsewhere in stillwater. The objective quality gate for the Anti-Generic Mandate is missing. **Fix:** add 10-point checklist + scoring to §1.4. *Found by: Agent 4c (Critical Omission).*

### P1-24. Missing `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true` in TS config tables (§2.1, §3.2)

All Next.js 16 source skills mandate `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true` in `tsconfig.json`. Stillwater §2.1 line 122 and §3.2 line 209 TS config tables list `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables` but OMIT these two. The former is mentioned only in passing at §14.2 line 2429; the latter is only used as an explanation for the enum rule at §9.2 line 1440. **Fix:** add both flags to the §2.1 and §3.2 TS config tables. *Found by: Agent 4a (Critical Omission).*

### P1-25. Missing `trustHost: true` + AUTH_URL host-mismatch P0 lesson (§5.6)

`nextjs16-react19-next-auth5-drizzle-orm` §42–43 lines 1442–1444: the `trustHost: true` + `AUTH_URL` ↔ `NEXT_PUBLIC_APP_URL` host-mismatch warning is a P0 production-outage lesson. Stillwater does NOT cover this for Better Auth. Better Auth uses `BETTER_AUTH_URL` (§3.3 line 233) but there's no guidance on the equivalent host-mismatch risk or reverse-proxy behavior. An agent deploying behind a reverse proxy has no warning that auth callbacks may resolve to localhost. **Fix:** add Better Auth `trustHost` equivalent warning to §5.6. *Found by: Agent 4b (Critical Omission).*

### P1-26. Missing API error response shape (§5.8, §14.6)

`api-and-interface-design` §"Consistent Error Semantics" lines 62–86 + `api-patterns/response.md`: source mandates `interface APIError { error: { code, message, details? } }` plus a status-code map (400/401/403/404/409/422/500). Stillwater §5.6 line 775 and §16.3 line 3167 only show `{ error: 'Unauthorized' }` (string, not structured). tRPC handles errors via `TRPCError` but the REST/route-handler shape is undefined. **Fix:** add `APIError` shape + status-code map to §14.6 or new §14.X. *Found by: Agent 4b (Critical Omission).*

### P1-27. Missing CI/CD, feature flags, rollback plans, Dependabot, Build Cop (§11)

`ci-cd-and-automation` source skill (391 lines) defines: "Shift Left" principle; "Faster is Safer" principle; Feature Flags pattern (deploy code without enabling, roll back without redeploy, canary, A/B); Staged Rollouts; Rollback Plan; Dependabot/Renovate config; Build Cop role; CI Optimization strategies (caching, parallelism, path filters, matrix, larger runners); Common Rationalizations table; Red Flags list; "CI should never have production secrets" rule. Stillwater §11.1 has 8 CI gates but covers none of these. Particularly critical for a Stripe-handling production app: feature flags would have smoothed the Auth.js→Better Auth migration (ADR-008); rollback plans are essential for Stripe webhook changes. **Fix:** add feature flags, rollback plan, Dependabot config to §11 or new §11.X. *Found by: Coordinator coverage scan (skill not in agent scopes).*

---

## P2 Gaps — Should Consider

These are lower-priority omissions, internal inconsistencies, or polish items. They don't break agent guidance but weaken fidelity.

- §4.3 OKLCH recommendation softened from "use" to "consider later" — diverges from `nextjs16-tailwind4` §2.4 line 284 and `tailwind-patterns` §7 lines 163–167.
- §2.1 line 124 + §1.3 line 71 say shadcn `style: "new-york"`; §3.2 line 217 says `style: default`. Internal inconsistency.
- §4.5 keyframes use `(0.16, 1, 0.3, 1)` (Expo out) for fade-in/reveal; `avant-garde-design-v4` `references/14-animation-standards.md` line 19 specifies `(0.25, 0.1, 0.25, 1)` (Dramatic) for 500ms+ animations. Substitution undocumented.
- §4.1 motion duration tokens `--duration-instant: 100ms` and `--duration-crawl: 900ms` extend the source's 150ms/300ms/500ms+ scale without marking as Stillwater-specific.
- §1.2 "Editorial Calm" is a Stillwater-coined hybrid name not in `avant-garde-design-v4` `references/10-design-directions.md`. Acceptable as project-specific direction but presented without citation to a source direction.
- §1.3 line 78 bans `shadow-lg`/`shadow-xl` on cards. `references/05-component-patterns.md` line 47 uses `hover:shadow-2xl` in its Tactile Depth Feature Card pattern. Stillwater's §5.5 strip-grep doesn't include `shadow-2xl` in its ban list — agent could add `shadow-2xl` and pass the pre-commit hook, violating the prose rule.
- §5.4 library discipline says "USE IT. Do not rebuild" for sonner (toasts), and sonner's default styling uses shadows. The skeleton+toast shadow exception is mentioned in §1.3 but §5.4 doesn't cross-reference it.
- §10.4/§10.5 BOOK-xxx and STRIPE-xxx debugging patterns are forward-looking (no source attribution). §12 Lessons note acknowledges this. Acceptable but should be marked as anticipated patterns, not sourced.
- ADR-008 line 3862 fabricates "Sept 2025" date and "officially directs new projects" claim. Source `authjs-vs-better-auth` line 16 says only "Better Auth team now also patches Auth.js security issues" — no date. Source line 117 says "Favor Better Auth [for greenfield projects]" — not "officially directs".
- §15.6 line 2818 `apiVersion: '2024-12-18.acacia'` in Stripe client constructor — not present in any source skill. Date plausible but unverified.
- §5.6 line 739 attributes a quote to "Auth0 Next.js 16 guidance" that doesn't appear in source `authjs-vs-better-auth` line 131 (which references the Auth0 blog URL but doesn't contain this exact quote). Substance correct; quotation attribution fabricated.
- §11.1 Gate 1 uses `pnpm check-types` (type ERROR checking) — `lint-and-validate/SKILL.md:44` defines `scripts/type_coverage.py` as type COVERAGE measurement (percentage of typed vs `any` annotations). Two distinct concepts silently substituted.
- §1.5 CTA Hierarchy is excellent and project-specific; no source skill mandates this exact 4-tier structure but it's a faithful extension of the Anti-Generic philosophy.

---

## Coverage Gaps — Source Skills Not Mentioned

**Only 11 of 142 source skills are explicitly mentioned by name in `stillwater_SKILL.md`** (despite frontmatter claiming "12 source skills"):

| Skill | Mentions |
|-------|----------|
| `design` | 11 (mostly generic word "design", not the skill) |
| `aesthetic` | 2 |
| `code-quality-standards` | 2 |
| `to-distill-project-into-skill` | 2 |
| `debugging-and-error-recovery` | 1 |
| `nextjs16-react19-next-auth5-drizzle-orm` | 1 |
| `nextjs16-react19-postgres17` | 1 |
| `nextjs16-react19-tailwind4-full-stack` | 1 |
| `nextjs16-tailwind4` | 1 |
| `tailwind-patterns` | 1 |
| `verification-and-review-protocol` | 1 |

**131 source skills are not mentioned at all.** Most are irrelevant to the Stillwater stack (ASR/TTS/VLM, aminer, dream-interpreter, etc.) — acceptable omissions. But the following are **relevant-but-unmentioned**, and most have content that should inform `stillwater_SKILL.md`:

| Skill | Relevance | Status |
|-------|-----------|--------|
| `avant-garde-design-v4` | Primary source for Anti-Generic Mandate (§1.4) + design system (§4) | Heavily drawn from, never credited |
| `authjs-vs-better-auth` | Primary source for Better Auth migration (ADR-008) + §5.6 | Heavily drawn from, never credited |
| `frontend-design` | UX Psychology Laws, Emotional Design, Golden Ratio rationale | Missing |
| `super-frontend-design` | 6-Phase SOP, 57 Vercel rules, OWASP 2025, OKLCH mandate | Missing |
| `ui-styling` | shadcn theming, dark mode plan | Partially captured |
| `ui-ux-pro-max` | Empty/loading/error state coverage mandate | Implicitly captured |
| `claude-design` | "Avoid AI-design slop", 3+ variations rule, Design Direction Advisor | Missing |
| `aesthetic` | Four-Stage framework, PEAK storytelling | Missing |
| `visual-design-foundations` | Modular scale, 8pt grid, dark mode strategy | Partially captured |
| `frontend-ui-engineering` | 200-line component red flag, no inline styles rule | Missing |
| `web-design-guidelines` | Vercel-labs external ruleset | Missing |
| `security-and-hardening` | OWASP Top 10, auth-security checklist, XSS rules, security headers, rate-limit strategy | Missing (P1-2 through P1-6) |
| `vulnerability-scanner` | OWASP 2025, threat modeling, CVSS+EPSS, fail-open vs fail-closed | Missing |
| `api-patterns` | Versioning, rate-limiting, response envelope, security-testing | Missing |
| `api-and-interface-design` | APIError shape, status-code map, Hyrum's Law, Branded Types | Missing (P1-26) |
| `code-review-checklist` | 12-category tactical scan, AI/LLM Review Patterns | Missing |
| `code-review-and-audit` | 5 review modes, Severity Matrix, response SLAs | Missing |
| `tdd-workflow` | Three Laws, AAA pattern, Test Prioritization | Missing (P1-9) |
| `test-driven-development` | Beyonce Rule, DAMP-over-DRY, Test Pyramid, Real>Fake>Stub>Mock | Missing (P1-10) |
| `testing-patterns` | Mock Types table, Test Type Selection | Partially captured |
| `webapp-testing-journey` | 4-tool matrix, URL journey methodology | Missing |
| `webapp-testing` | Discovery-first approach, Playwright config | Missing |
| `e2e-testing-lessons` | Hybrid API+UI Golden Rule, JWT test-auth patterns | Missing |
| `frontend-ui-testing-journey` | 8 Lessons Learned, Accessibility Tree analysis | Missing |
| `clean-code` | Script Output Handling, "Before Editing ANY File", Self-Check Before Completing | Missing |
| `ci-cd-and-automation` | Feature flags, rollback plans, Dependabot, Build Cop, Shift Left | Missing (P1-27) |
| `performance-optimization` | Core Web Vitals, bundle analysis | Missing (P1-21) |
| `documentation-and-adrs` | ADR format guidance | Missing |
| `deprecation-and-migration` | Migration patterns (relevant to ADR-008) | Missing |
| `git-workflow-and-versioning` | Atomic-commit-per-cycle protocol | Partially captured (Lesson 10) |
| `version-management` | Version pin policy | Missing |
| `framework-templates` | Framework choice rationale | Missing |
| `scaffold-ui` | UI scaffolding patterns | Missing |
| `incremental-implementation` | Phases 0-12 execution methodology | Missing |
| `coding-agent` | Agent guidance meta-skill (7 ref files) | Missing |
| `context-engineering` | Skill file structure best practices | Missing |
| `context-anchor` | Context anchoring (5 ref files) | Missing |
| `planning-and-task-breakdown` | Execution planning | Missing |
| `spec-driven-development` | Spec-driven approach | Missing |
| `source-driven-development` | Source distillation methodology | Missing |
| `writing-plans` | Plan writing | Missing |
| `memory-architecture` / `memory-architect` | Agent memory | Missing |
| `orchestrator-toolkit` | Multi-agent orchestration | Missing |
| `n8n-workflow-automation` | Trigger.dev context | Missing |
| `cloudflare-tunnel` | Cloudflare Images integration | Missing |
| `chrome-devtools-mcp` | Debugging | Missing |
| `browser-automation` / `browser-testing-with-devtools` / `playwright-cli` / `agent-browser` | E2E testing | Missing |
| `loop-builder` | Feedback loops (69 ref files) | Missing |
| `idea-refine` / `task-review` / `auto-target-tracker` | Process aids | Missing |

---

## Cross-Check vs Prior Validation Report

The prior `stillwater_SKILL_VALIDATION_REPORT.md` claimed **95/100 fidelity** and "production-ready" status. My independent findings disagree materially.

### Prior report's "fixes applied" — verified

| Prior claim | Independent verification |
|-------------|--------------------------|
| §5.5 `focus-visible:outline-hidden` (Tailwind v4 form) | ✅ Verified correct (Agent 4a) |
| §17.4 Container Queries added | ✅ Verified present and faithful (Agent 4a) |
| §4.3 OKLCH note added | ⚠️ Present but softened from "use" to "consider later" (Agent 4a Distortion) |
| §11.1.1 Six-Axis Code Review reference added | ✅ Verified present (Agent 4d) |
| §11.1 Iron Law enhanced with Gate Function + Red Flags | ✅ Verified verbatim (Agent 4d) |

### Prior report's "✅ Excellent" verdicts — challenged

The prior report awarded "✅ Excellent" to 18 of 24 sections. Independent line-level validation found:

- **§2 Tech Stack:** "Excellent" → actual **4/10** (P0-1 Stripe contradiction, P0-3 CVE-2025-55182 missed, P1-1 pervasive version drift)
- **§5 Component Architecture:** "Excellent" → actual **5/10** (P0-2 verifySession/requireAuth mismatch, P0-6 5-Layer inversion)
- **§8 Accessibility:** "Excellent" → actual **4/10** (P1-20 missing 5/6 WCAG 2.2 AAA criteria)
- **§11 Pre-Ship Checklist:** "⚠️ 1 Issue" → actual **5/10** (P1-7 through P1-11, P1-27 — many critical omissions)

### Prior report's blind spots

The prior report did NOT detect:

1. P0-1 Stripe v17 vs v22+ internal contradiction
2. P0-2 `verifySession()` vs `requireAuth()` mismatch
3. P0-3 CVE-2025-55182 React security floor missed
4. P0-4 `pg_advisory_lock` vs `pg_advisory_xact_lock` misnaming
5. P0-5 "Better Auth 1.2" typo in §13.13
6. P0-6 5-Layer Architecture Layer 3/4 inversion vs all Next.js 16 sources
7. P0-7 Focus ring color contradiction (§1.3 vs §8.3 vs §5.5 vs §9)
8. P0-8 Font variable disconnect (`--font-berkeley-mono` declared but not consumed)
9. P0-9 JetBrains Mono fabrication (called paid when it's Apache 2.0)
10. P0-10 `force-dynamic` + `cacheComponents` incompatibility
11. P0-11 Draft "Wait — let me reconsider" meta-commentary in §18.2
12. All P1 gaps (27 items)
13. Coverage gaps (only 11/142 source skills mentioned by name)
14. Pervasive downward version drift across all major dependencies

The prior report's Finding #1 (forwardRef inconsistency) was self-contradictory — it noted that §5.5 used `forwardRef` (a violation of §9.6) then declared it "correct" because the source skill also used `forwardRef`. My Agent 4a verified that §5.5 actually **correctly omits** `forwardRef` — the prior report's premise was wrong.

---

## Faithful Representations (Highlights)

To be balanced, the document does many things well. These are faithfully captured from sources:

- **Iron Law + Gate Function + 4 Red Flags** (§11.1) — verbatim from `verification-and-review-protocol`
- **Six-Axis Code Review** (§11.1.1) — all 6 axes preserved including Aesthetic & UX Rigor (Axis 6, the anti-generic mandate)
- **Anti-Generic Litmus Test (Why? Only? Without?)** (§1.4) — verbatim from `code-quality-standards`
- **Rejection Matrix** (§1.3) — captures all source bans + adds 5 Stillwater-specific bans
- **Stop-the-Line Rule** (§10.7) — verbatim 6-step process from `debugging-and-error-recovery`
- **git bisect for regressions** (§10.6) — faithful
- **Treat Error Output as Untrusted Data** (§10.8) — faithful
- **Regression Test Verification Cycle** (§11.5) — verbatim Red-Green-Revert-Restore cycle
- **Factory Pattern for test data (`getMockX(overrides)`)** (§15.11) — concrete implementations
- **8 CI Gates** (§11.1) — operational equivalent of `ci-cd-and-automation` Quality Gate Pipeline
- **6 smoke-test surfaces** (Appendix D) — home, schedule, tRPC health, SSE, Stripe webhook, Sanity webhook
- **TDD Red → Green → Refactor → Commit cycle** (§14.4) — high-level captured (granular laws missing, see P1-9)
- **`@theme` block + CSS-first Tailwind v4** (§4.1) — faithful
- **Container Queries** (§17.4) — faithful (prior fix verified)
- **`@utility` directive** (§4.5) — faithful
- **Tailwind v4 anti-pattern migration map** (§9.5) — `outline-none → outline-hidden`, `bg-gradient-to-r → bg-linear-to-r`, `bg-opacity-* → opacity modifier`, `@layer utilities → @utility`, `bg-[--brand] → bg-(--brand)` all faithful
- **Next.js 16 anti-patterns** (§9.1) — `middleware.ts → proxy.ts`, `experimental.serverComponentsExternalPackages → serverExternalPackages`, sync `params` → async, `cacheComponents` location — all faithful
- **React 19 anti-patterns** (§9.6) — `setState` in effect, `toLocaleString()` without locale, `suppressHydrationWarning` on text nodes, `useMemo`/`useCallback` without profiler evidence — all faithful
- **`forwardRef` correctly omitted** in §5.5 (positive deviation from source — source uses `forwardRef`, stillwater correctly uses React 19 `ref` as prop)
- **Better Auth primary API surface** (§5.6) — `toNextJsHandler(auth)`, `getSessionCookie(request)`, `auth.api.getSession({ headers: await headers() })`, `authClient.signIn.social({ provider })`, `authClient.useSession()` return shape, `authClient.signOut()`, schema mapping (User/Session/Account/Verification with camelCase + createdAt/updatedAt) — all faithful
- **`DrizzleAdapter` rejects Proxy-based db** (§13.4) — faithful
- **`drizzle-kit push` forbidden in production** (§9.3) — faithful
- **`DATABASE_URL_UNPOOLED` for migrations** (§9.3) — faithful
- **2-layer auth pattern** (proxy = cookie-only; layout = full validation) (§5.6, §5.7) — faithful
- **ADR-008 Better Auth rationale** (Appendix A) — stable release line, verified Next.js 16 compat, plugin architecture (RBAC/2FA/organizations), Drizzle adapter — all faithful (minus fabricated "Sept 2025" date)
- **ADR-009 `proxy.ts` rename** (Appendix A) — faithful
- **`pg_advisory_xact_lock` for booking concurrency** (§15.1, §9.3, ADR-004) — faithful in code (prose misnamed, see P0-4)
- **Reduced-motion CSS** (§4.6) — verbatim from `references/14-animation-standards.md` (including 0.01ms choice)
- **Skip-to-content link** (§8.4) — faithful
- **Z-index token values** (§18.1) — exact match to `avant-garde-design-v4` Appendix A
- **Library discipline** (§5.4) — Radix, sonner, react-day-picker, @tanstack/react-table, react-hook-form all flagged as "use, don't rebuild"

---

## Recommended Fix Sequence

### Batch 1 — P0 defects (must fix before treating as authoritative)

Apply all 11 P0 fixes. These are localized, low-risk edits (single-line changes, fact corrections, function-name swaps). Estimated effort: 1–2 hours.

### Batch 2 — P1 version drift + security gaps

Apply P1-1 (version alignment), P1-2 through P1-6 (security coverage), P1-26 (APIError shape). These require adding new subsections but don't change existing content. Estimated effort: 4–6 hours.

### Batch 3 — P1 process/quality gaps

Apply P1-7 through P1-12 (Multi-Model Review, Receiving Feedback, TDD Three Laws, Beyonce Rule, Dead Code Hygiene, Triage Checklist). Estimated effort: 4–6 hours.

### Batch 4 — P1 stack-specific gaps

Apply P1-13 through P1-19 (`use(promise)`, Stripe Basil API, data-attribute variants, `@source` syntax, `published: true` filter, honeypot, owner-checked queries, UUID validation). Estimated effort: 3–4 hours.

### Batch 5 — P1 accessibility + performance gaps

Apply P1-20 through P1-23 (WCAG 2.2 AAA criteria, Core Web Vitals, compositor-only rule, 10-point anti-generic checklist). Estimated effort: 3–4 hours.

### Batch 6 — P1 remaining + P2 polish

Apply P1-24 through P1-27 (TS config flags, `trustHost` warning, CI/CD coverage) + P2 items. Estimated effort: 4–6 hours.

### Batch 7 — Re-validate

After all batches, re-run this validation. Target: ≥85% average fidelity across sampled source skills, zero P0 defects, ≤3 P1 gaps.

---

## Final Verdict

| Dimension | Score | Notes |
|-----------|-------|-------|
| Structural ambition | 9/10 | 24 thematic sections, 9 ADRs, 8 CI gates, 15 lessons, 4 appendices — comprehensive scope |
| Coverage of source skills | 4/10 | Only 11/142 source skills mentioned by name; many relevant-but-unmentioned skills (avant-garde-design-v4, authjs-vs-better-auth, security-and-hardening, ci-cd-and-automation) |
| Faithful representation (where covered) | 6/10 | Strong on Anti-Generic + Iron Law + Better Auth API surface; weak on security, testing, TDD, debugging methodology |
| Internal consistency | 3/10 | 11 P0 defects including 3 internal contradictions (Stripe version, auth function name, focus ring color) |
| Factual accuracy | 5/10 | JetBrains Mono fabrication, ADR-008 fabricated date, §18.2 draft thinking, pg_advisory_lock misnaming |
| Version accuracy | 2/10 | Pervasive downward drift across ALL major dependencies; security floor missed |
| Actionability for coding agents | 5/10 | Will guide correctly on covered topics; will mislead on Stripe version, auth function name, font wiring; will leave agent unarmed on OWASP, XSS, security headers, TDD laws |
| **Overall independent fidelity** | **~5.5/10 (~55%)** | **Not yet a faithful, high-fidelity representation** |

The document is a strong *draft* of a project skill file but is **not yet safe to treat as authoritative**. The 11 P0 defects must be fixed first. The 27 P1 gaps should follow. After that, re-validate.

The prior report's 95/100 verdict is **overstated by roughly 35–40 points** and missed all 11 P0 defects. Treat the prior report as a partial first-pass review, not as a green light.

Now I have confirmed the key findings. Let me now also check the PAD §9.4 and §11.3 for any additional stale references. 
 
The key findings are confirmed: 
 
1. PAD §5: Line 1 shows "Next.js | 15.x" — confirmed stale 
2. PAD §5: Line 1 shows "Auth.js | v5" — confirmed stale 
3. PAD §5: Line 1 shows "TypeScript | 5.5+" — confirmed stale 
4. PAD §4.1: C4 Container diagram labels "Next.js 15 App" — confirmed stale 
5. PAD §6.1: Directory topology shows middleware.ts (not proxy.ts) — confirmed stale 
6. PAD §6.1: Directory topology shows [...nextauth] (not [...all]) — confirmed stale 
7. PAD §6.1: Directory topology shows lib/auth.ts as "Auth.js client helpers" — confirmed stale 
8. PAD §6.1: Directory topology shows packages/auth/ as "Auth.js v5 configuration" — confirmed stale 
9. PAD §8.5: TRPCContext says "session: Session | null; // Auth.js session" — confirmed stale 
10. PAD §9.1: Auth flow diagram references "Auth.js callback" — confirmed stale 
11. PAD §9.3: StillwaterSession says "Extended by Auth.js callbacks" — confirmed stale 
12. PAD §9.4: apps/web/middleware.ts shown (not proxy.ts) — confirmed stale 
13. PAD Appendix A: Env vars use Auth.js v5 naming (AUTH_SECRET, AUTH_GOOGLE_ID, etc.) — confirmed stale 
14. PAD Appendix C: Docker Compose uses stillwater_local password (not stillwater_local_dev) — confirmed stale 
 
Also: 
15. MASTER_PLAN §7.2 scaffolding coverage table: The proxy.ts row says "(Phase 2 patches with real auth.api.getSession call)" — this contradicts D36 which says proxy.ts should NOT call auth.api.getSession(). 
 
Now let me also check the MASTER_PLAN's own D36 and the proxy.ts section more carefully. 

Now I have comprehensive evidence. Let me also verify the MASTER_PLAN's own proxy.ts sections. 

 
read /home/project/stillwater/MASTER_EXECUTION_PLAN.md:300-379 
 

 
read /home/project/stillwater/MASTER_EXECUTION_PLAN.md:1400-1499 
 

Now I have all the evidence I need. Let me now produce the comprehensive re-validation and remediation plan. 
 
Key findings confirmed: 
 
From PAD.md: 
1. PAD §5: "Next.js | 15.x" — stale, should be 16.x 
2. PAD §5: "Auth.js | v5" — stale, should be Better Auth v1.6.23 
3. PAD §5: "TypeScript | 5.5+" — stale, should be 5.7+ 
4. PAD §4.1: C4 Container diagram labels "Next.js 15 App" — stale 
5. PAD §6.1: Directory topology shows middleware.ts — stale, should be proxy.ts 
6. PAD §6.1: Directory topology shows [...nextauth] — stale, should be [...all] 
7. PAD §6.1: Directory topology shows lib/auth.ts as "Auth.js client helpers" — stale 
8. PAD §6.1: Directory topology shows packages/auth/ as "Auth.js v5 configuration" — stale 
9. PAD §8.5: TRPCContext says "session: Session | null; // Auth.js session" — stale 
10. PAD §9.1: Auth flow diagram references "Auth.js callback" — stale 
11. PAD §9.3: StillwaterSession says "Extended by Auth.js callbacks" — stale 
12. PAD §9.4: apps/web/middleware.ts shown — stale13. PAD Appendix A: Env vars use Auth.js v5 naming — stale 
13. PAD Appendix C: Docker Compose uses stillwater_local password — stale 
 
From MASTER_EXECUTION_PLAN.md: 
1. Item #20 in Phase 0 file table: proxy.ts row says "Phase 2 patches real auth.api.getSession call" — contradicts D362. §7.2 scaffolding coverage: proxy.ts row says "(Phase 2 patches with real auth.api.getSession call)" — contradicts 
   D36 
2. §1.1: "~19 routes" — should be ~33 
3. Phase 2 §5 dependencies note: "Phase 2 before Phase 3 because tRPC protectedProcedure / staffProcedure / ownerProcedure middleware needs auth.api.getSession()" — this is correct for the tRPC context, but the proxy.ts itself should  
   NOT call it 
 
Let me now produce the comprehensive remediation plan with precise edits. 

I now have all evidence confirmed. Let me produce the comprehensive re-validation and remediation plan. 
 
---
 
🔍 RE-VALIDATION REPORT & PRECISION REMEDIATION PLAN 
 
Part 1: Re-Validation Summary 
 
After re-reading every flagged section against the actual source documents, I can confirm the following verified findings from my initial analysis, with corrections where I was wrong: 
 
> ⚠️ **HISTORICAL DOCUMENT — SUPERSEDED**
>
> This report reflects the state of PAD.md / SKILL.md / MEP.md as of its writing date.
> The project has since advanced to **PAD v1.4.0 / SKILL v1.4.1 / MEP v1.3.0**.
>
> Several technical claims herein have been corrected in the current documents,
> including but not limited to:
> - **Trigger.dev SDK import path**: reports may claim `/v4` (doesn't exist) or
>   `/v3` (deprecated). The canonical import is the **root** `@trigger.dev/sdk`
>   per official Trigger.dev v4 docs (see SKILL §9.9 Gotcha 1 + §12 Lesson 16).
> - **pnpm version**: reports may cite 9.15.4; actual is 11.9.0.
> - **Tailwind version**: reports may cite ^4.1.0; actual is ^4.3.0.
> - **React version**: reports may cite ^19.2.3; actual repo pin is ^19.2.7.
> - **ADR count**: reports may cite 9 ADRs; current is 10 (ADR-010 proposed).
>
> **Do not rely on this report for current technical guidance.** Consult the
> canonical documents listed in `CLAUDE.md` "Canonical Sources" section.

### ✅ Findings CONFIRMED (with evidence) 
 
┌───────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────┬──────────┐ 
│ #     │ Finding                                                                                                 │ Evidence Location              │ Severity │ 
├───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────┤ 
│ ND-1  │ PAD §5 says "Next.js 15.x", "Auth.js v5", "TypeScript 5.5+"                                             │ PAD lines 342-368 (§5.1 table) │ 🔴       │ 
├───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────┤ 
│ ND-2  │ PAD §4.1 C4 diagram labels "Next.js 15 App"                                                             │ PAD line 263                   │ 🔴       │ 
├───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────┤ 
│ ND-3  │ PAD §6.1 shows middleware.ts, [...nextauth], "Auth.js v5" labels                                        │ PAD lines 484-520, 540-545     │ 🔴       │ 
├───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────┤ 
│ ND-4  │ PAD §8.5 says // Auth.js session in TRPCContext                                                         │ PAD line 1036                  │ 🟡       │ 
├───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────┤ 
│ ND-5  │ PAD §9.1 flow diagram says "Auth.js callback"                                                           │ PAD line 1058                  │ 🟡       │ 
├───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────┤ 
│ ND-6  │ PAD §9.3 says "Extended by Auth.js callbacks"                                                           │ PAD line 1102                  │ 🟡       │ 
├───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────┤ 
│ ND-7  │ PAD §9.4 shows apps/web/middleware.ts                                                                   │ PAD line 1126                  │ 🟡       │ 
├───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────┤ 
│ ND-8  │ PAD Appendix A uses Auth.js v5 env var names (AUTH_SECRET, AUTH_GOOGLE_ID, etc.)                        │ PAD lines 2830-2845            │ 🔴       │ 
├───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────┤ 
│ ND-9  │ PAD Appendix C Docker uses stillwater_local (not stillwater_local_dev)                                  │ PAD line 2910                  │ 🟡       │ 
├───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────┤ 
│ IC-1  │ MASTER_PLAN §6 item #20 says proxy.ts "Phase 2 patches real auth.api.getSession call" — contradicts D36 │ MASTER_PLAN line 346           │ 🔴       │ 
├───────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────┼──────────┤ 
│ IC-1b │ MASTER_PLAN §7.2 says proxy.ts "(Phase 2 patches with real auth.api.getSession call)"                   │ MASTER_PLAN line 4343          │ 🔴       │ 
└───────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────┴──────────┘ 
 
### 🔄 Findings CORRECTED (I was wrong) 
 
┌───────┬─────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────┐ 
│ #     │ Initial Claim                       │ Correction                                                                                                                             │ Reason                                          │ 
├───────┼─────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
│ GAP-1 │ "Missing apps/studio/package.json"  │ Not a gap — PAD §6.1 does NOT list apps/studio in the directory topology. The plan references Sanity Studio hosting at                 │ PAD §6.1 directory tree only shows apps/web/.   │ 
│       │                                     │ stillwater.sanity.studio (Sanity Cloud), not a local workspace package. D13 confirms this.                                             │ No apps/studio/ workspace.                      │ 
├───────┼─────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
│ GAP-2 │ "Missing root vitest.config.ts"     │ Already specified — Phase 0 F0-08 creates vitest.config.ts (root) and F0-09 creates test/setup.ts. These are NEW files, not            │ Not a gap — correctly planned.                  │ 
│       │                                     │ scaffolding files. They are correctly listed as [NEW] in Phase 0.                                                                      │                                                 │ 
├───────┼─────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
│ GAP-4 │ "Missing @dnd-kit/core dependency"  │ Valid but low priority — The scaffolding is Phase 0; @dnd-kit/core is only needed in Phase 9 (F9-07). It can be added when Phase 9     │ Correct observation, but not a blocking issue.  │ 
│       │                                     │ begins. Not a Phase 0 blocker.                                                                                                         │                                                 │ 
├───────┼─────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
│ GAP-5 │ "Missing recharts dependency"       │ Same as GAP-4 — Only needed in Phase 9 (F9-14). Can be added then.                                                                     │ Correct observation, not blocking.              │ 
├───────┼─────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
│ IC-2  │ "Phase 8 Email Template Count — 13  │ Recounted: exactly 13 templates. F8-13 through F8-25 = 13 files. PAD §16.1 catalog = 13 entries. Count matches.                        │ I miscounted initially. No issue.               │ 
│       │ vs 15"                              │                                                                                                                                        │                                                 │ 
└───────┴─────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────┘ 
 
### ⚠ Guide Cross-Validation 
 
The guide_auth-v5_vs_better-auth.md confirms: 
- ✅ Better Auth v1.6.23 stable (not beta) 
- ✅ Auth.js v5 still at beta 5.0.0-beta.31 
- ✅ proxy.ts rename is a Next.js 16 platform change 
- ✅ 2-layer auth pattern: cookie-only proxy + auth.api.getSession() in layouts 
- ✅ [...nextauth] → [...all] route handler rename 
- ✅ authClient.signIn.social() API pattern (NOT Auth.js's signIn("github")) 
- ✅ authClient.useSession() returns { data, error, refetch, isPending } (NOT { data, status, update }) 
 
All of these are already correctly handled in the MASTER_PLAN's Phase 2 (F2-01 through F2-19). The plan is guide-consistent. 
 
---
 
Part 2: Precision Remediation Plan 
 
The following edits are organized by file, with exact oldText → newText replacements. 
 
### EDIT BLOCK 1: MASTER_EXECUTION_PLAN.md — proxy.ts contradiction (IC-1) 
 
File: /home/project/stillwater/MASTER_EXECUTION_PLAN.md 
 
Edit 1a: Fix Phase 0 file table item #20 (proxy.ts row) 
 
``` 
  oldText: "| 20 | `/apps/web/proxy.ts`                                | [SCAFFOLD] | verbatim — Phase 2 patches real `auth.api.getSession` call  |" 
  newText: "| 20 | `/apps/web/proxy.ts`                                | [SCAFFOLD] | verbatim — Phase 2 replaces auth logic entirely with cookie-only `getSessionCookie()` pattern (F2-13; D36) |" 
``` 
 
Edit 1b: Fix §7.2 scaffolding coverage table (proxy.ts row) 
 
``` 
  oldText: "| `/apps/web/proxy.ts`                             | 0     | [SCAFFOLD] (Phase 2 patches with real `auth.api.getSession` call) |" 
  newText: "| `/apps/web/proxy.ts`                             | 0     | [SCAFFOLD] (Phase 2 replaces auth logic entirely — F2-13, D36; cookie-only `getSessionCookie()`) |" 
``` 
 
Edit 1c: Fix Phase ordering rationale (line ~326 — clarify proxy.ts vs tRPC context distinction) 
 
``` 
  oldText: "- Phase 2 before Phase 3 because tRPC `protectedProcedure` / `staffProcedure` / `ownerProcedure` middleware needs `auth.api.getSession()`" 
  newText: "- Phase 2 before Phase 3 because tRPC `protectedProcedure` / `staffProcedure` / `ownerProcedure` middleware needs `auth.api.getSession()` (in tRPC context — Node.js runtime, NOT in proxy.ts)" 
``` 
 
### EDIT BLOCK 2: MASTER_EXECUTION_PLAN.md — Route count (§1.1) 
 
Edit 2: Fix "~19 routes" to accurate count 
 
``` 
  oldText: "The platform exposes ~19 routes organised into three Next.js App Router route groups: `(marketing)`, `(studio)`, `(admin)`." 
  newText: "The platform exposes ~33 routes organised into three Next.js App Router route groups: `(marketing)` (9 routes), `(studio)` (6 routes), `(admin)` (10 routes), plus auth (4 routes) and API (4 routes)." 
``` 
 
### EDIT BLOCK 3: MASTER_EXECUTION_PLAN.md — Version consistency note 
 
Edit 3: Add a note in Document Control about PAD staleness 
 
``` 
  oldText: "| Sources     | `design.md`, `PAD.md`, `scaffolding_files.md`, `static_landing_page_html_mockup.md` |" 
  newText: "| Sources     | `design.md`, `PAD.md`, `scaffolding_files.md`, `static_landing_page_html_mockup.md`, `guide_auth-v5_vs_better-auth.md` |" 
``` 
 
### EDIT BLOCK 4: MASTER_EXECUTION_PLAN.md — Add D41 to discrepancy table 
 
Edit 4: Insert new discrepancy D41 after D40 in §2.1 
 
The new discrepancy should be inserted after the D40 row. The exact insertion point is after: 
 
``` 
  | 40 | Better Auth DB schema differences (guide G5) | Files don't document table/field renames | Guide documents User/Session/Account/Verification schema changes | **Document schema migration** in stillwater_SKILL.md §Lesson 3 + 
Phase 1 schema files | 
``` 
 
Insert: 
 
``` 
  | 41 | PAD §5, §4.1, §6.1, §8.5, §9.1, §9.3, §9.4, Appendix A — stale Auth.js / Next.js 15 references | PAD references Auth.js v5, `middleware.ts`, `[...nextauth]`, `AUTH_SECRET` env vars, "Next.js 15" throughout | This document 
(PLAN) correctly uses Better Auth v1.6.23 + `proxy.ts` | **Update PAD.md** in 14 locations: §4.1 ("Next.js 15"→"Next.js 16"), §5.1 table (Auth.js→Better Auth, Next.js 15→16, TS 5.5→5.7), §5.2 (TS 5.5→5.7), §6.1 
(`middleware.ts`→`proxy.ts`, `[...nextauth]`→`[...all]`, "Auth.js v5"→"Better Auth"), §8.5 (comment), §9.1 diagram, §9.3 comment, §9.4 (`middleware.ts`→`proxy.ts`), Appendix A (env var names), Appendix C (docker password) | 
``` 
 
### EDIT BLOCK 5: MASTER_EXECUTION_PLAN.md — Add D42 for missing dependencies 
 
Edit 5: Insert new discrepancy D42 after D41 
 
Insert after D41: 
 
``` 
  | 42 | Missing `@dnd-kit/core` and `recharts` in `apps/web/package.json` scaffolding | Neither package listed in scaffolding deps | Phase 9 F9-07 references `@dnd-kit/core` for drag-and-drop calendar; F9-14 references `recharts` for 
revenue charts | **Add** `"@dnd-kit/core": "^6.0.0"` and `"recharts": "^2.15.0"` to `apps/web/package.json` dependencies in Phase 0 | 
``` 
 
### EDIT BLOCK 6: MASTER_EXECUTION_PLAN.md — Fix Phase 0 file table item #15 (add deps) 
 
Edit 6: Update Phase 0 item #15 to include D42 dependencies 
 
``` 
  oldText: "| 15 | `/apps/web/package.json`                            | [PATCH]    | add 3 `@tailwindcss/*` devDeps (D16); add `test`/`test:e2e` scripts (D22); replace `next lint` with `eslint .` (D23) |" 
  newText: "| 15 | `/apps/web/package.json`                            | [PATCH]    | add 3 `@tailwindcss/*` devDeps (D16); add `test`/`test:e2e` scripts (D22); replace `next lint` with `eslint .` (D23); add `@dnd-kit/core` + 
`recharts` deps (D42) |" 
``` 
 
### EDIT BLOCK 7: MASTER_EXECUTION_PLAN.md — Fix F0-20 description 
 
Edit 7: Fix the Phase 0 F0-20 checklist note about Phase 2 
 
``` 
  oldText: "20 | `/apps/web/proxy.ts`                                | [SCAFFOLD] | verbatim — Phase 2 patches real `auth.api.getSession` call  |" 
 
  oldText: "Checklist: 
    - [ ] Uses `getSessionCookie()` from `better-auth/cookies` (NOT `auth.api.getSession()`)" 
``` 
 
Wait, the F2-13 checklist is already correct. The issue is only in the Phase 0 file table. Edit 1a already fixes this. ✅ 
 
### EDIT BLOCK 8: MASTER_EXECUTION_PLAN.md — Add validation note to §7.1 
 
Edit 8: Add a note at the top of §7.1 (PAD section-by-section coverage) about PAD staleness 
 
``` 
  oldText: "> **External validation:** `guide_auth-v5_vs_better-auth.md` (July 2026) independently confirms ADR-008 (Better Auth v1.6.23 stable) and ADR-009 (`proxy.ts` rename). The guide additionally mandates a **2-layer auth 
pattern** (cookie-only `proxy.ts` + Server Component `requireAuth()`/`requireRole()`) which has been incorporated into Phase 2 (F2-13 rewrite + F2-16 through F2-19 new layout files). See discrepancy D36 below." 
 
  newText: "> **External validation:** `guide_auth-v5_vs_better-auth.md` (July 2026) independently confirms ADR-008 (Better Auth v1.6.23 stable) and ADR-009 (`proxy.ts` rename). The guide additionally mandates a **2-layer auth 
pattern** (cookie-only `proxy.ts` + Server Component `requireAuth()`/`requireRole()`) which has been incorporated into Phase 2 (F2-13 rewrite + F2-16 through F2-19 new layout files). See discrepancy D36 below. 
  > 
  > **⚠ PAD staleness notice:** PAD.md contains 14 stale references to Auth.js v5, `middleware.ts`, `[...nextauth]`, and old env var names. These are tracked as discrepancy D41 in §2.1. The PLAN's own specifications are correct and   
take precedence over PAD where they conflict." 
``` 
 
### EDIT BLOCK 9: MASTER_EXECUTION_PLAN.md — Update §10.1 to mention PAD update 
 
Edit 9: Add PAD update to immediate pre-IMPLEMENT steps 
 
``` 
  oldText: "### 10.1 Immediate (pre-IMPLEMENT) 
  1. **VALIDATE checkpoint** — Project owner reviews this document and answers Open Questions §9 
  2. **ADR-008 and ADR-009** drafted and added to PAD.md (Better Auth + proxy.ts rename) 
  3. **Phase 0 smoke test** — `git init`, place all scaffolding files, apply D15-D24 patches, run `pnpm install && pnpm dev`; verify `http://localhost:3000` returns a 200 (even if it's a placeholder page)" 
 
  newText: "### 10.1 Immediate (pre-IMPLEMENT) 
  1. **VALIDATE checkpoint** — Project owner reviews this document and answers Open Questions §9 
  2. **ADR-008 and ADR-009** drafted and added to PAD.md (Better Auth + proxy.ts rename) 
  3. **PAD.md stale references resolved** — Update 14 locations per D41 (Next.js 15→16, Auth.js→Better Auth, middleware→proxy, env var names, docker password) 
  4. **Phase 0 smoke test** — `git init`, place all scaffolding files, apply D15-D24 patches, run `pnpm install && pnpm dev`; verify `http://localhost:3000` returns a 200 (even if it's a placeholder page)" 
``` 
 
### EDIT BLOCK 10: MASTER_EXECUTION_PLAN.md — Add D42 to Phase 0 acceptance criteria 
 
Edit 10: Add dependency check to Phase 0 acceptance criteria 
 
``` 
  oldText: "- [ ] `customConditions` declaration visible in `pnpm-workspace.yaml` (D15) 
  - [ ] CI workflow `ci.yml` runs and passes on a feature branch" 
 
  newText: "- [ ] `customConditions` declaration visible in `pnpm-workspace.yaml` (D15) 
  - [ ] `@dnd-kit/core` and `recharts` present in `apps/web/node_modules` (D42) 
  - [ ] CI workflow `ci.yml` runs and passes on a feature branch" 
``` 
 
### EDIT BLOCK 11: MASTER_EXECUTION_PLAN.md — Update Open Questions §9.1 
 
Edit 11: Update Open Question #1 to reflect guide validation 
 
``` 
  oldText: "1. **Better Auth vs Auth.js** — CONFIRMED by `guide_auth-v5_vs_better-auth.md` (July 2026): Better Auth v1.6.23 stable is the correct choice for greenfield Next.js 16 projects. Auth.js v5 remains in beta (5.0.0-beta.31)    
and has friction with Next.js 16 (peer-dependency conflicts, server-action configuration errors — GitHub issues #13302, #13388). ADR-008 stands. If you still prefer Auth.js v5, Phase 2 changes substantially and you accept beta-status  
risk." 
 
  newText: "1. **Better Auth vs Auth.js** — RESOLVED. `guide_auth-v5_vs_better-auth.md` (July 2026) independently confirms: Better Auth v1.6.23 stable is correct for greenfield Next.js 16. Auth.js v5 still beta (5.0.0-beta.31), with   
confirmed friction (GitHub #13302 peer-dep conflicts, #13388 server-action failures). Better Auth team also patches Auth.js security. ADR-008 stands. **No action required — this question is answered.**" 
``` 
 
---
 
Part 3: Remediation Summary 
 
### Edit Count by File 
 
┌──────────────────────────┬──────────────────────────────────────┬───────────────────────────────────────────────────────┐ 
│ File                     │ Edits                                │ Type                                                  │ 
├──────────────────────────┼──────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ MASTER_EXECUTION_PLAN.md │ 11 edits                             │ Fix contradictions, add D41/D42, update notes         │ 
├──────────────────────────┼──────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ PAD.md                   │ 14 edits (downstream, separate task) │ Stale version refs, env var names, directory topology │ 
└──────────────────────────┴──────────────────────────────────────┴───────────────────────────────────────────────────────┘ 
 
### Edit Priority Order 
 
┌──────────┬──────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┐ 
│ Priority │ Edit Block                                       │ Risk if Deferred                                                       │ 
├──────────┼──────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤ 
│ 🔴 P0    │ 1a, 1b, 1c (proxy.ts contradiction)              │ Engineers will incorrectly implement auth.api.getSession() in proxy.ts │ 
├──────────┼──────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤ 
│ 🔴 P0    │ 4 (Add D41 to discrepancy table)                 │ PAD staleness not tracked as a known issue                             │ 
├──────────┼──────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤ 
│ 🔴 P0    │ 8 (PAD staleness notice in §7.1)                 │ Engineers reading §7.1 may trust stale PAD references                  │ 
├──────────┼──────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤ 
│ 🟡 P1    │ 2 (Route count fix)                              │ Misleading scope estimate                                              │ 
├──────────┼──────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤ 
│ 🟡 P1    │ 5, 6, 10 (D42 dependencies + Phase 0 acceptance) │ pnpm build fails in Phase 9 if deps missing                            │ 
├──────────┼──────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤ 
│ 🟡 P1    │ 9 (Pre-IMPLEMENT steps)                          │ PAD update forgotten before implementation                             │ 
├──────────┼──────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤ 
│ 🟢 P2    │ 3 (Document Control source list)                 │ Minor documentation accuracy                                           │ 
├──────────┼──────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤ 
│ 🟢 P2    │ 11 (Open Question #1 status)                     │ Minor — already answered by guide                                      │ 
└──────────┴──────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────┘ 
 
### PAD.md Updates Required (Separate Task) 
 
These are 14 edits to PAD.md, tracked as D41. They should be applied as a single atomic commit before Phase 0 begins: 
 
┌────┬────────────────────────────┬──────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────┐ 
│ #  │ PAD Location               │ Old                                                                  │ New                                                                            │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 1  │ §4.1 C4 diagram            │ "Next.js 15 App"                                                     │ "Next.js 16 App"                                                               │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 2  │ §5.1 table row 1           │ "Next.js | 15.x"                                                     │ "Next.js | 16.x"                                                               │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 3  │ §5.1 table row 3           │ "TypeScript | 5.5+"                                                  │ "TypeScript | 5.7+"                                                            │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 4  │ §5.1 table row 11          │ "Auth.js | v5"                                                       │ "Better Auth | v1.6.23"                                                        │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 5  │ §5.1 table row 11 rejected │ "NextAuth v4 (legacy)"                                               │ "Auth.js v5 (beta), NextAuth v4 (legacy)"                                      │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 6  │ §5.2                       │ "TypeScript: 5.5+"                                                   │ "TypeScript: 5.7+"                                                             │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 7  │ §6.1 directory tree        │ ├── middleware.ts                                                    │ ├── proxy.ts                                                                   │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 8  │ §6.1 directory tree        │ │   ├── auth/ with [...nextauth]                                     │ │   ├── auth/ with [...all]                                                    │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 9  │ §6.1 directory tree        │ ├── lib/auth.ts "# Auth.js client helpers"                           │ ├── lib/auth.ts "# Auth helpers (Better Auth)"                                 │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 10 │ §6.1 directory tree        │ ├── auth/ "# Auth.js v5 configuration"                               │ ├── auth/ "# Better Auth configuration"                                        │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 11 │ §8.5                       │ session: Session | null; // Auth.js session                          │ session: Session | null; // Better Auth session                                │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 12 │ §9.1 flow diagram          │ "Auth.js callback"                                                   │ "Better Auth callback"                                                         │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 13 │ §9.3                       │ // Extended by Auth.js callbacks                                     │ // Extended by Better Auth session callback                                    │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 14 │ §9.4                       │ // apps/web/middleware.ts                                            │ // apps/web/proxy.ts                                                           │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 15 │ Appendix A                 │ AUTH_SECRET=, AUTH_GOOGLE_ID=, AUTH_GOOGLE_SECRET=, AUTH_RESEND_KEY= │ BETTER_AUTH_SECRET=, GOOGLE_CLIENT_ID=, GOOGLE_CLIENT_SECRET=, RESEND_API_KEY= │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 16 │ Appendix A header          │ "# Authentication (Auth.js v5)"                                      │ "# Authentication (Better Auth)"                                               │ 
├────┼────────────────────────────┼──────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤ 
│ 17 │ Appendix C                 │ POSTGRES_PASSWORD: stillwater_local                                  │ POSTGRES_PASSWORD: stillwater_local_dev                                        │ 
└────┴────────────────────────────┴──────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────┘ 
 
---
 
Part 4: Verification Checklist 
 
After applying all edits, verify: 
 
- [ ] grep -n "Auth.js v5" MASTER_EXECUTION_PLAN.md → 0 results (except D41 reference) 
- [ ] grep -n "Next.js 15" MASTER_EXECUTION_PLAN.md → 0 results (except D41 reference) 
- [ ] grep -n "middleware\.ts" MASTER_EXECUTION_PLAN.md → 0 results (except D41 reference) 
- [ ] grep -n "\[\.\.\.nextauth\]" MASTER_EXECUTION_PLAN.md → 0 results 
- [ ] grep -n "auth\.api\.getSession" MASTER_EXECUTION_PLAN.md → only in F2-10 (server helper), F2-13 (explicitly forbidden), F2-16/F2-17 (layout requireAuth) 
- [ ] grep -n "getSessionCookie" MASTER_EXECUTION_PLAN.md → in F2-13 (proxy.ts implementation) 
- [ ] grep -n "patches with real" MASTER_EXECUTION_PLAN.md → 0 results 
- [ ] grep -n "D41" MASTER_EXECUTION_PLAN.md → present in §2.1, §7.1, §10.1 
- [ ] grep -n "D42" MASTER_EXECUTION_PLAN.md → present in §2.2, Phase 0 file table, Phase 0 acceptance criteria 
- [ ] grep -n "~19 routes" MASTER_EXECUTION_PLAN.md → 0 results (replaced with "~33 routes") 
- [ ] grep -n "Auth.js v5" PAD.md → only in ADR-008 context (historical reference) 
- [ ] grep -n "Next.js 15" PAD.md → 0 results 
- [ ] grep -n "middleware\.ts" PAD.md → 0 results (except ADR-009 historical reference) 
- [ ] grep -n "AUTH_SECRET" PAD.md → 0 results (replaced with BETTER_AUTH_SECRET) 
 
---
 
This completes the re-validation and remediation plan. Shall I proceed with applying the 11 edits to MASTER_EXECUTION_PLAN.md now


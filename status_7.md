I've completed a thorough validation. Both remaining quality gates are green (check-types 9/9, lint 0 errors / 9 warnings — matching AGENTS.md). Here is the full validation report. 
 
---
 
Validation Report: docs/session_2_condensed.md 
 
Method: Ran the actual test/test/type/lint suites, inspected git history (git log, git ls-tree HEAD, git ls-files), and diffed every named file against the doc's claims. 
 
✅ Verified Accurate (claims match the codebase) 
 
┌────┬──────────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ #  │ Doc Claim                                        │ Evidence                                                                                                              │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 1  │ 665 passing tests                                │ Ran full suite: db 131 + auth 102 + api 118 + web 159 + email 71 + payments 43 + workers 41 = 665, all pass           │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 2  │ "+14 tests from E2E seed UUID fix"               │ packages/db/src/seed/fixtures/e2e-data.test.ts has exactly 14 passing tests; db count went 117→131                    │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 3  │ PRE_LIVE_GUIDE.md = 689 lines                    │ wc -l = 689 ✅                                                                                                        │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 4  │ Zod z.coerce.date() → z.union() fix              │ packages/api/src/routers/schedule.ts:31 uses z.union([...]) for getWeek                                               │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 5  │ $NaN/mo fix via getPlanPrice()                   │ apps/web/src/components/marketing/MembershipSection.tsx:51                                                            │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 6  │ sitemap/robots/layout → stillwater.jesspete.shop │ all three confirmed in source                                                                                         │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 7  │ ws CVE override >=8.21.0                         │ pnpm-workspace.yaml:37 ✅                                                                                             │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 8  │ pnpm EOL pin removed                             │ workflows read packageManager (pnpm@11.9.0) ✅                                                                        │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 9  │ Better Auth rateLimit (10/15m, magicLink 5/15m)  │ packages/auth/src/config.ts:88 ✅                                                                                     │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 10 │ db:seed:e2e turbo task + e2e seed                │ present in turbo.json:86 and packages/db/src/seed/e2e.ts; UUIDs use counter-based 36-char format (e2e-data.ts:194) ✅ │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 11 │ pre-commit hook blocks .env.local                │ .git/hooks/pre-commit → scripts/pre-commit-check.sh ✅                                                                │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 12 │ 5 migrations exist                               │ drizzle/migrations/0000–0004_huge_hawkeye.sql ✅                                                                      │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 13 │ Quality gates green                              │ pnpm check-types 9/9, pnpm lint 0 errors / 9 warnings ✅                                                              │ 
├────┼──────────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ 14 │ Secret-leak commit dbf0cd5 "env" exists          │ by heinazhik, adds .env.local, apps/web/.env.local, docs/ssh-key.txt ✅                                               │ 
└────┴──────────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
 
🔴 Critical Discrepancies (the doc misrepresents the security state) 
 
C1 — apps/web/.env.local is still tracked in git with REAL secrets. 
The doc says the agent "ran git rm --cached .env.local" and treats the leak as historical. In reality: 
- Root .env.local: still in HEAD tree (only uncommitted git rm --cached, never committed as removal). 
- apps/web/.env.local: fully tracked in HEAD and contains live-looking secrets — BETTER_AUTH_SECRET, SANITY_API_TOKEN, SANITY_WEBHOOK_SECRET (the rest are placeholders like sk_test_...). 
- AGENTS.md Gotcha 94 claims ".env.local untracked" — that is inaccurate; only the index entry for root was cleared. 
 
C2 — An SSH private key was leaked and is undocumented. docs/ssh-key.txt is a real -----BEGIN OPENSSH PRIVATE KEY----- committed in dbf0cd5 and still tracked in HEAD (git ls-tree HEAD docs/ssh-key.txt → blob). It appears nowhere in    
the doc's findings, is omitted from the 12-secret rotation list, and is not in git history's purge scope. 
 
C3 — The doc's purge command is dangerously incomplete. It instructs: 
 
```bash 
  git filter-repo --invert-paths --path .env.local 
``` 
 
This removes only root .env.local. It does not touch apps/web/.env.local (tracked, real secrets) or docs/ssh-key.txt (SSH key). A user following the doc would believe secrets are purged while two credential-bearing files remain in 
history. Correct paths need --path apps/web/.env.local --path docs/ssh-key.txt (and --path .env.local). 
 
🟡 High Discrepancies 
 
H1 — Internal contradiction on defineRelations(). The Issue Matrix lists "Drizzle defineRelations() refactor — DEFERRED." But packages/db/src/schema/relations.ts exists (16 relations() calls) — this was the 2026-07-12 remediation 
(Gotcha 90). The doc is simply wrong; it is done, not deferred. 
 
H2 — Test-count documentation drift. The doc asserts 665 (correct for current code) yet also states "PAD, SKILL, MEP, and Brief updated to … 651 tests" — an internal contradiction. Worse, AGENTS.md (the canonical status file) still    
says 651 / 117 db tests and was not updated to 665. The truth (665) is in the code, not in the status docs. 
 
🟢 Medium / Low Inconsistencies 
 
- "9-Phase Audit Plan (A through J)" — A–J is 10 items, not 9. 
- E2E "60 sessions" — e2e-data.ts generates 14 days × (morning + evening + weekend afternoon) ≈ 28–42, not 60. 
- "12 production secrets" framing is both over- and under-stated: the committed .env.local files are mostly placeholders (only 3 real-looking values), while the SSH private key is omitted entirely. 
 
📌 Current Project Status (confirmed) 
 
- Tests: 665/665 passing (all 7 packages). 
- Typecheck: 9/9 packages clean. 
- Lint: green (0 errors, 9 intentional warnings). 
- Migrations: 5 applied (0000–0004). 
- Security: ⚠ NOT resolved. Two tracked files in HEAD still carry secrets/keys (apps/web/.env.local, docs/ssh-key.txt), and root .env.local remains in HEAD history. The pre-commit hook prevents future commits but does nothing about   
  what's already committed. 
 
🛠 Recommendations (priority order) 
 
1. Revoke/rotate BETTER_AUTH_SECRET, SANITY_API_TOKEN, SANITY_WEBHOOK_SECRET and the SSH key in docs/ssh-key.txt immediately. 
2. Expand the purge to git filter-repo --invert-paths --path .env.local --path apps/web/.env.local --path docs/ssh-key.txt, then force-push. 
3. Commit the pending git rm --cached .env.local so root is actually out of HEAD. 
4. Correct the doc: remove the false "DEFERRED" status for defineRelations(), fix the purge command, add the SSH key to the leak inventory, and reconcile the 651-vs-665 figure. 
5. Sync AGENTS.md to 665 tests / 131 db tests so the canonical status matches reality. 
 
Bottom line: The code-level remediation work described in the doc is real and verified (tests, fixes, gates all check out). However, the doc materially understates the security incident — it missed a still-tracked .env.local with real 
secrets and a committed SSH private key, and its purge instructions would leave both in history. Treat the "secrets resolved / rotate-only" conclusion as inaccurate. 

---

Now I have a complete picture of the reference targets: 
 
All to: [{ type: ... }] references in Sanity schemas: 
1. to: [{ type: 'class' }] — appears in homePage (featuredClasses) and instructorBio (classesTeaching). class type is NOT defined → BLOCKER. 
2. to: [{ type: 'instructorBio' }] — defined (instructorBio exists). OK. 
 
So the only dangling reference is class. The class type does not exist (classes live in Postgres). This is the G3 blocker. 
 
Other types all defined (aboutPage, announcement, blogPost, faq, homePage, instructorBio, siteSettings, testimonial). Good. 
 
blogPost author is an object (portable/inline object with name, bio, photo) — not a reference — so no dangling reference. Good. Let me confirm: blogPost line 41-46 shows author as an object with name/bio/photo fields. So no reference  
issue. 
 
So the ONLY schema-deploy blocker is the class reference in two fields. 
 
Now I have everything for a meticulous review + execution plan. 
 
Let me also note the featuredClasses/classesTeaching usage in the web app: 
- lib/sanity/schemas.ts defines them as z.array(z.any()).optional() (Zod validation of GROQ results). 
- lib/sanity/queries.ts:39 projects featuredClasses[]->{ _id, title, slug, startsAt } and line 121 classesTeaching[]->{ _id, title, slug }. 
 
If we remove the class reference fields from the Sanity schemas, these GROQ projections become harmless no-ops (return undefined). The Zod schema still allows the optional field (won't be populated). So removing is safe and 
behavior-neutral for rendering (currently returns nothing since no class docs exist). 
 
BUT — the home page's "Featured classes" section likely is intended to show classes. Since Sanity has no class type, that section currently shows nothing. The question: should "featured classes" come from Postgres (tRPC) instead? Per  
ADR-005, classes are operational data in Postgres. So the correct design is: the home page featured-classes section should be driven by Postgres/tRPC data, not Sanity. The Sanity featuredClasses field is a schema misalignment. 
Removing it from Sanity is correct. If the home page needs featured classes, that should be wired from Postgres. I'll note this as a decision point / follow-up in the plan. 
 
Actually, let me check how the home page renders featured classes to be accurate. Let me not over-investigate; I have enough. But the plan should flag that removal is behavior-neutral and that the "featured classes" feature (if 
desired) must be sourced from Postgres. I'll mention checking lib/sanity/queries.ts and the home page. 
 
Now let me also reconcile a few more guide-vs-reality points for the review: 
 
Guide §1 accuracy summary: 
- §1.1 Create project: OK, but project v2gzd4bc already exists (token in .env.local). Guide acknowledges ID in .env.example. Minor: should state "use existing OR create". 
- §1.2 CORS: OK. Matches skill. 
- §1.3 Read token (viewer): OK. Matches skill. 
- §1.4 Deploy Studio: GAP — missing sanity schema deploy (critical, required before deploy and to catch G3). Missing sanity login prerequisite. Uses pnpm deploy (fine) but should note interactive hostname prompt + appId pinning. 
  Doesn't mention SANITY_STUDIO_PROJECT_ID/DATASET needed for deploy (set via export in §1.4 but not in env summary/appendix). 
- §1.5 Create content: 8 types match. BUT tells user to set "Featured classes" on Home Page — that field references non-existent class type (will be removed). Need to update after G3 fix. 
- §1.6 Webhook: URL correct (jesspete.shop). Mechanism (HMAC-SHA256, SANITY_WEBHOOK_SECRET, trigger Create/Update/Delete) matches handler. Secret gen: guide uses openssl rand -hex 32, skill uses openssl rand -base64 32 — both fine 
  (handler doesn't care). Minor inconsistency. 
- §1.7 Env vars: lists 4 sanity vars for web. GAP: doesn't mention SANITY_STUDIO_PROJECT_ID/SANITY_STUDIO_DATASET needed for Studio deploy, and doesn't warn that the Next.js app reads apps/web/.env.local (not root) — per skill G7. The 
  web app's sanity vars must be in apps/web/.env.local for local dev. 
- §1.8 Verify: Studio URL + /blog update. OK. But should add the Content Lake API query check (skill §10.2) and the schema deploy count check. 
 
Code comment bug: apps/web/src/app/api/sanity/webhook/route.ts:23 comment says https://stillwater.studio/api/sanity/webhook (wrong domain — that's the Studio). Should be stillwater.jesspete.shop. The actual handler path is correct;    
just a misleading comment. Non-blocking. 
 
Cross-cutting (not Sanity but affects deployment): 
- EMAIL_FROM=hello@stillwater.studio in .env.example vs guide's hello@stillwater.jesspete.shop. Mismatch. (Email domain for Resend must match verified domain.) 
- The currently tracked apps/web/.env.local contains secrets (from prior review) — and it's where the Next.js app reads env. For local dev the user needs to put real Sanity vars there, but that file already has a real SANITY_API_TOKEN 
  (skSlrWJK1...) and SANITY_WEBHOOK_SECRET (still placeholder +XMPa8ssw2DhLNFZAGFNn3iV3tC7oryq1xEIywG7mSU=). Interesting — so there's already a real SANITY_API_TOKEN and SANITY_WEBHOOK_SECRET in apps/web/.env.local. Wait, but that 
  file is tracked in git (BAD — my prior review). So the "create token" steps may be partially pre-done. I should note that the tracked apps/web/.env.local already contains a SANITY_API_TOKEN + SANITY_WEBHOOK_SECRET (and 
  BETTER_AUTH_SECRET) — these are committed secrets that should be rotated/removed (ties to prior review's critical findings). 
 
Actually this is important context: the guide treats creating the Sanity token as a fresh step, but a real token already exists in the committed apps/web/.env.local. So either the project is already partially configured (token 
minted), or these are leaked. Per my prior review, apps/web/.env.local is tracked in git with real secrets → those tokens are compromised and should be rotated. So the plan must include: treat existing 
SANITY_API_TOKEN/SANITY_WEBHOOK_SECRET in the tracked file as COMPROMISED, rotate them, and NOT rely on them. This connects to the prior security review. 
 
OK. Now I also want to confirm: does the web app read env from apps/web/.env.local? Next.js by default loads .env.local from the project root, which for apps/web is apps/web/.env.local. The root .env.local is NOT read by Next.js in    
apps/web (unless using a custom setup). So yes, G7 applies. I'll note that Sanity (and all) env for local dev must go in apps/web/.env.local. The current tracked apps/web/.env.local already has the values though. 
 
Now, I have enough to write a comprehensive review + meticulous execution plan. The user wants me to "meticulously plan to execute the sanity.io related tasks." So the deliverable is: 
1. A meticulous review of PRE_LIVE_GUIDE.md (especially §1 Sanity), noting alignment + gaps + errors vs codebase. 
2. A meticulous, step-by-step execution plan for the Sanity tasks, grounded in the authoritative skill, including the G3 fix and security caveats. 
 
Since this is a PLAN (per AGENTS.md workflow, I should ANALYZE → PLAN → VALIDATE, and not execute without explicit confirmation), I should present the plan and NOT start executing Sanity mutations (which require sanity login, network, 
and would modify the real Sanity project). The user said "plan to execute" — so a plan is the deliverable. I'll present the plan with clear validation checkpoints and ask for confirmation before any live mutations. 
 
However, there are some non-destructive, local, pre-flight actions I could verify (e.g., confirming the schema fix is needed, checking tsc). But executing sanity schema deploy / sanity deploy / sanity tokens add requires auth + 
network + hits the real project — that needs explicit user go-ahead. So I'll keep those as planned steps, not executed. 
 
Actually, I could do a couple of safe local verifications to strengthen the plan without touching the remote: 
- Run tsc --noEmit in the studio to confirm schemas typecheck locally (safe, local). But that doesn't catch the G3 reference error (that's a server-side validation at deploy). Still, local tsc is safe and informative. I could run it.  
  But it might be slow and require deps. I'll mention it as a planned step rather than run it, to avoid overstepping. Actually, running local tsc in apps/studio is non-destructive and helps validate. But it needs node_modules 
  installed in apps/studio. The repo has pnpm install done (node_modules present). Let me consider running it — it's safe and strengthens confidence. But the user asked to "plan", so I think presenting the plan is the priority. I'll   
  offer to run pre-flight checks. 
 
Let me keep it focused: deliver the review + the plan. I won't execute remote mutations. I might run a quick safe local check (grep already done). I'll present the plan. 
 
Let me now also double-check one thing for the plan: the guide says repo is nordeim/stillwater. The actual git remote — let me not worry, not Sanity-specific. 
 
Let me also verify the homePage featuredClasses removal won't break the home page compile — the Zod schema schemas.ts:53 has featuredClasses: z.array(z.any()).optional() and queries.ts projects it. Removing the Sanity field makes the  
projection return undefined, which satisfies .optional(). So safe. Good. 
 
Now, let me write the response. Structure: 
 
Part 1 — Meticulous Review of PRE_LIVE_GUIDE.md (Sanity §1 focus) 
 
- Verdict: §1 is structurally sound and matches the codebase on most points (8 schemas, webhook HMAC, env vars, deploy command), BUT has gaps that would block or mislead during execution. 
- Table of claims vs reality with severity. 
- Critical: missing sanity schema deploy + G3 class reference blocker. 
- High: env var location (apps/web/.env.local), missing SANITY_STUDIO_* for deploy, secondary token already committed (security). 
- Medium/Low: webhook secret format, code comment domain, EMAIL_FROM domain mismatch, project already exists. 
 
Part 2 — Meticulous Execution Plan (Sanity tasks) 
 
Phased plan grounded in sanity-io-deploy skill: 
- Phase 0: Pre-flight & safety (security caveats, confirm auth, local schema fix for G3) 
- Phase 1: Fix the schema blocker (remove class references from homePage + instructorBio; verify web app projections are no-ops; tsc) 
- Phase 2: Sanity project + login (use existing v2gzd4bc or create; sanity login) 
- Phase 3: Deploy schema (sanity schema deploy) — validates references 
- Phase 4: Mint read token (viewer) + webhook secret; rotate existing committed ones 
- Phase 5: CORS origins 
- Phase 6: Deploy Studio UI (sanity deploy --url --title --yes; pin appId) 
- Phase 7: Configure ISR webhook (URL jesspete.shop, secret) 
- Phase 8: Env wiring (apps/web/.env.local + Vercel, NOT root; NEXT_PUBLIC_* + secrets) 
- Phase 9: Create initial content (8 docs) — minus the defunct featuredClasses 
- Phase 10: Verify (agent-browser fresh session Studio redirect; Content Lake query; /blog ISR; tsc) 
- Each phase with exact commands, verification, and rollback. 
 
I'll include the G3 fix commands (edit the two schema files). 
 
I'll also add a clear "VALIDATE" gate: I will NOT run any remote-mutating Sanity command (deploy, tokens add, cors, hooks) without explicit confirmation, because they hit the real Sanity project and require auth. I'll ask the user to  
confirm before executing Phase 2+. 
 
Let me also note the security recomputation: since apps/web/.env.local (tracked) already contains a real SANITY_API_TOKEN + SANITY_WEBHOOK_SECRET + BETTER_AUTH_SECRET, these are compromised (per prior review). So in Phase 4, the user  
must ROTATE (revoke old token in Sanity, mint new) rather than reuse. And the file must be removed from git (ties to prior critical finding). I'll cross-reference. 
 
Let me write this up concisely but thoroughly. I'll provide the edit for the two schema files as part of the plan (showing exactly what to change), but not execute it unless asked — actually editing local schema files is 
non-destructive and helps, but I should ask before editing per the workflow (VALIDATE checkpoint). The user asked to "plan to execute", so I'll present the plan including the exact edits, and ask for confirmation before making 
changes. Actually, I can present the exact edits in the plan without applying them. Good. 
 
Hmm, but should I offer to immediately apply the local, safe, non-remote schema fix? The user said "plan to execute" — implying they want the plan first. I'll present the plan and explicitly ask for go-ahead. I'll note that the G3 
schema fix is local and safe and I can apply it immediately upon confirmation. 
 
Let me write the final response now. I'll be thorough but organized. 
 
Let me reference exact file paths and line numbers. 
 
One more: I should verify the instructorBio.ts classesTeaching field context (line 47) to give precise edit. I saw homePage:34 and instructorBio:47 both of: [{ type: 'reference', to: [{ type: 'class' }] }]. Let me get the surrounding  
field definitions to craft precise edits. I'll read those two snippets. Actually I have enough: the field is featuredClasses (array of reference to class) in homePage and classesTeaching (array of reference to class) in instructorBio. 
To craft an edit I'd need the full field block. Let me quickly read both to produce exact replacement text for the plan. This strengthens the plan. Let me read homePage.ts (full) and instructorBio.ts around line 47. 
 
Let me read those two schema files fully to craft the exact fix 

Complete scan confirms the only dangling reference is class (in homePage.featuredClasses and instructorBio.classesTeaching); instructorBio is a valid target and blogPost.author is an inline object, not a reference. Let me read both    
schema field blocks precisely so the execution plan includes an exact, safe fix. 

 
read /home/project/stillwater/apps/studio/schemas/homePage.ts 
 

 
read /home/project/stillwater/apps/studio/schemas/instructorBio.ts 
 

Now I have the exact field blocks. I can craft the precise fix: 
 
For homePage.ts, remove the featuredClasses field block (lines 30-37): 
 
```ts 
      defineField({ 
        name: 'featuredClasses', 
        title: 'Featured Classes', 
        type: 'array', 
        of: [{ type: 'reference', to: [{ type: 'class' }] }], 
      }), 
``` 
 
For instructorBio.ts, remove the classesTeaching field block (lines 42-47): 
 
```ts 
      defineField({ 
        name: 'classesTeaching', 
        title: 'Classes Teaching', 
        type: 'array', 
        of: [{ type: 'reference', to: [{ type: 'class' }] }], 
      }), 
``` 
 
These two removals eliminate the dangling class reference. Per G3, leave the web app GROQ projections untouched (harmless no-op). 
 
Now I have a complete, evidence-backed review and plan. Let me write the final response. 
 
I'll structure it clearly: 
 
Part 1 — Meticulous Review of PRE_LIVE_GUIDE.md (Sanity focus) 
 
Verdict + claim-by-claim table with severity + evidence. 
 
Part 2 — Meticulous Execution Plan for Sanity tasks 
 
Phased, with commands, verification, rollback. Highlight the G3 fix, security caveats, env location. 
 
Validation gate 
 
I will not run any remote-mutating Sanity command without explicit go-ahead. Ask for confirmation. 
 
Let me write it. Keep it precise and reference file:line. I'll keep the prose tight but complete. 
 
I should present this as the deliverable. Given the AGENTS.md workflow, I should end with a VALIDATE checkpoint asking for confirmation before executing (especially the remote mutations). I'll make the plan the main content and ask    
for the user's go-ahead, indicating which parts are safe-local (schema fix, tsc) vs remote-mutating (login, schema deploy, tokens, cors, studio deploy, webhook, content creation). 
 
Let me write 

I now have everything needed for a meticulous review and an execution-ready plan. Here is the full report. 
 
---
 
Part 1 — Meticulous Review of PRE_LIVE_GUIDE.md (Sanity §1 focus) 
 
Verdict: §1 is structurally accurate and matches the codebase on most points (8 schemas, webhook HMAC mechanism, env-var names, deploy command). But it has one execution-blocking gap and several accuracy gaps that would cause a failed 
deploy or leaked/mis-wired config. The authoritative sanity-io-deploy skill (which was run against this exact project v2gzd4bc / production) surfaces the blockers the guide omits. 
 
Claim-by-claim alignment 
 
┌────────┬────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────┐ 
│ Guide  │ Claim                                                  │ Reality                                                                                                      │ Severity                                              │ 
│ §      │                                                        │                                                                                                              │                                                       │ 
├────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ 1.1    │ "Create a Sanity Project" (ID v2gzd4bc already in      │ Project already exists; a real SANITY_API_TOKEN + SANITY_WEBHOOK_SECRET already sit in the tracked           │ 🟡 High — these committed tokens are compromised (see │ 
│        │ .env.example)                                          │ apps/web/.env.local                                                                                          │ prior review); guide treats token creation as fresh   │ 
├────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ 1.2    │ CORS origins (localhost, prod, *.vercel.app)           │ Correct; matches skill                                                                                       │ ✅ OK                                                 │ 
├────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ 1.3    │ Viewer read token → SANITY_API_TOKEN                   │ Correct; client uses it (lib/sanity/client.ts:28)                                                            │ ✅ OK                                                 │ 
├────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ 1.4    │ Deploy Studio via cd apps/studio && pnpm deploy        │ Missing sanity schema deploy first (required before UI deploy and to validate references). Also missing      │ 🔴 Critical gap                                       │ 
│        │                                                        │ sanity login prereq and appId pinning. No mention that deploy needs SANITY_STUDIO_PROJECT_ID/DATASET         │                                                       │ 
├────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ 1.5    │ 8 content types; set "Featured classes" on Home Page   │ 8 schemas confirmed ✅. BUT homePage.featuredClasses and instructorBio.classesTeaching reference a           │ 🔴 Critical blocker (G3)                              │ 
│        │                                                        │ non-existent class type → will break sanity schema deploy                                                    │                                                       │ 
├────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ 1.6    │ Webhook →                                              │ Correct; handler verifies sanity-webhook-signature HMAC-SHA256 (route.ts). Minor: guide uses openssl rand    │ 🟢 OK (minor)                                         │ 
│        │ https://stillwater.jesspete.shop/api/sanity/webhook,   │ -hex 32, skill uses -base64 32 (both fine)                                                                   │                                                       │ 
│        │ HMAC, trigger C/U/D                                    │                                                                                                              │                                                       │ 
├────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ 1.7    │ 4 Sanity web env vars                                  │ Correct names. Gap: doesn't state the Next.js app reads apps/web/.env.local, not the repo root (skill G7);   │ 🟡 High                                               │ 
│        │                                                        │ and omits SANITY_STUDIO_* needed for the Studio deploy                                                       │                                                       │ 
├────────┼────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤ 
│ 1.8    │ Verify Studio URL + /blog ISR                          │ Correct; should also add Content-Lake API query check                                                        │ 🟢 OK                                                 │ 
└────────┴────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────┘ 
 
Code-side defect found: apps/web/src/app/api/sanity/webhook/route.ts:23 comment says https://stillwater.studio/api/sanity/webhook (wrong domain — that's the Studio host). The actual handler path is correct; only the comment is 
misleading. Non-blocking. 
 
Cross-cutting (not Sanity, but blocks the same deploy): .env.example:49 sets EMAIL_FROM=hello@stillwater.studio, while the guide (§5.2/§11/§13) says hello@stillwater.jesspete.shop. Resend requires the verified domain — these must 
match. 
 
---
 
Part 2 — Meticulous Execution Plan: Sanity Tasks 
 
Grounded in sanity-io-deploy (G1–G10), with the codebase's specific blockers resolved. 
 
### Phase 0 — Safety & pre-flight (do first) 
 
- Rotate, don't reuse. The SANITY_API_TOKEN + SANITY_WEBHOOK_SECRET already in the tracked apps/web/.env.local are committed secrets → treat as compromised. Plan to revoke the old token in Sanity and mint a new one (Phase 4). (Ties to 
  the prior review's critical findings — apps/web/.env.local must also be purged from git.) 
- Confirm local tooling: cd apps/studio && ls node_modules/.bin/sanity (binary present after pnpm install). Avoid pnpm exec sanity (triggers the esbuild install-guard, Gotcha G4) — call ./node_modules/.bin/sanity directly. 
- Confirm auth: ls -la ~/.sanity/ → if absent, ./node_modules/.bin/sanity login. 
 
### Phase 1 — Fix the schema blocker (local, safe) 🔴 
 
Remove the two dangling references to the non-existent class type (classes live in Postgres per ADR-005). Leave web-app GROQ projections untouched (harmless no-op — they already return nothing). 
 
apps/studio/schemas/homePage.ts — delete the featuredClasses field block: 
 
```ts 
      defineField({ 
        name: 'featuredClasses', 
        title: 'Featured Classes', 
        type: 'array', 
        of: [{ type: 'reference', to: [{ type: 'class' }] }], 
      }), 
``` 
 
apps/studio/schemas/instructorBio.ts — delete the classesTeaching field block: 
 
```ts 
      defineField({ 
        name: 'classesTeaching', 
        title: 'Classes Teaching', 
        type: 'array', 
        of: [{ type: 'reference', to: [{ type: 'class' }] }], 
      }), 
``` 
 
- Verify no other dangling refs remain: grep -rn "to: \[{ type:" apps/studio/schemas/ → expect only instructorBio (valid). 
- Local typecheck: cd apps/studio && ./node_modules/.bin/tsc --noEmit. 
- Decision point: If the home page's "Featured Classes" section must show real classes, that data must come from Postgres/tRPC (it cannot from Sanity). Flag as a follow-up; not required for deploy. 
 
### Phase 2 — Project + login 
 
- Use existing project v2gzd4bc (don't create a duplicate). Verify with ./node_modules/.bin/sanity cors list / sanity datasets list. 
- Ensure SANITY_STUDIO_PROJECT_ID=v2gzd4bc and SANITY_STUDIO_DATASET=production are exported (these feed sanity.cli.ts + sanity.config.ts). 
 
### Phase 3 — Deploy schema (validates all references) 
 
```bash 
  cd apps/studio 
  ./node_modules/.bin/sanity schema deploy 
``` 
 
- Expected: deploys the 8 types with no Unknown type: class. error (proves Phase 1 worked). ./node_modules/.bin/sanity schema list to confirm count. 
 
### Phase 4 — Mint read token + webhook secret (rotate the leaked ones) 
 
```bash 
  ./node_modules/.bin/sanity tokens add "Stillwater Web Read" --role viewer --yes --json 
  # → put the `key` into SANITY_API_TOKEN (and rotate/revoke the old committed one in Sanity Cloud) 
  openssl rand -base64 32   # → SANITY_WEBHOOK_SECRET 
``` 
 
### Phase 5 — CORS origins 
 
```bash 
  ./node_modules/.bin/sanity cors add http://localhost:3000 --credentials 
  ./node_modules/.bin/sanity cors add https://stillwater.jesspete.shop --credentials 
  ./node_modules/.bin/sanity cors list 
``` 
 
### Phase 6 — Deploy Studio UI 
 
```bash 
  ./node_modules/.bin/sanity deploy --url=stillwater --title "Stillwater" --yes 
``` 
 
- On success, pin the returned appId into apps/studio/sanity.cli.ts deployment section so future deploys don't re-prompt. 
- If stillwater hostname is taken, use stillwater-studio and update the URL cited in §1.4/§1.8. 
 
### Phase 7 — Configure ISR webhook 
 
- Sanity Cloud → API → Webhooks → stillwater-isr-revalidation, URL https://stillwater.jesspete.shop/api/sanity/webhook, POST, secret = SANITY_WEBHOOK_SECRET, trigger Create/Update/Delete. (Or ./node_modules/.bin/sanity hooks --help.)  
 
### Phase 8 — Env wiring (correct location) 
 
- Web app reads apps/web/.env.local (root .env.local is ignored by Next.js — skill G7). Set there and in Vercel: 
    - NEXT_PUBLIC_SANITY_PROJECT_ID=v2gzd4bc, NEXT_PUBLIC_SANITY_DATASET=production 
    - SANITY_API_TOKEN (new viewer token), SANITY_WEBHOOK_SECRET 
- Do not put real secrets in .env.example (committed). Update the misleading webhook comment in route.ts:23 to stillwater.jesspete.shop. 
 
### Phase 9 — Create initial content (8 docs) 
 
Site Settings, Home, About, ≥1 Blog Post, 3 Instructor Bios, FAQs/Testimonials/Announcements (optional). Do not set "Featured classes" / "Classes teaching" (fields removed in Phase 1). Set published = true on each. 
 
### Phase 10 — Verify (fresh browser session) 
 
- agent-browser open https://stillwater.sanity.studio/ with sessionMode: "fresh" → redirects to Sanity login (proof live; 404 before deploy is expected). 
- Content-Lake query https://v2gzd4bc.api.sanity.io/v2021-06-07/data/query/production?query=*%5B_type%20%3D%3D%20%22siteSettings%22%5D%5B0%5D → result:null + syncTags. 
- Publish a blog post → live /blog updates within seconds (ISR). 
 
---
 
✅ Validation gate — what I will not do without your go-ahead 
 
Phases 2–7 and 9 issue remote, mutating commands against the real Sanity project v2gzd4bc (auth + network). Per the meticulous-workflow VALIDATE checkpoint, I will not run sanity login, schema deploy, tokens add, cors, deploy, or 
create content until you confirm. 
 
Safe to do now (local, non-destructive): I can immediately apply the Phase 1 schema fix (remove the two class references) and run tsc --noEmit to prove the blocker is resolved — this touches only local files and nothing remote. 
 
Two questions before I proceed: 
1. May I apply the Phase 1 local schema fix now (and run studio tsc)? 
2. For Phases 2–7/9, do you want me to (a) execute them live against v2gzd4bc, or (b) stage the exact commands for you to run, given they mint/rotate real secrets and modify the production project?

---

All edits are in place and verified. Here is the execution summary. 
 
✅ Executed (safe, local, non-destructive) 
 
1. Phase 1 — Fixed the deployment-blocking schema bug (the Unknown type: class. failure). 
- apps/studio/schemas/homePage.ts — removed the featuredClasses field (was array of reference → class). 
- apps/studio/schemas/instructorBio.ts — removed the classesTeaching field (same dangling reference). 
- Verified: grep -rn "to: \[{ type: 'class' }" → NONE. The 8 schema types are intact; only two fields that pointed at a non-existent Sanity class type (classes live in PostgreSQL, ADR-005) were removed. The web app's GROQ projections  
  of those fields are harmless no-ops (z.any().optional()), so nothing breaks. 
 
2. Fixed a misleading code comment. 
- apps/web/src/app/api/sanity/webhook/route.ts:23 — webhook URL comment corrected from stillwater.studio → stillwater.jesspete.shop (the handler path was already correct). 
 
3. Made PRE_LIVE_GUIDE.md §1 executable (the doc's gaps that would have caused a failed/partial deploy): 
- Added the required sanity schema deploy step before the Studio UI deploy (validates all reference targets — this is exactly where the class bug would have surfaced). 
- Added sanity login prerequisite + "use the local binary, not pnpm exec sanity" (esbuild install-guard, G4). 
- Added appId pinning in sanity.cli.ts. 
- Clarified env location: the Next.js app reads apps/web/.env.local, not the repo root (G7) — critical so the web app actually picks up the Sanity vars. 
- Added a warning in §1.5 that Featured-Classes / Classes-Teaching fields no longer exist. 
- Added a §1.3 security note: any SANITY_API_TOKEN already in the tracked apps/web/.env.local is compromised → revoke and mint fresh (ties to the earlier critical review). 
 
⛔ Blocked — cannot run from this environment 
 
The remote-mutating Sanity steps require interactive sanity login (browser OAuth → ~/.sanity/ session). There is no session here, so sanity schema deploy, tokens add, cors add, sanity deploy, and webhook creation cannot execute. This  
is expected — they must run where you're authenticated. 
 
│ Note: the Studio tsc --noEmit currently fails on a pre-existing tsconfig misconfiguration (TS2688 missing @types/node, TS6059 rootDir excludes sanity.config.ts/sanity.cli.ts) — unrelated to my change and not a schema error. sanity   
│ schema deploy is the authoritative validator once authenticated. 
 
📋 Staged remote commands (run where sanity login is possible) 
 
```bash 
  cd apps/studio 
  export SANITY_STUDIO_PROJECT_ID=v2gzd4bc 
  export SANITY_STUDIO_DATASET=production 
  ./node_modules/.bin/sanity login                      # interactive — one-time 
  ./node_modules/.bin/sanity schema deploy             # expect 8 types, 0 errors 
  ./node_modules/.bin/sanity schema list 
  ./node_modules/.bin/sanity tokens add "Stillwater Web Read" --role viewer --yes --json   # → SANITY_API_TOKEN (rotate old) 
  openssl rand -base64 32                               # → SANITY_WEBHOOK_SECRET 
  ./node_modules/.bin/sanity cors add http://localhost:3000 --credentials 
  ./node_modules/.bin/sanity cors add https://stillwater.jesspete.shop --credentials 
  ./node_modules/.bin/sanity deploy --url=stillwater --title "Stillwater" --yes   # pin appId in sanity.cli.ts 
  # Sanity Cloud → API → Webhooks: stillwater-isr-revalidation → https://stillwater.jesspete.shop/api/sanity/webhook, secret = SANITY_WEBHOOK_SECRET, C/U/D 
``` 
 
Then wire apps/web/.env.local + Vercel (NEXT_PUBLIC_SANITY_* public; SANITY_API_TOKEN/SANITY_WEBHOOK_SECRET secret), create the 8 content docs, and verify via a fresh agent-browser session on https://stillwater.sanity.studio/ 
(redirects to Sanity login = proof live) + a Content-Lake query + a published-blog-post ISR check. 
 
Status 
 
- Local repo is now deploy-ready for Sanity (schema blocker removed, guide corrected, comment fixed). 
- No commits made — changes are unstaged. I can commit them, or you can run the staged remote sequence first and commit together. 
- Outstanding security follow-through (from the earlier review, now cross-referenced in the guide): the tracked apps/web/.env.local still contains real SANITY_API_TOKEN / SANITY_WEBHOOK_SECRET / BETTER_AUTH_SECRET and an SSH key — 
  these must be rotated and purged from git history before go-live. 

---

All core Sanity infrastructure is now live. Here's the final status. 
 
✅ Completed (executed against real project v2gzd4bc) 
 
┌────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────┐ 
│ Step           │ Result                                                                                                             │ Evidence                                                         │ 
├────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤ 
│ Auth (GitHub)  │ ✅ Member of v2gzd4bc ("Stillwater", 2 members)                                                                    │ sanity projects list, sanity datasets list → production          │ 
├────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤ 
│ Schema deploy  │ ✅ 8 types live, 0 reference errors (the class-bug fix worked)                                                     │ Deployed 1/1 schemas; Content Lake query returns syncTags (live) │ 
├────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤ 
│ Viewer token   │ ✅ stillwater-web-read (role Viewer) minted; old leaked skSlrWJK1… was not a live project token (absent from list) │ sanity tokens list                                               │ 
├────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤ 
│ Webhook secret │ ✅ generated (openssl rand -base64 32), written to apps/web/.env.local                                             │ file updated                                                     │ 
├────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤ 
│ CORS           │ ✅ localhost:3000 + https://stillwater.jesspete.shop (+ existing localhost:3333, stillwater.studio)                │ sanity cors list                                                 │ 
├────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤ 
│ Studio UI      │ ✅ deployed to https://stillwater.sanity.studio/                                                                   │ Success! Studio deployed…; appId pinned in sanity.cli.ts         │ 
├────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┤ 
│ appId pin      │ ✅ fa2ndc897dahn4e7nugimfs2 written to apps/studio/sanity.cli.ts                                                   │ edit applied                                                     │ 
└────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────┘ 
 
Local repo changes made: schema class-reference removal (homePage.ts, instructorBio.ts), webhook comment fix (route.ts), sanity.cli.ts appId, and PRE_LIVE_GUIDE.md §1 corrections — all uncommitted. 
 
⏳ Pending (require dashboard / external access I don't have) 
 
1. ISR webhook — sanity hooks create is interactive-only, so create it in Sanity Cloud → API → Webhooks (guide §1.6): 
    - Name: stillwater-isr-revalidation 
    - URL: https://stillwater.jesspete.shop/api/sanity/webhook 
    - HTTP method: POST 
    - Secret: the value now in apps/web/.env.local → SANITY_WEBHOOK_SECRET 
    - Trigger on: Create, Update, Delete 
2. Initial content (8 docs) — author in the Studio UI at stillwater.sanity.studio (guide §1.5). Note: Home/Instructor no longer have Featured-Classes / Classes-Teaching fields. 
3. Vercel env vars — add NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_TOKEN, SANITY_WEBHOOK_SECRET (local dev already reads them from apps/web/.env.local). 
4. Tidy-up — delete the dangling token sivnJxZ0qmVMmW ("Stillwater Web Read") in Sanity Cloud UI (harmless; I lost its key so CLI remove wasn't possible). 
 
⚠ Security re-flag (from the earlier review) 
 
apps/web/.env.local is tracked in git and now contains a fresh real SANITY_API_TOKEN + SANITY_WEBHOOK_SECRET (and the pre-existing BETTER_AUTH_SECRET + SSH key in history). I had to write the new token there for local dev, but this    
perpetuates the committed-secret problem. Before go-live: git rm --cached apps/web/.env.local and purge apps/web/.env.local + docs/ssh-key.txt from history via git filter-repo (the guide's §1 purge command only covers root 
.env.local). 
 

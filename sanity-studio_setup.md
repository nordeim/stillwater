Now in a fresh session, the URL redirected to https://www.sanity.io/api/dashboard/authenticate/session?redirectTo=%2F%40ojFKxDD74%2Fstudio%2Ffa2ndc897dahn4e7nugimfs2. 
 
This is the Sanity authentication redirect — the Studio IS deployed and live; it's redirecting to the Sanity login because the (unauthenticated) browser session isn't logged in. This confirms: 
1. The Studio is now deployed and reachable at https://stillwater.sanity.studio/. 
2. It's no longer 404 — it now serves the Studio app, which requires Sanity login. 
 
The redirect URL https://www.sanity.io/api/dashboard/authenticate/session?redirectTo=/@ojFKxDD74/studio/fa2ndc897dahn4e7nugimfs2 shows the studio app id fa2ndc897dahn4e7nugimfs2 (matches what we pinned) and the organization/user. 
 
So the deploy succeeded and the Studio is live. The earlier 404 was a cached response in the reused session (and/or CDN propagation). 
 
Let me confirm by snapshotting the login page to show it's the Sanity login (proving the Studio app is being served). Let me snapshot -i to see the login form. Actually, the eval/snapshot would show a login page. Let me do a quick 
snapshot to confirm it's the Sanity auth page (not an error). 
 
Let me snapshot. 

That's the proof we needed. In a fresh session the URL redirects to Sanity's authentication endpoint (sanity.io/api/dashboard/authenticate/...?redirectTo=/@ojFKxDD74/studio/fa2ndc897dahn4e7nugimfs2) — meaning the Studio app is now 
deployed and live; it just requires a Sanity login (which the headless browser doesn't have). The earlier 404 was a cached response in the reused session. Let me snapshot to confirm it's the real Sanity login screen. 

 
agent_browser snapshot -i 
 
Origin: https://www.sanity.io/login?type=token&origin=https%3A%2F%2Fwww.sanity.io%2Fapi%2Fdashboard%2Fauthenticate%3FredirectTo%3D%252F%2540ojFKxDD74%252Fstudio%252Ffa2ndc897dahn4e7nugimfs2 
Refs: 18 
 
- link "Privacy Policy" [ref=e8] 
- button "PREFERENCES" [ref=e9] 
- button "ACCEPT ALL" [ref=e10] 
- button "REJECT NON-ESSENTIAL" [ref=e11] 
- link "Privacy Policy" [ref=e12] 
- button "PREFERENCES" [ref=e13] 
- button "ACCEPT ALL" [ref=e14] 
- button "REJECT NON-ESSENTIAL" [ref=e15] 
... (10 more lines, 22 total, ctrl+o to expand) 
 

The snapshot confirms: the URL redirected to https://www.sanity.io/login?type=token&origin=... which is the Sanity login page ("Log in to your account / Continue with Google / Continue with GitHub / Continue with email"). This is the  
standard Sanity authentication screen that wraps the Studio. 
 
This definitively confirms: 
- The Studio is deployed and live at https://stillwater.sanity.studio/. 
- It's no longer 404. 
- The 404 was a cached response in the reused browser session. 
 
The deploy is complete and verified. 
 
Now let me summarize for the user: 
- Deployed the Studio to https://stillwater.sanity.studio/ (exit 0, "Success!"). 
- Schema deployed (1/1). 
- Pinned appId in sanity.cli.ts. 
- Verified via agent-browser (fresh session): the URL now redirects to Sanity login (proves Studio is live). The earlier 404 was cached state in the reused session. 
 
I should also mention: 
- To use the Studio, log in via the browser at that URL (Google/GitHub). The user (nordeimkuahsziyp@outlook.com via GitHub) can log in. 
- The webhook secret is still real but unused until they configure the Sanity webhook (offered earlier). 
 
Let me write a concise final summary. Keep it tight per communication style. Include the verification evidence. 
 
Should I clean up the broken pnpm-workspace.yaml placeholder? It's a minor thing. I'll mention it as a note but not fix (out of scope, and deploy worked). Actually, for meticulousness, the placeholder allowBuilds: esbuild: set this to 
true or false is invalid. But since deploy worked without fixing it, I'll just note it as an optional cleanup. I'll keep the summary focused. 
 
Actually, let me reconsider whether to fix the pnpm-workspace.yaml. It's part of the studio-stillwater project. A broken/invalid value could cause pnpm install to fail if anyone runs it there (as we saw the install guard issue). For   
robustness, fixing it to allowBuilds: { esbuild: true } would be good. But it's a judgment call and slightly out of the "deploy" scope. Given the user said "meticulously execute the deploy", I'll keep focus on deploy and mention the   
pnpm-workspace.yaml as a follow-up note. I won't change it now to avoid unrequested modifications (AGENTS.md: "Don't 'improve' adjacent code"). 
 
Let me write the final summary. 
 
Let me give: 
- Status: ✅ Deployed & verified. 
- Evidence. 
- What's next (login to use; webhook still pending). 
 
Concise. 

✅ Studio deployed and verified 
 
Deploy (exit 0): 
 
``` 
  ✔ Creating studio hostname → https://stillwater.sanity.studio 
  ✔ Build Sanity Studio (4177ms) 
  ✔ Deployed 1/1 schemas 
  ✔ Deploying to sanity.studio 
  Success! Studio deployed to https://stillwater.sanity.studio/ — "Stillwater" 
``` 
 
I also pinned appId: 'fa2ndc897dahn4e7nugimfs2' into studio-stillwater/sanity.cli.ts so future deploys don't re-prompt. 
 
Browser verification (fresh session, via agent-browser): 
- Before: https://stillwater.sanity.studio/ → 404 "Studio not found". 
- Now: the URL redirects to the Sanity login (https://www.sanity.io/login?type=token&origin=…/studio/fa2ndc897dahn4e7nugimfs2), showing the real "Log in to your account / Continue with Google / GitHub" screen. 
 
That redirect is the definitive proof the Studio is live — the app is being served; it just requires a Sanity login the headless browser doesn't have. (The earlier 404 was a cached response in the reused browser session, not a real    
state.) 
 
What this means 
 
- Your deployed Sanity URL works: https://stillwater.sanity.studio/ — open it and log in (GitHub/Google, e.g. the nordeimkuahsziyp@outlook.com account used during setup) to author the 8 content types. 
- Full chain is now live: Studio (authoring) → Content Lake production (deployed schema + dataset, confirmed reachable earlier) → Next.js app (apps/web, env wired to v2gzd4bc/production with the real read token). 
 
Still pending (from earlier) 
 
- Sanity webhook for ISR revalidation isn't configured yet — the SANITY_WEBHOOK_SECRET in your .env.local is real but unused until a webhook calls https://stillwater.sanity.studio/api/sanity/webhook (or localhost:3000) with that 
  secret. Say the word and I'll create it via sanity hooks add. 
 
One minor note (not blocking): studio-stillwater/pnpm-workspace.yaml still has a placeholder allowBuilds: esbuild: set this to true or false from the scaffolding — harmless for deploys (esbuild ran fine), but I can clean it to a valid 
allowBuilds: { esbuild: true } if you'd like.

---

The skill is written and verified — frontmatter parses cleanly and the structure is intact.

Summary

I distilled the entire task into a comprehensive, agent-ready skill at /home/pete/.pi/agent/skills/sanity-io-deploy/SKILL.md (≈18.5 KB, 14 sections). It's built so another coding agent
can repeat this without the hiccups we hit.

What it covers:
- §1 Mental model — the schema deploy ≠ studio deploy distinction (the root cause of "Studio not found" 404s), and the standalone-sibling rule.
- §2–§3 Trigger conditions + the pre-flight folder-layout check (stop if you can't see the Studio; ask if multiple app candidates).
- §4–§9 The full pipeline: confirm/scaffold Studio → populate the empty template schema → deploy schema → wire env → mint tokens/secrets → CORS → deploy Studio UI (with appId pinning) →
  optional webhook.
- §10 agent-browser verification — including the fresh-session trick and the exact eval-expression gotcha.
- §11 Critical gotchas (G1–G10) — each with the verbatim error string and the precise fix:
    - G1 empty template schema, G2 two-studios trap, G3 Unknown type: class. (the dangling-reference deploy failure), G4 pnpm exec install-guard (use ./node_modules/.bin/sanity), G5
      invalid pnpm-workspace.yaml placeholder, G6 no whoami, G7 env-file location, G8 reused-session cached 404, G9 eval return error, G10 secrets in .env.example.
- §12 Command cheat-sheet, §13 Verification checklist, §14 Decision points to surface to the user.

Every command uses the local-binary invocation, exact flags (--url, --role viewer --yes --json, sessionMode: fresh), and real values from this engagement, so it's copy-paste reliable. It
explicitly references the sanity-best-practices companion skill for the conceptual "why."

One note: the skill is written for the general pattern (project id / hostname as placeholders) rather than hardcoding v2gzd4bc, so it stays reusable across future Sanity onboarding tasks.


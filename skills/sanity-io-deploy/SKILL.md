---
name: sanity-io-deploy
description: Connect an existing Next.js app to a standalone Sanity Studio — confirm/scaffold the Studio as a sibling folder (never embedded), migrate or author the content schema, deploy the schema and the Studio UI to Sanity hosting, mint a read token + webhook secret, wire env vars, add CORS origins, and verify the live deployment with a headless browser. Use when a task references a Sanity onboarding doc ("Get started with Sanity"), "connect Sanity to my existing Next.js app", a standalone Studio in a sibling folder, or any of `npm create sanity`, `sanity deploy`, `sanity schema deploy`, `sanity cors`, `sanity tokens`. Companion to the `sanity-best-practices` skill.
---

# Sanity Studio: Setup, Configuration, Deployment & Verification

A field-tested playbook for wiring an existing Next.js app to a **standalone** Sanity Studio
and getting it live without the usual false starts. Every command below was run against a real
project (`v2gzd4bc`, dataset `production`, Studio folder `studio-stillwater` beside a
`stillwater` monorepo). The gotchas section lists the exact error strings you will hit and the
precise fix for each.

---

## 1. Mental model (read this first)

Two completely separate things get deployed, and confusing them is the #1 source of wasted time:

| Artifact | Command | Lives at | Purpose |
|---|---|---|---|
| **Schema** (content model) | `sanity schema deploy` | Content Lake (`*.api.sanity.io`) | Defines document types the app queries |
| **Studio UI** (authoring app) | `sanity deploy` | `*.sanity.studio` | The editing interface humans log into |

- `sanity schema deploy` does **NOT** publish the Studio. A Studio URL returning
  `404 "Studio not found"` almost always means the *schema* was deployed but the *UI* was not.
- The app never talks to `*.sanity.studio`. It reads the **Content Lake API**
  (`https://<projectId>.api.sanity.io/...`) via the public CDN. The Studio is only for authors.
- **Standalone Studio rule:** the Studio is its own folder next to the app, **not** embedded
  inside it. Embedding (`next-sanity/studio`) is explicitly not recommended by Sanity — slower
  builds, no auto-updates, no TypeGen watch mode. Keep it sibling.

---

## 2. When to use this skill

- A task doc says "Set up Sanity", references `sanity-best-practices`' `getting-started`, and
  mentions a Studio in a `studio*` / `studio-*` sibling folder.
- "Connect Sanity to my existing Next.js app."
- You need to deploy a Studio to Sanity hosting, add CORS, mint a read token, or configure a
  webhook secret.
- You must verify a deployment with a browser (`agent-browser`).

**Companion skill:** load `sanity-best-practices` and read its `get-started.md`, `nextjs.md`,
and `project-structure.md` references for the conceptual "why". This skill is the
"here are the exact commands and the traps" companion.

---

## 3. Pre-flight: confirm the folder layout

The working directory is usually a **parent** folder with the Studio and the app as siblings:

```
some-parent/
├── studio-stillwater/   ← Sanity Studio (standalone)  [THE studio]
└── stillwater/          ← Next.js monorepo (apps/web) [THE app]
```

Do this **before** anything else (the onboarding doc often instructs it):

1. Confirm both folders are visible from your cwd. If you only see the app's source, **stop and
   tell the user to restart you from the parent folder** — you won't be able to see the Studio.
2. Identify the app folder: a sibling of the Studio with its own `package.json` (commonly
   `web/`, `apps/web/`, or the repo root). If multiple candidates exist, **ask** — never assume.
3. Confirm the Studio is standalone. If it lives inside the app (`apps/studio/`), decide with the
   user whether the task's "studio" is that in-app one or a new sibling. (See §7, "Two studios"
   trap.)

---

## 4. Phase 1 — Studio & Schema

### 4.1 Studio already created?
If `sanity.config.ts` exists in the Studio folder, read it for `projectId` + `dataset`. If not,
scaffold it from the **repo root, not inside the app**:

```bash
npm create sanity@latest -- --project <projectId> --dataset production \
  --template clean --typescript --output-path studio
```

### 4.2 Schema present?
Look in `schemaTypes/` (clean template) or `schemas/` (monorepo style).

**CRITICAL:** a Studio created by the onboarding wizard (`npm create sanity`) ships with an
**EMPTY** schema:

```ts
// studio-stillwater/schemaTypes/index.ts  (fresh from template)
export const schemaTypes = []
```

If you `sanity schema deploy` like this, it "succeeds" with **0 types** — the Studio can't
author anything and every app query returns empty. You MUST populate it first. Copy the real
content types in (flat or `documents/objects/` split — both are fine), then rewrite
`schemaTypes/index.ts` to export them:

```ts
import { siteSettings } from './siteSettings'
// ... import all 8 types
export const schemaTypes = [siteSettings, /* ... */]
```

**Verify schemas are self-contained before copying:** a `index.ts` that imports siblings is
fine, but make sure every imported file exists in the destination. Check for hidden local deps:

```bash
grep -rnE "from '(\.\/|\.\.\/)" studio-stillwater/schemaTypes/*.ts
```

If a schema references `from '../something'`, resolve it before copying or the deploy fails.

### 4.3 Deploy the schema (validates reference targets!)
```bash
cd studio-stillwater
./node_modules/.bin/sanity schema deploy     # NOT `pnpm exec sanity` — see Gotcha G4
```

`Schema deploy` **validates every reference target**. This is where latent bugs in
never-deployed studios surface (see Gotcha G3).

---

## 5. Phase 2 — Frontend integration (env wiring)

The app reads these from its **own** `.env.local` (Next.js loads `.env.local` from the
directory it runs in — usually `apps/web/.env.local`, **not** the monorepo root). Set them in
both the app's env and the root env for safety:

```dotenv
# ─── Sanity CMS ────────────────────────────────────────────────────
# Standalone Studio: studio-stillwater/ (Sanity project <projectId>)
NEXT_PUBLIC_SANITY_PROJECT_ID=<projectId>
NEXT_PUBLIC_SANITY_DATASET=production

# Read-only (viewer) token — mint via `sanity tokens add` (see §6)
SANITY_API_TOKEN=<token>

# Webhook secret for ISR revalidation (generate: openssl rand -base64 32)
SANITY_WEBHOOK_SECRET=<secret>
```

- `NEXT_PUBLIC_*` are public (safe to commit in `.env.example` as a hint).
- `SANITY_API_TOKEN` and `SANITY_WEBHOOK_SECRET` are **secrets** — keep them only in
  `.env.local`, **never** in `.env.example` (that file is committed). A good `client.ts` already
  has a null-fallback so the build won't break if these are missing.
- The app's existing Sanity client typically already reads `process.env.NEXT_PUBLIC_SANITY_*`
  directly. **Do not rewrite the client** to a new pattern unless asked — point the env at the
  new project and leave the (tested) integration code alone.

---

## 6. Phase 3 — Auth, tokens & secrets

### 6.1 Are you logged in?
There is **no `sanity whoami` command** (Gotcha G6). Check for a cached session instead:

```bash
ls -la ~/.sanity/ 2>/dev/null && echo "session present" || echo "not logged in"
```

If absent, `npm create sanity` / `sanity login` establishes one. The session from the onboarding
login persists across later CLI calls, so `schema deploy` / `cors` / `deploy` usually just work.

### 6.2 Mint a read token (least privilege = `viewer`)
```bash
./node_modules/.bin/sanity tokens add "Stillwater Web Read" --role viewer --yes --json
# → { "id": "...", "key": "sk...", "roles":[{"name":"viewer"}], ... }
```
Put the `key` into `SANITY_API_TOKEN`. Use `viewer` (read-only) for app content reads — never an
editor/admin token.

### 6.3 Generate a webhook secret
```bash
openssl rand -base64 32
```
Put the output into `SANITY_WEBHOOK_SECRET`. This is *your* shared secret; it only takes effect
once you configure the Sanity webhook (see §9).

---

## 7. Phase 4 — CORS origins

The app (and the Studio's own preview) must be allowed to read the API:

```bash
./node_modules/.bin/sanity cors add http://localhost:3000 --credentials
./node_modules/.bin/sanity cors add https://<your-domain> --credentials
# The Studio itself is auto-added as http://localhost:3333
```

Verify:
```bash
./node_modules/.bin/sanity cors list
```

---

## 8. Phase 5 — Deploy the Studio UI

Schema deployed ≠ Studio live. Deploy the UI:

```bash
cd studio-stillwater
./node_modules/.bin/sanity deploy --url=<hostname> --title "Stillwater" --yes
```

- `--url=stillwater` → `https://stillwater.sanity.studio`. If the hostname is taken by another
  project it errors; pick another (e.g. `stillwater-studio`).
- `--yes` + `--title` make it unattended (no prompts).
- Build uses Vite/esbuild (~4s). On success you get:
  ```
  Success! Studio deployed to https://stillwater.sanity.studio/ — "Stillwater"
  Add appId: 'fa2ndc897dahn4e7nugimfs2' to the `deployment` section in sanity.cli.ts ...
  ```
- **Pin the `appId`** in `sanity.cli.ts` so future deploys don't re-prompt:
  ```ts
  export default defineCliConfig({
    api: { projectId: '<projectId>', dataset: 'production' },
    deployment: { autoUpdates: true, appId: 'fa2ndc897dahn4e7nugimfs2' },
  })
  ```

---

## 9. Phase 6 — (Optional) Configure the ISR webhook

The webhook secret is real but inert until a Sanity webhook calls your endpoint. The app already
has the handler (e.g. `apps/web/src/app/api/sanity/webhook/route.ts`) that HMAC-verifies
`SANITY_WEBHOOK_SECRET`. Create the webhook (CLI or Sanity Cloud UI):

- URL: `https://<domain>/api/sanity/webhook` (dev: `http://localhost:3000/api/sanity/webhook`)
- Secret: the value in `SANITY_WEBHOOK_SECRET`
- Trigger: on publish/update of your content types

(Use `./node_modules/.bin/sanity hooks --help` to create it via CLI.)

---

## 10. Phase 7 — Verify with `agent-browser`

Use the **native `agent_browser` tool** (not a bash `agent-browser` invocation). Recipe:
`open` → `snapshot -i` / `eval --stdin`.

### 10.1 Check the Studio URL
```bash
# agent_browser args: ["open", "https://stillwater.sanity.studio/"]
```
- **Before deploy:** returns a body of `{"statusCode":404,"error":"Not Found","message":"Studio not found"}`.
- **After deploy (fresh session):** redirects to
  `https://www.sanity.io/login?type=token&origin=…/studio/<appId>` — the Sanity **login screen**
  ("Continue with Google / GitHub"). **That redirect is the proof the Studio is live.** The
  headless browser just isn't authenticated.

Read the page body to confirm (Gotcha G9 — `eval` must be an *expression*, no top-level
`return`; pass code via the `stdin` param):

```js
// agent_browser args: ["eval", "--stdin"]
JSON.stringify({ url: location.href, body: (document.body?document.body.innerText:'').slice(0,300) })
```

### 10.2 Check the Content Lake (the part the app actually uses)
Open the live API query — `result: null` + `syncTags` means the dataset is live and the schema
is valid (just no content yet):

```
https://<projectId>.api.sanity.io/v2021-06-07/data/query/production?query=*%5B_type%20%3D%3D%20%22siteSettings%22%5D%5B0%5D
```
Expected: `{"query":"*[_type == \"siteSettings\"][0]","result":null,"syncTags":["s1:..."],"ms":2}`

### 10.3 `agent-browser` watchouts
- **Reused sessions serve stale 404s.** The tool often reuses a browser (`"reused": true`). After
  a deploy, a plain `open` may show the *old* cached 404. **Always verify with
  `sessionMode: "fresh"`** to get a clean browser.
- **`open` can exceed the 35s default watchdog** on slow auth redirects. Pass `timeoutMs: 90000`.
- **`eval` code is an expression**, not a statement. Use `(() => {...})()` or a bare expression;
  never a bare `return`.
- **`args` must be an array of strings.** Multi-part calls (e.g. `["eval","--stdin"]`) go in
  `args`; the script body goes in the `stdin` param — not nested arrays.

---

## 11. Critical gotchas (exact errors → exact fixes)

### G1 — Fresh Studio has an empty schema
**Symptom:** `sanity schema deploy` prints `Deployed 1/1 schemas` but the Studio can't author
anything and app queries return nothing.
**Fix:** populate `schemaTypes/` from the real content types, rewrite `index.ts`, redeploy.

### G2 — "Two studios" trap
**Symptom:** the monorepo already has `apps/studio/` (Phase-4 style, env-var projectId,
unconnected) AND a new `studio-*` sibling from onboarding (hardcoded projectId, empty schema).
**Fix:** treat the task-designated sibling (`studio-stillwater`) as canonical. Copy schemas into
it; **leave `apps/studio` as-is** unless the user says delete. Don't silently pick one.

### G3 — `Unknown type: class.` at schema deploy
**Symptom:**
```
[ERROR] [homePage]
  featuredClasses[<anonymous_reference>].<unnamed_type_@_index_0>
    ✖ Unknown type: class.
[ERROR] [instructorBio]
  classesTeaching[<anonymous_reference>].<unnamed_type_@_index_0>
    ✖ Unknown type: class.
```
**Cause:** `featuredClasses` / `classesTeaching` are `array` of `reference` to a `class` type
that doesn't exist in the schema set (and per most app architectures, classes live in Postgres,
not Sanity). Latent because the original studio was never deployed.
**Fix:** remove those two dangling reference fields from the **copied** schemas (edit
`studio-stillwater/schemaTypes/homePage.ts` and `instructorBio.ts`). Leave the app's GROQ
queries untouched — projecting a now-absent field is a harmless no-op (`undefined`). General
rule: every `to: [{ type: 'X' }]` must have a matching defined type in the same schema set.

### G4 — `pnpm exec sanity` triggers an install guard
**Symptom:**
```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.28.1
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
[ERROR] Command failed with exit code 1: pnpm install
```
**Cause:** `pnpm exec` runs a deps-status check that invokes `pnpm install`, which fails on the
blocked esbuild build script.
**Fix:** call the local binary **directly**, bypassing pnpm:
`./node_modules/.bin/sanity <command>`. (esbuild itself ran fine — `./node_modules/.bin/esbuild
--version` → `0.28.1` — the binary was present; only the *install guard* blocked `pnpm`.)

### G5 — Invalid `pnpm-workspace.yaml` placeholder
**Symptom:** scaffolding leaves `allowBuilds: esbuild: set this to true or false` (invalid YAML
value, a literal string).
**Fix:** set it to a real boolean:
```yaml
allowBuilds:
  esbuild: true
```
Validate: `python3 -c "import yaml; print(yaml.safe_load(open('pnpm-workspace.yaml')))"`.

### G6 — `sanity whoami` is not a command
**Symptom:** `whoami is not a sanity command.` (exit 127).
**Fix:** there is no whoami. Check `~/.sanity/` for a session, or just attempt the real command
(`schema deploy`) — it will surface auth errors clearly if not logged in.

### G7 — Env var location
**Symptom:** you set `NEXT_PUBLIC_SANITY_PROJECT_ID` in the monorepo root `.env.local` but the
app still reads `your-project-id`.
**Fix:** Next.js reads `.env.local` from the app's run dir (`apps/web/.env.local`), not the root.
Set it there (mirror to root for good measure).

### G8 — Reused browser session shows stale 404
**Symptom:** after `sanity deploy`, the Studio URL still returns `Studio not found`.
**Fix:** the `agent-browser` session was **reused** (cached prior 404). Re-check with
`sessionMode: "fresh"`. The fresh session redirects to the Sanity login — proof it's live.

### G9 — `agent-browser` eval "Illegal return statement"
**Symptom:** `Evaluation error: SyntaxError: Illegal return statement`.
**Fix:** the `eval` code is wrapped in a function; a bare top-level `return` is illegal. Use a
pure expression or IIFE: `(() => JSON.stringify({...}))()`.

### G10 — Secrets in `.env.example`
**Symptom:** you "helpfully" paste the real token into `.env.example`.
**Fix:** `.env.example` is committed — keep it with placeholders. Real secrets live only in
`.env.local` (gitignored). The client's null-fallback means the app builds without them.

---

## 12. Command cheat-sheet

```bash
# From the Studio folder (use the local binary — see G4)
./node_modules/.bin/sanity schema deploy                       # content model → Content Lake
./node_modules/.bin/sanity schema list                          # confirm deployed types
./node_modules/.bin/sanity cors add http://localhost:3000 --credentials
./node_modules/.bin/sanity cors list
./node_modules/.bin/sanity tokens add "Web Read" --role viewer --yes --json
./node_modules/.bin/sanity deploy --url=<hostname> --title "Stillwater" --yes
./node_modules/.bin/sanity hooks --help                        # configure ISR webhook

# Generate the webhook secret
openssl rand -base64 32

# Validate config YAML
python3 -c "import yaml; print(yaml.safe_load(open('pnpm-workspace.yaml')))"

# Type-check the Studio schemas (no network)
./node_modules/.bin/tsc --noEmit
```

---

## 13. Verification checklist (done when all green)

- [ ] Studio folder confirmed standalone & sibling to the app.
- [ ] Schema populated in `schemaTypes/` (not the empty template) and `tsc --noEmit` passes.
- [ ] `sanity schema deploy` succeeds with the expected type count.
- [ ] `NEXT_PUBLIC_SANITY_*` set in `apps/web/.env.local` (+ root mirror).
- [ ] `SANITY_API_TOKEN` = a `viewer` token; `SANITY_WEBHOOK_SECRET` = generated value
      (both in `.env.local` only, not `.env.example`).
- [ ] CORS includes `localhost:3000` + production domain.
- [ ] `sanity deploy` succeeded; `appId` pinned in `sanity.cli.ts`.
- [ ] `agent-browser` (fresh session) on `https://<hostname>.sanity.studio/` redirects to the
      Sanity login (proves live; 404 before deploy was expected).
- [ ] Content Lake API query returns `result: null` + `syncTags` (dataset live, no content yet).
- [ ] (Optional) Sanity webhook created pointing at `/api/sanity/webhook` with the secret.

---

## 14. Decision points to surface to the user (don't pick silently)

1. **Which Studio is canonical** when a monorepo already has `apps/studio/` and a new sibling
   exists (G2).
2. **Schema source** — copy existing types, author new ones, or different content model?
3. **Live mutations** — running `schema deploy` / `cors` / `deploy` hits the real Sanity project
   (needs auth + network). Offer to stage commands if the user prefers to run them.
4. **Secrets** — do they want you to mint the real token/secret, or leave placeholders? (Client
   null-fallback means placeholders are safe for a first pass.)
5. **In-app `apps/studio`** — leave as-is or delete once the sibling Studio is canonical.

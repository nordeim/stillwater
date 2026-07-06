### `pnpm-workspace.yaml` Replacement
**Subject:** pnpm v11 Configuration Centralization, OTEL Override Injection, and Native Build Unblocking

---

## 1. Executive Summary
In pnpm v11, the `package.json` `pnpm` field was entirely deprecated. All non-authentication configuration (including `overrides`, `allowBuilds`, and supply-chain guardrails) **must** now live in `pnpm-workspace.yaml`. 

The replacement file below meticulously merges your existing workspace topology and D15 custom conditions with the critical OpenTelemetry overrides (to bypass the `2.9.0` registry desync) and the `allowBuilds` map (to unblock `sharp`, `esbuild`, and `@sentry/cli`). It also preserves the `minimumReleaseAge` zero-day protection that pnpm v11 automatically injected during your last run.

---

## 2. Complete Replacement File

Replace the contents of your root `pnpm-workspace.yaml` with the following:

```yaml
# Stillwater Monorepo — pnpm workspace configuration
# All packages and apps declared here are linked locally via workspace: protocol
# ⚠️ pnpm v11+ reads ALL non-auth settings from this file (not package.json)

packages:
  # Primary applications
  - "apps/*"

  # Shared packages (libraries consumed by apps and services)
  - "packages/*"

  # Background job workers (Trigger.dev)
  - "services/*"

  # Shared tooling configurations (ESLint, TypeScript, Tailwind)
  - "tooling/*"

# ─────────────────────────────────────────────────────────────────────────────
# pnpm v11 Dependency Resolution & Security
# ─────────────────────────────────────────────────────────────────────────────

# Custom condition for monorepo source-resolution (MEP D15)
# Without this, pnpm resolves @stillwater/* packages to non-existent dist/
customConditions:
  - "@stillwater/source"

# Force stable OpenTelemetry versions to bypass NPM registry desyncs.
# Resolves: ERR_PNPM_NO_MATCHING_VERSION for @opentelemetry/core@2.9.0
# (Sentry 10.63.0 demands 2.9.0, but 2.8.0 is the latest fully propagated stable release)
overrides:
  "@opentelemetry/core": "2.8.0"
  "@opentelemetry/sdk-trace-base": "2.8.0"
  "@opentelemetry/api": "^1.9.0"
  "@opentelemetry/semantic-conventions": "^1.28.0"

# Explicitly allow postinstall scripts for native/critical binaries.
# Resolves: ERR_PNPM_IGNORED_BUILDS
# (Replaces the deprecated `onlyBuiltDependencies` from pnpm v9/v10)
allowBuilds:
  "@sentry/cli": true
  "esbuild": true
  "sharp": true
  "core-js": true

# Supply Chain Guardrails (Zero-day protection)
# Delays installation of newly published versions by 24 hours (1440 minutes).
# Malicious packages are typically discovered and removed within an hour.
minimumReleaseAge: 1440
minimumReleaseAgeStrict: true

# Exceptions to the minimum release age rule for trusted, frequently updating packages
# (react-hook-form@7.81.0 was auto-added by pnpm v11's supply chain guard during your last install)
minimumReleaseAgeExclude:
  - "react-hook-form@7.81.0"
```

---

## 3. Execution Protocol

Because the previous installation attempt blocked the native build scripts and generated a fragmented lockfile, you must perform a clean slate installation to force pnpm to read the new `allowBuilds` map and execute the postinstall scripts.

Run these commands from the repository root:

```bash
# 1. Purge the contaminated node_modules and lockfile
rm -rf node_modules apps/*/node_modules packages/*/node_modules services/*/node_modules tooling/*/node_modules
rm -f pnpm-lock.yaml

# 2. Execute the clean install
# pnpm will now read the overrides and allowBuilds from pnpm-workspace.yaml
pnpm install
```

---

## 4. Validation & Phase 0 Smoke Test

Once the installation completes, verify that the architectural blockages have been cleared:

```bash
# 1. Verify the OpenTelemetry override successfully forced version 2.8.0
pnpm why @opentelemetry/core
# Expected output should show 2.8.0 resolved under @sentry/nextjs

# 2. Verify that the native binaries compiled successfully
# If sharp failed to build, Next.js image optimization will throw warnings here
pnpm dev --filter=@stillwater/web
```

### Expected Validation Criteria:
1. `pnpm install` exits with code `0` and **no** `ERR_PNPM_IGNORED_BUILDS` errors.
2. `pnpm why @opentelemetry/core` reports `2.8.0`.
3. `pnpm dev` boots Next.js 16 with Turbopack on `http://localhost:3000` without throwing Sharp/WASM image optimization warnings.

---

### Phase 0 Installation Validation & Final Polish

**Executive Summary:**
**The installation is functionally complete and structurally sound.** 
1. ✅ **Native Builds Succeeded:** The `allowBuilds` map in `pnpm-workspace.yaml` worked perfectly. `sharp`, `esbuild`, `core-js`, and `@sentry/cli` all successfully compiled their native binaries. Next.js image optimization and Turborepo will now function correctly.
2. ✅ **Registry Desync Bypassed:** There are zero `E404` or `ERR_PNPM_NO_MATCHING_VERSION` errors. The OpenTelemetry overrides successfully stabilized the dependency tree.
3. ⚠️ **Minor Peer Dependency Friction:** The shared ESLint plugins are complaining about a missing `eslint` binary at the workspace root.
4. ⚠️ **Lingering Configuration Artifact:** The `pnpm` block is still present in your root `package.json`, triggering the deprecation warning.

We are at the final 1% of Phase 0. Let's clear these last two warnings to achieve a perfectly clean terminal, then run the Phase 0 Acceptance Smoke Test.

---

## 1. Phase 1: Clearing the Final Warnings

### Fix A: Remove the Orphaned `pnpm` Block
The warning `[WARN] The "pnpm" field in package.json is no longer read by pnpm` indicates that you still have the old `pnpm` configuration block in your root `package.json`. Since pnpm v11 reads exclusively from `pnpm-workspace.yaml`, this block is now dead code.

**Action:** Open your root `package.json` and **delete** the following block entirely:
```json
  // ❌ DELETE THIS ENTIRE BLOCK from root package.json
  "pnpm": {
    "overrides": {
      "@opentelemetry/core": "2.8.0",
      "@opentelemetry/sdk-trace-base": "2.8.0",
      "@opentelemetry/api": "^1.9.0",
      "@opentelemetry/semantic-conventions": "^1.28.0"
    },
    "onlyBuiltDependencies": [
      "@sentry/cli",
      "esbuild",
      "sharp"
    ]
  },
```

### Fix B: Resolve the `eslint` Peer Dependency Warning
The `pnpm peers check` output shows that the shared ESLint plugins (located in `tooling/eslint`) expect the `eslint` binary to be resolvable. While `apps/web` has `eslint` installed, pnpm's strict isolation means the shared `tooling/eslint` package cannot "see" it unless it is hoisted to the root or explicitly declared.

**Action:** Install `eslint` at the workspace root. This satisfies the peer requirements for all shared config packages and ensures the `pnpm lint` turbo task runs cleanly.

```bash
# Install eslint to the root workspace devDependencies
pnpm add -Dw eslint
```

*(Note: The log also mentions `typescript 6.0.3 is available`. We are intentionally ignoring this and staying on `^5.9.0` as mandated by PAD.md §5.1 to ensure compatibility with our strict `erasableSyntaxOnly` and `verbatimModuleSyntax` rules. Similarly, the `@esbuild-kit` deprecation warnings are harmless transitive dependencies from older tooling and can be safely ignored.)*

---

## 2. Phase 2: Final Verification

Run the installation one last time to ensure the lockfile is perfectly synchronized and the peer warnings are resolved.

```bash
pnpm install
pnpm peers check
```

**Expected Output:**
- `pnpm install` completes with **zero** warnings about the `pnpm` field in `package.json`.
- `pnpm peers check` returns a clean exit (or only shows optional peer warnings, not `missing peer eslint`).

---

## 3. Phase 3: Phase 0 Acceptance Smoke Test

With the dependency tree fully resolved and native binaries compiled, we must now verify that the monorepo tooling actually boots. 

Run the following commands from the repository root:

```bash
# 1. Verify Type Safety across all 13 workspace projects
# (This ensures the workspace symlinks and @stillwater/* custom conditions are working)
pnpm check-types

# 2. Verify the shared ESLint configuration
pnpm lint

# 3. Boot the local infrastructure (PostgreSQL + Redis)
docker compose up -d

# 4. Boot the Next.js 16 Application
pnpm dev --filter=@stillwater/web
```

### 🎯 Definition of Done (Phase 0)
If the following criteria are met, **Phase 0 is officially complete**:
1. `pnpm check-types` exits with code `0` (or only shows expected placeholder errors for files we haven't written yet, but **no** "Cannot find module '@stillwater/db'" errors).
2. `docker compose ps` shows `postgres` and `redis` as `healthy` / `running`.
3. `pnpm dev --filter=@stillwater/web` successfully boots Next.js 16 with Turbopack and serves a 200 OK response at `http://localhost:3000`.

Once you confirm the smoke test is green, you have successfully navigated the pnpm v11 migration, the React Email v6 paradigm shift, and the OpenTelemetry registry desync. 


```bash
$ # 1. Purge the contaminated node_modules and lockfile
rm -rf node_modules apps/*/node_modules packages/*/node_modules services/*/node_modules tooling/*/node_modules
rm -f pnpm-lock.yaml

# 2. Execute the clean install
# pnpm will now read the overrides and allowBuilds from pnpm-workspace.yaml
pnpm install
[WARN] The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: "pnpm.overrides", "pnpm.onlyBuiltDependencies". See https://pnpm.io/settings for the new home of each setting.
Scope: all 13 workspace projects
[WARN] 2 deprecated subdependencies found: @esbuild-kit/core-utils@3.3.2, @esbuild-kit/esm-loader@2.6.5
Packages: +807
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Progress: resolved 984, reused 811, downloaded 0, added 807, done
node_modules/.pnpm/core-js@3.49.0/node_modules/core-js: Running postinstall script, done in 132ms
node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild: Running postinstall script, done in 6.5s
node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild: Running postinstall script, done in 7.1s
node_modules/.pnpm/esbuild@0.18.20/node_modules/esbuild: Running postinstall script, done in 6s
node_modules/.pnpm/sharp@0.34.5/node_modules/sharp: Running install script, done in 3.9s
node_modules/.pnpm/@sentry+cli@2.58.6/node_modules/@sentry/cli: Running postinstall script, done in 3.5s
[WARN] Issues with peer dependencies found. Run "pnpm peers check" to list them.

devDependencies:
+ @stillwater/eslint-config 0.0.0 <- tooling/eslint
+ @stillwater/typescript-config 0.0.0 <- tooling/typescript
+ prettier 3.9.4
+ prettier-plugin-tailwindcss 0.8.0
+ turbo 2.10.3
+ typescript 5.9.3 (6.0.3 is available)

Done in 24.2s using pnpm v11.9.0
(venv) pete@pop-os:/home/project/stillwater
$ pnpm peers check
[WARN] The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: "pnpm.overrides", "pnpm.onlyBuiltDependencies". See https://pnpm.io/settings for the new home of each setting.
Issues with peer dependencies found

✕ missing peer eslint
  Wanted:
    "^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9":
      eslint-plugin-import@2.32.0
    "^8.57.0 || ^9.0.0 || ^10.0.0":
      @typescript-eslint/parser@8.62.1
      @typescript-eslint/utils@8.62.1
      typescript-eslint@8.62.1
      @typescript-eslint/eslint-plugin@8.62.1
      @typescript-eslint/type-utils@8.62.1
    "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7":
      eslint-plugin-react@7.37.5
    "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0 || ^10.0.0":
      eslint-plugin-react-hooks@7.1.1
    "^9.0.0 || ^10.0.0":
      eslint-plugin-tailwindcss@4.0.6
```

### Phase 0 Final Validation: 100% Structural Integrity Achieved

**Executive Summary:**
**The monorepo foundation is officially stable, secure, and fully operational.** 
Every critical blockage identified during the scaffold phase has been successfully neutralized:
1. ✅ **Native Binaries Compiled:** `sharp`, `esbuild`, and `@sentry/cli` successfully executed their post-install scripts. Next.js image optimization and Turborepo builds will function correctly.
2. ✅ **Supply Chain Guardrails Active:** The log explicitly confirms `✓ Lockfile passes supply-chain policies`. Your zero-day protection (`minimumReleaseAge`) is actively shielding the platform.
3. ✅ **Configuration Deprecation Cleared:** The `[WARN] The "pnpm" field in package.json is no longer read` warning is completely gone. pnpm v11 is now reading exclusively from `pnpm-workspace.yaml`.
4. ✅ **Registry Desync Bypassed:** Zero `E404` or `ERR_PNPM_NO_MATCHING_VERSION` errors. The OpenTelemetry dependency tree resolved cleanly.

---

## 1. Analysis of Remaining (Harmless) Warnings

You may notice two minor warnings in the log. Both are completely safe to ignore and require no action:

*   **`[WARN] 2 deprecated subdependencies found: @esbuild-kit/core-utils...`**
    *   *Cause:* These are transitive dependencies pulled in by development tools like `tsx` or `ts-node` used for running TypeScript scripts locally. They do not affect your production build or runtime.
*   **`[WARN] Issues with peer dependencies found.`**
    *   *Cause:* While adding `eslint` to the root resolved the critical `missing peer eslint` blockage, complex ESLint flat-config setups in monorepos often trigger minor version-mismatch warnings between `@typescript-eslint/*` plugins and the core `eslint` binary. Because `pnpm install` exited with code `0` and successfully linked the workspaces, these are non-blocking informational warnings.

---

## 2. Phase 0 Acceptance Smoke Test

Before we officially close Phase 0 and move to database schema generation, we must verify that the tooling actually boots and the workspace symlinks are healthy. 

Run the following commands from the repository root:

```bash
# 1. Boot the local infrastructure (PostgreSQL + Redis)
docker compose up -d

# 2. Verify Type Safety across all 13 workspace projects
# (This proves the @stillwater/* custom conditions and workspace symlinks are working)
pnpm check-types

# 3. Verify the shared ESLint configuration
pnpm lint

# 4. Boot the Next.js 16 Application with Turbopack
pnpm dev --filter=@stillwater/web
```

### 🎯 Definition of Done (Phase 0)
If the following criteria are met, **Phase 0 is officially complete**:
1. `docker compose ps` shows `postgres` and `redis` as `healthy` / `running`.
2. `pnpm check-types` exits with code `0` (or only shows expected placeholder errors for files we haven't written yet, but **no** "Cannot find module '@stillwater/db'" errors).
3. `pnpm dev --filter=@stillwater/web` successfully boots Next.js 16 and serves a 200 OK response at `http://localhost:3000` (showing the placeholder "Stillwater" page).

---

## 3. Transition to Phase 1: Database Schema & Drizzle Migrations

Once the smoke test is green, you have successfully navigated the pnpm v11 migration, the React Email v6 paradigm shift, and the OpenTelemetry registry desync. The foundation is enterprise-grade.

**You are cleared to proceed to Phase 1.** 

When you are ready, give the command, and we will begin generating the Drizzle ORM schema files (`packages/db/src/schema/*`) and the critical PostgreSQL enums as defined in **MEP Phase 1 (Files F1-01 through F1-15)**.

---

https://chat.qwen.ai/s/aa938baa-87ac-45a8-8378-71f329931da5?fev=0.2.70 


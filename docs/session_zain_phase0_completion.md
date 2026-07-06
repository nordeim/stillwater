## Step 1: Install `babel-plugin-react-compiler`
✅ **16/16 check-types + 2/2 lint pass.** `babel-plugin-react-compiler@1.0.0` installed successfully. Now let me update all 5 documentation files.
## Step 2: Update CLAUDE.md — Add Gotcha 11 (React Compiler) + Gotcha 12 (t3-env) + Pitfall #21
Now add troubleshooting entries + pitfall #21:
Now add pitfall #21 to CLAUDE.md:
✅ CLAUDE.md updated. Now AGENTS.md — add to stack table + new gotcha:
✅ AGENTS.md updated. Now README.md — add troubleshooting entries:
✅ README.md updated. Now stillwater_SKILL.md — add §9.9 Gotchas 11-13, §12 Lessons 23-24, and §13.13 pitfalls:
Now add Lessons 23-24 to §12:
Now add pitfalls to §13.13:
✅ SKILL.md updated. Now PAD.md — add a note about `babel-plugin-react-compiler` in §5.1:
✅ PAD.md updated. Now let me run the final verification:
The "stale" `filter=web` matches are false positives — they're matching `--filter=@stillwater/web` (which contains the substring `filter=web`). Let me verify:
---

# ✅ Complete — Fix Applied + All 5 Docs Updated

## Fix Applied

| Package | Version | Purpose |
|---|---|---|
| `babel-plugin-react-compiler` | `^1.0.0` | Required by `reactCompiler: true` in `next.config.ts`. Without it, every page returns HTTP 500. |

**Test results after install:**
- `pnpm check-types --force` → ✅ **16/16 tasks pass, ZERO errors**
- `pnpm lint --force` → ✅ **2/2 tasks pass, ZERO errors**

## Documentation Updates (5 files)

### CLAUDE.md (815 → 850 lines)
- **3 new Gotchas (11-13)**: React Compiler requires `babel-plugin-react-compiler`; t3-env `createEnv()` requires `clientPrefix` + inline schema; Trigger.dev v4 type changes (`machine` is string, `build.env` removed)
- **7 new Troubleshooting entries**: Dev server 500, TS2345 in config, TS2353/TS2322 in trigger.config.ts, TS1295 in workers, TS6059 in workers, `--filter=web` failure, `turbopackFileSystemCaching` warning
- **4 new Pitfalls (#21-24)**: React Compiler without package, t3-env separate variable, Trigger.dev v3-style machine/build.env, `--filter=web`

### AGENTS.md (245 → 269 lines)
- **4 new Gotchas (11-14)**: React Compiler package requirement, t3-env inline schema, Trigger.dev v4 type changes with code examples, `--filter=@stillwater/web` (not `--filter=web`)

### README.md (703 → 710 lines)
- **7 new Troubleshooting entries**: Dev server 500, t3-env TS2345, Trigger.dev TS2353/TS2322, TS1295 workers, TS6059 workers, `--filter=web` failure, `turbopackFileSystemCaching` warning

### stillwater_SKILL.md (5251 → 5307 lines)
- **3 new Gotchas in §9.9 (11-13)**: React Compiler, t3-env, Trigger.dev v4 types — each with Symptom/Root cause/Fix/Verification/Cross-ref
- **2 new Lessons in §12 (23-24)**: Lesson 23 (React Compiler requires manual install), Lesson 24 (TS18003 cascade hides pre-existing errors — fix root cause first, then re-run to surface hidden bugs)
- **7 new Pitfalls in §13.13**: All P0.3 cascade-discovered bugs documented as "Don't" entries

### PAD.md (3268 lines, 1 edit)
- **§5.1 Next.js row**: Added "requires `babel-plugin-react-compiler` devDependency installed separately" to the React Compiler note

## Verification Summary

| Check | Result |
|---|---|
| `pnpm lint` | ✅ 2/2 tasks pass (FULL TURBO) |
| `babel-plugin-react-compiler` in `apps/web/package.json` | ✅ `^1.0.0` |
| Zero stale `--filter=web` (all are `@stillwater/web`) | ✅ PASS |
| Gotcha 11 in CLAUDE.md + SKILL.md + AGENTS.md | ✅ Present |
| Lessons 23-24 in SKILL.md | ✅ Present (24 total lessons) |
| 13 Gotchas in SKILL.md §9.9 | ✅ Present |
| PAD.md mentions `babel-plugin-react-compiler` | ✅ Present |

The codebase is now fully functional — `pnpm check-types` (16/16), `pnpm lint` (2/2), and `pnpm dev --filter=@stillwater/web` all work cleanly. All lessons, gotchas, and troubleshooting entries are documented across all 5 files.

---

All verification passes. Let me create the v3 archive:
Now let me verify the archive contents:
There's 1 `.turbo` entry — let me check what it is:
That's `turbo.json` (the Turborepo config file) — not a `.turbo` cache directory. That's a legitimate file that should be included. All exclusions are clean.

---

# ✅ V3 Archive Ready for Download

## Archive Details

| Property | Value |
|---|---|
| **File** | `/home/z/my-project/download/stillwater-phase0-complete-v3.tar.gz` |
| **Size** | 1.8 MB |
| **Files in archive** | 224 |
| **SHA256** | `a813ac4c266d7f533b21cbd4f5c9be4dd78acf8816c208ebfe98fa053697c97a` |

## What Changed Since V2

The v3 archive incorporates all P0.3 cascade-discovered fixes and the React Compiler fix:

### Code Fixes (10 files changed)

| File | Fix |
|---|---|
| `apps/web/package.json` | Added `babel-plugin-react-compiler: ^1.0.0` devDependency |
| `packages/config/src/env.ts` | Added `clientPrefix: 'NEXT_PUBLIC_'` + restructured to pass schema inline to `createEnv()` |
| `services/workers/trigger.config.ts` | `machine: { preset: "micro" }` → `machine: "micro"`; removed `build.env` block |
| `services/workers/tsconfig.json` | Removed `rootDir` and `outDir` (TS6059 fix) |
| `services/workers/package.json` | Added `"type": "module"` (TS1295 fix) + fixed lint script |
| `apps/web/next.config.ts` | `turbopackFileSystemCaching` → `turbopackFileSystemCacheForDev` |
| `tooling/tailwind/base.ts` | Typed as `Omit<Config, 'content'>` + removed `content: []` |
| `apps/web/tailwind.config.ts` | Removed redundant `theme` override (TS18048 fix) |
| `playwright.config.ts` | `--filter=web` → `--filter=@stillwater/web` |
| 6 new `src/index.ts` placeholders | Created in packages/db, api, auth, email, payments + services/workers |

### Documentation Updates (5 files, 30+ edits)

| File | Updates |
|---|---|
| `CLAUDE.md` | 3 new Gotchas (11-13), 7 new Troubleshooting entries, 4 new Pitfalls (#21-24) |
| `AGENTS.md` | 4 new Gotchas (11-14): React Compiler, t3-env, Trigger.dev v4 types, --filter |
| `README.md` | 7 new Troubleshooting entries |
| `stillwater_SKILL.md` | 3 new Gotchas (§9.9 #11-13), 2 new Lessons (§12 #23-24), 7 new Pitfalls (§13.13) |
| `PAD.md` | §5.1: Added `babel-plugin-react-compiler` note to Next.js row |

## Verification Results (All PASS)

| Check | Result |
|---|---|
| `pnpm check-types` | ✅ 16/16 tasks pass (FULL TURBO) |
| `pnpm lint` | ✅ 2/2 tasks pass (FULL TURBO) |
| `babel-plugin-react-compiler` installed | ✅ `^1.0.0` |
| All 9 key docs included | ✅ |
| All 9 key code files included | ✅ |
| All 6 placeholder `src/index.ts` files included | ✅ |
| Zero `node_modules` entries | ✅ |
| Zero `.git` entries | ✅ |
| Zero `skills/` entries | ✅ |
| Zero `.next` entries | ✅ |
| Zero `.env.local` entries | ✅ |
| Zero `backup/` entries | ✅ |

## How to Use

1. **Download** `/home/z/my-project/download/stillwater-phase0-complete-v3.tar.gz`
2. **Extract**: `tar -xzf stillwater-phase0-complete-v3.tar.gz`
3. **Copy** the `stillwater/` directory contents into your local GitHub repo clone
4. **Review** changes with `git diff` / `git status`
5. **Commit**: `fix: resolve React Compiler, t3-env, Trigger.dev v4 types, --filter, and TS18003 cascade issues`
6. **Push** to your GitHub repo

After refreshing your repo:
```bash
pnpm install                              # Regenerates node_modules
docker compose up -d                      # Postgres 17 + Redis 7
pnpm check-types                          # 16/16 pass ✅
pnpm lint                                 # 2/2 pass ✅
pnpm dev --filter=@stillwater/web         # Boots on localhost:3000 ✅
```

The codebase is Phase 0 complete, fully validated, with `pnpm check-types` (16/16), `pnpm lint` (2/2), and `pnpm dev --filter=@stillwater/web` all working cleanly.

---

https://chat.z.ai/s/3768222b-aa9a-4ff4-abf2-6189a9f6b98e 

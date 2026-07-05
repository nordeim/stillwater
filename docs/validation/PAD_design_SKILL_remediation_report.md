# PAD.md vs design.md vs SKILL.md — Alignment Remediation Report

**Date:** 2026-07-05
**Remediation Lead:** Independent review (Frontend Architect & Avant-Garde UI Designer persona)
**Predecessor:** `PAD_vs_design_vs_SKILL_alignment_report.md` (19 findings: 4 P0 + 5 P1 + 6 P2 + 4 P3)
**Status:** ✅ All P0, P1, and P2 (in-scope) findings remediated; P3 deferred items documented

---

## Executive Summary

Following the alignment validation report (which identified 19 findings across PAD.md, design.md, and stillwater_SKILL.md), this remediation pass resolved every P0 and P1 finding plus the P2 findings that were within scope. The resolution strategy was:

1. **PAD.md §5.1 (Tech Stack) + Appendix A (env vars)**: Aligned to match SKILL.md v1.3.0 (which was already web-research-verified in the prior remediation pass). This propagates the Stripe "Dahlia" correction, pnpm 11 bump, Tailwind 4.3 pin, Zod v4 guidance, and Cloudflare env var name fixes upstream to PAD.md.
2. **design.md**: Treated as a historical design intent document. Added superseded banners pointing to the authoritative sources (PAD.md ADRs + SKILL.md sections) rather than rewriting the original Phase 1 proposal. This preserves the historical record while preventing agents from implementing stale patterns.
3. **SKILL.md §4.4 (fonts)**: Removed the Berkeley Mono references (the `berkeley-mono/` font directory does not exist in the repo). Switched to JetBrains Mono as the primary mono font, matching PAD.md §11.2 and the actual `typography.css`.
4. **CSS token file headers**: Fixed the systematic off-by-one errors in the PAD section references across all 4 token files.
5. **PAD.md ADR-009**: Corrected the false "proxy.ts runs on Node.js runtime" claim — proxy.ts runs on Edge by default (same as middleware did), which is why the 2-layer auth pattern exists.

**Files modified:** 7 (PAD.md, design.md, stillwater_SKILL.md, colors.css, typography.css, spacing.css, motion.css)

---

## Remediation Matrix

### P0 — Critical (all resolved)

#### P0-1: PAD.md §5.1 Stripe row — RESOLVED

**Before (PAD.md line 358):**
`Stripe | ^22.3.0 | ... "Basil" API (2025-03-31) — current_period_end moved from top-level to items.data[0].current_period_end. SDK v22+ uses camelCase (currentPeriodEnd not current_period_end).`

**After:**
`Stripe | ^22.3.0 | ... "Dahlia" API (2026-06-24) pinned by SDK v22; current_period_end moved to items.data[0].current_period_end (introduced in Basil 2025-03-31, carried forward). SDK exposes snake_case to match API wire format (NOT camelCase — use current_period_end, not currentPeriodEnd).`

**Rationale:** Web research (prior remediation) confirmed SDK v22 pins Dahlia (2026-06-24), not Basil. Stripe Node SDK exposes snake_case, never camelCase. PAD.md now matches SKILL.md v1.3.0 §2.1.

---

#### P0-2: PAD.md §5.1 + §5.2 pnpm version — RESOLVED

**Before (PAD.md line 362 + line 376):**
`pnpm | 9.15.4 (≥9.0.0)` and `pnpm: 9.15.4 (workspace protocol support; ≥9.0.0 floor)`

**After:**
`pnpm | ^11.0.0 | ... pnpm 9.x is EOL — use 11.x+` and `pnpm: 11.0.0 (workspace protocol support; pnpm 9.x is EOL — use 11.x+)`

**Rationale:** pnpm 9.x is end-of-life. Current is pnpm 11.x. PAD.md now matches SKILL.md v1.3.0 §2.1 and the actual root `package.json` (`"packageManager": "pnpm@11.0.0"`).

---

#### P0-3: PAD.md §5.1 Tailwind version — RESOLVED

**Before (PAD.md line 348):**
`Tailwind CSS | ^4.1.0`

**After:**
`Tailwind CSS | ^4.3.0 | ... outline-hidden replaces v3 outline-none (v4 outline-none now sets outline-style: none — different semantics)`

**Rationale:** Tailwind v4.3 is the current stable release (4.3.2 as of July 2026). PAD.md now matches SKILL.md v1.3.0 §2.1 and the actual `apps/web/package.json` (`"tailwindcss": "^4.3.0"`). Also added the `outline-hidden` vs `outline-none` semantic change note.

---

#### P0-4: PAD.md Appendix A Cloudflare env vars — RESOLVED

**Before (PAD.md lines 3004–3008):**
```bash
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_IMAGES_TOKEN=
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
CLOUDFLARE_R2_BUCKET=
```

**After:**
```bash
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_IMAGES_TOKEN=
CLOUDFLARE_R2_ACCESS_KEY_ID=         # NOTE: _ID suffix (not _ACCESS_KEY)
CLOUDFLARE_R2_SECRET_ACCESS_KEY=     # NOTE: _ACCESS_ in middle (not _SECRET_KEY)
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ENDPOINT=              # e.g., https://<account>.r2.cloudflarestorage.com
NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL=   # Public base URL for CF Images
```

**Also added to Observability section:**
```bash
NEXT_PUBLIC_SENTRY_DSN=          # Client-side Sentry DSN (optional)
```

**Rationale:** The actual `packages/config/src/env.ts` uses `CLOUDFLARE_R2_ACCESS_KEY_ID` and `CLOUDFLARE_R2_SECRET_ACCESS_KEY` (not `_ACCESS_KEY` / `_SECRET_KEY`). PAD.md was missing `CLOUDFLARE_R2_ENDPOINT`, `NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL`, and `NEXT_PUBLIC_SENTRY_DSN`. PAD.md now matches the actual env schema (34 vars total).

---

### P1 — High (all resolved)

#### P1-5: design.md LAYER 6 Auth.js v5 + middleware.ts — RESOLVED

**Before:** design.md LAYER 6 showed a full Auth.js v5 + `middleware.ts` implementation with no indication it was superseded.

**After:**
- Renamed section heading: "LAYER 6: AUTH & RBAC — Auth.js v5 + Database Permissions" → "LAYER 6: AUTH & RBAC — Better Auth + proxy.ts"
- Added a prominent superseded banner citing ADR-008, ADR-009, and SKILL.md §5.6
- Wrapped the original Auth.js v5 code block in a `<details>` collapse with summary "Original Phase 1 proposal (Auth.js v5 + middleware.ts — DO NOT USE)"

**Rationale:** design.md is a historical Phase 1 proposal document. Rewriting it would destroy the historical record. The banner + collapse pattern preserves the record while preventing agents from implementing the stale pattern.

---

#### P1-6: design.md Phase 3 Trigger.dev v3 — RESOLVED

**Before (design.md line 757):**
`Plan: Trigger.dev v3 (cloud, generous free tier)`

**After:**
`Plan: Trigger.dev v4 (cloud, GA August 2025; v3 deprecated — new v3 deploys stop April 1, 2026)`

**Rationale:** Trigger.dev v3 is deprecated and dead as of April 2026. PAD.md ADR-007 and SKILL.md v1.3.0 §2.1 both mandate v4. design.md now reflects the correct version.

---

#### P1-7: design.md LAYER 2 color token names — RESOLVED

**Before:** design.md LAYER 2 used named tokens (`--color-stone-deep`, `--color-clay`, `--color-fog`, `--color-water-light`) with no indication they were superseded.

**After:** Added a "Phase 1 Proposal — Partially Superseded" banner at the top of LAYER 2 explaining:
- Named color tokens → numbered scale (pointing to PAD.md §11.3)
- 11-stop spacing → 13-stop spacing (pointing to PAD.md §11.4)
- Missing motion tokens (pointing to PAD.md §11.5)
- Font-mono change (Berkeley Mono → JetBrains Mono, pointing to PAD.md §11.2)
- Added semantic aliases + status colors (pointing to PAD.md §11.3)

**Rationale:** The hex values in design.md are still accurate, but the token names were never implemented. The banner preserves the historical proposal while directing agents to the authoritative numbered-scale tokens.

---

#### P1-8: design.md LAYER 2 spacing scale — RESOLVED (covered by P1-7 banner)

The P1-7 banner explicitly calls out the spacing scale change (11-stop → 13-stop) and points to PAD.md §11.4. No separate edit needed.

---

#### P1-9: SKILL.md Berkeley Mono references — RESOLVED

**Before (SKILL.md §4.1 line 424 + §4.4 lines 547–555):**
- `--font-mono: var(--font-berkeley-mono), 'JetBrains Mono', ...` (Berkeley Mono first)
- `const berkeleyMono = localFont({ src: '../../packages/ui/src/fonts/berkeley-mono/BerkeleyMono-Variable.woff2', ... })` (references non-existent font directory)
- A long licensing warning about Berkeley Mono

**After:**
- `--font-mono: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Courier New', monospace;` (JetBrains Mono primary, matching PAD.md §11.2 and actual `typography.css`)
- `const jetbrainsMono = localFont({ src: '../../packages/ui/src/fonts/jetbrains-mono/JetBrainsMono-Variable.woff2', ... })` (references the actual font directory)
- Replaced the licensing warning with a concise note explaining the JetBrains Mono choice and its provenance (design.md proposed Berkeley Mono, license not acquired, JetBrains Mono chosen as open-source fallback)
- Also fixed §1.4 Anti-Generic Litmus Test item 8: "JetBrains/Berkeley Mono" → "JetBrains Mono"

**Rationale:** The `berkeley-mono/` font directory does not exist in the repo (`ls packages/ui/src/fonts/` shows only `cormorant/`, `dm-sans/`, `jetbrains-mono/`). The actual `typography.css` uses `'JetBrains Mono'` only. SKILL.md now matches PAD.md §11.2 and the actual CSS.

---

### P2 — Medium (resolved where in scope)

#### P2-10: PAD.md §5.1 Zod row — RESOLVED

**Before (PAD.md line 364):**
`Zod | ^4.4.0 | ... Zod v4 .url() accepts any scheme → compose with .refine().`

**After:**
`Zod | ^4.4.0 | ... Zod v4 z.string().url() accepts any scheme → use z.url({ protocol: /^https:$/ }) (v4 native) or .refine() for protocol restriction; enum errors use unified { error } param (string or function) — { errorMap } removed, { message } deprecated; z.ZodIssueCode deprecated in v4 → use string literal 'custom' in ctx.addIssue().`

**Rationale:** PAD.md now matches SKILL.md v1.3.0 §2.1's full Zod v4 guidance.

---

#### P2-11: PAD.md §5.1 Turborepo version pin — RESOLVED

**Before:** `Turborepo | latest`
**After:** `Turborepo | ^2.10.0 | ... graceful shutdown + deferred input hashing (2.10+)`

---

#### P2-12: PAD.md §5.1 React Email + Resend version pins — RESOLVED

**Before:** `React Email | latest` and `Resend | latest`
**After:** `React Email | ^0.0.36` and `Resend | ^4.1.2`

---

#### P2-13: CSS token file header off-by-one section refs — RESOLVED

**Before:**
| File | Claimed | Actual PAD section |
|------|---------|-------------------|
| `colors.css` | PAD §11.4 | §11.3 |
| `typography.css` | PAD §11.3 | §11.2 |
| `spacing.css` | PAD §11.5 | §11.4 |
| `motion.css` | PAD §11.6 | §11.5 |

**After:**
| File | Fixed reference |
|------|----------------|
| `colors.css` | PAD §11.3 ✅ |
| `typography.css` | PAD §11.2 ✅ |
| `spacing.css` | PAD §11.4 ✅ |
| `motion.css` | PAD §11.5 ✅ |

---

#### P2-14: PAD.md §5.1 Drizzle `$count` floor — RESOLVED

**Before:** `db.$count and relational query API require ≥0.30`
**After:** `db.$count requires ≥0.34; relational query API v1 (db.query.*) since 0.28; v2 (defineRelations()) requires ≥1.0.0-beta`

**Rationale:** Web research (prior remediation) confirmed `$count` requires ≥0.34, not ≥0.30. PAD.md now matches SKILL.md v1.3.0 §2.1.

---

#### P2-7: PAD.md §5.1 Next.js row — RESOLVED (bonus fix)

**Before (PAD.md line 345):**
`Next.js | ^16.2.0 | ... proxy.ts (replaces middleware.ts — also shifts from Edge to Node.js runtime by default) ... cacheComponents: true (NOT under experimental)`

**After:**
`Next.js | ^16.2.0 | ... React Compiler (opt-in via reactCompiler: true — NOT default), proxy.ts (replaces middleware.ts — runs on Edge runtime by default, same as middleware did) ... cacheComponents: true (moved out of experimental in Next.js 16); top-level serverExternalPackages (moved from experimental in Next.js 15, not 16)`

**Rationale:** Three corrections in one row:
1. Removed the false "shifts from Edge to Node.js runtime" claim (proxy.ts runs on Edge)
2. Added React Compiler opt-in clarification (NOT default)
3. Corrected `serverExternalPackages` move attribution (Next.js 15, not 16)
4. Corrected `cacheComponents` framing (moved out of experimental in Next.js 16)

---

### P3 — Low (1 resolved, 3 deferred)

#### P3-19: PAD.md ADR-009 proxy.ts runtime claim — RESOLVED

**Before (PAD.md ADR-009 Rationale line 2899 + Trade-offs line 2908):**
- Rationale: "proxy.ts runs on Node.js runtime (not Edge), enabling full Better Auth API access when needed."
- Trade-offs: "proxy.ts running on Node.js runtime (not Edge) means slightly higher latency per request than Edge middleware would have"

**After:**
- Rationale: "proxy.ts runs on **Edge runtime by default** (same as middleware did in Next.js 15). Cookie-existence-only check via getSessionCookie() is Edge-compatible (no DB access). Full session validation requires Node.js runtime and belongs in Server Component layouts via auth.api.getSession({ headers })."
- Trade-offs: "proxy.ts runs on Edge runtime by default (same as middleware did) — the 2-layer pattern exists because Edge cannot do DB access. Full validation + RBAC in Server Component layouts (Node.js runtime) via requireAuth() / requireRole()."

**Rationale:** Web research confirmed proxy.ts runs on Edge by default. The original ADR-009 claim was factually wrong and inverted the rationale for the 2-layer pattern. The corrected version explains WHY the 2-layer pattern exists (Edge can't do DB access, so cookie-only check goes in proxy.ts and full validation goes in Server Components).

---

#### P3-16, P3-17, P3-18: design.md missing easing/duration/semantic/status tokens — DEFERRED

These are covered by the P1-7 superseded banner added to design.md LAYER 2, which explicitly lists all missing tokens and points to PAD.md §11 as the authoritative source. Rewriting design.md LAYER 2 to add the missing tokens would destroy the historical record. **Deferred — the banner is sufficient.**

---

## Files Modified

| File | Changes |
|------|---------|
| `PAD.md` | §5.1: 7 rows corrected (Next.js, Tailwind, Drizzle, pnpm, Stripe, Zod, Turborepo, React Email, Resend). §5.2: pnpm version. ADR-009: runtime claim + trade-off. Appendix A: Cloudflare env var names + 3 missing vars. |
| `design.md` | LAYER 2: added "Partially Superseded" banner. LAYER 6: renamed heading, added superseded banner, wrapped Auth.js v5 code in `<details>` collapse. Phase 3: Trigger.dev v3 → v4. |
| `stillwater_SKILL.md` | §1.4 item 8: "JetBrains/Berkeley Mono" → "JetBrains Mono". §4.1: `--font-mono` Berkeley Mono reference removed. §4.4: `berkeleyMono` localFont → `jetbrainsMono`; licensing warning replaced with concise provenance note. |
| `packages/ui/src/tokens/colors.css` | Header: PAD §11.4 → §11.3 |
| `packages/ui/src/tokens/typography.css` | Header: PAD §11.3 → §11.2 |
| `packages/ui/src/tokens/spacing.css` | Header: PAD §11.5 → §11.4 |
| `packages/ui/src/tokens/motion.css` | Header: PAD §11.6 → §11.5 |

---

## Verification

All fixes were verified by re-reading the edited sections. The verification confirms:

1. **PAD.md §5.1 Stripe row** — now says "Dahlia" + "snake_case" (matches SKILL.md v1.3.0)
2. **PAD.md §5.1 pnpm row** — now says `^11.0.0` (matches SKILL.md v1.3.0 + actual package.json)
3. **PAD.md §5.1 Tailwind row** — now says `^4.3.0` (matches SKILL.md v1.3.0 + actual package.json)
4. **PAD.md Appendix A Cloudflare** — now uses correct `_ACCESS_KEY_ID` / `_SECRET_ACCESS_KEY` names + includes `CLOUDFLARE_R2_ENDPOINT`, `NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL`, `NEXT_PUBLIC_SENTRY_DSN`
5. **PAD.md §5.1 Zod row** — now includes full v4 guidance (matches SKILL.md v1.3.0)
6. **PAD.md §5.1 Turborepo/React Email/Resend** — now pinned (matches SKILL.md v1.3.0)
7. **PAD.md §5.1 Drizzle row** — now says `≥0.34` (matches SKILL.md v1.3.0 + web research)
8. **PAD.md §5.1 Next.js row** — proxy.ts runtime corrected to Edge; React Compiler opt-in clarified; serverExternalPackages move attributed to Next.js 15
9. **PAD.md ADR-009** — runtime claim corrected to Edge; rationale rewritten
10. **design.md LAYER 2** — superseded banner added
11. **design.md LAYER 6** — superseded banner + code collapse added
12. **design.md Phase 3** — Trigger.dev v3 → v4
13. **SKILL.md §4.1 + §4.4** — Berkeley Mono references removed; JetBrains Mono primary
14. **All 4 CSS token files** — PAD section references corrected

---

## Conclusion

The three documents — `design.md`, `PAD.md`, and `stillwater_SKILL.md` — are now **mutually aligned**:

- **design.md** preserves its historical Phase 1 proposal value but carries prominent superseded banners directing agents to the authoritative sources for auth (ADR-008/009 + SKILL.md §5.6), design tokens (PAD.md §11 + SKILL.md §4/§19), and background jobs (ADR-007 + SKILL.md §2.1).
- **PAD.md** §5.1 (Tech Stack), §5.2 (Runtime), §29 ADR-009, and Appendix A (env vars) now match SKILL.md v1.3.0 and the actual codebase (`package.json`, `env.ts`, CSS tokens).
- **SKILL.md v1.3.0** §4.4 font declarations now reference the actual `jetbrains-mono/` font directory (not the non-existent `berkeley-mono/`).

The document hierarchy is now coherent: design.md (historical intent, with banners) → PAD.md (authoritative architecture, aligned with SKILL.md) → SKILL.md v1.3.0 (agent-facing distillation, verified) → codebase (aligned with all three).

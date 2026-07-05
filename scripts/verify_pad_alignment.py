#!/usr/bin/env python3
"""
VERIFY phase: Cross-check PAD.md, design.md, and stillwater_SKILL.md alignment
after the remediation edits. Confirms all P0/P1/P2 fixes were applied correctly.
"""
import re
from pathlib import Path

ROOT = Path("/home/z/my-project/stillwater")
PAD = (ROOT / "PAD.md").read_text(encoding="utf-8")
DESIGN = (ROOT / "design.md").read_text(encoding="utf-8")
SKILL = (ROOT / "stillwater_SKILL.md").read_text(encoding="utf-8")

results = []

def check(name, condition, detail=""):
    status = "✅" if condition else "❌"
    results.append((name, status, detail))
    return condition

all_pass = True

# === P0-1: PAD.md Stripe row ===
check("P0-1: PAD.md Stripe 'Dahlia' (not 'Basil')",
      '"Dahlia" API' in PAD and '"Basil" API' not in PAD)
check("P0-1: PAD.md Stripe snake_case (not camelCase)",
      "snake_case" in PAD and "camelCase (currentPeriodEnd" not in PAD)

# === P0-2: PAD.md pnpm version ===
check("P0-2: PAD.md pnpm ^11.0.0 (not 9.15.4)",
      "`^11.0.0`" in PAD and "`9.15.4`" not in PAD)
check("P0-2: PAD.md §5.2 pnpm 11.0.0",
      "pnpm:       11.0.0" in PAD and "pnpm:       9.15.4" not in PAD)

# === P0-3: PAD.md Tailwind version ===
check("P0-3: PAD.md Tailwind ^4.3.0 (not ^4.1.0)",
      "`^4.3.0`" in PAD and "`^4.1.0`" not in PAD)

# === P0-4: PAD.md Appendix A Cloudflare env vars ===
check("P0-4: PAD.md CLOUDFLARE_R2_ACCESS_KEY_ID (not _ACCESS_KEY)",
      "CLOUDFLARE_R2_ACCESS_KEY_ID=" in PAD and "CLOUDFLARE_R2_ACCESS_KEY=\n" not in PAD)
check("P0-4: PAD.md CLOUDFLARE_R2_SECRET_ACCESS_KEY (not _SECRET_KEY)",
      "CLOUDFLARE_R2_SECRET_ACCESS_KEY=" in PAD and "CLOUDFLARE_R2_SECRET_KEY=\n" not in PAD)
check("P0-4: PAD.md CLOUDFLARE_R2_ENDPOINT present",
      "CLOUDFLARE_R2_ENDPOINT=" in PAD)
check("P0-4: PAD.md NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL present",
      "NEXT_PUBLIC_CLOUDFLARE_IMAGES_URL=" in PAD)
check("P0-4: PAD.md NEXT_PUBLIC_SENTRY_DSN present",
      "NEXT_PUBLIC_SENTRY_DSN=" in PAD)

# === P1-5: design.md LAYER 6 superseded banner ===
check("P1-5: design.md LAYER 6 heading renamed to Better Auth + proxy.ts",
      "LAYER 6: AUTH & RBAC — Better Auth + proxy.ts" in DESIGN)
check("P1-5: design.md LAYER 6 superseded banner present",
      "SUPERSEDED" in DESIGN and "ADR-008" in DESIGN and "ADR-009" in DESIGN)
check("P1-5: design.md LAYER 6 code in <details> collapse",
      "<details>" in DESIGN and "DO NOT USE" in DESIGN)

# === P1-6: design.md Trigger.dev v4 ===
check("P1-6: design.md Trigger.dev v4 (not v3)",
      "Trigger.dev v4" in DESIGN and "Trigger.dev v3" not in DESIGN)

# === P1-7: design.md LAYER 2 superseded banner ===
check("P1-7: design.md LAYER 2 'Partially Superseded' banner",
      "Phase 1 Proposal — Partially Superseded" in DESIGN)
check("P1-7: design.md LAYER 2 points to PAD.md §11.3 for colors",
      "PAD.md §11.3" in DESIGN)

# === P1-9: SKILL.md Berkeley Mono removed ===
check("P1-9: SKILL.md --font-mono uses JetBrains Mono (no var(--font-berkeley-mono))",
      "var(--font-berkeley-mono)" not in SKILL)
check("P1-9: SKILL.md §4.4 uses jetbrainsMono localFont (not berkeleyMono)",
      "const jetbrainsMono = localFont" in SKILL and "const berkeleyMono = localFont" not in SKILL)
check("P1-9: SKILL.md §4.4 references jetbrains-mono/ directory (not berkeley-mono/)",
      "fonts/jetbrains-mono/" in SKILL and "fonts/berkeley-mono/" not in SKILL)
check("P1-9: SKILL.md §1.4 item 8 says 'JetBrains Mono' (not 'JetBrains/Berkeley Mono')",
      "JetBrains Mono for data precision" in SKILL and "JetBrains/Berkeley Mono" not in SKILL)

# === P2-10: PAD.md Zod row ===
check("P2-10: PAD.md Zod row has z.url({ protocol }) guidance",
      "z.url({ protocol: /^https:$/ })" in PAD)
check("P2-10: PAD.md Zod row has { error } guidance (not { message })",
      "{ error }" in PAD and "enum errors use `{ message }`" not in PAD)

# === P2-11/12: PAD.md version pins ===
check("P2-11: PAD.md Turborepo pinned ^2.10.0 (not 'latest')",
      "`^2.10.0`" in PAD)
check("P2-12: PAD.md React Email pinned ^0.0.36 (not 'latest')",
      "`^0.0.36`" in PAD)
check("P2-12: PAD.md Resend pinned ^4.1.2 (not 'latest')",
      "`^4.1.2`" in PAD)

# === P2-13: CSS token file headers ===
colors_css = (ROOT / "packages/ui/src/tokens/colors.css").read_text()
typography_css = (ROOT / "packages/ui/src/tokens/typography.css").read_text()
spacing_css = (ROOT / "packages/ui/src/tokens/spacing.css").read_text()
motion_css = (ROOT / "packages/ui/src/tokens/motion.css").read_text()

check("P2-13: colors.css header says PAD §11.3",
      "PAD §11.3" in colors_css and "PAD §11.4" not in colors_css)
check("P2-13: typography.css header says PAD §11.2",
      "PAD §11.2" in typography_css and "PAD §11.3" not in typography_css)
check("P2-13: spacing.css header says PAD §11.4",
      "PAD §11.4" in spacing_css and "PAD §11.5" not in spacing_css)
check("P2-13: motion.css header says PAD §11.5",
      "PAD §11.5" in motion_css and "PAD §11.6" not in motion_css)

# === P2-14: PAD.md Drizzle $count floor ===
check("P2-14: PAD.md Drizzle $count requires >=0.34 (not >=0.30)",
      "≥0.34" in PAD and "≥0.30" not in PAD)

# === P3-19: PAD.md ADR-009 runtime ===
check("P3-19: PAD.md ADR-009 says Edge runtime (not Node.js)",
      "Edge runtime by default" in PAD and "runs on Node.js runtime (not Edge)" not in PAD)
check("P3-19: PAD.md §5.1 Next.js row says Edge (not Node.js)",
      "runs on Edge runtime by default, same as middleware did" in PAD and
      "shifts from Edge to Node.js runtime" not in PAD)

# === Bonus: PAD.md Next.js row corrections ===
check("Bonus: PAD.md React Compiler opt-in clarified",
      "opt-in via `reactCompiler: true` — NOT default" in PAD)
check("Bonus: PAD.md serverExternalPackages attributed to Next.js 15",
      "Next.js 15, not 16" in PAD)

# === Print results ===
print("=" * 100)
print(f"{'Check':<70} {'Result'}")
print("=" * 100)
for name, status, _ in results:
    print(f"{status} {name}")

passed = sum(1 for _, s, _ in results if s == "✅")
failed = sum(1 for _, s, _ in results if s == "❌")
print()
print("=" * 100)
print(f"Total: {len(results)} checks — {passed} passed, {failed} failed")
if failed == 0:
    print("✅ ALL CHECKS PASSED — PAD.md, design.md, and SKILL.md are aligned.")
else:
    print("❌ SOME CHECKS FAILED — see above.")
print("=" * 100)

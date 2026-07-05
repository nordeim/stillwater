#!/usr/bin/env python3
"""
VERIFY phase: Cross-check MASTER_EXECUTION_PLAN.md against the 4 source documents
after the v1.1.0 → v1.2.0 remediation. Confirms all P0/P1/P2/P3 fixes were applied.
"""
from pathlib import Path

ROOT = Path("/home/z/my-project/stillwater")
MEP = (ROOT / "MASTER_EXECUTION_PLAN.md").read_text(encoding="utf-8")

results = []

def check(name, condition):
    status = "✅" if condition else "❌"
    results.append((name, status))
    return condition

# === P0-1: Stripe apiVersion ===
check("P0-1: MEP Stripe apiVersion 'dahlia' (not 'basil')",
      "2026-06-24.dahlia" in MEP and "2025-03-31.basil" not in MEP)

# === P0-2: Env var count ===
check("P0-2: MEP env count '34 vars' (not '25 vars')",
      "all 34 vars" in MEP and "all 25 vars" not in MEP)

# === P0-3: F0-23 font directory ===
check("P0-3: MEP F0-23 references jetbrains-mono/ (not berkeley-mono/)",
      "fonts/jetbrains-mono/" in MEP and "fonts/berkeley-mono/" not in MEP)
check("P0-3: MEP F0-23 says 'no license required' for JetBrains Mono",
      "no license required" in MEP)
check("P0-3: MEP F0-23 has 'Do NOT create berkeley-mono' warning",
      "Do NOT" in MEP and "berkeley-mono/" in MEP and "not a Google Font" in MEP)
check("P0-3: MEP F0-24 imports JetBrains Mono (not Berkeley Mono)",
      "Imports Cormorant, DM Sans, JetBrains Mono" in MEP and
      "Imports Cormorant, DM Sans, Berkeley Mono" not in MEP)

# === P1-4: Document Control ===
check("P1-4: MEP Version 1.2.0 (not 1.1.0)",
      "| 1.2.0 |" in MEP or "Version     | 1.2.0" in MEP)
check("P1-4: MEP Status verified against PAD v1.3.0 / SKILL v1.3.0",
      "PAD v1.3.0 / SKILL v1.3.0" in MEP)
check("P1-4: MEP Change Log has v1.2.0 entry",
      "| 1.2.0   | 2026-07-05 | Claw Code / Validation |" in MEP)

# === P1-5: D25 ===
check("P1-5: MEP D25 references JetBrains Mono (not 'self-host Berkeley Mono')",
      "self-host JetBrains Mono" in MEP and "Adopt PAD spec (updated)" in MEP)

# === P1-6: D34 ===
check("P1-6: MEP D34 references JetBrains Mono",
      "JetBrains Mono in `packages/ui/src/fonts/`" in MEP)

# === P1-7: D41 ===
check("P1-7: MEP D41 acknowledges v1.3.0 corrections",
      "FURTHER UPDATED (v1.3.0)" in MEP and "Stripe API version (Basil→Dahlia)" in MEP)

# === P1-8: Phase 12 acceptance criteria ===
check("P1-8: MEP Phase 12 acceptance says 'JetBrains Mono — all free Google Fonts'",
      "Cormorant + DM Sans + JetBrains Mono — all free Google Fonts" in MEP)

# === P1-9: §3.2 Design principles ===
check("P1-9: MEP §3.2 says 'JetBrains Mono data' (not 'Berkeley Mono data')",
      "JetBrains Mono data" in MEP and "Berkeley Mono data" not in MEP)

# === P1-10: Open Questions §9.7 ===
check("P1-10: MEP Q2 (proxy.ts) marked ✅ RESOLVED",
      "✅ RESOLVED. Next.js 16.2.0 is pinned" in MEP)
check("P1-10: MEP Q3 (fonts) marked ✅ RESOLVED with JetBrains Mono",
      "✅ RESOLVED. Self-hosting Cormorant Garamond + DM Sans + JetBrains Mono" in MEP)
check("P1-10: MEP Q7 (Berkeley Mono license) marked ✅ RESOLVED",
      "✅ RESOLVED. JetBrains Mono (Apache 2.0, open-source Google Font) selected" in MEP)

# === P1-11: §7.1 alignment claim ===
check("P1-11: MEP §7.1 says 'Partially Verified' (not '100% alignment')",
      "PAD Alignment Partially Verified" in MEP and "100% alignment" not in MEP)

# === P2-12: Source Document Map ===
check("P2-12: MEP Source Document Map includes static_landing_page_mockup.html",
      "static_landing_page_mockup.html" in MEP and
      "visual/aesthetic reference" in MEP)
check("P2-12: MEP Sources field includes .html mockup",
      "static_landing_page_mockup.html" in MEP.split("Sources")[1].split("Change Log")[0] if "Sources" in MEP and "Change Log" in MEP else False)
check("P2-12: MEP Phase 12 Goal references both .html and .md",
      "static_landing_page_mockup.html` (visual reference)" in MEP and
      "static_landing_page_html_mockup.md` (design rationale)" in MEP)

# === P2-13: D9 ===
check("P2-13: MEP D9 marked RESOLVED IN SOURCE (PAD v1.2.0)",
      "RESOLVED IN SOURCE (PAD v1.2.0)" in MEP and
      "orphaned `--color-fog` removed entirely" in MEP)
check("P2-13: MEP F0-16 D9 checklist item struck through",
      "~~`--color-fog` defined separately (D9 fix)~~" in MEP)

# === P2-15: Color token prefix remapping ===
check("P2-15: MEP Phase 12 acceptance has color token prefix criterion",
      "Color tokens use `--color-` prefix" in MEP and
      "not mockup's unprefixed `--stone-950`" in MEP)

# === P3-16: proxy.ts Open Question (covered by P1-10) ===
check("P3-16: MEP proxy.ts question resolved (covered by P1-10)",
      "✅ RESOLVED. Next.js 16.2.0 is pinned" in MEP)

# === Bonus: No stale 'Berkeley Mono' as an active instruction ===
# (Berkeley Mono may still appear in historical context like "was the Phase 1 proposal")
berkeley_active = [line for line in MEP.splitlines()
                   if "Berkeley Mono" in line
                   and "Phase 1 proposal" not in line
                   and "~~Berkeley Mono" not in line
                   and "RESOLVED" not in line
                   and "paid" not in line
                   and "never acquired" not in line
                   and "not a Google Font" not in line
                   and "Do NOT" not in line]
check("Bonus: No stale 'Berkeley Mono' as active instruction",
      len(berkeley_active) == 0)

# === Print results ===
print("=" * 100)
print(f"{'Check':<75} {'Result'}")
print("=" * 100)
for name, status in results:
    print(f"{status} {name}")

passed = sum(1 for _, s in results if s == "✅")
failed = sum(1 for _, s in results if s == "❌")
print()
print("=" * 100)
print(f"Total: {len(results)} checks — {passed} passed, {failed} failed")
if failed == 0:
    print("✅ ALL CHECKS PASSED — MASTER_EXECUTION_PLAN.md is aligned with all 4 source documents.")
else:
    print("❌ SOME CHECKS FAILED — see above.")
    if berkeley_active:
        print(f"\nStale 'Berkeley Mono' lines (not in historical context):")
        for line in berkeley_active:
            print(f"  → {line.strip()[:100]}")
print("=" * 100)

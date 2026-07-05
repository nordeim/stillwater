#!/usr/bin/env python3
"""
VERIFY phase: Cross-check SKILL.md §2.1 version claims against actual package.json
files after the alignment edits. Confirms SKILL.md <-> package.json are now aligned.
"""
import re
import json
from pathlib import Path

ROOT = Path("/home/z/my-project/stillwater")
SKILL_MD = (ROOT / "stillwater_SKILL.md").read_text(encoding="utf-8")

# Extract §2.1 version table rows
section_match = re.search(
    r"### 2\.1 Locked Versions\s*\n(.*?)(?=\n### 2\.2)",
    SKILL_MD,
    flags=re.DOTALL,
)
section_text = section_match.group(1)

# Parse table rows: | Layer | Technology | Version | Critical Note |
rows = []
for line in section_text.splitlines():
    m = re.match(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|\s*$", line)
    if m:
        rows.append({
            "layer": m.group(1).strip(),
            "tech": m.group(2).strip(),
            "version": m.group(3).strip(),
            "note": m.group(4).strip()[:80],
        })

# Read actual package.json files
pkg_files = {
    "root": ROOT / "package.json",
    "apps/web": ROOT / "apps/web/package.json",
    "packages/db": ROOT / "packages/db/package.json",
    "packages/auth": ROOT / "packages/auth/package.json",
}
actual_deps = {}
for label, path in pkg_files.items():
    pkg = json.loads(path.read_text())
    for section in ("dependencies", "devDependencies"):
        for dep, ver in pkg.get(section, {}).items():
            actual_deps.setdefault(dep, {})[label] = ver

# Cross-check key packages
checks = [
    ("next", "^16.2.0", ["apps/web"]),
    ("react", "^19.2.3", ["apps/web"]),
    ("react-dom", "^19.2.3", ["apps/web"]),
    ("typescript", "^5.9.0", ["root", "packages/db", "packages/auth"]),
    ("tailwindcss", "^4.3.0", ["apps/web"]),
    ("@tailwindcss/postcss", "^4.3.0", ["apps/web"]),
    ("stripe", "^22.3.0", ["apps/web"]),
    ("zod", "^4.4.0", ["apps/web", "packages/db", "packages/auth"]),
    ("drizzle-orm", "^0.45.0", ["packages/db"]),
    ("drizzle-kit", "^0.31.0", ["packages/db"]),
    ("turbo", "^2.10.0", ["root"]),
    ("better-auth", "^1.6.23", ["apps/web", "packages/auth"]),
    ("@trpc/server", "^11.0.0", ["apps/web"]),
]

print("=" * 100)
print(f"{'Package':<28} {'SKILL.md':<14} {'Location':<16} {'Actual':<14} {'Match':<6}")
print("=" * 100)
all_match = True
for pkg, expected, locations in checks:
    for loc in locations:
        actual = actual_deps.get(pkg, {}).get(loc, "NOT FOUND")
        match = "✅" if actual == expected else "❌"
        if actual != expected:
            all_match = False
        print(f"{pkg:<28} {expected:<14} {loc:<16} {actual:<14} {match}")

print()
# Check packageManager field
root_pkg = json.loads(pkg_files["root"].read_text())
pm = root_pkg.get("packageManager", "NOT SET")
pm_match = pm == "pnpm@11.0.0"
print(f"{'packageManager':<28} {'pnpm@11.0.0':<14} {'root':<16} {pm:<14} {'✅' if pm_match else '❌'}")
if not pm_match:
    all_match = False

# Check tsconfig flags (strip JSONC comments first)
base_raw = (ROOT / "tooling/typescript/base.json").read_text()
base_clean = re.sub(r"^\s*//.*$", "", base_raw, flags=re.MULTILINE)  # strip // comments
base_clean = re.sub(r"/\*.*?\*/", "", base_clean, flags=re.DOTALL)  # strip /* */ comments
base_clean = re.sub(r",(\s*[}\]])", r"\1", base_clean)  # strip trailing commas
base_json = json.loads(base_clean)
compiler = base_json.get("compilerOptions", {})
ts_flags = [
    ("verbatimModuleSyntax", True),
    ("erasableSyntaxOnly", True),
    ("strict", True),
    ("noUncheckedIndexedAccess", True),
    ("exactOptionalPropertyTypes", True),
    ("useUnknownInCatchVariables", True),
]
print()
print("=== tsconfig flags (tooling/typescript/base.json) ===")
for flag, expected in ts_flags:
    actual = compiler.get(flag)
    match = "✅" if actual == expected else "❌"
    if actual != expected:
        all_match = False
    print(f"  {flag:<35} expected={expected!s:<6} actual={actual!s:<6} {match}")

# Check env.ts Zod v4 migration
env_ts = (ROOT / "packages/config/src/env.ts").read_text()
v3_pattern = "z.ZodIssueCode.custom"
v4_pattern = "code: 'custom'"
v3_count = env_ts.count(v3_pattern)
v4_count = env_ts.count(v4_pattern)
print()
print("=== env.ts Zod v4 migration ===")
print(f"  z.ZodIssueCode.custom (v3, deprecated): {v3_count} occurrences {'✅' if v3_count == 0 else '❌'}")
print(f"  code: 'custom' (v4 pattern):            {v4_count} occurrences {'✅' if v4_count > 0 else '❌'}")
if v3_count > 0:
    all_match = False

# Check env var count in SKILL.md
env_34 = "Environment Variables (34 total)" in SKILL_MD
env_25 = "Environment Variables (25 total)" in SKILL_MD
env_schema_34 = "Env Schema (34 vars)" in SKILL_MD
env_schema_25 = "Env Schema (25 vars)" in SKILL_MD
print()
print("=== SKILL.md env var count ===")
print(f"  §3.3 '34 total': {env_34} {'✅' if env_34 else '❌'}")
print(f"  §3.3 '25 total' (should be gone): {env_25} {'✅' if not env_25 else '❌'}")
print(f"  §20.5 '34 vars': {env_schema_34} {'✅' if env_schema_34 else '❌'}")
print(f"  §20.5 '25 vars' (should be gone): {env_schema_25} {'✅' if not env_schema_25 else '❌'}")
if env_25 or env_schema_25:
    all_match = False

# Check source-skill count consistency
count_12 = len(re.findall(r"\b12 source skills?\b", SKILL_MD, flags=re.IGNORECASE))
count_21 = len(re.findall(r"\b21 source skills?\b", SKILL_MD, flags=re.IGNORECASE))
count_25plus = len(re.findall(r"\b25\+\s*source skills?\b", SKILL_MD, flags=re.IGNORECASE))
print()
print("=== SKILL.md source-skill count consistency ===")
print(f"  '12 source skills' occurrences: {count_12} {'✅' if count_12 == 0 else '❌ (should be 0)'}")
print(f"  '21 source skills' occurrences: {count_21} {'✅' if count_21 >= 2 else '❌ (should be ≥2)'}")
print(f"  '25+ source skills' occurrences: {count_25plus} {'✅' if count_25plus == 0 else '❌ (should be 0)'}")
if count_12 > 0 or count_25plus > 0:
    all_match = False

# Check trustHost removed from Better Auth claims (Auth.js v5 historical context is OK)
trusthost_lines = [l for l in SKILL_MD.splitlines() if "trusthost: true" in l.lower()]
bad_trusthost = 0
for l in trusthost_lines:
    # OK if line explicitly says Auth.js v5 or "Better Auth does NOT"
    if "auth.js v5" in l.lower() or "better auth does not" in l.lower() or "unlike auth.js v5" in l.lower():
        continue
    bad_trusthost += 1
print()
print("=== SKILL.md §5.6.0 trustHost claim (Better Auth context only) ===")
print(f"  Total 'trustHost: true' mentions: {len(trusthost_lines)}")
print(f"  Auth.js v5 historical context (OK): {len(trusthost_lines) - bad_trusthost}")
print(f"  Better Auth misclaims (should be 0): {bad_trusthost} {'✅' if bad_trusthost == 0 else '❌'}")
if bad_trusthost > 0:
    all_match = False

# Check Stripe claims
basil_count = SKILL_MD.count('"Basil" API')
dahlia_count = SKILL_MD.count('"Dahlia" API')
camelcase_count = SKILL_MD.lower().count("camelcase (currentperiodend)")
print()
print("=== SKILL.md Stripe claims ===")
print(f"  '\"Basil\" API' (wrong for v22): {basil_count} {'✅' if basil_count == 0 else '❌'}")
print(f"  '\"Dahlia\" API' (correct for v22): {dahlia_count} {'✅' if dahlia_count >= 1 else '❌'}")
print(f"  'camelCase (currentPeriodEnd)' (false): {camelcase_count} {'✅' if camelcase_count == 0 else '❌'}")
if basil_count > 0 or camelcase_count > 0:
    all_match = False

# Check Zod enum error claim
message_claim = "enum errors use `{ message }`" in SKILL_MD
error_claim = "enum errors use unified `{ error }`" in SKILL_MD
print()
print("=== SKILL.md Zod v4 enum error claim ===")
print(f"  '{{ message }}' claim (wrong): {message_claim} {'✅' if not message_claim else '❌'}")
print(f"  '{{ error }}' claim (correct): {error_claim} {'✅' if error_claim else '❌'}")
if message_claim:
    all_match = False

print()
print("=" * 100)
if all_match:
    print("✅ ALL CHECKS PASSED — SKILL.md, package.json, tsconfig, and env.ts are aligned.")
else:
    print("❌ SOME CHECKS FAILED — see above for details.")
print("=" * 100)

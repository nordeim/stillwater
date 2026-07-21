#!/bin/sh
# Pre-commit hook: block accidental commits of .env.local or files containing secrets.
# Install: ln -s ../../scripts/pre-commit-check.sh .git/hooks/pre-commit
# Or copy this file to .git/hooks/pre-commit and chmod +x.
#
# V17-1 fix: Previously only blocked `.env.local` (with leading dot).
# The original env.local (NO leading dot) was committed by accident because
# the .gitignore pattern `.env.local` didn't match `env.local`. This hook
# now blocks BOTH variants. See AUDIT_REMEDIATION.md §v17 Fix #1.

# Block .env.local AND env.local ADDITIONS (allow deletions so `git rm --cached` works)
# --diff-filter=Ac means only Added and Copied files (excludes Deleted, Modified, Renamed)
# Pattern matches:
#   .env.local              (dot-prefixed)
#   env.local               (no-dot — the V17-1 incident)
#   apps/web/.env.local     (nested dot-prefixed)
#   apps/web/env.local      (nested no-dot — the V17-1 incident)
if git diff --cached --diff-filter=Ac --name-only | grep -qE '(^|/)\.env\.local$|(^|/)env\.local$'; then
  echo "❌ BLOCKED: env.local / .env.local is staged for ADDITION."
  echo "   These files contain local dev secrets and must NEVER be committed."
  echo "   If you intended to commit .env.example (the template), check the filename."
  exit 1
fi

# Block any .env*.local / env*.local ADDITIONS (e.g. .env.development.local, env.prod.local)
if git diff --cached --diff-filter=Ac --name-only | grep -qE '(^|/)\.env\..*\.local$|(^|/)env\..*\.local$'; then
  echo "❌ BLOCKED: .env.*.local / env.*.local file is staged for ADDITION."
  echo "   These files contain local dev secrets and must NEVER be committed."
  exit 1
fi

# Warn on .env ADDITIONS (not .env.example)
if git diff --cached --diff-filter=Ac --name-only | grep -qE '(^|/)\.env$'; then
  echo "⚠️  WARNING: .env is staged for ADDITION. Are you sure? (only .env.example should be tracked)"
fi

exit 0

#!/bin/sh
# Pre-commit hook: block accidental commits of .env.local or files containing secrets.
# Install: ln -s ../../scripts/pre-commit-check.sh .git/hooks/pre-commit
# Or copy this file to .git/hooks/pre-commit and chmod +x.

# Block .env.local ADDITIONS only (allow deletions so `git rm --cached` works)
# --diff-filter=Ac means only Added and Copied files (excludes Deleted, Modified, Renamed)
if git diff --cached --diff-filter=Ac --name-only | grep -qE '^\.env\.local$'; then
  echo "❌ BLOCKED: .env.local is staged for ADDITION."
  echo "   .env.local contains local dev secrets and must NEVER be committed."
  echo "   If you intended to commit .env.example (the template), check the filename."
  exit 1
fi

# Block any .env*.local ADDITIONS
if git diff --cached --diff-filter=Ac --name-only | grep -qE '\.env\..*\.local$'; then
  echo "❌ BLOCKED: .env.*.local file is staged for ADDITION."
  echo "   These files contain local dev secrets and must NEVER be committed."
  exit 1
fi

# Warn on .env ADDITIONS (not .env.example)
if git diff --cached --diff-filter=Ac --name-only | grep -qE '^\.env$'; then
  echo "⚠️  WARNING: .env is staged for ADDITION. Are you sure? (only .env.example should be tracked)"
fi

exit 0

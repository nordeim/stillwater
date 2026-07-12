#!/bin/sh
# Pre-commit hook: block accidental commits of .env.local or files containing secrets.
# Install: ln -s ../../scripts/pre-commit-check.sh .git/hooks/pre-commit
# Or copy this file to .git/hooks/pre-commit and chmod +x.

# Block .env.local (tracked or staged)
if git diff --cached --name-only | grep -qE '^\.env\.local$'; then
  echo "❌ BLOCKED: .env.local is staged for commit."
  echo "   .env.local contains local dev secrets and must NEVER be committed."
  echo "   If you intended to commit .env.example (the template), check the filename."
  exit 1
fi

# Block any file matching .env*.local pattern
if git diff --cached --name-only | grep -qE '\.env\..*\.local$'; then
  echo "❌ BLOCKED: .env.*.local file is staged for commit."
  echo "   These files contain local dev secrets and must NEVER be committed."
  exit 1
fi

# Warn on any .env file that's not .env.example
if git diff --cached --name-only | grep -qE '^\.env$'; then
  echo "⚠️  WARNING: .env is staged for commit. Are you sure? (only .env.example should be tracked)"
fi

exit 0

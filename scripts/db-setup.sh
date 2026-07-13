#!/usr/bin/env bash
# Stillwater — Database Setup Helper
#
# Copies .env.example → .env.local if it doesn't exist, then verifies
# that DATABASE_URL_UNPOOLED is set.
#
# Run: pnpm db:setup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_EXAMPLE="$ROOT_DIR/.env.example"
ENV_LOCAL="$ROOT_DIR/.env.local"

echo "🌱 Stillwater database setup"
echo ""

# Step 1: Ensure .env.local exists
if [ ! -f "$ENV_LOCAL" ]; then
  if [ ! -f "$ENV_EXAMPLE" ]; then
    echo "❌ .env.example not found at $ENV_EXAMPLE"
    echo "   This file should be committed to the repo."
    exit 1
  fi
  echo "  Creating .env.local from .env.example..."
  cp "$ENV_EXAMPLE" "$ENV_LOCAL"
  echo "  ✅ .env.local created."
  echo ""
  echo "  ⚠️  .env.local now contains PLACEHOLDER values."
  echo "     For local dev, the defaults work with: docker compose up -d postgres redis"
  echo "     For production, edit .env.local and fill in real secrets."
else
  echo "  ✅ .env.local already exists."
fi

echo ""

# Step 2: Verify DATABASE_URL_UNPOOLED is set
if grep -q "^DATABASE_URL_UNPOOLED=.\+" "$ENV_LOCAL" 2>/dev/null; then
  echo "  ✅ DATABASE_URL_UNPOOLED is set in .env.local"
else
  echo "  ⚠️  DATABASE_URL_UNPOOLED is not set (or is empty) in .env.local"
  echo "     Add this line to .env.local:"
  echo "       DATABASE_URL_UNPOOLED=postgresql://stillwater:stillwater_local_dev@localhost:5432/stillwater_dev"
fi

echo ""

# Step 3: Check if Docker Postgres is running (local dev)
if command -v docker &>/dev/null; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "postgres"; then
    echo "  ✅ Postgres container is running"
  else
    echo "  ℹ️  Postgres container not detected. For local dev, run:"
    echo "       docker compose up -d postgres redis"
  fi
else
  echo "  ℹ️  Docker not found. Ensure Postgres is running on localhost:5432"
fi

echo ""
echo "✅ Setup complete. Next steps:"
echo "   pnpm db:migrate     # Apply database migrations"
echo "   pnpm db:seed        # Seed base demo data"
echo "   pnpm db:seed:e2e    # Seed E2E test data (on top of base)"

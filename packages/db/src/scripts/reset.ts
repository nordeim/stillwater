/**
 * F1-21 — Local DB reset script
 *
 * Drops all tables, re-runs migrations, re-seeds.
 * LOCAL ONLY — refuses to run in production.
 *
 * Run via: pnpm db:reset
 *
 * Source: MASTER_EXECUTION_PLAN.md F1-21.
 */

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

// ── Safety check: refuse to run in production ─────────────────────
if (process.env['NODE_ENV'] === 'production') {
  console.error('❌ REFUSING TO RUN: db:reset is LOCAL ONLY.');
  console.error('   This script drops all tables. Set NODE_ENV != production to override.');
  process.exit(1);
}

const dbPackageDir = resolve(import.meta.dirname, '..');

function run(command: string, label: string): void {
  console.log(`\n▶ ${label}...`);
  execSync(command, {
    cwd: dbPackageDir,
    stdio: 'inherit',
    env: process.env,
  });
}

async function reset(): Promise<void> {
  console.log('⚠️  Stillwater Local DB Reset');
  console.log('   This will DROP ALL TABLES and re-seed.\n');
  console.log(`   Database: ${process.env['DATABASE_URL_UNPOOLED'] ?? '(not set)'}\n`);

  // Step 1: Drop schema public cascade (wipes all tables)
  // Using drizzle-kit push with --force to reset schema
  // Alternative: psql -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
  run('pnpm exec drizzle-kit push --force', 'Step 1/3: Dropping all tables (drizzle-kit push --force)');

  // Step 2: Run migrations to recreate schema
  run('pnpm exec drizzle-kit migrate', 'Step 2/3: Running migrations');

  // Step 3: Seed
  run('pnpm exec tsx src/seed/index.ts', 'Step 3/3: Seeding development data');

  console.log('\n✓ Local DB reset complete.');
  console.log('   All tables recreated and demo data loaded.');
}

reset().catch((error) => {
  console.error('\n❌ Reset failed:', error);
  process.exit(1);
});

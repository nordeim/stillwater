#!/usr/bin/env node
/**
 * F10-11 — Bundle size checker for CI
 *
 * Compares .next/build-manifest.json route sizes against .bundle-stats.json
 * budgets. Fails (exit 1) if any route exceeds budget.
 *
 * Usage: node scripts/check-bundle-size.js
 * Run after `pnpm build` in CI.
 *
 * Source: MEP Phase 10 F10-11, PAD §19.2 (bundle size budget).
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const BUNDLE_STATS_PATH = join(ROOT, 'apps/web/.bundle-stats.json');
const BUILD_MANIFEST_PATH = join(ROOT, 'apps/web/.next/build-manifest.json');
const APP_BUILD_MANIFEST_PATH = join(ROOT, 'apps/web/.next/app-build-manifest.json');

if (!existsSync(BUNDLE_STATS_PATH)) {
  console.error('❌ .bundle-stats.json not found');
  process.exit(1);
}

if (!existsSync(BUILD_MANIFEST_PATH)) {
  console.error('❌ Build manifest not found. Run `pnpm build` first.');
  process.exit(1);
}

const budgets = JSON.parse(readFileSync(BUNDLE_STATS_PATH, 'utf-8'));
const buildManifest = JSON.parse(readFileSync(BUILD_MANIFEST_PATH, 'utf-8'));

// Also check app-build-manifest for App Router routes
const appManifest = existsSync(APP_BUILD_MANIFEST_PATH)
  ? JSON.parse(readFileSync(APP_BUILD_MANIFEST_PATH, 'utf-8'))
  : { pages: {} };

let hasErrors = false;
let hasWarnings = false;

console.log('📊 Bundle Size Check\n');
console.log('Route                      Budget    Actual    Status');
console.log('─────────────────────────────────────────────────────────');

for (const [route, config] of Object.entries(budgets.routes)) {
  const budget = config.budget;
  const warningThreshold = budget * budgets.global.warning;

  // Try to find the route in the manifest
  // The build manifest uses different key formats
  const manifestKey = route === '/' ? '/' : route;
  let pageFiles = buildManifest.pages[manifestKey] || appManifest.pages[manifestKey] || [];

  if (pageFiles.length === 0) {
    // Try without leading slash
    pageFiles = buildManifest.pages[route.replace(/^\//, '')] || [];
  }

  // Estimate bundle size from file sizes
  let totalSize = 0;
  for (const file of pageFiles) {
    const filePath = join(ROOT, 'apps/web/.next', file);
    if (existsSync(filePath)) {
      const stat = readFileSync(filePath);
      totalSize += stat.length;
    }
  }

  // Convert to KB (gzipped estimate: ~30% of raw)
  const sizeKB = Math.round((totalSize * 0.3) / 1024);
  const displaySize = sizeKB > 0 ? `${sizeKB}kb` : 'N/A';

  let status = '✅';
  if (sizeKB > budget) {
    status = '❌ FAIL';
    hasErrors = true;
  } else if (sizeKB > warningThreshold) {
    status = '⚠️ WARN';
    hasWarnings = true;
  }

  const routePadded = route.padEnd(26);
  const budgetPadded = `${budget}kb`.padEnd(10);
  const sizePadded = displaySize.padEnd(10);

  console.log(`${routePadded}${budgetPadded}${sizePadded}${status}`);
}

console.log('─────────────────────────────────────────────────────────');

if (hasErrors) {
  console.error('\n❌ Bundle size check FAILED — routes exceed budget');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('\n⚠️ Bundle size warnings — routes approaching budget');
} else {
  console.log('\n✅ All routes within bundle size budget');
}

process.exit(0);

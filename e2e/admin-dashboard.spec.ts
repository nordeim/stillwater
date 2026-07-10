import { test, expect } from '@playwright/test';

/**
 * Admin Dashboard E2E specs (Phase 9 F9-03).
 *
 * Prerequisites:
 *   - Dev server running (pnpm dev --filter=@stillwater/web)
 *   - Database seeded (pnpm db:seed)
 *   - Authenticated staff session
 *
 * Per MEP Phase 9 F9-03.
 */

const ADMIN_BASE = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000';

test.describe('Admin Dashboard', () => {
  test.skip(
    !process.env['DATABASE_URL'] || process.env['DATABASE_URL'].includes('placeholder'),
    'Requires real DATABASE_URL (Docker + seeded DB)',
  );

  test('staff user sees KPI cards on /admin', async ({ page }) => {
    // Note: This test requires a pre-authenticated staff session.
    // In CI, this would be set up via a test fixture that signs in as staff.
    await page.goto(`${ADMIN_BASE}/admin`);

    // KPI cards should be visible
    await expect(page.locator('text=Active Members')).toBeVisible();
    await expect(page.locator('text=Upcoming Sessions')).toBeVisible();
    await expect(page.locator('text=Processed Payments')).toBeVisible();
    await expect(page.locator('text=MRR')).toBeVisible();
  });

  test('member user is redirected from /admin to /dashboard', async ({ page }) => {
    // Note: This test requires a pre-authenticated member session.
    await page.goto(`${ADMIN_BASE}/admin`);

    // Should redirect to /dashboard (requireRole throws NEXT_REDIRECT)
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

import { test, expect } from '@playwright/test';

/**
 * Admin Members E2E specs (Phase 9 F9-09).
 *
 * Prerequisites:
 *   - Dev server running + seeded DB + staff session
 *
 * Per MEP Phase 9 F9-09.
 */

const ADMIN_BASE = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000';

test.describe('Admin Members', () => {
  test.skip(
    !process.env['DATABASE_URL'] || process.env['DATABASE_URL'].includes('placeholder'),
    'Requires real DATABASE_URL (Docker + seeded DB)',
  );

  test('member directory table renders', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/admin/members`);

    await expect(page.locator('text=Name')).toBeVisible();
    await expect(page.locator('text=Email')).toBeVisible();
    await expect(page.locator('text=Joined')).toBeVisible();
    await expect(page.locator('text=Roles')).toBeVisible();
  });

  test('clicking View link navigates to member detail', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/admin/members`);
    await page.click('text=View →');

    await expect(page).toHaveURL(/\/admin\/members\/[a-f0-9-]+/);
  });
});

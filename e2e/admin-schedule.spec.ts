import { test, expect } from '@playwright/test';

/**
 * Admin Schedule E2E specs (Phase 9 F9-06).
 *
 * Prerequisites:
 *   - Dev server running + seeded DB + staff session
 *
 * Per MEP Phase 9 F9-06.
 */

const ADMIN_BASE = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000';

test.describe('Admin Schedule', () => {
  test.skip(
    !process.env['DATABASE_URL'] || process.env['DATABASE_URL'].includes('placeholder'),
    'Requires real DATABASE_URL (Docker + seeded DB)',
  );

  test('week calendar renders with day headers', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/admin/schedule`);

    // Day headers should be visible
    await expect(page.locator('text=Mon')).toBeVisible();
    await expect(page.locator('text=Tue')).toBeVisible();
    await expect(page.locator('text=Wed')).toBeVisible();
    await expect(page.locator('text=Sun')).toBeVisible();
  });

  test('clicking empty slot opens create session dialog', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/admin/schedule`);

    // Click an empty time slot (role=button, aria-label contains "Create session")
    const emptySlot = page.locator('[aria-label*="Create session"]').first();
    await emptySlot.click();

    // Dialog should open
    await expect(page.locator('text=Create Session')).toBeVisible();
  });
});

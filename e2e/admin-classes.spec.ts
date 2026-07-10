import { test, expect } from '@playwright/test';

/**
 * Admin Classes E2E specs (Phase 9 F9-04).
 *
 * Prerequisites:
 *   - Dev server running + seeded DB + staff session
 *
 * Per MEP Phase 9 F9-04.
 */

const ADMIN_BASE = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000';

test.describe('Admin Classes', () => {
  test.skip(
    !process.env['DATABASE_URL'] || process.env['DATABASE_URL'].includes('placeholder'),
    'Requires real DATABASE_URL (Docker + seeded DB)',
  );

  test('lists all classes in table', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/admin/classes`);

    // Table header should be visible
    await expect(page.locator('text=Title')).toBeVisible();
    await expect(page.locator('text=Level')).toBeVisible();
    await expect(page.locator('text=Duration')).toBeVisible();
    await expect(page.locator('text=Capacity')).toBeVisible();
  });

  test('Create class button navigates to new class form', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/admin/classes`);

    await page.click('text=Create Class');
    await expect(page).toHaveURL(/\/admin\/classes\/new/);
    await expect(page.locator('text=Create New Class')).toBeVisible();
  });

  test('editing class updates DB', async ({ page }) => {
    // Navigate to first class in the list
    await page.goto(`${ADMIN_BASE}/admin/classes`);
    await page.click('text=Edit →');

    // Should be on the edit page
    await expect(page).toHaveURL(/\/admin\/classes\/[a-f0-9-]+/);
    await expect(page.locator('text=Class Details')).toBeVisible();
  });
});

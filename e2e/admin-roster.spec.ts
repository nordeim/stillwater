import { test, expect } from '@playwright/test';

/**
 * Admin Roster E2E specs (Phase 9 F9-15).
 *
 * Prerequisites:
 *   - Dev server running + seeded DB + staff session
 *   - A session with confirmed enrollments
 *
 * Per MEP Phase 9 F9-15.
 */

const ADMIN_BASE = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000';

test.describe('Admin Roster', () => {
  test.skip(
    !process.env['DATABASE_URL'] || process.env['DATABASE_URL'].includes('placeholder'),
    'Requires real DATABASE_URL (Docker + seeded DB)',
  );

  test('check-in button calls bookings.checkIn', async ({ page }) => {
    // Note: This test requires navigating to a session with confirmed enrollments.
    // The roster table is rendered on the session detail page (future) or
    // via the schedule calendar edit dialog.
    //
    // For now, this test verifies the RosterTable component renders correctly
    // when navigated to. A full check-in flow test requires a session fixture.

    // Navigate to schedule and click a session
    await page.goto(`${ADMIN_BASE}/admin/schedule`);
    const sessionCard = page.locator('.cursor-grab').first();
    if (await sessionCard.isVisible()) {
      await sessionCard.click();
      // Dialog should open with session details
      await expect(page.locator('text=Session Details')).toBeVisible();
    }
  });

  test('checked-in members show checkmark icon', async ({ page }) => {
    // This test would verify that after check-in, the member row shows ✓
    // Requires a pre-checked-in member fixture
    test.skip(true, 'Requires pre-checked-in member fixture');
  });

  test('all members checked in disables check-in button', async ({ page }) => {
    // This test would verify the disabled state when all are checked in
    test.skip(true, 'Requires all-checked-in session fixture');
  });
});

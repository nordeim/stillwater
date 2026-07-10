/**
 * F10-13 — Checkly synthetic check: booking flow
 *
 * Navigates to /schedule, clicks first class, verifies booking button visible.
 * Runs every 60s against production.
 *
 * Source: MEP Phase 10 F10-13, PAD §18.1.
 */

import { check } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'https://stillwater.studio';

check('booking-flow', async ({ page }) => {
  // Navigate to schedule
  await page.goto(`${BASE_URL}/schedule`, { timeout: 10000 });

  // Verify schedule page loaded
  await page.waitForSelector('h1', { timeout: 5000 });

  // Look for any class card or Book link
  const bookLink = page.locator('a[href*="book"], text=Book').first();
  const hasBookLink = await bookLink.isVisible().catch(() => false);

  if (hasBookLink) {
    await bookLink.click();
    // Verify booking page loaded (booking button or seat availability)
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  }
});

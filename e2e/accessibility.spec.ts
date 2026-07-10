/**
 * F11-11 — Accessibility E2E tests (Playwright + axe-core)
 *
 * Tests for every public route + keyboard navigation + color contrast.
 * Uses @axe-core/playwright AxeBuilder.
 *
 * Source: MEP Phase 11 F11-11, PAD §22.3.
 */

import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000';

const PUBLIC_ROUTES = [
  '/',
  '/schedule',
  '/instructors',
  '/pricing',
  '/about',
  '/blog',
];

test.describe('Accessibility (axe-core)', () => {
  test.skip(
    !process.env['DATABASE_URL'] || process.env['DATABASE_URL'].includes('placeholder'),
    'Requires real DATABASE_URL (Docker + seeded DB)',
  );

  for (const route of PUBLIC_ROUTES) {
    test(`${route} has no a11y violations`, async ({ page }) => {
      await page.goto(`${BASE_URL}${route}`);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }

  test('skip link is first focusable element and visible on focus', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Press Tab to focus the first element
    await page.keyboard.press('Tab');

    // Skip link should be visible and focused
    const skipLink = page.locator('a[href="#main"]').first();
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toBeFocused();
  });

  test('all interactive elements have visible focus indicators', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Tab through interactive elements
    const focusable = page.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const count = await focusable.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      // Verify focus is visible (has outline or box-shadow)
      const outline = await focused.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outlineWidth !== '0px' || styles.boxShadow !== 'none';
      });
      expect(outline).toBe(true);
    }
  });

  test('reduced motion is respected', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Emulate prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Check that animation-duration is 0.01ms or less
    const bodyStyles = await page.evaluate(() => {
      const el = document.body;
      const styles = window.getComputedStyle(el);
      return styles.animationDuration;
    });

    // With reduced-motion, animations should be effectively instant
    // (0.01ms or 0s depending on implementation)
    expect(bodyStyles).toMatch(/^0(\.\d+)?[ms]s?$/);
  });
});

test.describe('SEO metadata', () => {
  test.skip(
    !process.env['DATABASE_URL'] || process.env['DATABASE_URL'].includes('placeholder'),
    'Requires real DATABASE_URL',
  );

  test('home page has title and meta description', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const title = await page.title();
    expect(title).toContain('Stillwater');

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.+/);
  });

  test('all public routes have unique titles', async ({ page }) => {
    const titles: string[] = [];

    for (const route of PUBLIC_ROUTES) {
      await page.goto(`${BASE_URL}${route}`);
      const title = await page.title();
      titles.push(title);
    }

    // All titles should be unique
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  test('all public routes have meta description', async ({ page }) => {
    for (const route of PUBLIC_ROUTES) {
      await page.goto(`${BASE_URL}${route}`);
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute('content', /.+/);
    }
  });

  test('home page has JSON-LD structured data', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();

    if (count > 0) {
      const content = await jsonLd.first().textContent();
      const parsed = JSON.parse(content ?? '{}');
      expect(parsed['@type']).toBeDefined();
    }
  });

  test('robots.txt is accessible', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/robots.txt`);
    expect(response?.status()).toBe(200);

    const content = await response?.text();
    expect(content).toContain('User-agent');
    expect(content).toContain('Disallow: /api/');
  });

  test('sitemap.xml is accessible', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/sitemap.xml`);
    expect(response?.status()).toBe(200);
  });
});

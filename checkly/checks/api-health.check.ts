/**
 * F10-15 — Checkly synthetic check: tRPC API health
 *
 * Hits /api/trpc/schedule.getWeek, verifies 200 response + response time < 500ms.
 *
 * Source: MEP Phase 10 F10-15, PAD §18.1.
 */

import { check } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'https://stillwater.studio';

check('api-health', async ({ request }) => {
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const encodedInput = encodeURIComponent(JSON.stringify({ json: { weekStart: weekStart.toISOString() } }));

  const start = Date.now();
  const response = await request.get(
    `${BASE_URL}/api/trpc/schedule.getWeek?input=${encodedInput}`,
    { timeout: 10000 },
  );
  const elapsed = Date.now() - start;

  if (!response.ok()) {
    throw new Error(`API health check failed: ${response.status()} ${response.statusText()}`);
  }

  if (elapsed > 500) {
    throw new Error(`API response too slow: ${elapsed}ms (threshold: 500ms)`);
  }
});

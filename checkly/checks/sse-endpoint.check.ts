/**
 * F10-14 — Checkly synthetic check: SSE endpoint
 *
 * Hits /api/schedule/stream, verifies SSE event received within 5s.
 * Alerts Slack if SSE down.
 *
 * Source: MEP Phase 10 F10-14, PAD §18.1.
 */

import { check } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'https://stillwater.studio';
const TEST_SESSION_ID = process.env.CHECKLY_TEST_SESSION_ID ?? '00000000-0000-4000-8000-000000000001';

check('sse-endpoint', async ({ page }) => {
  // Use page.evaluate to create an EventSource and wait for first event
  const receivedEvent = await page.evaluate(
    async (url: string) => {
      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        const eventSource = new EventSource(url);

        eventSource.onmessage = () => {
          clearTimeout(timeout);
          eventSource.close();
          resolve(true);
        };

        eventSource.onerror = () => {
          clearTimeout(timeout);
          eventSource.close();
          resolve(false);
        };
      });
    },
    `${BASE_URL}/api/schedule/stream?sessionId=${TEST_SESSION_ID}`,
  );

  if (!receivedEvent) {
    throw new Error('SSE endpoint did not send an event within 5s');
  }
});

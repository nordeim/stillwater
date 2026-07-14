/**
 * withTimeout — race a promise against a timeout, return fallback if timeout wins.
 *
 * Used by marketing pages to avoid stuck Suspense fallbacks when the DB
 * (neon-http driver via fetch()) hangs indefinitely. The neon-http driver
 * has no built-in timeout — a cold Neon compute endpoint or a network stall
 * can leave fetch() pending forever, which leaves the page's <Suspense>
 * fallback rendered forever.
 *
 * This is defensive resilience, NOT a substitute for fixing the underlying
 * DB connectivity issue. Root-cause diagnosis still requires inspecting
 * Vercel function logs + Neon query logs.
 *
 * Usage:
 *   const sessions = await withTimeout(
 *     caller.schedule.getWeek({ weekStart }),
 *     8_000,
 *     [],
 *   );
 */

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      resolve(fallback);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

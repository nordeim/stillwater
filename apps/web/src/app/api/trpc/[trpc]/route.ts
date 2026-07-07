/**
 * F3-16 — tRPC HTTP handler for Next.js App Router
 *
 * Uses the fetch adapter (Vercel-compatible). Both GET and POST
 * are exported for query and mutation support.
 *
 * Source: MEP Phase 3 F3-16, PAD §8.6.
 */

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { appRouter, createContext } from '@stillwater/api';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    ...(process.env.NODE_ENV === 'development'
      ? {
          onError: ({ path, error }: { path: string | undefined; error: { message: string } }) => {
            console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`);
          },
        }
      : {}),
  });

export { handler as GET, handler as POST };

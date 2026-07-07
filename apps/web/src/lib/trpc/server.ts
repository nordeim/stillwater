/**
 * F3-17 — Server-side tRPC caller for RSC (zero HTTP round-trip)
 *
 * Used by Server Components to call tRPC procedures directly
 * in-process without an HTTP round-trip.
 *
 * Source: MEP Phase 3 F3-17, PAD §10.2.
 */

import 'server-only';
import { headers } from 'next/headers';

import { appRouter, createContext } from '@stillwater/api';

export async function apiCaller() {
  const heads = new Headers(await headers());
  const req = new Request('http://localhost:3000/api/trpc', { headers: heads });
  const ctx = await createContext({ req });
  return appRouter.createCaller(ctx);
}

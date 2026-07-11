/**
 * F10-05 — PostHogProvider: React provider for PostHog
 *
 * Client component that initializes PostHog and wraps children.
 * Mounted in the root layout.
 *
 * Source: MEP Phase 10 F10-05, PAD §18.2.
 */

'use client';

import { useEffect, type ReactNode } from 'react';

import { initPostHog } from '@/lib/analytics/posthog';

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    initPostHog();
  }, []);

  return <>{children}</>;
}

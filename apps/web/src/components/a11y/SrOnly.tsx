/**
 * F11-14 — Screen-reader-only text wrapper
 *
 * Uses Tailwind's `sr-only` class (visually-hidden pattern).
 *
 * Source: MEP Phase 11 F11-14, PAD §22.
 */

import type { ReactNode } from 'react';

interface SrOnlyProps {
  children: ReactNode;
}

export function SrOnly({ children }: SrOnlyProps) {
  return <span className="sr-only">{children}</span>;
}

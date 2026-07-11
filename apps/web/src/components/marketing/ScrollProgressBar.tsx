/**
 * F12-16 — Visual scroll progress bar
 *
 * Fixed top, full-width, 2px tall. clay-400 background.
 * transform: scaleX(progress) with transform-origin: left.
 *
 * Source: MEP Phase 12 F12-16.
 */

'use client';

import { useScrollProgress } from '@/hooks/useScrollProgress';

export function ScrollProgressBar() {
  const progress = useScrollProgress();

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[60] h-0.5 origin-left bg-clay-400"
      style={{ transform: `scaleX(${String(progress)})` }}
      aria-hidden="true"
    />
  );
}

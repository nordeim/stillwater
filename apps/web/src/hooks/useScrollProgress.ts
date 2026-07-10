/**
 * F12-13 — Reading progress bar (top of page)
 *
 * Returns 0-1 representing scroll position.
 * Throttled via requestAnimationFrame. SSR-safe.
 *
 * Source: MEP Phase 12 F12-13.
 */

import { useState, useEffect } from 'react';

export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame: number;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const newProgress = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(newProgress);
      frame = -1;
    };

    const onScroll = () => {
      if (frame < 0) {
        frame = requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update(); // initial

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame >= 0) cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}

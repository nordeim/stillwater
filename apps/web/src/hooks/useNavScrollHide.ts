/**
 * F12-15 — Hide nav on scroll-down, show on scroll-up
 *
 * Hides after 80px scroll-down. Shows on scroll-up.
 * Adds nav--scrolled class after 20px (blur backdrop).
 *
 * Source: MEP Phase 12 F12-15.
 */

import { useState, useEffect } from 'react';

export function useNavScrollHide() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;

      setScrolled(y > 20);

      if (y > 80 && y > lastY) {
        setHidden(true);
      } else {
        setHidden(false);
      }

      lastY = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { hidden, scrolled };
}

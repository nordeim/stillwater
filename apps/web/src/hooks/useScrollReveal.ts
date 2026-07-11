/**
 * F12-14 — IntersectionObserver-based scroll reveal
 *
 * Adds reveal--visible class when element enters viewport at 88% threshold.
 * Single observer per element. Respects prefers-reduced-motion.
 *
 * Source: MEP Phase 12 F12-14.
 */

import { useEffect, useRef, type RefObject } from 'react';

export function useScrollReveal<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Respect reduced motion — always visible
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.classList.add('reveal--visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 }, // 88% from top = 12% threshold
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return ref;
}

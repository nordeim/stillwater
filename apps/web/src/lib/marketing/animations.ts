/**
 * F12-25 — Framer Motion variants mirroring mockup CSS animations
 *
 * Easing: [0.16, 1, 0.3, 1] (gentle / expo-out)
 * Duration: 600ms (slow)
 * Stagger: 80ms
 *
 * Source: MEP Phase 12 F12-25, mockup CSS `--ease-gentle` + `--dur-slow`.
 */

import type { Variants } from 'framer-motion';

export const revealVariant: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

export const fadeInVariant: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

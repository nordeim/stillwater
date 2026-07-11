/**
 * F12-04 — Marquee strip (kinetic typography)
 *
 * Client component with Framer Motion. 7 class items duplicated 2×
 * for seamless loop. Pauses on hover. Respects prefers-reduced-motion.
 *
 * Source: MEP Phase 12 F12-04.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { MarqueeItem } from './MarqueeItem';

import { MARQUEE_ITEMS } from '@/lib/marketing/copy';

export function ClassMarquee() {
  const shouldReduceMotion = useReducedMotion();
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]; // duplicate for seamless loop

  return (
    <div
      className="overflow-hidden border-y border-stone-200 bg-sand-warm py-6"
      aria-hidden="true"
    >
      {shouldReduceMotion ? (
        /* Static layout for reduced motion */
        <div className="flex flex-wrap gap-4 px-6">
          {MARQUEE_ITEMS.map((item, i) => (
            <MarqueeItem key={i} {...item} />
          ))}
        </div>
      ) : (
        <motion.div
          className="flex whitespace-nowrap"
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            duration: 32,
            ease: 'linear',
            repeat: Infinity,
          }}
          whileHover={{ animationPlayState: 'paused' }}
        >
          {items.map((item, i) => (
            <MarqueeItem key={i} {...item} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

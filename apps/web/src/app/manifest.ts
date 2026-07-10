/**
 * F11-04 — PWA manifest
 *
 * Source: MEP Phase 11 F11-04, PAD §23.
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Stillwater Yoga Studio',
    short_name: 'Stillwater',
    description: 'A sanctuary for mindful movement in Southeast Portland. Book classes online.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F0E8', // --color-sand
    theme_color: '#C4856A', // --color-clay-400
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

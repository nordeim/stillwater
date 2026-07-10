/**
 * F11-02 — robots.txt generation
 *
 * Allows all crawling except /api/*, /admin/*, /auth/*.
 * References sitemap.
 *
 * Source: MEP Phase 11 F11-02, PAD §23.
 */

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/', '/dashboard', '/book/', '/profile', '/membership', '/history'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

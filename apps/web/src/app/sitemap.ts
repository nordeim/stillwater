/**
 * F11-03 — sitemap.xml generation
 *
 * Static routes + dynamic routes (instructors, blog posts).
 * Uses Sanity for blog post slugs + DB for instructors.
 *
 * Source: MEP Phase 11 F11-03, PAD §23.
 */

import type { MetadataRoute } from 'next';
import { apiCaller } from '@/lib/trpc/server';
import { getSanityClient } from '@/lib/sanity/client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/schedule`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/instructors`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  // Dynamic: instructors
  try {
    const caller = await apiCaller();
    const instructors = await caller.instructors.list();
    const instructorRoutes: MetadataRoute.Sitemap = (instructors as unknown[]).map((ins) => {
      const instructor = ins as { slug: string };
      return {
        url: `${baseUrl}/instructors/${instructor.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      };
    });

    // Dynamic: blog posts (Sanity)
    let blogRoutes: MetadataRoute.Sitemap = [];
    try {
      const client = getSanityClient();
      if (client) {
        const posts = await client.fetch(
          `*[_type == "blogPost" && published == true] | order(publishedAt desc) { slug }`
        );
        blogRoutes = (posts as Array<{ slug: { current: string } }>).map((post) => ({
          url: `${baseUrl}/blog/${post.slug.current}`,
          lastModified: new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }));
      }
    } catch {
      // Sanity not configured in this environment — skip blog routes
    }

    return [...staticRoutes, ...instructorRoutes, ...blogRoutes];
  } catch {
    // If DB/API unavailable, return static routes only
    return staticRoutes;
  }
}

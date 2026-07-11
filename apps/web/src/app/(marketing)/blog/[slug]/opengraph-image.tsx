/**
 * F11-06 — Per-blog-post OG image
 *
 * Generates from blog post title + author.
 * Cached per slug.
 *
 * Source: MEP Phase 11 F11-06, PAD §23.3.
 */

import { ImageResponse } from '@vercel/og';

import { getSanityClient } from '@/lib/sanity/client';

export const runtime = 'edge';
export const alt = 'Stillwater Yoga Studio Blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let title = 'Stillwater Blog';
  let author = '';

  try {
    const client = getSanityClient();
    if (client) {
      const post = await client.fetch<{ title?: string; author?: string } | null>(
        `*[_type == "blogPost" && published == true && slug.current == $slug][0] { title, author }`,
        { slug },
      );
      if (post) {
        title = post.title ?? title;
        author = post.author ?? '';
      }
    }
  } catch {
    // Graceful fallback to defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
          backgroundColor: '#F5F0E8',
          color: '#1C1915',
          fontFamily: 'serif',
        }}
      >
        <div style={{ fontSize: 20, color: '#C4856A', fontFamily: 'sans-serif', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Stillwater Blog
        </div>
        <div style={{ fontSize: 56, fontWeight: 300, lineHeight: 1.2, marginBottom: 30 }}>
          {title}
        </div>
        {author && (
          <div style={{ fontSize: 24, color: '#8C7B6E', fontFamily: 'sans-serif' }}>
            by {author}
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}

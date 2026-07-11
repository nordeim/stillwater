/**
 * F11-07 — Per-instructor OG image
 *
 * Instructor name + specialty. Warm Mineral palette.
 *
 * Source: MEP Phase 11 F11-07, PAD §23.3.
 */

import { ImageResponse } from '@vercel/og';

import { apiCaller } from '@/lib/trpc/server';

export const runtime = 'nodejs';
export const alt = 'Stillwater Yoga Instructor';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let name = 'Stillwater Yoga';
  let bio = '';

  try {
    const caller = await apiCaller();
    const instructor = await caller.instructors.getBySlug({ slug });
    name = instructor.slug;
    bio = instructor.bio?.slice(0, 120) ?? '';
  } catch {
    // Graceful fallback
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
          Stillwater Instructor
        </div>
        <div style={{ fontSize: 64, fontWeight: 300, lineHeight: 1.1, marginBottom: 20 }}>
          {name}
        </div>
        {bio && (
          <div style={{ fontSize: 26, color: '#8C7B6E', fontFamily: 'sans-serif', lineHeight: 1.4 }}>
            {bio}
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}

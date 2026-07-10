/**
 * F11-05 — Default OG image (generated via @vercel/og)
 *
 * 1200×630. Stillwater wordmark + tagline. Warm Mineral palette.
 *
 * Source: MEP Phase 11 F11-05, PAD §23.3.
 */

import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';
export const alt = 'Stillwater Yoga Studio — A sanctuary for mindful movement in Southeast Portland';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#F5F0E8',
          color: '#1C1915',
          fontFamily: 'serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 16 }}>
          Stillwater
        </div>
        <div style={{ fontSize: 28, color: '#8C7B6E', fontFamily: 'sans-serif' }}>
          A sanctuary for mindful movement in SE Portland
        </div>
        <div style={{ marginTop: 40, display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 18, color: '#C4856A', fontFamily: 'sans-serif' }}>Vinyasa</span>
          <span style={{ fontSize: 18, color: '#8C7B6E', fontFamily: 'sans-serif' }}>·</span>
          <span style={{ fontSize: 18, color: '#C4856A', fontFamily: 'sans-serif' }}>Ashtanga</span>
          <span style={{ fontSize: 18, color: '#8C7B6E', fontFamily: 'sans-serif' }}>·</span>
          <span style={{ fontSize: 18, color: '#C4856A', fontFamily: 'sans-serif' }}>Yin</span>
          <span style={{ fontSize: 18, color: '#8C7B6E', fontFamily: 'sans-serif' }}>·</span>
          <span style={{ fontSize: 18, color: '#C4856A', fontFamily: 'sans-serif' }}>Restorative</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

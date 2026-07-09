/**
 * F8-27 — EmailButton: reusable email CTA button
 *
 * Per PAD §16.2 + MEP F8-27:
 * - Variants: 'primary' (clay-400 bg) and 'ghost' (transparent + border)
 * - Padding: 16px 32px
 * - Sharp corners (matches site --radius: 0 — Editorial Calm)
 * - Safe hex colors, NOT CSS variables
 *
 * Source: MEP F8-27, PAD §16.2.
 */

import { Link } from 'react-email';
import type { CSSProperties } from 'react';

const COLORS = {
  clay400: '#C4856A',
  clay500: '#9E5E44',
  sand100: '#F7EDE8',
  stone900: '#1C1915',
  stone400: '#8C7B6E',
} as const;

export interface EmailButtonProps {
  href: string;
  variant?: 'primary' | 'ghost';
  children: React.ReactNode;
}

export function EmailButton({
  href,
  variant = 'primary',
  children,
}: EmailButtonProps) {
  const baseStyle: CSSProperties = {
    display: 'inline-block',
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: 500,
    textDecoration: 'none',
    // Sharp corners — NO border-radius (Editorial Calm: --radius: 0)
  };

  const variantStyle =
    variant === 'primary'
      ? {
          backgroundColor: COLORS.clay400,
          color: COLORS.sand100,
          border: 'none',
        }
      : {
          backgroundColor: 'transparent',
          color: COLORS.stone900,
          border: `1px solid ${COLORS.stone400}`,
        };

  return (
    <Link href={href} style={{ ...baseStyle, ...variantStyle }}>
      {children}
    </Link>
  );
}

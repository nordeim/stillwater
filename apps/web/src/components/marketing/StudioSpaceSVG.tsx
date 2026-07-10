/**
 * F12-22 — SVG illustrations for studio rooms
 *
 * Reproduces mockup SVGs verbatim (until real photos available).
 * Accessible: role="img" + aria-label.
 *
 * Source: MEP Phase 12 F12-22.
 */

interface StudioSpaceSVGProps {
  variant: 'main-hall' | 'stillness-room' | 'sunrise-room';
  className?: string;
}

const ARIA_LABELS: Record<StudioSpaceSVGProps['variant'], string> = {
  'main-hall': 'Illustration of the Main Hall studio room with wooden floor and yoga mats',
  'stillness-room': 'Illustration of the Stillness Room with candlelight ambiance',
  'sunrise-room': 'Illustration of the Sunrise Room with morning light',
};

export function StudioSpaceSVG({ variant, className }: StudioSpaceSVGProps) {
  return (
    <svg
      viewBox="0 0 480 520"
      className={className}
      role="img"
      aria-label={ARIA_LABELS[variant]}
      style={{ width: '100%', height: 'auto' }}
    >
      {variant === 'main-hall' && (
        <>
          {/* Background */}
          <rect width="480" height="520" fill="#EDE5D8" />
          {/* Windows */}
          <rect x="40" y="40" width="100" height="160" fill="#B8CDD4" opacity="0.5" />
          <rect x="160" y="40" width="100" height="160" fill="#B8CDD4" opacity="0.5" />
          <rect x="280" y="40" width="100" height="160" fill="#B8CDD4" opacity="0.5" />
          {/* Floor */}
          <rect x="0" y="350" width="480" height="170" fill="#D4CFC9" />
          {/* Mats */}
          <rect x="60" y="380" width="80" height="20" fill="#C4856A" opacity="0.3" />
          <rect x="180" y="380" width="80" height="20" fill="#C4856A" opacity="0.3" />
          <rect x="300" y="380" width="80" height="20" fill="#C4856A" opacity="0.3" />
          <rect x="60" y="430" width="80" height="20" fill="#C4856A" opacity="0.3" />
          <rect x="180" y="430" width="80" height="20" fill="#C4856A" opacity="0.3" />
          <rect x="300" y="430" width="80" height="20" fill="#C4856A" opacity="0.3" />
          {/* Caption */}
          <text x="240" y="490" textAnchor="middle" fill="#3D3832" fontSize="16" fontFamily="sans-serif">
            Main Hall
          </text>
        </>
      )}

      {variant === 'stillness-room' && (
        <>
          <rect width="480" height="520" fill="#1C1915" />
          {/* Candle flames */}
          <circle cx="120" cy="260" r="8" fill="#C4856A" opacity="0.6" />
          <circle cx="240" cy="280" r="8" fill="#C4856A" opacity="0.6" />
          <circle cx="360" cy="260" r="8" fill="#C4856A" opacity="0.6" />
          <circle cx="180" cy="320" r="6" fill="#D9A48F" opacity="0.4" />
          <circle cx="300" cy="320" r="6" fill="#D9A48F" opacity="0.4" />
          <text x="240" y="490" textAnchor="middle" fill="#F5F0E8" fontSize="16" fontFamily="sans-serif">
            Stillness Room
          </text>
        </>
      )}

      {variant === 'sunrise-room' && (
        <>
          <rect width="480" height="520" fill="#F7EDE8" />
          {/* Sun rays */}
          <circle cx="240" cy="200" r="60" fill="#C4856A" opacity="0.2" />
          <circle cx="240" cy="200" r="40" fill="#C4856A" opacity="0.3" />
          {/* Floor */}
          <rect x="0" y="350" width="480" height="170" fill="#EDD4C8" />
          <text x="240" y="490" textAnchor="middle" fill="#3D3832" fontSize="16" fontFamily="sans-serif">
            Sunrise Room
          </text>
        </>
      )}
    </svg>
  );
}

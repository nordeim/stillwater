import 'server-only';
import { createHmac } from 'crypto';

/**
 * Cloudflare Images URL signer.
 *
 * Per SKILL §7.6 + §15.4: Server-side URL signing for Cloudflare Images CDN.
 * NEVER import this module in a Client Component — the 'server-only' guard
 * prevents accidental client-side usage (which would leak the signing key).
 *
 * V13-7 fix (2026-07-19, Phase B audit S6): Aligned env var name with the
 * t3-env schema in packages/config/src/env.ts. The code previously read
 * `CLOUDFLARE_IMAGES_KEY` but the env schema defines `CLOUDFLARE_IMAGES_TOKEN`.
 * This mismatch caused image URL signing to always return null in production
 * (the env var was never found). Renamed to `CLOUDFLARE_IMAGES_TOKEN` to match.
 *
 * Per SKILL §15.6: Uses `process.env` directly with null fallback (NOT env module).
 *
 * Usage:
 *   import { getSignedImageUrl } from '@/lib/cloudflare/images';
 *   const url = getSignedImageUrl('image-id', { width: 800 });
 *   // → https://imagedelivery.net/<account>/<image-id>?w=800&exp=...&sig=...
 */

export interface ImageUrlOptions {
  width?: number;
  height?: number;
  format?: 'auto' | 'avif' | 'webp' | 'json';
  quality?: number;
  fit?: 'cover' | 'contain' | 'scale-down';
  /** Expiry in seconds from now (default: 3600 = 1 hour) */
  expirySeconds?: number;
}

/**
 * Generate a signed Cloudflare Images URL.
 * Returns null when CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_IMAGES_TOKEN is missing.
 *
 * V13-7: env var renamed from CLOUDFLARE_IMAGES_KEY → CLOUDFLARE_IMAGES_TOKEN
 * to match the t3-env schema (packages/config/src/env.ts:45,105,171).
 */
export function getSignedImageUrl(
  imageId: string,
  options: ImageUrlOptions = {},
): string | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  // V13-7: renamed from CLOUDFLARE_IMAGES_KEY to CLOUDFLARE_IMAGES_TOKEN
  const imagesToken = process.env.CLOUDFLARE_IMAGES_TOKEN;

  // Null fallback per SKILL §15.6
  if (!accountId || !imagesToken) {
    return null;
  }

  const expirySeconds = options.expirySeconds ?? 3600;
  const exp = Math.floor(Date.now() / 1000) + expirySeconds;

  // Build query parameters
  const params = new URLSearchParams();
  if (options.width) params.set('w', String(options.width));
  if (options.height) params.set('h', String(options.height));
  params.set('format', options.format ?? 'auto');
  if (options.quality) params.set('q', String(options.quality));
  if (options.fit) params.set('fit', options.fit);
  params.set('exp', String(exp));

  const paramString = params.toString();

  // Cloudflare Images signing: HMAC-SHA256 of the path + query string
  const signingString = `/${imageId}?${paramString}`;
  const sig = createHmac('sha256', imagesToken)
    .update(signingString)
    .digest('hex');

  return `https://imagedelivery.net/${accountId}/${imageId}?${paramString}&sig=${sig}`;
}

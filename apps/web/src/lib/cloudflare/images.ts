import 'server-only';
import { createHmac } from 'crypto';

/**
 * Cloudflare Images URL signer.
 *
 * Per SKILL §7.6 + §15.4: Server-side URL signing for Cloudflare Images CDN.
 * NEVER import this module in a Client Component — the 'server-only' guard
 * prevents accidental client-side usage (which would leak the signing key).
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
 * Returns null when CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_IMAGES_KEY is missing.
 */
export function getSignedImageUrl(
  imageId: string,
  options: ImageUrlOptions = {},
): string | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const imagesKey = process.env.CLOUDFLARE_IMAGES_KEY;

  // Null fallback per SKILL §15.6
  if (!accountId || !imagesKey) {
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
  const sig = createHmac('sha256', imagesKey)
    .update(signingString)
    .digest('hex');

  return `https://imagedelivery.net/${accountId}/${imageId}?${paramString}&sig=${sig}`;
}

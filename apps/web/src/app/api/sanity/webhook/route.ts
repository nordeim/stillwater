import { createHmac, timingSafeEqual } from 'crypto';

import { revalidatePath } from 'next/cache';

/**
 * Sanity webhook handler for ISR revalidation.
 *
 * Per SKILL §7.4: When content is published/updated in Sanity, a webhook fires
 * to this endpoint. We verify the HMAC signature and call `revalidatePath`
 * to trigger on-demand ISR revalidation.
 *
 * Security:
 *   - HMAC-SHA256 signature verification (timingSafeEqual to prevent timing attacks)
 *   - Signature is computed over the raw request body (not parsed JSON)
 *   - Returns 401 for missing/invalid signatures (NEVER reveals which)
 *   - Returns 500 if SANITY_WEBHOOK_SECRET is not configured
 *
 * Setup:
 *   In Sanity Cloud dashboard → API → Webhooks:
 *     URL: https://stillwater.studio/api/sanity/webhook
 *     Project: (your project ID)
 *     Dataset: production
 *     HTTP method: POST
 *     HTTP Headers: { "Content-Type": "application/json" }
 *     Secret: (value of SANITY_WEBHOOK_SECRET env var)
 */

interface SanityWebhookPayload {
  _type: string;
  _id: string;
  slug?: { current?: string };
}

/** Map Sanity content types to marketing routes that display them. */
const REVALIDATION_MAP: Record<string, string[]> = {
  homePage: ['/'],
  aboutPage: ['/about'],
  blogPost: ['/blog'],
  instructorBio: ['/instructors'],
  faq: ['/'], // FAQs appear on home
  testimonial: ['/'], // Testimonials appear on home
  announcement: ['/'], // Announcements appear on home
  siteSettings: ['/'], // Site settings affect all pages
};

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  const webhookSecret = process.env.SANITY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('SANITY_WEBHOOK_SECRET is not set — cannot verify webhook');
    return Response.json(
      { error: 'Webhook secret not configured' },
      { status: 500 },
    );
  }

  // Read raw body for signature verification (NOT parsed JSON)
  const rawBody = await request.text();
  const signature = request.headers.get('sanity-webhook-signature');

  if (!signature) {
    return Response.json(
      { error: 'Missing signature header' },
      { status: 401 },
    );
  }

  // Compute expected signature over raw body
  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  // timingSafeEqual prevents timing attacks (never reveal which failed)
  if (!safeCompare(signature, expectedSignature)) {
    return Response.json(
      { error: 'Invalid signature' },
      { status: 401 },
    );
  }

  // Parse body AFTER signature verification
  let payload: SanityWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as SanityWebhookPayload;
  } catch {
    return Response.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  // Revalidate routes based on content type
  const routesToRevalidate = REVALIDATION_MAP[payload._type] ?? ['/'];

  // If it's a specific blog post or instructor bio, revalidate the detail page too
  if (payload._type === 'blogPost' && payload.slug?.current) {
    routesToRevalidate.push(`/blog/${payload.slug.current}`);
  }
  if (payload._type === 'instructorBio' && payload.slug?.current) {
    routesToRevalidate.push(`/instructors/${payload.slug.current}`);
  }

  for (const path of routesToRevalidate) {
    revalidatePath(path);
  }

  return Response.json({
    revalidated: routesToRevalidate,
    type: payload._type,
    id: payload._id,
  });
}

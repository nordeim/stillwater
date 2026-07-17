import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { getSanityClient } from '@/lib/sanity/client';
import { blogPostListQuery, blogPostQuery } from '@/lib/sanity/queries';
import { blogPostListSchema, blogPostSchema } from '@/lib/sanity/schemas';

// v9 V9-3 fix: Per Next.js docs, "Next.js will return a 200 HTTP status
// code for streamed responses, and 404 for non-streamed responses."
// Dynamic pages (force-dynamic) are streamed → always 200, even when
// notFound() is called. The fix: use generateStaticParams to enumerate
// valid slugs at build time. Unknown slugs 404 at the routing layer
// (before streaming starts).
//
// History:
//   v7 M1: experimental_ppr = false + dynamic = 'force-dynamic' + notFound()
//       in generateMetadata. DID NOT WORK — live site still returned 200.
//   v8 F1: Added regression test verifying v7 M1 fix in source. Test passed
//       but live site still returned 200.
//   v9 V9-3: Removed force-dynamic. Added generateStaticParams. Kept
//       experimental_ppr = false (defensive) + notFound() (defense-in-depth).
//
// Source: Stillwater Audit Report v9 §V9-3;
//         https://nextjs.org/docs/app/api-reference/file-conventions/not-found
export const experimental_ppr = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * v9 V9-3 fix: Enumerate valid blog post slugs at build time.
 * Unknown slugs (not in this list) will 404 at the routing layer
 * before streaming starts, ensuring the correct HTTP 404 status.
 *
 * If Sanity CMS is not configured (no client), return an empty array —
 * all blog slug routes will 404, which is correct (no posts exist).
 */
export async function generateStaticParams() {
  const client = getSanityClient();
  if (!client) {
    return [];
  }
  try {
    const raw: unknown = await client.fetch(blogPostListQuery);
    const parsed = blogPostListSchema.safeParse(raw);
    if (!parsed.success) {
      return [];
    }
    return parsed.data.map((post) => ({ slug: post.slug.current }));
  } catch {
    // If Sanity fetch fails at build time, return empty — pages will
    // be rendered on-demand (and notFound() will fire for missing posts).
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const client = getSanityClient();
  if (!client) {
    notFound();
  }

  const raw: unknown = await client.fetch(blogPostQuery, { slug });
  const parsed = blogPostSchema.safeParse(raw);
  if (!parsed.success) {
    notFound();
  }
  return {
    title: parsed.data.title,
    description: parsed.data.excerpt,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const client = getSanityClient();

  if (!client) {
    notFound();
  }

  const raw: unknown = await client.fetch(blogPostQuery, { slug });
  const parsed = blogPostSchema.safeParse(raw);

  if (!parsed.success) {
    notFound();
  }

  const post = parsed.data;

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/blog"
        className="text-sm font-medium text-clay-500 underline-offset-4 hover:underline"
      >
        ← Back to blog
      </Link>

      <header className="mt-8">
        {post.publishedAt && (
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            {new Date(post.publishedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
        <h1
          className="mt-2 text-4xl font-light leading-[1.1] text-stone-900 md:text-5xl"
          style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
        >
          {post.title}
        </h1>
        {post.author?.name && (
          <p className="mt-4 text-sm text-stone-600">By {post.author.name}</p>
        )}
      </header>

      {post.coverImage && (
        <div className="mt-8 aspect-[16/9] border border-stone-200 bg-sand-warm" />
      )}

      {/* Note: Sanity Portable Text rendering deferred to Phase 12.
          For now, render excerpt if available. */}
      {post.excerpt && (
        <p className="mt-8 text-lg leading-[1.65] text-stone-700">{post.excerpt}</p>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="mt-12 border-t border-stone-200 pt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Tags
          </p>
          <p className="mt-2 text-sm text-stone-700">{post.tags.join(' · ')}</p>
        </div>
      )}
    </article>
  );
}

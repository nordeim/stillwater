import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { getSanityClient } from '@/lib/sanity/client';
import { blogPostListQuery, blogPostQuery } from '@/lib/sanity/queries';
import { blogPostListSchema, blogPostSchema } from '@/lib/sanity/schemas';

// v10 V10-1 fix: Added dynamicParams = false to force 404 for unknown slugs.
// Without this, unknown slugs trigger on-demand rendering → streaming → 200.
// With dynamicParams = false, unknown slugs 404 at the routing layer.
//
// History:
//   v7 M1: experimental_ppr = false + force-dynamic + notFound(). 200 (streamed).
//   v8 F1: Regression test added. Still 200.
//   v9 V9-3: Removed force-dynamic. Added generateStaticParams. Still 200
//       because blog has no posts → generateStaticParams returns [] →
//       all slugs rendered on-demand → streaming → 200.
//   v10 V10-1: Added dynamicParams = false. Now unknown slugs 404 at the
//       routing layer (no on-demand rendering). Kept experimental_ppr = false
//       + notFound() (defense-in-depth).
//
// Source: Stillwater Audit Report v10 §V10-1;
//         https://nextjs.org/docs/app/api-reference/file-conventions/not-found
export const experimental_ppr = false;
export const dynamicParams = false;

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

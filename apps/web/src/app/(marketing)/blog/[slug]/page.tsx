import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { getSanityClient } from '@/lib/sanity/client';
import { blogPostQuery } from '@/lib/sanity/queries';
import { blogPostSchema } from '@/lib/sanity/schemas';

// M1 fix v4 (v7, 2026-07-15): Disable PPR for this route so notFound()
// can set the HTTP 404 status BEFORE the response body is committed.
export const experimental_ppr = false;
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const client = getSanityClient();
  if (!client) {
    // M2 fix: Call notFound() here (in generateMetadata) to set HTTP 404
    // before streaming starts.
    notFound();
  }

  const raw: unknown = await client.fetch(blogPostQuery, { slug });
  const parsed = blogPostSchema.safeParse(raw);
  if (!parsed.success) {
    // M2 fix: Call notFound() here for nonexistent blog posts.
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

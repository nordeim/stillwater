import Link from 'next/link';

import type { Metadata } from 'next';

import { getSanityClient } from '@/lib/sanity/client';
import { blogPostListQuery } from '@/lib/sanity/queries';
import { blogPostListSchema, type BlogPostList } from '@/lib/sanity/schemas';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Thoughts on yoga, mindfulness, and conscious living.',
};

// ISR — revalidate every hour
export const revalidate = 3600;

export default async function BlogPage() {
  const client = getSanityClient();

  let posts: BlogPostList = [];

  if (client) {
    const raw: unknown = await client.fetch(blogPostListQuery);
    const parsed = blogPostListSchema.safeParse(raw);
    if (parsed.success) {
      posts = parsed.data;
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <header className="mb-16">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          Journal
        </p>
        <h1
          className="mt-2 text-5xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Blog
        </h1>
      </header>

      {posts.length === 0 ? (
        <p className="text-stone-600">
          No blog posts yet. Check back soon for thoughts on yoga, mindfulness, and conscious living.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          {posts.map((post) => (
            <article key={post._id} className="group">
              {post.coverImage && (
                <div className="aspect-[16/9] border border-stone-200 bg-sand-warm" />
              )}
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-stone-500">
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : ''}
                {post.author?.name ? ` · ${post.author.name}` : ''}
              </p>
              <h2
                className="mt-2 text-2xl font-medium text-stone-900"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <Link href={`/blog/${post.slug.current}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              {post.excerpt && (
                <p className="mt-3 text-sm leading-[1.65] text-stone-600">
                  {post.excerpt}
                </p>
              )}
              {post.tags && post.tags.length > 0 && (
                <p className="mt-4 text-xs text-stone-500">
                  {post.tags.join(' · ')}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

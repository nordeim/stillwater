import type { Metadata } from 'next';

import { getSanityClient } from '@/lib/sanity/client';
import { aboutPageQuery } from '@/lib/sanity/queries';
import { aboutPageSchema } from '@/lib/sanity/schemas';

export const metadata: Metadata = {
  title: 'About',
  description: 'Our story, our values, and the space we hold for your practice.',
};

// ISR — revalidate every 24 hours
export const revalidate = 86400;

export default async function AboutPage() {
  const client = getSanityClient();

  let about = null;

  if (client) {
    const raw: unknown = await client.fetch(aboutPageQuery);
    const parsed = aboutPageSchema.safeParse(raw);
    if (parsed.success) {
      about = parsed.data;
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-16">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          Our story
        </p>
        <h1
          className="mt-2 text-5xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          About Stillwater
        </h1>
      </header>

      {about ? (
        <div className="space-y-8">
          {about.studioImage && (
            <div className="aspect-[16/9] border border-stone-200 bg-sand-warm" />
          )}
          {about.title && (
            <h2
              className="text-2xl font-light text-stone-900"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {about.title}
            </h2>
          )}
          {about.values && about.values.length > 0 && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Our values
              </h3>
              <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
                {about.values.map((value: { title?: string; description?: string }, index: number) => (
                  <div key={index}>
                    {value.title && (
                      <h4
                        className="text-xl font-medium text-stone-900"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {value.title}
                      </h4>
                    )}
                    {value.description && (
                      <p className="mt-2 text-sm leading-[1.65] text-stone-600">
                        {value.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-lg leading-[1.65] text-stone-700">
            Stillwater is a boutique yoga studio in Southeast Portland, founded on
            the belief that mindful movement is a path to a more connected life.
          </p>
          <p className="text-base leading-[1.65] text-stone-600">
            Our studio offers Vinyasa, Ashtanga, Yin, and Restorative classes
            taught by experienced instructors who honor each student&apos;s
            unique journey. We believe yoga is not about perfection — it&apos;s
            about presence.
          </p>
          <p className="text-base leading-[1.65] text-stone-600">
            Full content will appear here once Sanity CMS is configured. For now,
            visit our <a href="/schedule" className="text-clay-500 underline-offset-4 hover:underline">schedule</a> or{' '}
            <a href="/instructors" className="text-clay-500 underline-offset-4 hover:underline">meet our instructors</a>.
          </p>
        </div>
      )}
    </div>
  );
}

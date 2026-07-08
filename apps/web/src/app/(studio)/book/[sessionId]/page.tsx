import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { BookingFlow } from '@/components/booking/BookingFlow';
import { apiCaller } from '@/lib/trpc/server';

// Booking page is dynamic (auth-gated, real-time data)
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sessionId } = await params;
  try {
    const caller = await apiCaller();
    const session = await caller.schedule.getSession({ sessionId });
    // Cast for Drizzle relational type inference (SKILL §9.9 Gotcha 27)
    const sessionData = session as {
      class: { name: string } | null;
    };
    return {
      title: sessionData.class?.name ?? 'Book a class',
      description: `Book your spot in ${sessionData.class?.name ?? 'this class'}`,
    };
  } catch {
    return { title: 'Book a class' };
  }
}

export default async function BookingPage({ params }: PageProps) {
  const { sessionId } = await params;
  const caller = await apiCaller();

  let session;
  try {
    session = await caller.schedule.getSession({ sessionId });
  } catch {
    notFound();
  }

  // Cast for Drizzle relational type inference (SKILL §9.9 Gotcha 27)
  const sessionData = session as {
    id: string;
    startsAt: Date;
    class: { name: string; description: string | null } | null;
    instructor: { slug: string } | null;
    room: { name: string } | null;
    enrolledCount: number;
    overrideCapacity: number | null;
  };

  const className = sessionData.class?.name ?? 'Class';
  const instructorName = sessionData.instructor?.slug ?? 'Instructor';
  const roomName = sessionData.room?.name ?? 'Studio';

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Breadcrumb */}
      <a
        href="/schedule"
        className="text-sm font-medium text-clay-500 underline-offset-4 hover:underline"
      >
        ← Back to schedule
      </a>

      {/* Session header */}
      <header className="mt-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          {sessionData.startsAt.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}{' '}
          ·{' '}
          {sessionData.startsAt.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
        <h1
          className="mt-2 text-4xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {className}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          with {instructorName.replace(/-/g, ' ')} · {roomName}
        </p>
      </header>

      {/* Class description */}
      {sessionData.class?.description && (
        <p className="mt-6 text-base leading-[1.65] text-stone-700">
          {sessionData.class.description}
        </p>
      )}

      {/* Booking flow (Client Component — uses SSE + tRPC mutations) */}
      <div className="mt-10">
        <BookingFlow
          sessionId={sessionId}
          sessionDetails={{
            className,
            startsAt: sessionData.startsAt.toISOString(),
            instructorName,
          }}
        />
      </div>
    </div>
  );
}

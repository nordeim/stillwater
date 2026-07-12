import Link from 'next/link';

/**
 * ScheduleGrid — displays weekly schedule with Book CTA per session.
 *
 * Per SKILL §1.3: sharp edges, no drop shadows, editorial grid.
 * Per SKILL §8.5: each card is an <article> with semantic time element.
 *
 * Used by the marketing /schedule page (ISR) and links to (studio)/book/[sessionId].
 */
interface ScheduleSession {
  id: string;
  startsAt: Date;
  class: { title: string };
  instructor: { slug: string };
  room: { name: string };
}

export function ScheduleGrid({ sessions }: { sessions: ScheduleSession[] }) {
  if (sessions.length === 0) {
    return <p className="text-stone-600">No classes scheduled this week.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <article
          key={session.id}
          className="border border-stone-200 bg-sand-50 p-6"
        >
          <time className="text-xs font-medium text-stone-500">
            {session.startsAt.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </time>
          <h3
            className="mt-2 text-xl font-medium text-stone-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {session.class.title}
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            with {session.instructor.slug.replace(/-/g, ' ')}
          </p>
          <p className="mt-2 text-xs text-stone-500">{session.room.name}</p>
          <Link
            href={`/book/${session.id}`}
            className="mt-4 inline-block bg-clay-500 px-4 py-2 text-xs font-medium text-sand-100 transition-colors hover:bg-clay-600"
          >
            Book
          </Link>
        </article>
      ))}
    </div>
  );
}

'use client';

import Link from 'next/link';

interface UpcomingClass {
  id: string;
  session: { startsAt: Date; class: { name: string } };
}

export function UpcomingClassesWidget({ upcoming }: { upcoming: UpcomingClass[] }) {
  return (
    <div className="border border-stone-200 bg-sand-50 p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
          Upcoming Classes
        </p>
        <Link
          href="/history"
          className="text-xs font-medium text-clay-500 underline-offset-4 hover:underline"
        >
          View all →
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <p className="mt-6 text-sm text-stone-600">
          No upcoming classes.{' '}
          <Link href="/schedule" className="text-clay-500 underline-offset-4 hover:underline">
            Book a class →
          </Link>
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {upcoming.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between border-t border-stone-200 pt-3">
              <div>
                <p className="text-sm font-medium text-stone-900">
                  {entry.session.class.name}
                </p>
                <p className="text-xs text-stone-500">
                  {new Date(entry.session.startsAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <Link
                href={`/book/${entry.session.startsAt.getTime()}`}
                className="text-xs font-medium text-clay-500 underline-offset-4 hover:underline"
              >
                Details →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

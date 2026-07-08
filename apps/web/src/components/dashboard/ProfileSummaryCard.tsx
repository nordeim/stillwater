'use client';

import Link from 'next/link';

interface ProfileData {
  displayName: string;
  email: string;
  joinedAt: Date;
}

export function ProfileSummaryCard({ displayName, email, joinedAt }: ProfileData) {
  return (
    <div className="border border-stone-200 bg-sand-50 p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
        Profile
      </p>
      <h3
        className="mt-2 text-2xl font-medium capitalize text-stone-900"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {displayName || 'Member'}
      </h3>
      {email && <p className="mt-1 text-sm text-stone-600">{email}</p>}
      <p className="mt-2 text-xs text-stone-500">
        Member since {new Date(joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
      <Link
        href="/profile"
        className="mt-4 inline-block text-sm font-medium text-clay-500 underline-offset-4 hover:underline"
      >
        Edit profile →
      </Link>
    </div>
  );
}

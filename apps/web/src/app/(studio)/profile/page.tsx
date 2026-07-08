import type { Metadata } from 'next';

import { ProfileEditForm } from '@/components/dashboard/ProfileEditForm';
import { apiCaller } from '@/lib/trpc/server';

export const metadata: Metadata = {
  title: 'Edit Profile',
  description: 'Update your member profile',
};

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const caller = await apiCaller();
  const profile = await caller.members.getProfile();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <header className="mb-12">
        <a href="/dashboard" className="text-sm font-medium text-clay-500 underline-offset-4 hover:underline">
          ← Back to dashboard
        </a>
        <h1
          className="mt-4 text-4xl font-light text-stone-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Edit Profile
        </h1>
      </header>

      <ProfileEditForm
        initialValues={{
          displayName: profile.displayName,
          phone: profile.phone ?? '',
          emergencyContact: profile.emergencyContact ?? '',
          emergencyPhone: profile.emergencyPhone ?? '',
        }}
      />
    </div>
  );
}

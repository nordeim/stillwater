/**
 * F2-07 — Sign-in page
 *
 * Server component that renders the SignInForm client component.
 * Editorial Calm design: two-column layout (left: brand, right: form).
 *
 * Source: MEP Phase 2 F2-07.
 */

import { SignInForm } from '@/components/auth/SignInForm';

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="sign-in-page">
      <div className="sign-in-page__brand">
        <h1>Stillwater</h1>
        <p>A sanctuary for mindful movement.</p>
      </div>
      <div className="sign-in-page__form">
        <SignInForm callbackUrl={callbackUrl ?? '/dashboard'} />
      </div>
    </main>
  );
}

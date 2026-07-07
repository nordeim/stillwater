/**
 * F2-12 — Auth error page
 *
 * Shows error messages for OAuth failures, expired magic links, etc.
 *
 * Source: MEP Phase 2 F2-12.
 */

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  OAuthFailed: {
    title: 'Sign-in failed',
    description: 'We couldn&apos;t complete the Google sign-in. Please try again.',
  },
  MagicLinkExpired: {
    title: 'Link expired',
    description: 'The sign-in link has expired. Magic links are valid for 10 minutes. Please request a new one.',
  },
  SessionExpired: {
    title: 'Session expired',
    description: 'Your session has expired. Please sign in again.',
  },
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { error } = await searchParams;
  const errorInfo = error ? ERROR_MESSAGES[error] : null;

  return (
    <main className="auth-error-page">
      <div className="auth-error-page__content">
        <h1>{errorInfo?.title ?? 'Something went wrong'}</h1>
        <p>
          {errorInfo?.description ?? 'An unexpected error occurred during authentication. Please try signing in again.'}
        </p>
        <a href="/auth/sign-in" aria-label="Try again — return to sign-in page">
          Try again
        </a>
      </div>
    </main>
  );
}

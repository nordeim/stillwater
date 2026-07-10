import { Toaster } from 'sonner';

import type { Metadata } from 'next';

import './globals.css';
import { TRPCProvider } from '@/lib/trpc/client';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';
import { SkipLink } from '@/components/a11y/SkipLink';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Stillwater Yoga Studio',
    template: '%s — Stillwater Yoga',
  },
  description: 'A sanctuary for mindful movement in Southeast Portland. Book Vinyasa, Ashtanga, Yin, and Restorative classes online.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Stillwater Yoga Studio',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stillwater Yoga Studio',
    description: 'A sanctuary for mindful movement in Southeast Portland.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SkipLink />
        <TRPCProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </TRPCProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}

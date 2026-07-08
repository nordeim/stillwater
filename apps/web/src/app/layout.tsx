import type { Metadata } from 'next';

import './globals.css';
import { TRPCProvider } from '@/lib/trpc/client';

export const metadata: Metadata = {
  title: {
    default: 'Stillwater Yoga Studio',
    template: '%s — Stillwater Yoga',
  },
  description: 'A sanctuary for mindful movement in Southeast Portland. Book classes online.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Stillwater Yoga Studio',
  },
  robots: {
    index: true,
    follow: true,
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
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}

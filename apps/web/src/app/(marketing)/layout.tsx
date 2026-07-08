import { Footer } from '@/components/marketing/Footer';
import { MarketingNav } from '@/components/marketing/MarketingNav';

/**
 * Marketing route group layout.
 *
 * Per SKILL §5.7: Marketing routes are PUBLIC (no auth guard).
 * Per SKILL §8.4: Skip-to-content link is the FIRST element in <body> (WCAG AAA).
 *
 * This layout wraps all public marketing pages with MarketingNav + Footer.
 * It does NOT fetch data (per SKILL §5.2 — data fetching happens in page components, not layouts).
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Skip-to-content link — first element in body (WCAG AAA §2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-stone-900 focus:px-4 focus:py-2 focus:text-sand-50"
      >
        Skip to content
      </a>

      <MarketingNav />

      <main id="main-content">{children}</main>

      <Footer />
    </>
  );
}

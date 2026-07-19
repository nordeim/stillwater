import { Footer } from '@/components/marketing/Footer';
import { MarketingNav } from '@/components/marketing/MarketingNav';

/**
 * Marketing route group layout.
 *
 * Per SKILL §5.7: Marketing routes are PUBLIC (no auth guard).
 * Per SKILL §8.4: Skip-to-content link is rendered in the ROOT layout
 * (apps/web/src/app/layout.tsx via <SkipLink />), so it appears on ALL
 * routes (marketing, studio, admin, auth). This layout does NOT duplicate it.
 *
 * This layout wraps all public marketing pages with MarketingNav + Footer.
 * It does NOT fetch data (per SKILL §5.2 — data fetching happens in page components, not layouts).
 *
 * V14-1 fix (2026-07-19): Removed duplicate inline skip link — the root layout's
 * <SkipLink /> component already covers this. Having both caused duplicate
 * tab stops and confused screen readers.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingNav />

      <main id="main-content">{children}</main>

      <Footer />
    </>
  );
}

import Link from 'next/link';

/**
 * Marketing footer — editorial layout with studio info + nav.
 * Per SKILL §1.3: sharp edges (rounded-none), no drop shadows.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200 bg-stone-900 px-6 py-12 text-stone-300">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Studio info */}
          <div>
            <h2
              className="text-2xl font-light text-sand-50"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Stillwater
            </h2>
            <p className="mt-2 text-sm text-stone-400">
              A sanctuary for mindful movement in Southeast Portland.
            </p>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Visit
            </h3>
            <address className="mt-3 text-sm not-italic text-stone-300">
              123 SE Division St
              <br />
              Portland, OR 97202
            </address>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-stone-500">
              Explore
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/schedule" className="text-stone-300 hover:text-sand-50">
                  Schedule
                </Link>
              </li>
              <li>
                <Link href="/instructors" className="text-stone-300 hover:text-sand-50">
                  Instructors
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-stone-300 hover:text-sand-50">
                  About
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-stone-800 pt-6 md:flex-row">
          <p className="text-xs text-stone-500">
            © {year} Stillwater Yoga Studio. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              href="https://instagram.com"
              className="text-xs text-stone-500 hover:text-stone-300"
              aria-label="Instagram"
            >
              Instagram
            </a>
            <a
              href="https://facebook.com"
              className="text-xs text-stone-500 hover:text-stone-300"
              aria-label="Facebook"
            >
              Facebook
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * F12-20 — Static marketing copy (not from Sanity)
 *
 * Eyebrow text, taglines, section labels, CTA copy.
 * Sourced verbatim from static_landing_page_mockup.html.
 *
 * Source: MEP Phase 12 F12-20.
 */

export const HERO_EYEBROW = 'Est. 2019 · Portland, Oregon';

export const HERO_HEADLINE_LINES = ['The practice', 'of returning', 'to yourself.'] as const;

export const HERO_EMPHASIS_WORD = 'returning';

// V14-3 fix (2026-07-19): Restored mockup's warm welcoming intro copy.
// Was a shortened version; the mockup has the full 2-sentence intro with
// <strong>mindful movement</strong> emphasis.
// Note: the <strong> is rendered in Hero.tsx via a split on the emphasis word.
export const HERO_INTRO =
  'Stillwater is a sanctuary for mindful movement in the heart of Southeast Portland. Whether you\u2019re finding the mat for the first time or deepening a long practice, there is a class — and a community — waiting for you.';
export const HERO_INTRO_EMPHASIS = 'mindful movement';

// V14-4 fix (2026-07-19): Restored aspirational marketing numbers from mockup.
// The v5 M2 fix (2026-07-14) downgraded these to seed-data reality (7/3/2),
// but marketing pages should show aspirational numbers — the mockup's 42+/8/3
// represents the studio's target capacity, not the current seed data.
// The stats are static marketing copy, not live DB counts.
export const HERO_META_STATS = [
  { label: 'Weekly Classes', value: '42+' },
  { label: 'Instructors', value: '8' },
  { label: 'Studio Rooms', value: '3' },
] as const;

export const HERO_CTAS = {
  primary: { label: 'Start Your Practice', href: '/schedule' },
  ghost: { label: 'View Full Schedule', href: '/schedule' },
} as const;

// V14-8 fix (2026-07-19): Restored full marquee item names from mockup.
// The v12 port shortened these (e.g., "Vinyasa Flow" instead of "Morning Vinyasa Flow").
// Also restored the mockup's instructor names (Soren Vass, Lucia Ferreira, Marcus Webb)
// which are aspirational marketing names — the seed data only has 3 instructors
// (Mei, James, Aiko) but the marquee shows the full target roster.
export const MARQUEE_ITEMS = [
  { className: 'Morning Vinyasa Flow', time: '7:00 AM', instructor: 'Mei Tanaka' },
  { className: 'Restorative Yoga', time: '9:30 AM', instructor: 'Soren Vass' },
  { className: 'Yin & Meditation', time: '12:00 PM', instructor: 'Aiko Mori' },
  { className: 'Ashtanga Primary Series', time: '6:00 AM', instructor: 'James Harlow' },
  { className: 'Candlelight Slow Flow', time: '7:30 PM', instructor: 'Lucia Ferreira' },
  { className: 'Pranayama & Breathwork', time: '10:00 AM', instructor: 'Aiko Mori' },
  { className: 'Power Flow', time: '5:30 PM', instructor: 'Marcus Webb' },
] as const;

export const PHILOSOPHY_QUOTE = 'Yoga is not about touching your toes. It is about what you learn on the way down.';

export const PHILOSOPHY_QUOTE_EMPHASIS = 'touching your toes.';

export const PHILOSOPHY_BODY =
  'Stillwater is more than a studio — it is a practice of presence. Our approach blends traditional lineage with modern understanding, creating space for every body to find their own alignment.';

// V14-6 fix (2026-07-19): Restored section labels + titles + descriptions
// from mockup. The v12 port rewrote these; the mockup's versions are more
// evocative and editorial (matching the "Editorial Calm" design direction).
export const SECTION_LABELS = {
  philosophy: '§ 01',
  schedule: 'Weekly Schedule',
  instructors: 'Our Instructors',
  membership: 'Membership',
  studio: 'The Studio',
} as const;

export const SECTION_TITLES = {
  philosophy: 'Yoga is not about touching your toes. It is about what you learn on the way down.',
  schedule: 'Find your class.\nFind your time.',
  instructors: 'Teachers who\u2019ve\nwalked the path.',
  membership: 'Your practice,\nyour commitment.',
  studio: 'Three rooms.\nOne intention.',
} as const;

// V14-6: Section descriptions (from mockup)
export const SECTION_DESCRIPTIONS = {
  schedule: 'Every session is a fresh beginning. Browse by day, filter by level, and reserve your spot — all in one place.',
  instructors: 'Every instructor at Stillwater brings decades of embodied practice and a genuine commitment to holding safe, transformative space for every student.',
  membership: 'Three paths into regular practice. No long-term contracts. Pause or cancel any time — the studio should meet you where you are.',
  studio: 'Purpose-built for practice. Natural materials, living walls, acoustic engineering, and light that shifts with the day.',
} as const;

// V14-7 fix (2026-07-19): Restored CTA Band copy from mockup.
// Added the sub-paragraph that was missing.
export const CTA_BAND_TITLE = 'The mat is waiting.';
export const CTA_BAND_SUBTITLE = 'Your first class is free.';
export const CTA_BAND_SUB =
  'Every new member begins with a complimentary 7-day trial. Book any class, meet your instructors, and discover which practice calls to you — with no commitment required.';
export const CTA_BAND_PRIMARY = { label: 'Begin Free Trial', href: '/schedule' };
export const CTA_BAND_GHOST = { label: 'Browse Schedule', href: '/schedule' };

export const FOOTER_NEWSLETTER_LABEL = 'Stay Connected';
export const FOOTER_NEWSLETTER_PLACEHOLDER = 'your@email.com';
export const FOOTER_NEWSLETTER_CTA = 'Subscribe';

export const FOOTER_COPYRIGHT = `© ${String(new Date().getFullYear())} Stillwater Yoga Studio. All rights reserved.`;

export const FOOTER_LINKS = {
  navigate: [
    { label: 'Schedule', href: '/schedule' },
    { label: 'Instructors', href: '/instructors' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Blog', href: '/blog' },
    { label: 'About', href: '/about' },
  ],
  legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Accessibility', href: '/accessibility' },
  ],
} as const;

export const FOOTER_HOURS = [
  { day: 'Mon – Fri', hours: '5:45 am – 9:00 pm' },
  { day: 'Saturday', hours: '7:00 am – 5:00 pm' },
  { day: 'Sunday', hours: '8:00 am – 4:00 pm' },
] as const;

// V14-2 fix (2026-07-19): Restored correct address from mockup.
// Was "123 SE Division Street" (fabricated); mockup has "2847 SE Division Street".
export const FOOTER_ADDRESS = '2847 SE Division Street, Portland, OR 97202';
export const FOOTER_PHONE = '(503) 321-4950';
export const FOOTER_EMAIL = 'hello@stillwater.studio';

// V14-2 fix: Brand text for footer (from mockup line 2606)
export const FOOTER_BRAND_TEXT =
  'A sanctuary for mindful movement in Southeast Portland. We believe practice is a lifelong conversation with yourself — and we\u2019re honoured to hold space for yours.';

// V14-5 fix: Social links from mockup (Instagram + YouTube, NOT Facebook)
export const FOOTER_SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com/stillwateryoga' },
  { label: 'YouTube', href: 'https://youtube.com/stillwateryoga' },
] as const;

export const MEMBERSHIP_TRIAL_NOTE = '7-day free trial on all memberships. Cancel anytime.';

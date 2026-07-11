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

export const HERO_INTRO =
  'A sanctuary for mindful movement in the heart of Southeast Portland. Where breath meets body, and stillness meets strength.';

export const HERO_META_STATS = [
  { label: 'Weekly Classes', value: '42+' },
  { label: 'Instructors', value: '8' },
  { label: 'Studio Rooms', value: '3' },
] as const;

export const HERO_CTAS = {
  primary: { label: 'Start Your Practice', href: '/schedule' },
  ghost: { label: 'View Full Schedule', href: '/schedule' },
} as const;

export const MARQUEE_ITEMS = [
  { className: 'Vinyasa Flow', time: 'Mon 7:00 AM', instructor: 'Mei Tanaka' },
  { className: 'Ashtanga Primary', time: 'Tue 6:00 AM', instructor: 'James Harlow' },
  { className: 'Yin Yoga', time: 'Wed 7:30 PM', instructor: 'Aiko Mori' },
  { className: 'Restorative', time: 'Thu 6:00 PM', instructor: 'Mei Tanaka' },
  { className: 'Power Vinyasa', time: 'Fri 9:00 AM', instructor: 'James Harlow' },
  { className: 'Meditation', time: 'Sat 8:00 AM', instructor: 'Aiko Mori' },
  { className: 'Gentle Flow', time: 'Sun 10:00 AM', instructor: 'Mei Tanaka' },
] as const;

export const PHILOSOPHY_QUOTE = 'Yoga is not about touching your toes. It is about what you learn on the way down.';

export const PHILOSOPHY_QUOTE_EMPHASIS = 'touching your toes.';

export const PHILOSOPHY_BODY =
  'Stillwater is more than a studio — it is a practice of presence. Our approach blends traditional lineage with modern understanding, creating space for every body to find their own alignment.';

export const SECTION_LABELS = {
  philosophy: 'Our Philosophy',
  schedule: 'Weekly Schedule',
  instructors: 'Our Instructors',
  membership: 'Membership',
  studio: 'Our Space',
} as const;

export const SECTION_TITLES = {
  philosophy: 'The Practice of Stillness',
  schedule: 'Find Your Time',
  instructors: 'Guides for Your Journey',
  membership: 'Choose Your Path',
  studio: 'Spaces for Practice',
} as const;

export const CTA_BAND_TITLE = 'The mat is waiting.';
export const CTA_BAND_SUBTITLE = 'Your first class is free.';
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
  { day: 'Monday — Friday', hours: '6:00 AM — 9:00 PM' },
  { day: 'Saturday — Sunday', hours: '7:00 AM — 7:00 PM' },
] as const;

export const FOOTER_ADDRESS = '123 SE Division Street, Portland, OR 97202';

export const MEMBERSHIP_TRIAL_NOTE = '7-day free trial on all memberships. Cancel anytime.';

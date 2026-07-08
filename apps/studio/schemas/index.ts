import { siteSettings } from './siteSettings';
import { homePage } from './homePage';
import { aboutPage } from './aboutPage';
import { blogPost } from './blogPost';
import { instructorBio } from './instructorBio';
import { faq } from './faq';
import { testimonial } from './testimonial';
import { announcement } from './announcement';

/**
 * 8 Sanity content types for Stillwater marketing surface.
 * Per PAD §14.1 + SKILL §7.2.
 *
 * CRITICAL: Every content type (except siteSettings singleton) has a `published`
 * boolean field. GROQ queries filter `published == true` (SKILL §7.5.1).
 */
export const schemaTypes = [
  siteSettings,
  homePage,
  aboutPage,
  blogPost,
  instructorBio,
  faq,
  testimonial,
  announcement,
];

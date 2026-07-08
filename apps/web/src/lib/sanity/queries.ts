/**
 * GROQ query registry for Sanity CMS.
 *
 * CRITICAL RULE (SKILL §7.5.1): Every public-facing query MUST filter `published == true`.
 * This is defense-in-depth — even if an unpublished doc slips through, the query rejects it.
 * Zod schema validation (schemas.ts) provides a second layer of defense.
 *
 * Content types (8 total, per PAD §14.1 + SKILL §7.2):
 *   1. siteSettings    — singleton (no published field)
 *   2. homePage        — singleton with published flag
 *   3. aboutPage       — singleton with published flag
 *   4. blogPost        — list + single by slug
 *   5. instructorBio   — list + single by slug
 *   6. faq             — list
 *   7. testimonial     — list
 *   8. announcement    — list
 */

// ── Singleton queries ────────────────────────────────────────────

export const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  _id,
  studioName,
  tagline,
  contactEmail,
  contactPhone,
  address->{ street, city, state, zip },
  socialLinks,
  navItems[]
}`;

export const homePageQuery = `*[_type == "homePage" && published == true][0]{
  _id,
  title,
  heroHeadline,
  heroSubheadline,
  heroImage,
  philosophyText,
  featuredClasses[]->{ _id, title, slug, startsAt },
  ctaText,
  ctaHref
}`;

export const aboutPageQuery = `*[_type == "aboutPage" && published == true][0]{
  _id,
  title,
  body,
  studioImage,
  values[],
  team[]->{ _id, name, role, bio, photo }
}`;

// ── List queries ─────────────────────────────────────────────────

export const blogPostListQuery = `*[_type == "blogPost" && published == true] | order(publishedAt desc){
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  author->{ name },
  coverImage,
  tags
}`;

export const instructorBioListQuery = `*[_type == "instructorBio" && published == true] | order(name asc){
  _id,
  name,
  slug,
  title,
  photo,
  bio,
  specialties[]
}`;

export const faqListQuery = `*[_type == "faq" && published == true] | order(order asc){
  _id,
  question,
  answer,
  category
}`;

export const testimonialListQuery = `*[_type == "testimonial" && published == true]{
  _id,
  quote,
  authorName,
  authorRole,
  authorPhoto
}`;

export const announcementListQuery = `*[_type == "announcement" && published == true] | order(publishedAt desc){
  _id,
  title,
  body,
  publishedAt,
  dismissible
}`;

// ── Single-item queries (by slug) ────────────────────────────────

export const blogPostQuery = `*[_type == "blogPost" && published == true && slug.current == $slug][0]{
  _id,
  title,
  slug,
  body,
  publishedAt,
  author->{ name, bio, photo },
  coverImage,
  tags
}`;

export const instructorBioQuery = `*[_type == "instructorBio" && published == true && slug.current == $slug][0]{
  _id,
  name,
  slug,
  title,
  photo,
  bio,
  specialties[],
  certifications[],
  classesTeaching[]->{ _id, title, slug }
}`;

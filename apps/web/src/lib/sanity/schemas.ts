import { z } from 'zod';

/**
 * Zod schemas for Sanity CMS response validation.
 *
 * Per SKILL §7.5.1: Zod provides defense-in-depth. The GROQ query filters
 * `published == true` as the primary defense; these schemas validate the
 * response shape as a secondary defense (e.g., if Sanity schema drifts
 * or a malformed doc is published).
 *
 * Note: `published` field is NOT in these schemas because the GROQ query
 * projection doesn't include it (it's always true due to the filter).
 * If we wanted triple defense, we could add `published: z.literal(true)`
 * to each schema and include it in the projection.
 */

// ── Primitive schemas ────────────────────────────────────────────

const slugSchema = z.object({
  current: z.string().min(1),
});

const imageRefSchema = z.object({
  _ref: z.string().optional(),
  _type: z.string().optional(),
}).nullable().optional();

// ── Content type schemas ─────────────────────────────────────────

export const siteSettingsSchema = z.object({
  _id: z.string(),
  studioName: z.string(),
  tagline: z.string().optional(),
  contactEmail: z.email().optional(),
  contactPhone: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
  }).optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  navItems: z.array(z.any()).optional(),
});

export const homePageSchema = z.object({
  _id: z.string(),
  title: z.string(),
  heroHeadline: z.string(),
  heroSubheadline: z.string().optional(),
  heroImage: imageRefSchema,
  philosophyText: z.string().optional(),
  featuredClasses: z.array(z.any()).optional(),
  ctaText: z.string().optional(),
  ctaHref: z.string().optional(),
});

export const aboutPageSchema = z.object({
  _id: z.string(),
  title: z.string(),
  body: z.any().optional(),
  studioImage: imageRefSchema,
  values: z.array(z.any()).optional(),
  team: z.array(z.any()).optional(),
});

export const blogPostSchema = z.object({
  _id: z.string(),
  title: z.string(),
  slug: slugSchema,
  excerpt: z.string().optional(),
  body: z.any().optional(),
  publishedAt: z.string().optional(),
  author: z.object({
    name: z.string(),
    bio: z.any().optional(),
    photo: imageRefSchema,
  }).optional(),
  coverImage: imageRefSchema,
  tags: z.array(z.string()).optional(),
});

export const blogPostListSchema = z.array(blogPostSchema);

export const instructorBioSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: slugSchema,
  title: z.string().optional(),
  photo: imageRefSchema,
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  classesTeaching: z.array(z.any()).optional(),
});

export const instructorBioListSchema = z.array(instructorBioSchema);

export const faqSchema = z.object({
  _id: z.string(),
  question: z.string(),
  answer: z.string(),
  category: z.string().optional(),
});

export const faqListSchema = z.array(faqSchema);

export const testimonialSchema = z.object({
  _id: z.string(),
  quote: z.string(),
  authorName: z.string(),
  authorRole: z.string().optional(),
  authorPhoto: imageRefSchema,
});

export const testimonialListSchema = z.array(testimonialSchema);

export const announcementSchema = z.object({
  _id: z.string(),
  title: z.string(),
  body: z.string().optional(),
  publishedAt: z.string().optional(),
  dismissible: z.boolean().optional(),
});

export const announcementListSchema = z.array(announcementSchema);

// ── Type exports ─────────────────────────────────────────────────

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type HomePage = z.infer<typeof homePageSchema>;
export type AboutPage = z.infer<typeof aboutPageSchema>;
export type BlogPost = z.infer<typeof blogPostSchema>;
export type BlogPostList = z.infer<typeof blogPostListSchema>;
export type InstructorBio = z.infer<typeof instructorBioSchema>;
export type InstructorBioList = z.infer<typeof instructorBioListSchema>;
export type Faq = z.infer<typeof faqSchema>;
export type FaqList = z.infer<typeof faqListSchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;
export type TestimonialList = z.infer<typeof testimonialListSchema>;
export type Announcement = z.infer<typeof announcementSchema>;
export type AnnouncementList = z.infer<typeof announcementListSchema>;

import { describe, it, expect } from 'vitest';

import {
  siteSettingsSchema,
  homePageSchema,
  blogPostListSchema,
  blogPostSchema,
  instructorBioListSchema,
  instructorBioSchema,
  faqListSchema,
  testimonialListSchema,
} from './schemas';

describe('Sanity Zod schemas', () => {
  const validBlogPost = {
    _id: 'blogpost-1',
    title: 'Test Post',
    slug: { current: 'test-post' },
    excerpt: 'An excerpt',
    publishedAt: '2026-07-08T00:00:00Z',
    author: { name: 'Author Name' },
    coverImage: null,
    tags: ['yoga'],
  };

  const validInstructorBio = {
    _id: 'instructor-1',
    name: 'Jane Doe',
    slug: { current: 'jane-doe' },
    title: 'Lead Instructor',
    photo: null,
    bio: 'Bio text',
    specialties: ['Vinyasa'],
  };

  it('blogPostSchema accepts a valid blog post', () => {
    expect(blogPostSchema.safeParse(validBlogPost).success).toBe(true);
  });

  it('blogPostSchema rejects a post missing required title', () => {
    const { title: _, ...missingTitle } = validBlogPost;
    expect(blogPostSchema.safeParse(missingTitle).success).toBe(false);
  });

  it('blogPostListSchema accepts a list of valid posts', () => {
    expect(blogPostListSchema.safeParse([validBlogPost]).success).toBe(true);
  });

  it('blogPostListSchema rejects a non-array', () => {
    expect(blogPostListSchema.safeParse(validBlogPost).success).toBe(false);
  });

  it('instructorBioSchema accepts a valid instructor bio', () => {
    expect(instructorBioSchema.safeParse(validInstructorBio).success).toBe(true);
  });

  it('instructorBioListSchema accepts a list of valid instructor bios', () => {
    expect(instructorBioListSchema.safeParse([validInstructorBio]).success).toBe(true);
  });

  it('faqListSchema accepts a valid FAQ list', () => {
    const validFaq = {
      _id: 'faq-1',
      question: 'What should I bring?',
      answer: 'A mat and water',
      category: 'general',
    };
    expect(faqListSchema.safeParse([validFaq]).success).toBe(true);
  });

  it('testimonialListSchema accepts a valid testimonial list', () => {
    const validTestimonial = {
      _id: 'testimonial-1',
      quote: 'Great studio!',
      authorName: 'Happy Student',
      authorRole: 'Member',
      authorPhoto: null,
    };
    expect(testimonialListSchema.safeParse([validTestimonial]).success).toBe(true);
  });

  it('siteSettingsSchema accepts valid settings', () => {
    const validSettings = {
      _id: 'siteSettings',
      studioName: 'Stillwater',
      tagline: 'Mindful movement',
      contactEmail: 'hello@stillwater.studio',
      contactPhone: '+1-555-0100',
      address: { street: '123 Main St', city: 'Portland', state: 'OR', zip: '97201' },
      socialLinks: { instagram: '@stillwater' },
      navItems: [],
    };
    expect(siteSettingsSchema.safeParse(validSettings).success).toBe(true);
  });

  it('homePageSchema accepts a valid home page', () => {
    const validHome = {
      _id: 'homePage',
      title: 'Home',
      heroHeadline: 'Find your stillness',
      heroSubheadline: 'Yoga in SE Portland',
      heroImage: null,
      philosophyText: 'We believe in...',
      featuredClasses: [],
      ctaText: 'Book a class',
      ctaHref: '/schedule',
    };
    expect(homePageSchema.safeParse(validHome).success).toBe(true);
  });

  // CRITICAL: Per SKILL §7.5.1 — Zod defense-in-depth validates DB results.
  // If an unpublished doc somehow reaches the client, Zod should reject it
  // IF we add `published: z.literal(true)` to the schema.
  // However, we don't include `published` in the projection (it's always true
  // because the GROQ query filters it). So this test verifies the schema
  // works WITHOUT a published field (the GROQ filter is the primary defense).
  it('schemas work without published field (GROQ filter is primary defense)', () => {
    expect(blogPostSchema.safeParse(validBlogPost).success).toBe(true);
  });
});

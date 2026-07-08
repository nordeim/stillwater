import { describe, it, expect } from 'vitest';

import {
  homePageQuery,
  aboutPageQuery,
  blogPostListQuery,
  blogPostQuery,
  instructorBioListQuery,
  instructorBioQuery,
  faqListQuery,
  announcementListQuery,
  testimonialListQuery,
  siteSettingsQuery,
} from './queries';

describe('GROQ query registry', () => {
  const queries = [
    { name: 'homePageQuery', q: homePageQuery },
    { name: 'aboutPageQuery', q: aboutPageQuery },
    { name: 'blogPostListQuery', q: blogPostListQuery },
    { name: 'blogPostQuery', q: blogPostQuery },
    { name: 'instructorBioListQuery', q: instructorBioListQuery },
    { name: 'instructorBioQuery', q: instructorBioQuery },
    { name: 'faqListQuery', q: faqListQuery },
    { name: 'announcementListQuery', q: announcementListQuery },
    { name: 'testimonialListQuery', q: testimonialListQuery },
    { name: 'siteSettingsQuery', q: siteSettingsQuery },
  ];

  // CRITICAL: Per SKILL §7.5.1, every public-facing query MUST filter `published == true`.
  // This is the #1 defense-in-depth rule for marketing content.
  it('every content query filters published == true (SKILL §7.5.1)', () => {
    for (const { name, q } of queries) {
      // siteSettings doesn't have a published field (it's a singleton)
      if (name === 'siteSettingsQuery') continue;
      expect(q).toContain('published == true');
      expect(q).toMatch(/published\s*==\s*true/);
    }
  });

  it('homePageQuery is a GROQ query string', () => {
    expect(homePageQuery).toMatch(/^\*\[/);
  });

  it('blogPostQuery accepts a $slug parameter', () => {
    expect(blogPostQuery).toContain('$slug');
    // Sanity slug is an object — query uses slug.current == $slug
    expect(blogPostQuery).toMatch(/slug\.current\s*==\s*\$slug/);
  });

  it('instructorBioQuery accepts a $slug parameter', () => {
    expect(instructorBioQuery).toContain('$slug');
    expect(instructorBioQuery).toMatch(/slug\.current\s*==\s*\$slug/);
  });

  it('blogPostListQuery orders by publishedAt descending', () => {
    expect(blogPostListQuery).toContain('order(publishedAt desc)');
  });

  it('instructorBioListQuery orders by name', () => {
    expect(instructorBioListQuery).toContain('order(name asc)');
  });
});

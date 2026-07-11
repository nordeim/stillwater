/**
 * F11-10 — JSON-LD schema builder tests
 *
 * Source: MEP Phase 11 F11-10.
 */

import { describe, it, expect } from 'vitest';
import { yogaStudioSchema, articleSchema, personSchema, breadcrumbSchema } from './schemas';

describe('F11-10: JSON-LD schema builders', () => {
  it('yogaStudioSchema returns correct @type and required fields', () => {
    const schema = yogaStudioSchema();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('YogaStudio');
    expect(schema['name']).toBe('Stillwater Yoga Studio');
    expect(schema['address']).toBeDefined();
    expect(schema['openingHours']).toBeDefined();
    expect(schema['priceRange']).toBe('$$');
    expect(schema['hasMap']).toBeDefined();
  });

  it('yogaStudioSchema accepts overrides', () => {
    const schema = yogaStudioSchema({
      name: 'Custom Studio',
      telephone: '+1-555-123-4567',
      priceRange: '$',
    });
    expect(schema['name']).toBe('Custom Studio');
    expect(schema['telephone']).toBe('+1-555-123-4567');
    expect(schema['priceRange']).toBe('$');
  });

  it('articleSchema returns correct @type and fields', () => {
    const schema = articleSchema({
      title: 'The Benefits of Yin Yoga',
      author: 'Mei Tanaka',
      publishedAt: '2026-01-15',
      slug: 'benefits-of-yin-yoga',
    });
    expect(schema['@type']).toBe('Article');
    expect(schema['headline']).toBe('The Benefits of Yin Yoga');
    expect((schema['author'] as { name: string })['name']).toBe('Mei Tanaka');
    expect(schema['datePublished']).toBe('2026-01-15');
    expect((schema['publisher'] as { name: string })['name']).toBe('Stillwater Yoga Studio');
  });

  it('personSchema returns correct @type and fields', () => {
    const schema = personSchema({
      name: 'James Harlow',
      slug: 'james-harlow',
      bio: 'Ashtanga and Vinyasa teacher',
    });
    expect(schema['@type']).toBe('Person');
    expect(schema['name']).toBe('James Harlow');
    expect(schema['description']).toBe('Ashtanga and Vinyasa teacher');
    expect((schema['worksFor'] as { name: string })['name']).toBe('Stillwater Yoga Studio');
  });

  it('breadcrumbSchema returns correct itemListElement', () => {
    const schema = breadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: 'Post', url: '/blog/post' },
    ]);
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema['itemListElement']).toHaveLength(3);
    expect((schema['itemListElement'] as unknown[])[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: expect.stringContaining('/'),
    });
  });
});

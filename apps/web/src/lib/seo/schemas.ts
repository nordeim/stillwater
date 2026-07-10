/**
 * F11-10 — JSON-LD schema builders
 *
 * Builders for YogaStudio, Article, Person, and Breadcrumb schemas.
 * All follow schema.org spec.
 *
 * Source: MEP Phase 11 F11-10, PAD §23.2.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export interface YogaStudioSchemaInput {
  name?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
  };
  telephone?: string;
  openingHours?: string[];
  priceRange?: string;
  hasMap?: string;
}

export function yogaStudioSchema(input: YogaStudioSchemaInput = {}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'YogaStudio',
    name: input.name ?? 'Stillwater Yoga Studio',
    description: 'A sanctuary for mindful movement in Southeast Portland. Book Vinyasa, Ashtanga, Yin, and Restorative classes online.',
    url: BASE_URL,
    telephone: input.telephone ?? '',
    address: {
      '@type': 'PostalAddress',
      streetAddress: input.address?.streetAddress ?? '123 SE Division St',
      addressLocality: input.address?.addressLocality ?? 'Portland',
      addressRegion: input.address?.addressRegion ?? 'OR',
      postalCode: input.address?.postalCode ?? '97202',
      addressCountry: 'US',
    },
    openingHours: input.openingHours ?? ['Mo-Su 06:00-21:00'],
    priceRange: input.priceRange ?? '$$',
    hasMap: input.hasMap ?? `https://maps.google.com/?q=Stillwater+Yoga+Portland`,
  };
}

export interface ArticleSchemaInput {
  title: string;
  description?: string;
  author: string;
  publishedAt: string;
  slug: string;
  image?: string;
}

export function articleSchema(input: ArticleSchemaInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description ?? '',
    author: {
      '@type': 'Person',
      name: input.author,
    },
    datePublished: input.publishedAt,
    url: `${BASE_URL}/blog/${input.slug}`,
    image: input.image ?? `${BASE_URL}/blog/${input.slug}/opengraph-image`,
    publisher: {
      '@type': 'Organization',
      name: 'Stillwater Yoga Studio',
      url: BASE_URL,
    },
  };
}

export interface PersonSchemaInput {
  name: string;
  slug: string;
  bio?: string;
  specialty?: string;
}

export function personSchema(input: PersonSchemaInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: input.name,
    description: input.bio ?? input.specialty ?? '',
    url: `${BASE_URL}/instructors/${input.slug}`,
    image: `${BASE_URL}/instructors/${input.slug}/opengraph-image`,
    worksFor: {
      '@type': 'Organization',
      name: 'Stillwater Yoga Studio',
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

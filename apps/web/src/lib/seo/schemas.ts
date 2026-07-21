/**
 * F11-10 — JSON-LD schema builders
 *
 * Builders for YogaStudio, Article, Person, and Breadcrumb schemas.
 * All follow schema.org spec.
 *
 * V17-8 fix (2026-07-21): Defaults now use the shared SITE constant from
 * @stillwater/config/site (single source of truth for address + phone +
 * email). Previously the default streetAddress was a fabricated
 * '123 SE Division St' that didn't match the Footer's corrected value.
 *
 * Source: MEP Phase 11 F11-10, PAD §23.2;
 *         STILLWATER_AUDIT_REPORT.md §7 Finding #9
 */

import { SITE } from '@stillwater/config/site';

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
    name: input.name ?? SITE.name,
    description: 'A sanctuary for mindful movement in Southeast Portland. Book Vinyasa, Ashtanga, Yin, and Restorative classes online.',
    url: BASE_URL,
    // V17-8: Default telephone uses SITE constant (was empty string).
    telephone: input.telephone ?? SITE.phone,
    address: {
      '@type': 'PostalAddress',
      // V17-8: Defaults use SITE.address (was fabricated '123 SE Division St').
      streetAddress: input.address?.streetAddress ?? SITE.address.street,
      addressLocality: input.address?.addressLocality ?? SITE.address.city,
      addressRegion: input.address?.addressRegion ?? SITE.address.region,
      postalCode: input.address?.postalCode ?? SITE.address.postalCode,
      addressCountry: SITE.address.country,
    },
    openingHours: input.openingHours ?? ['Mo-Su 06:00-21:00'],
    priceRange: input.priceRange ?? '$$',
    hasMap: input.hasMap ?? `https://maps.google.com/?q=${encodeURIComponent(SITE.address.full)}`,
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

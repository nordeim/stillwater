import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';

/**
 * Sanity Studio configuration for Stillwater.
 *
 * Per PAD §14 + SKILL §7.1: Sanity is for marketing content ONLY (ADR-005).
 * Operational data (members, bookings, payments) lives in PostgreSQL.
 *
 * Studio is hosted at stillwater.sanity.studio (Sanity Cloud managed — Q4 resolved).
 * For local development: `pnpm --filter @stillwater/studio dev` → http://localhost:3333
 */
export default defineConfig({
  name: 'stillwater-studio',
  title: 'Stillwater Studio',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'placeholder-project-id',
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Site Settings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.listItem()
              .title('Pages')
              .child(
                S.list()
                  .title('Pages')
                  .items([
                    S.listItem()
                      .title('Home Page')
                      .child(S.document().schemaType('homePage').documentId('homePage')),
                    S.listItem()
                      .title('About Page')
                      .child(S.document().schemaType('aboutPage').documentId('aboutPage')),
                  ]),
              ),
            S.divider(),
            S.listItem()
              .title('Blog Posts')
              .schemaType('blogPost')
              .child(S.documentTypeList('blogPost')),
            S.listItem()
              .title('Instructor Bios')
              .schemaType('instructorBio')
              .child(S.documentTypeList('instructorBio')),
            S.divider(),
            S.listItem()
              .title('FAQs')
              .schemaType('faq')
              .child(S.documentTypeList('faq')),
            S.listItem()
              .title('Testimonials')
              .schemaType('testimonial')
              .child(S.documentTypeList('testimonial')),
            S.listItem()
              .title('Announcements')
              .schemaType('announcement')
              .child(S.documentTypeList('announcement')),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
});

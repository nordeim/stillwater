import { defineField, defineType } from 'sanity';

export const homePage = defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: false,
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'heroHeadline',
      title: 'Hero Headline',
      type: 'string',
      validation: (R) => R.required(),
    }),
    defineField({ name: 'heroSubheadline', title: 'Hero Subheadline', type: 'string' }),
    defineField({ name: 'heroImage', title: 'Hero Image', type: 'image' }),
    defineField({ name: 'philosophyText', title: 'Philosophy Text', type: 'text' }),
    defineField({
      name: 'featuredClasses',
      title: 'Featured Classes',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'class' }] }],
    }),
    defineField({ name: 'ctaText', title: 'CTA Text', type: 'string' }),
    defineField({ name: 'ctaHref', title: 'CTA URL', type: 'string' }),
  ],
});

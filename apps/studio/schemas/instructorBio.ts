import { defineField, defineType } from 'sanity';

export const instructorBio = defineType({
  name: 'instructorBio',
  title: 'Instructor Bio',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name' },
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: false,
      validation: (R) => R.required(),
    }),
    defineField({ name: 'title', title: 'Title (e.g., Lead Instructor)', type: 'string' }),
    defineField({ name: 'photo', title: 'Photo', type: 'image' }),
    defineField({ name: 'bio', title: 'Bio', type: 'text' }),
    defineField({
      name: 'specialties',
      title: 'Specialties',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'certifications',
      title: 'Certifications',
      type: 'array',
      of: [{ type: 'string' }],
    }),
  ],
});

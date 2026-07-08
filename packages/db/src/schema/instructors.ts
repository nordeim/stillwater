/**
 * F1-04 — instructors table
 *
 * Studio instructors. Linked to users table (an instructor is a user with
 * a public profile). Slug is unique for URL-based lookup (/instructors/[slug]).
 *
 * Source: PAD.md §7.2 INSTRUCTOR entity, MASTER_EXECUTION_PLAN.md F1-04.
 */

import { pgTable, uuid, text, boolean, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const instructors = pgTable('instructors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  bio: text('bio'),
  specialties: text('specialties').array(),
  imageKey: text('image_key'),
  isActive: boolean('is_active').default(true).notNull(),
  // Phase 4: published controls marketing visibility (SKILL §7.5.1).
  // Separate from isActive (which controls internal/staff visibility).
  // GROQ queries and tRPC public procedures filter published == true.
  published: boolean('published').default(true).notNull(),
  sortOrder: integer('sort_order').default(0),
});

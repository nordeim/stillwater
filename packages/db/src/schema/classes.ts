/**
 * F1-06 — classes table
 *
 * Class templates (e.g., "Morning Vinyasa Flow", "Ashtanga Primary Series").
 * A class is a reusable definition; specific scheduled occurrences are
 * stored in the `class_sessions` table (F1-08).
 *
 * Source: PAD.md §7.2 CLASS entity, MASTER_EXECUTION_PLAN.md F1-06.
 */

import { pgTable, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { classLevelEnum } from './enums';
import { classStyles } from './class-styles';

export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  styleId: uuid('style_id').references(() => classStyles.id),
  level: classLevelEnum('level').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  maxCapacity: integer('max_capacity').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  imageKey: text('image_key'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

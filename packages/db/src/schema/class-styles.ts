/**
 * F1-05 — class_styles table
 *
 * Taxonomy of class types (Vinyasa, Yin, Ashtanga, etc.).
 * Used to categorize classes for filtering and display.
 *
 * Source: PAD.md §7.2 CLASS_STYLE entity, MASTER_EXECUTION_PLAN.md F1-05.
 */

import { pgTable, uuid, text } from 'drizzle-orm/pg-core';

export const classStyles = pgTable('class_styles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'), // hex string validated at app layer
});
